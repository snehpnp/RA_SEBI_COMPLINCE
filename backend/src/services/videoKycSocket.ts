import dynamicDb from '../config/db';
import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';

interface RoomParticipant {
  socketId: string;
  role: 'ADMIN' | 'CLIENT';
  userId?: string;
  name?: string;
}

const activeRooms: Map<string, Map<string, RoomParticipant>> = new Map();

/**
 * Initializes Socket.IO signaling server for two-way live Video KYC
 */
export function initVideoKycSocket(httpServer: HttpServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: true,
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  const videoKycNamespace = io.of('/video-kyc');

  videoKycNamespace.on('connection', (socket: Socket) => {
    let currentSessionId: string | null = null;
    let participantRole: 'ADMIN' | 'CLIENT' = 'CLIENT';

    console.log(`🔌 [VIDEO-KYC SOCKET] Connected: ${socket.id}`);

    // Join room event
    socket.on('join-room', (data: { sessionId: string; role: 'ADMIN' | 'CLIENT'; name?: string; userId?: string }) => {
      const { sessionId, role, name, userId } = data;
      currentSessionId = sessionId;
      participantRole = role;

      socket.join(sessionId);

      if (!activeRooms.has(sessionId)) {
        activeRooms.set(sessionId, new Map());
      }

      const room = activeRooms.get(sessionId)!;

      // Check if session is already concluded or expired
      try {
        dynamicDb.VideoKycSession.findOne({ sessionId }).then((s: any) => {
          if (s && ['APPROVED', 'REJECTED', 'COMPLETED', 'EXPIRED'].includes(s.status)) {
            socket.emit('session-already-concluded', {
              status: s.status,
              message: s.status === 'EXPIRED'
                ? 'This Video KYC link has expired (24 hours exceeded).'
                : `This Video KYC session has already been ${s.status.toLowerCase()} and cannot be rejoined.`
            });
            socket.leave(sessionId);
            room.delete(socket.id);
          }
        }).catch(() => {});
      } catch {}

      // Reject duplicate connections for the same role (one Client, one Admin only)
      const existingParticipantWithRole = Array.from(room.values()).find(p => p.role === role && p.socketId !== socket.id);
      if (existingParticipantWithRole) {
        console.warn(`⚠️ [VIDEO-KYC] Blocked duplicate connection for role: ${role} in session: ${sessionId}`);
        socket.emit('session-already-active', {
          role,
          message: `An active ${role === 'ADMIN' ? 'Compliance Officer' : 'Client'} connection is already active in another browser tab or device. Multiple simultaneous connections are not permitted under SEBI compliance.`
        });
        return;
      }

      room.set(socket.id, { socketId: socket.id, role, name, userId });

      console.log(`👤 [VIDEO-KYC] ${role} (${name || socket.id}) joined room: ${sessionId}. Room total: ${room.size}`);

      // Notify others in the room that a user joined
      socket.to(sessionId).emit('user-joined', {
        socketId: socket.id,
        role,
        name,
        userId
      });

      // Send existing participants list back to the newly joined user
      const existingParticipants = Array.from(room.values()).filter(p => p.socketId !== socket.id);
      socket.emit('room-users', {
        participants: existingParticipants
      });
    });

    // WebRTC Offer
    socket.on('offer', (data: { targetSocketId?: string; offer: any; sessionId: string }) => {
      console.log(`📤 [VIDEO-KYC] Forwarding Offer from ${socket.id} (${participantRole}) in session ${data.sessionId}`);
      if (data.sessionId) {
        socket.to(data.sessionId).emit('offer', {
          senderSocketId: socket.id,
          offer: data.offer,
          role: participantRole
        });
      } else if (data.targetSocketId) {
        socket.to(data.targetSocketId).emit('offer', {
          senderSocketId: socket.id,
          offer: data.offer,
          role: participantRole
        });
      }
    });

    // WebRTC Answer
    socket.on('answer', (data: { targetSocketId?: string; answer: any; sessionId: string }) => {
      console.log(`📥 [VIDEO-KYC] Forwarding Answer from ${socket.id} (${participantRole}) in session ${data.sessionId}`);
      if (data.sessionId) {
        socket.to(data.sessionId).emit('answer', {
          senderSocketId: socket.id,
          answer: data.answer,
          role: participantRole
        });
      } else if (data.targetSocketId) {
        socket.to(data.targetSocketId).emit('answer', {
          senderSocketId: socket.id,
          answer: data.answer,
          role: participantRole
        });
      }
    });

    // WebRTC ICE Candidate
    socket.on('ice-candidate', (data: { targetSocketId?: string; candidate: any; sessionId: string }) => {
      if (data.sessionId) {
        socket.to(data.sessionId).emit('ice-candidate', {
          senderSocketId: socket.id,
          candidate: data.candidate
        });
      } else if (data.targetSocketId) {
        socket.to(data.targetSocketId).emit('ice-candidate', {
          senderSocketId: socket.id,
          candidate: data.candidate
        });
      }
    });

    // Admin commands: Request action (e.g. show PAN front, show PAN back, read consent)
    socket.on('admin-instruction', (data: { sessionId: string; instruction: string; instructionType?: string }) => {
      if (participantRole === 'ADMIN' && data.sessionId) {
        videoKycNamespace.to(data.sessionId).emit('admin-instruction', {
          instruction: data.instruction,
          instructionType: data.instructionType || 'GENERAL'
        });
      }
    });

    // Admin commands: Snapshot trigger
    socket.on('trigger-snapshot', (data: { sessionId: string; snapshotType: 'PAN' | 'FACE' }) => {
      if (participantRole === 'ADMIN' && data.sessionId) {
        videoKycNamespace.to(data.sessionId).emit('trigger-snapshot', {
          snapshotType: data.snapshotType
        });
      }
    });

    // Client sends captured snapshot back to room (for admin preview)
    socket.on('client-snapshot-captured', (data: { sessionId: string; snapshotType: 'PAN' | 'FACE'; imageBase64: string }) => {
      if (data.sessionId) {
        socket.to(data.sessionId).emit('client-snapshot-captured', {
          snapshotType: data.snapshotType,
          imageBase64: data.imageBase64
        });
      }
    });

    // Call End event initiated by Admin
    socket.on('end-session', (data: { sessionId: string; reason?: string }) => {
      if (participantRole === 'ADMIN' && data.sessionId) {
        videoKycNamespace.to(data.sessionId).emit('session-ended', {
          by: 'ADMIN',
          reason: data.reason || 'Verification session ended by Compliance Officer.'
        });
      }
    });

    // Handle Disconnect
    socket.on('disconnect', () => {
      console.log(`🔌 [VIDEO-KYC SOCKET] Disconnected: ${socket.id} (${participantRole})`);
      if (currentSessionId && activeRooms.has(currentSessionId)) {
        const room = activeRooms.get(currentSessionId)!;
        room.delete(socket.id);
        if (room.size === 0) {
          activeRooms.delete(currentSessionId);
        } else {
          socket.to(currentSessionId).emit('user-left', {
            socketId: socket.id,
            role: participantRole
          });
        }
      }
    });
  });

  return io;
}
