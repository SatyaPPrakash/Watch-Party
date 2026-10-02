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
import SimplePeer from "simple-peer";
import { Peer, ServerToClientEvents, ClientToServerEvents } from "../types/room";
import { useError } from "./ErrorContext";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";

interface PeerConnection {
  peer: SimplePeer.Instance;
  stream: MediaStream | null;
}

interface RoomContextValue {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  roomCode: string | null;
  localPeer: Peer | null;
  peers: Peer[];
  localStream: MediaStream | null;
  peerStreams: Map<string, MediaStream>;
  cameraOn: boolean;
  micOn: boolean;
  controllerId: string | null;
  isController: boolean;
  toggleCamera: () => void;
  toggleMic: () => void;
  createRoom: (displayName: string) => Promise<string>;
  joinRoom: (code: string, displayName: string) => Promise<void>;
}

const RoomContext = createContext<RoomContextValue | null>(null);

export function RoomProvider({ children }: { children: ReactNode }) {
  const { showError } = useError();

  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, PeerConnection>>(new Map());

  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [localPeer, setLocalPeer] = useState<Peer | null>(null);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peerStreams, setPeerStreams] = useState<Map<string, MediaStream>>(new Map());
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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch {
      showError("Camera / Mic access denied", "Allow camera and microphone access to join a room.");
      return null;
    }
  }, [showError]);

  const createPeerConnection = useCallback(
    (peerId: string, initiator: boolean, stream: MediaStream) => {
      const peer = new SimplePeer({ initiator, stream, trickle: false });

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
        setPeers((prev) => prev.filter((p) => p.id !== peerId));
        peerConnectionsRef.current.get(peerId)?.peer.destroy();
        peerConnectionsRef.current.delete(peerId);
        setPeerStreams((prev) => {
          const next = new Map(prev);
          next.delete(peerId);
          return next;
        });
      });

      socket.on("room:peer-updated", (updated) => {
        setPeers((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      });

      socket.on("signal", ({ from, signal }) => {
        const conn = peerConnectionsRef.current.get(from);
        if (conn) conn.peer.signal(signal as SimplePeer.SignalData);
      });

      socket.on("room:error", (message) => {
        showError("Room error", message);
      });

      socket.on("sync:controller-changed", (peerId) => {
        setControllerId(peerId);
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
        socket.emit("room:create", displayName, (code) => resolve(code));
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
            showError("Couldn't join", err);
            reject(new Error(err));
          } else {
            socket.emit("sync:request-state");
            resolve();
          }
        });
      });
    },
    [initLocalStream, getSocket, setupSocketListeners, showError]
  );

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
    const stream = localStreamRef.current;
    if (!stream) return;
    const track = stream.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
    socketRef.current?.emit("room:toggle-mic", track.enabled);
  }, []);

  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
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
        peers,
        localStream,
        peerStreams,
        cameraOn,
        micOn,
        controllerId,
        isController: !!socketRef.current && controllerId === socketRef.current.id,
        toggleCamera,
        toggleMic,
        createRoom,
        joinRoom,
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