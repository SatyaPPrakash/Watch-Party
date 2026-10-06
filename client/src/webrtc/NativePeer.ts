const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

type PeerEvents = {
  signal: (data: unknown) => void;
  stream: (stream: MediaStream) => void;
  error: (err: Error) => void;
  close: () => void;
  connect: () => void;
};

export class NativePeer {
  private pc: RTCPeerConnection;
  private initiator: boolean;
  private handlers: Partial<PeerEvents> = {};
  private destroyed = false;
  private senders = new Map<"audio" | "video", RTCRtpSender>();
  private remoteStream = new MediaStream();

  constructor(opts: { initiator: boolean; stream?: MediaStream }) {
    this.initiator = opts.initiator;
    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    for (const kind of ["audio", "video"] as const) {
      const track = opts.stream?.getTracks().find((candidate) => candidate.kind === kind);
      const sender = track && opts.stream
        ? this.pc.addTrack(track, opts.stream)
        : this.pc.addTransceiver(kind, { direction: "sendrecv" }).sender;
      this.senders.set(kind, sender);
    }

    this.pc.ontrack = (event) => {
      const stream = event.streams[0] ?? this.remoteStream;
      if (!event.streams[0] && !stream.getTracks().some((track) => track.id === event.track.id)) {
        stream.addTrack(event.track);
      }
      this.handlers.stream?.(stream);
    };

    // ICE candidate → send as signal
    this.pc.onicecandidate = (e) => {
      if (e.candidate) {
        this.handlers.signal?.({ type: "candidate", candidate: e.candidate });
      }
    };

    this.pc.onconnectionstatechange = () => {
      if (this.pc.connectionState === "connected") {
        void this.configureAudioSender();
      }
      if (this.pc.connectionState === "failed") {
        this.handlers.error?.(new Error("Connection failed"));
      }
      if (
        this.pc.connectionState === "closed" ||
        this.pc.connectionState === "disconnected"
      ) {
        this.handlers.close?.();
      }
    };

    if (this.initiator) {
      this.createOffer();
    }
  }

  private async createOffer() {
    try {
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      this.handlers.signal?.({ type: "offer", sdp: offer });
    } catch (err) {
      this.handlers.error?.(err as Error);
    }
  }

  async signal(data: unknown) {
    if (this.destroyed) return;
    const msg = data as { type: string; sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit };

    try {
      if (msg.type === "offer") {
        await this.pc.setRemoteDescription(new RTCSessionDescription(msg.sdp!));
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        this.handlers.signal?.({ type: "answer", sdp: answer });
      } else if (msg.type === "answer") {
        await this.pc.setRemoteDescription(new RTCSessionDescription(msg.sdp!));
      } else if (msg.type === "candidate") {
        await this.pc.addIceCandidate(new RTCIceCandidate(msg.candidate!));
      }
    } catch (err) {
      this.handlers.error?.(err as Error);
    }
  }

  replaceTrack(kind: "audio" | "video", track: MediaStreamTrack | null) {
    const sender = this.senders.get(kind);
    if (!sender) return Promise.reject(new Error(`No ${kind} sender is available`));
    return sender.replaceTrack(track).then(() => {
      if (kind === "audio") return this.configureAudioSender();
    });
  }

  private async configureAudioSender() {
    const sender = this.senders.get("audio");
    if (!sender) return;

    const parameters = sender.getParameters();
    if (!parameters.encodings.length) return;
    parameters.encodings[0].maxBitrate = 256_000;
    await sender.setParameters(parameters).catch(() => {});
  }

  on<K extends keyof PeerEvents>(event: K, cb: PeerEvents[K]) {
    this.handlers[event] = cb;
  }

  off<K extends keyof PeerEvents>(event: K) {
    delete this.handlers[event];
  }

  destroy() {
    this.destroyed = true;
    this.pc.close();
    this.handlers = {};
  }
}