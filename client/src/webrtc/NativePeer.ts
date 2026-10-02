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

  constructor(opts: { initiator: boolean; stream?: MediaStream }) {
    this.initiator = opts.initiator;
    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Add local tracks
    if (opts.stream) {
      opts.stream.getTracks().forEach((track) => {
        this.pc.addTrack(track, opts.stream!);
      });
    }

    // Receive remote stream
    this.pc.ontrack = (e) => {
      const stream = e.streams[0];
      if (stream) this.handlers.stream?.(stream);
    };

    // ICE candidate → send as signal
    this.pc.onicecandidate = (e) => {
      if (e.candidate) {
        this.handlers.signal?.({ type: "candidate", candidate: e.candidate });
      }
    };

    this.pc.onconnectionstatechange = () => {
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