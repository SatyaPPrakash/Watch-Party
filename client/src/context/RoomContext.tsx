import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";
import { NativePeer } from "../webrtc/NativePeer";
import { JoinRequest, Peer, ServerToClientEvents, ClientToServerEvents } from "../types/room";
import { useError } from "./ErrorContext";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";

interface PeerConnection {
  peer: NativePeer;
  stream: MediaStream | null;
}

interface RoomContextValue {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  roomCode: string | null;
  localPeer: Peer | null;
  hostId: string | null;
  isHost: boolean;
  joinRequests: JoinRequest[];
  joinRequestPending: boolean;
  peers: Peer[];
  localStream: MediaStream | null;
  peerStreams: Map<string, MediaStream>;
  screenSharerId: string | null;
  screenShareStream: MediaStream | null;
  cameraOn: boolean;
  micOn: boolean;
  controllerId: string | null;
  isController: boolean;
  toggleCamera: () => void;
  toggleMic: () => void;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => Promise<void>;
  leaveRoom: () => void;
  cancelJoinRequest: () => void;
  approveJoinRequest: (requestId: string) => void;
  denyJoinRequest: (requestId: string) => void;
  createRoom: (displayName: string) => Promise<string>;
  joinRoom: (code: string, displayName: string) => Promise<void>;
  onLoadUrl: (cb: (url: string) => void) => () => void;
  remoteMute: (targetId: string) => void;
  remoteHideCamera: (targetId: string) => void;
}

const RoomContext = createContext<RoomContextValue | null>(null);

export function RoomProvider({ children }: { children: ReactNode }) {
  const { showError } = useError();

  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenShareStreamRef = useRef<MediaStream | null>(null);
  const pendingJoinRequestIdRef = useRef<string | null>(null);
  const peerConnectionsRef = useRef<Map<string, PeerConnection>>(new Map());

  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [localPeer, setLocalPeer] = useState<Peer | null>(null);
  const [hostId, setHostId] = useState<string | null>(null);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [joinRequestPending, setJoinRequestPending] = useState(false);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peerStreams, setPeerStreams] = useState<Map<string, MediaStream>>(new Map());
  const [screenSharerId, setScreenSharerId] = useState<string | null>(null);
  const [screenShareStream, setScreenShareStream] = useState<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [controllerId, setControllerId] = useState<string | null>(null);

  const getSocket = useCallback(() => {
    if (!socketRef.current) {
      socketRef.current = io(SERVER_URL, { transports: ["websocket"] });
    }
    return socketRef.current;
  }, []);

  const initLocalStream = useCallback(async () => {
    let videoStream: MediaStream | null = null;
    let audioStream: MediaStream | null = null;

    try {
      videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
    } catch {
      showError("Camera access denied", "Could not access your camera. You can still join but others won't see you.");
    }

    try {
      audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      showError("Mic access denied", "Could not access your microphone. You can still join but others won't hear you.");
    }

    const combined = new MediaStream();
    videoStream?.getTracks().forEach((t) => combined.addTrack(t));
    audioStream?.getTracks().forEach((t) => combined.addTrack(t));

    localStreamRef.current = combined;
    setLocalStream(combined);
    return combined;
  }, [showError]);

  const createPeerConnection = useCallback(
    (peerId: string, initiator: boolean, stream: MediaStream) => {
      const presentation = screenShareStreamRef.current;
      const outgoingStream = new MediaStream();
      const videoTrack = presentation?.getVideoTracks()[0] ?? stream.getVideoTracks()[0];
      const audioTrack = presentation?.getAudioTracks()[0] ?? stream.getAudioTracks()[0];
      if (videoTrack) outgoingStream.addTrack(videoTrack);
      if (audioTrack) outgoingStream.addTrack(audioTrack);
      const peer = new NativePeer({ initiator, stream: outgoingStream });

      peer.on("signal", (signal) => {
        socketRef.current?.emit("signal", { to: peerId, signal });
      });

      peer.on("stream", (remoteStream) => {
        setPeerStreams((prev) => new Map(prev).set(peerId, remoteStream));
      });

      peer.on("error", (err) => {
        showError("Connection error", `Lost connection to a peer: ${err.message}`);
      });

      peer.on("close", () => {
        setPeerStreams((prev) => {
          const next = new Map(prev);
          next.delete(peerId);
          return next;
        });
      });

      peerConnectionsRef.current.set(peerId, { peer, stream: null });
      return peer;
    },
    [showError]
  );

  const setupSocketListeners = useCallback(
    (socket: Socket<ServerToClientEvents, ClientToServerEvents>, stream: MediaStream) => {
      socket.on("room:joined", ({ room, peer }) => {
        setRoomCode(room.code);
        setHostId(room.hostId);
        pendingJoinRequestIdRef.current = null;
        setJoinRequestPending(false);
        setScreenSharerId(room.screenSharerId);
        setLocalPeer(peer);
        const others = room.peers.filter((p) => p.id !== peer.id);
        setPeers(others);
        others.forEach((p) => createPeerConnection(p.id, true, stream));
      });

      socket.on("room:peer-joined", (peer) => {
        setPeers((prev) => [...prev, peer]);
        createPeerConnection(peer.id, false, stream);
      });

      socket.on("room:peer-left", (peerId) => {
        setScreenSharerId((current) => current === peerId ? null : current);
        setPeers((prev) => prev.filter((p) => p.id !== peerId));
        peerConnectionsRef.current.get(peerId)?.peer.destroy();
        peerConnectionsRef.current.delete(peerId);
        setPeerStreams((prev) => {
          const next = new Map(prev);
          next.delete(peerId);
          return next;
        });
      });

      socket.on("room:join-request", (request) => {
        setJoinRequests((current) => current.some((item) => item.requestId === request.requestId)
          ? current
          : [...current, request]);
      });

      socket.on("room:join-request-cancelled", (requestId) => {
        setJoinRequests((current) => current.filter((request) => request.requestId !== requestId));
      });

      socket.on("room:join-pending", (requestId) => {
        pendingJoinRequestIdRef.current = requestId;
        setJoinRequestPending(true);
      });

      socket.on("room:host-changed", (nextHostId) => {
        setHostId(nextHostId);
      });

      socket.on("room:peer-updated", (updated) => {
        setPeers((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      });

      socket.on("signal", ({ from, signal }) => {
        const conn = peerConnectionsRef.current.get(from);
        if (conn) conn.peer.signal(signal);
      });

      socket.on("room:error", (message) => {
        showError("Room error", message);
      });

      socket.on("room:screen-share-changed", (peerId) => {
        setScreenSharerId(peerId);
      });

      socket.on("sync:controller-changed", (peerId) => {
        setControllerId(peerId);
      });

      socket.on("room:you-were-muted", () => {
        const track = screenShareStreamRef.current?.getAudioTracks()[0]
          ?? localStreamRef.current?.getAudioTracks()[0];
        if (track) track.enabled = false;
        setMicOn(false);
      });

      socket.on("room:your-camera-was-hidden", () => {
        const s = localStreamRef.current;
        const track = s?.getVideoTracks()[0];
        if (track) track.enabled = false;
        setCameraOn(false);
      });
    },
    [createPeerConnection, showError]
  );

  const createRoom = useCallback(
    async (displayName: string): Promise<string> => {
      const stream = await initLocalStream();
      if (!stream) throw new Error("No media stream");

      const socket = getSocket();
      setupSocketListeners(socket, stream);

      return new Promise((resolve) => {
        socket.emit("room:create", displayName, (code) => {
          if (socket.id) {
            setControllerId(socket.id);
            socket.emit("sync:set-controller", socket.id);
          }
          resolve(code);
        });
      });
    },
    [initLocalStream, getSocket, setupSocketListeners]
  );

  const joinRoom = useCallback(
    async (code: string, displayName: string): Promise<void> => {
      const stream = await initLocalStream();
      if (!stream) throw new Error("No media stream");

      const socket = getSocket();
      setupSocketListeners(socket, stream);

      return new Promise((resolve, reject) => {
        socket.emit("room:join", { code, displayName }, (err) => {
          if (err) {
            pendingJoinRequestIdRef.current = null;
            setJoinRequestPending(false);
            if (err !== "Join request cancelled.") showError("Couldn't join", err);
            reject(new Error(err));
          } else {
            pendingJoinRequestIdRef.current = null;
            setJoinRequestPending(false);
            socket.emit("sync:request-state");
            resolve();
          }
        });
      });
    },
    [initLocalStream, getSocket, setupSocketListeners, showError]
  );

  const remoteMute = useCallback((targetId: string) => {
    socketRef.current?.emit("room:remote-mute", targetId);
  }, []);

  const remoteHideCamera = useCallback((targetId: string) => {
    socketRef.current?.emit("room:remote-hide-camera", targetId);
  }, []);

  const stopScreenShare = useCallback(async () => {
    const presentation = screenShareStreamRef.current;
    if (!presentation) return;

    screenShareStreamRef.current = null;
    const cameraTrack = localStreamRef.current?.getVideoTracks()[0] ?? null;
    const microphoneTrack = localStreamRef.current?.getAudioTracks()[0] ?? null;
    await Promise.all(Array.from(peerConnectionsRef.current.values(), async ({ peer }) => {
      await Promise.all([
        peer.replaceTrack("video", cameraTrack).catch(() => {}),
        peer.replaceTrack("audio", microphoneTrack).catch(() => {}),
      ]);
    }));

    presentation.getTracks().forEach((track) => track.stop());
    setScreenShareStream(null);
    setScreenSharerId(null);
    socketRef.current?.emit("room:screen-share", false);
  }, []);

  const leaveRoom = useCallback(() => {
    screenShareStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    peerConnectionsRef.current.forEach(({ peer }) => peer.destroy());
    peerConnectionsRef.current.clear();
    socketRef.current?.disconnect();
    socketRef.current = null;
    screenShareStreamRef.current = null;
    localStreamRef.current = null;

    setRoomCode(null);
    setLocalPeer(null);
    setHostId(null);
    setJoinRequests([]);
    pendingJoinRequestIdRef.current = null;
    setJoinRequestPending(false);
    setPeers([]);
    setLocalStream(null);
    setPeerStreams(new Map());
    setScreenSharerId(null);
    setScreenShareStream(null);
    setControllerId(null);
    setCameraOn(true);
    setMicOn(true);
  }, []);

  const cancelJoinRequest = useCallback(() => {
    const requestId = pendingJoinRequestIdRef.current;
    if (requestId) socketRef.current?.emit("room:cancel-join", requestId);
  }, []);

  const approveJoinRequest = useCallback((requestId: string) => {
    socketRef.current?.emit("room:approve-join", requestId);
    setJoinRequests((current) => current.filter((request) => request.requestId !== requestId));
  }, []);

  const denyJoinRequest = useCallback((requestId: string) => {
    socketRef.current?.emit("room:deny-join", requestId);
    setJoinRequests((current) => current.filter((request) => request.requestId !== requestId));
  }, []);

  const startScreenShare = useCallback(async () => {
    const socket = socketRef.current;
    if (!navigator.mediaDevices?.getDisplayMedia) {
      showError("Screen sharing unavailable", "Use a browser that supports screen capture over a secure connection.");
      return;
    }
    if (!socket?.connected || !socket.id) {
      showError("Room disconnected", "Reconnect to the room before sharing your screen.");
      return;
    }
    if (screenSharerId && screenSharerId !== socket.id) {
      showError("Screen already in use", "Another participant is already sharing their screen.");
      return;
    }
    if (screenShareStreamRef.current) return;

    let presentation: MediaStream;
    try {
      presentation = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30, max: 30 } },
        audio: true,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "NotAllowedError") return;
      showError("Screen share failed", error instanceof Error ? error.message : "Could not capture this screen.");
      return;
    }

    const videoTrack = presentation.getVideoTracks()[0];
    if (!videoTrack) {
      presentation.getTracks().forEach((track) => track.stop());
      showError("Screen share failed", "The selected source did not provide a video track.");
      return;
    }

    screenShareStreamRef.current = presentation;
    setScreenShareStream(presentation);
    const audioTrack = presentation.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = localStreamRef.current?.getAudioTracks()[0]?.enabled ?? true;
    }
    try {
      await Promise.all(Array.from(peerConnectionsRef.current.values(), async ({ peer }) => {
        await peer.replaceTrack("video", videoTrack);
        if (audioTrack) await peer.replaceTrack("audio", audioTrack);
      }));
    } catch {
      await stopScreenShare();
      showError("Screen share failed", "Could not send the selected source to everyone in the room.");
      return;
    }

    setScreenSharerId(socket.id);
    socket.emit("room:screen-share", true);
    videoTrack.addEventListener("ended", () => void stopScreenShare(), { once: true });
  }, [screenSharerId, showError, stopScreenShare]);

  const onLoadUrl = useCallback((cb: (url: string) => void) => {
    const socket = socketRef.current;
    if (!socket) return () => {};
    socket.on("sync:load-url", cb);
    return () => { socket.off("sync:load-url", cb); };
  }, []);

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCameraOn(track.enabled);
    socketRef.current?.emit("room:toggle-camera", track.enabled);
  }, []);

  const toggleMic = useCallback(() => {
    const track = screenShareStreamRef.current?.getAudioTracks()[0]
      ?? localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
    socketRef.current?.emit("room:toggle-mic", track.enabled);
  }, []);

  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenShareStreamRef.current?.getTracks().forEach((t) => t.stop());
      peerConnectionsRef.current.forEach(({ peer }) => peer.destroy());
      socketRef.current?.disconnect();
    };
  }, []);

  return (
    <RoomContext.Provider
      value={{
        socket: socketRef.current,
        roomCode,
        localPeer,
        hostId,
        isHost: !!socketRef.current && hostId === socketRef.current.id,
        joinRequests,
        joinRequestPending,
        peers,
        localStream,
        peerStreams,
        screenSharerId,
        screenShareStream,
        cameraOn,
        micOn,
        controllerId,
        isController: !!socketRef.current && controllerId === socketRef.current.id,
        toggleCamera,
        toggleMic,
        startScreenShare,
        stopScreenShare,
        leaveRoom,
        cancelJoinRequest,
        approveJoinRequest,
        denyJoinRequest,
        createRoom,
        joinRoom,
        onLoadUrl,
        remoteMute,
        remoteHideCamera,
      }}
    >
      {children}
    </RoomContext.Provider>
  );
}

export function useRoom() {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error("useRoom must be used inside RoomProvider");
  return ctx;
}