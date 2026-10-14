'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Camera, 
  CameraOff, 
  Mic, 
  MicOff, 
  MapPin, 
  ShieldCheck, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  RefreshCw, 
  Eye, 
  Lock, 
  FileText, 
  User, 
  CreditCard,
  Radio,
  StopCircle,
  HelpCircle,
  XCircle,
  Sparkles,
  Calendar,
  KeyRound,
  Mail
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import api from '../../../services/api';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:5000';

export default function VideoKycRoomPage() {
  const params = useParams();
  const router = useRouter();

  // Extract sessionId from params, searchParams (?sessionId=...), or pathname
  const [sessionId, setSessionId] = useState<string>(() => {
    if (params?.sessionId && params.sessionId !== 'session' && params.sessionId !== 'room') {
      return params.sessionId as string;
    }
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search).get('sessionId');
      if (sp) return sp;
      const parts = window.location.pathname.split('/').filter(Boolean);
      const idx = parts.indexOf('video-kyc');
      if (idx !== -1 && parts[idx + 1] && parts[idx + 1] !== 'session' && parts[idx + 1] !== 'room') {
        return decodeURIComponent(parts[idx + 1]);
      }
    }
    return (params?.sessionId as string) || '';
  });

  useEffect(() => {
    if (params?.sessionId && params.sessionId !== 'session' && params.sessionId !== 'room') {
      setSessionId(params.sessionId as string);
    } else if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search).get('sessionId');
      if (sp) {
        setSessionId(sp);
      } else {
        const parts = window.location.pathname.split('/').filter(Boolean);
        const idx = parts.indexOf('video-kyc');
        if (idx !== -1 && parts[idx + 1] && parts[idx + 1] !== 'session' && parts[idx + 1] !== 'room') {
          setSessionId(decodeURIComponent(parts[idx + 1]));
        }
      }
    }
  }, [params]);

  // Session & Metadata State
  const [sessionData, setSessionData] = useState<any>(null);
  const [tenantData, setTenantData] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Hardware & Permissions State
  const [hasPermission, setHasPermission] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [geoData, setGeoData] = useState<{ latitude?: number; longitude?: number; accuracy?: number } | null>(null);

  // WebRTC & Media Streams
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Call States
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [remoteUserName, setRemoteUserName] = useState<string>('Participant');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [adminInstruction, setAdminInstruction] = useState<string | null>(null);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Admin Controls
  const [adminMicMuted, setAdminMicMuted] = useState(false);
  const [adminCamDisabled, setAdminCamDisabled] = useState(false);
  const [capturedPanSnapshot, setCapturedPanSnapshot] = useState<string | null>(null);
  const [capturedFaceSnapshot, setCapturedFaceSnapshot] = useState<string | null>(null);
  const [snapshotGallery, setSnapshotGallery] = useState<Array<{ type: 'PAN' | 'FACE' | 'OTHER'; base64: string; label?: string; time: string }>>([]);
  const [snapshotToast, setSnapshotToast] = useState<string | null>(null);

  // Scheduled appointment states
  const [officerUnlockedEarly, setOfficerUnlockedEarly] = useState(false);
  const [nowTime, setNowTime] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // MediaRecorder for Video Recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const hasAutoStartedRecording = useRef(false);
  const isCapturingRef = useRef(false);
  const adminCamDisabledRef = useRef(false);
  const isAdminRef = useRef(false);
  const pendingIceCandidatesRef = useRef<any[]>([]);
  const compositeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const compositeAnimIdRef = useRef<number | null>(null);
  const audioContextRef = useRef<any>(null);

  useEffect(() => {
    adminCamDisabledRef.current = adminCamDisabled;
  }, [adminCamDisabled]);

  useEffect(() => {
    isAdminRef.current = isAdmin;
  }, [isAdmin]);

  // Client 2FA Email OTP Verification States
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSuccessMsg, setOtpSuccessMsg] = useState<string | null>(null);
  const [resendingOtp, setResendingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [maskedEmail, setMaskedEmail] = useState<string>('');

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => {
      setResendCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!otpInput || otpInput.trim().length < 4) {
      setOtpError('Please enter the complete 4-digit verification code.');
      return;
    }

    try {
      setVerifyingOtp(true);
      setOtpError(null);
      const res: any = await api.verifyVideoKycOtp(sessionId, otpInput.trim());
      if (res?.success) {
        setIsOtpVerified(true);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(`vkyc_otp_verified_${sessionId}`, 'true');
        }
        setOtpSuccessMsg('✅ OTP verified successfully! Proceeding to camera check...');
      } else {
        setOtpError(res?.message || 'Invalid OTP code. Please check your email.');
      }
    } catch (err: any) {
      setOtpError(err?.message || 'Verification failed. Please check the code and try again.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resendingOtp) return;

    try {
      setResendingOtp(true);
      setOtpError(null);
      const res: any = await api.resendVideoKycOtp(sessionId);
      if (res?.success) {
        setOtpSuccessMsg(res?.message || 'A fresh OTP has been sent to your registered email.');
        setResendCooldown(30);
      } else {
        setOtpError(res?.message || 'Failed to resend OTP.');
      }
    } catch (err: any) {
      setOtpError(err?.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setResendingOtp(false);
    }
  };

  // Bind local stream whenever localVideoRef or hasPermission updates
  useEffect(() => {
    if (hasPermission && localVideoRef.current && localStreamRef.current) {
      if (localVideoRef.current.srcObject !== localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      localVideoRef.current.play().catch(() => {});
    }
  }, [hasPermission]);

  // Bind remote stream whenever remoteVideoRef or remoteStreamRef updates
  useEffect(() => {
    if (remoteConnected && remoteVideoRef.current && remoteStreamRef.current) {
      if (remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
      }
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [remoteConnected]);

  // AUTO-START RECORDING AS SOON AS BOTH SIDES CONNECT AND REMOTE STREAM HAS VIDEO
  useEffect(() => {
    if (isAdmin && remoteConnected && hasPermission && !isRecording && !hasAutoStartedRecording.current) {
      const checkAndStart = () => {
        const hasRemoteVideoTrack = remoteStreamRef.current && remoteStreamRef.current.getVideoTracks().length > 0;
        const hasVideoDims = remoteVideoRef.current && remoteVideoRef.current.videoWidth > 0;
        if (hasRemoteVideoTrack || hasVideoDims) {
          console.log('⏺️ [Auto-Record] Remote video track active. Starting composite recording...');
          hasAutoStartedRecording.current = true;
          startRecording();
          return true;
        }
        return false;
      };

      if (!checkAndStart()) {
        const interval = setInterval(() => {
          if (checkAndStart() || hasAutoStartedRecording.current) {
            clearInterval(interval);
          }
        }, 600);
        return () => clearInterval(interval);
      }
    }
  }, [remoteConnected, hasPermission, isRecording, isAdmin]);

  // 1. Fetch Session Info & Current User
  useEffect(() => {
    if (!sessionId) return;

    const loadSession = async () => {
      try {
        setLoading(true);
        const res: any = await api.getVideoKycSession(sessionId);
        if (res?.success && res?.data) {
          setSessionData(res.data.session);
          setTenantData(res.data.tenant);
          if (res.data.maskedEmail) {
            setMaskedEmail(res.data.maskedEmail);
          }

          // Priority 1: Check explicit URL query parameter ?role=admin or ?role=client
          const queryRole = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('role') : null;
          let determinedAdmin = false;
          if (queryRole === 'admin') {
            setIsAdmin(true);
            isAdminRef.current = true;
            determinedAdmin = true;
          } else if (queryRole === 'client') {
            setIsAdmin(false);
            isAdminRef.current = false;
            determinedAdmin = false;
          } else {
            // Priority 2: Fall back to localStorage authenticated user role
            const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
            if (userStr) {
              try {
                const u = JSON.parse(userStr);
                setCurrentUser(u);
                const adminRoles = ['ADMIN', 'SUPER_ADMIN', 'COMPLIANCE', 'STAFF'];
                const adminCheck = adminRoles.includes(u.role);
                setIsAdmin(adminCheck);
                isAdminRef.current = adminCheck;
                determinedAdmin = adminCheck;
              } catch { }
            }
          }

          // If Admin, auto-verify OTP. If Client, check sessionStorage
          if (determinedAdmin) {
            setIsOtpVerified(true);
          } else {
            const cachedOtp = typeof window !== 'undefined' ? sessionStorage.getItem(`vkyc_otp_verified_${sessionId}`) : null;
            if (cachedOtp === 'true') {
              setIsOtpVerified(true);
            }
          }
        } else {
          setErrorMsg(res?.message || 'Video KYC session not found or link expired.');
        }
      } catch (err: any) {
        setErrorMsg(err?.message || 'Failed to load Video KYC session.');
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [sessionId]);

  // 2. Request Geolocation & Media Stream (Camera + Mic)
  const initializeMediaAndGeo = async () => {
    try {
      setPermissionError(null);

      // Request Geolocation
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setGeoData({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy
            });
          },
          (geoErr) => {
            console.warn('Geolocation denied or unavailable:', geoErr.message);
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      }

      // Request Camera and Audio
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          frameRate: { ideal: 24, max: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      localStreamRef.current = stream;
      setHasPermission(true);

      // Immediate attachment
      setTimeout(() => {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      }, 100);

      // Start Socket and WebRTC connection
      initSocketAndWebRTC(stream);
    } catch (err: any) {
      console.error('Error accessing camera/mic:', err);
      setPermissionError(
        'Camera and microphone access are required for SEBI compliance verification. Please allow permissions in your browser.'
      );
    }
  };

  // Helper to safely add ICE candidate or queue it if remote description is not set yet
  const addIceSafely = async (pc: RTCPeerConnection, candidate: any) => {
    try {
      if (!candidate) return;
      if (!pc.remoteDescription || !pc.remoteDescription.type) {
        console.log('⏳ [WebRTC] Remote description not set yet. Queuing incoming ICE candidate...');
        pendingIceCandidatesRef.current.push(candidate);
        return;
      }
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.warn('Error adding ICE candidate:', e);
    }
  };

  // Helper to flush queued ICE candidates once remote description is ready
  const flushPendingIceCandidates = async (pc: RTCPeerConnection) => {
    if (!pc.remoteDescription) return;
    const queued = [...pendingIceCandidatesRef.current];
    pendingIceCandidatesRef.current = [];
    if (queued.length > 0) {
      console.log(`🧊 [WebRTC] Flushing ${queued.length} queued ICE candidate(s)...`);
      for (const cand of queued) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        } catch (err) {
          console.warn('Error flushing queued ICE candidate:', err);
        }
      }
    }
  };

  // 3. WebRTC & Socket.IO Setup
  const initSocketAndWebRTC = (stream: MediaStream) => {
    const role = isAdminRef.current ? 'ADMIN' : 'CLIENT';
    const userName = isAdminRef.current ? 'Compliance Officer' : sessionData?.clientId?.name || 'Client';

    const socket = io(`${BACKEND_URL}/video-kyc`, {
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    // WebRTC PeerConnection configuration with multi-STUN and candidate pool
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun.cloudflare.com:3478' },
        { urls: 'stun:global.stun.twilio.com:3478' }
      ],
      iceCandidatePoolSize: 10
    });
    peerConnectionRef.current = pc;

    // Add local audio and video tracks to WebRTC
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    // Handle remote tracks
    pc.ontrack = (event) => {
      console.log('📹 [WebRTC] Remote track received:', event.track.kind, event.track.id, 'readyState:', event.track.readyState);
      
      let incomingStream = remoteStreamRef.current;
      if (event.streams && event.streams[0]) {
        incomingStream = event.streams[0];
        remoteStreamRef.current = incomingStream;
      } else {
        if (!incomingStream) {
          incomingStream = new MediaStream();
          remoteStreamRef.current = incomingStream;
        }
        if (!incomingStream.getTracks().some(t => t.id === event.track.id)) {
          incomingStream.addTrack(event.track);
        }
      }

      const syncRemoteVideo = () => {
        if (remoteVideoRef.current && incomingStream) {
          if (remoteVideoRef.current.srcObject !== incomingStream) {
            remoteVideoRef.current.srcObject = incomingStream;
          }
          remoteVideoRef.current.play().catch((err) => {
            console.warn('remoteVideo play failed, retrying muted:', err);
            if (remoteVideoRef.current) {
              remoteVideoRef.current.muted = true;
              remoteVideoRef.current.play().catch(() => {});
            }
          });
        }
      };

      event.track.onunmute = () => {
        console.log('📹 [WebRTC] Remote track unmuted & streaming live:', event.track.kind);
        setRemoteConnected(true);
        syncRemoteVideo();
      };

      setRemoteConnected(true);
      syncRemoteVideo();

      // Automatically initiate/refresh recording once remote video arrives
      if (isAdminRef.current && event.track.kind === 'video') {
        console.log('⏺️ [Auto-Record] Remote video track detected. Triggering startRecording...');
        setTimeout(() => {
          startRecording();
        }, 500);
      }
    };

    // Connection state monitoring
    pc.onconnectionstatechange = () => {
      console.log('🔄 [WebRTC] Connection state changed:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        console.log('🎉 [WebRTC] Peer Connection Established Successfully!');
        setRemoteConnected(true);
        if (remoteVideoRef.current && remoteStreamRef.current) {
          remoteVideoRef.current.play().catch(() => {});
        }
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        console.warn('⚠️ [WebRTC] Connection state dropped. Triggering ICE restart...');
        if (role === 'ADMIN') {
          pc.createOffer({ iceRestart: true }).then(async (offer) => {
            await pc.setLocalDescription(offer);
            socket.emit('offer', { sessionId, offer });
          }).catch(console.error);
        }
      }
    };

    // ICE Candidate generation
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice-candidate', {
          sessionId,
          candidate: event.candidate
        });
      }
    };

    // Socket: Join room
    socket.emit('join-room', {
      sessionId,
      role,
      name: userName,
      userId: currentUser?.id
    });

    const createAndSendOffer = async (targetSocketId?: string) => {
      try {
        if (pc.signalingState !== 'stable') {
          console.warn('⚠️ WebRTC signalingState not stable, state is:', pc.signalingState);
          return;
        }
        console.log('🚀 [WebRTC] Creating & sending offer to target:', targetSocketId || 'all');
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });
        await pc.setLocalDescription(offer);
        socket.emit('offer', { sessionId, offer, targetSocketId });
      } catch (e) {
        console.error('Error creating WebRTC offer:', e);
      }
    };

    // Socket: Handle incoming room users
    socket.on('room-users', async (data: { participants: any[] }) => {
      const other = data.participants[0];
      if (other) {
        console.log('👥 [WebRTC] Room users received. Peer found:', other);
        setRemoteConnected(true);
        setRemoteUserName(other.name || (other.role === 'ADMIN' ? 'Compliance Officer' : 'Client'));
        
        // Designated caller: ONLY ADMIN initiates offer to prevent glare collision
        if (role === 'ADMIN') {
          await createAndSendOffer(other.socketId);
        }
      }
    });

    // Socket: Another user joined
    socket.on('user-joined', async (data: any) => {
      console.log('👤 [WebRTC] User joined room:', data);
      setRemoteConnected(true);
      setRemoteUserName(data.name || (data.role === 'ADMIN' ? 'Compliance Officer' : 'Client'));

      // Designated caller: ONLY ADMIN initiates offer
      if (role === 'ADMIN') {
        await createAndSendOffer(data.socketId);
      }
    });

    // Socket: WebRTC Offer received
    socket.on('offer', async (data: any) => {
      try {
        console.log('📨 [WebRTC] Received offer. Current state:', pc.signalingState);
        if (pc.signalingState !== 'stable') {
          // Perfect negotiation rollback
          await Promise.all([
            pc.setLocalDescription({ type: 'rollback' }),
            pc.setRemoteDescription(new RTCSessionDescription(data.offer))
          ]);
        } else {
          await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        }
        await flushPendingIceCandidates(pc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        console.log('📤 [WebRTC] Sending answer back to:', data.senderSocketId);
        socket.emit('answer', { sessionId, answer, targetSocketId: data.senderSocketId });
      } catch (err) {
        console.error('Error handling WebRTC offer:', err);
      }
    });

    // Socket: WebRTC Answer received
    socket.on('answer', async (data: any) => {
      try {
        console.log('📨 [WebRTC] Received answer. Current state:', pc.signalingState);
        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          await flushPendingIceCandidates(pc);
          console.log('✅ [WebRTC] Connection fully established and candidate queue flushed!');
        }
      } catch (err) {
        console.error('Error handling WebRTC answer:', err);
      }
    });

    // Socket: ICE Candidate received
    socket.on('ice-candidate', async (data: any) => {
      if (data.candidate) {
        await addIceSafely(pc, data.candidate);
      }
    });

    // Socket: Admin instruction broadcast
    socket.on('admin-instruction', (data: { instruction: string; instructionType?: string }) => {
      setAdminInstruction(data.instruction);
    });

    // Socket: Session ended
    socket.on('session-ended', (data: any) => {
      setSessionCompleted(true);
      stopMediaAndRecording();
    });

    // Socket: User left
    socket.on('user-left', () => {
      setRemoteConnected(false);
    });
  };

  // 4. Capture Video Frame Snapshot (for PAN or Face) - Client camera only
  const captureAndSendSnapshot = (snapshotType: 'PAN' | 'FACE') => {
    if (isCapturingRef.current) return;
    isCapturingRef.current = true;

    // Strict Target: Always capture the CLIENT (remote video for Admin, local video for Client)
    let targetVideo: HTMLVideoElement | null = null;
    if (isAdmin) {
      if (remoteVideoRef.current && remoteVideoRef.current.videoWidth > 0) {
        targetVideo = remoteVideoRef.current;
      } else {
        alert("Client camera stream is not live yet on the screen. Please ensure the client has connected their camera.");
        isCapturingRef.current = false;
        return;
      }
    } else {
      targetVideo = localVideoRef.current;
    }

    if (!targetVideo || !targetVideo.videoWidth) {
      alert('Camera feed is not active yet to take snapshot.');
      isCapturingRef.current = false;
      return;
    }

    try {
      const maxW = 1280;
      const scale = Math.min(1, maxW / (targetVideo.videoWidth || 1280));
      const targetW = Math.round((targetVideo.videoWidth || 640) * scale);
      const targetH = Math.round((targetVideo.videoHeight || 480) * scale);

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(targetVideo, 0, 0, targetW, targetH);
        // Draw Timestamp and GPS watermark
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, canvas.height - 32, canvas.width, 32);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px monospace';
        const geoText = geoData?.latitude ? `GPS: ${geoData.latitude.toFixed(4)}, ${geoData.longitude?.toFixed(4)}` : '';
        const watermark = `SEBI V-CIP | ${new Date().toLocaleString('en-IN')} | ${sessionId} | ${geoText}`;
        ctx.fillText(watermark, 10, canvas.height - 11);

        const base64 = canvas.toDataURL('image/jpeg', 0.82);

        const countOfType = snapshotGallery.filter(s => s.type === snapshotType).length + 1;
        const newSnapItem = {
          type: snapshotType,
          base64,
          label: `${snapshotType === 'PAN' ? 'PAN Card' : 'Client Face'} #${countOfType}`,
          time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };

        // Append to local snapshot gallery (Single snap saved directly)
        setSnapshotGallery(prev => [newSnapItem, ...prev]);

        // Update primary previews
        if (snapshotType === 'PAN') {
          setCapturedPanSnapshot(base64);
          setSnapshotToast(`✅ PAN Snapshot #${countOfType} captured successfully!`);
        } else {
          setCapturedFaceSnapshot(base64);
          setSnapshotToast(`✅ Face Snapshot #${countOfType} captured successfully!`);
        }
        setTimeout(() => setSnapshotToast(null), 3500);

        // Inform participant via socket instruction (no echo loop)
        if (socketRef.current && isAdmin) {
          socketRef.current.emit('admin-instruction', {
            sessionId,
            instruction: `📸 Compliance Officer captured ${snapshotType === 'PAN' ? 'PAN Card' : 'Client Face'} snapshot.`
          });
        }
      }
    } catch (err) {
      console.error('Failed to capture snapshot:', err);
    } finally {
      setTimeout(() => {
        isCapturingRef.current = false;
      }, 500);
    }
  };

  // Helper to draw video with aspect cover fit into canvas rect
  const drawVideoCover = (
    ctx: CanvasRenderingContext2D,
    video: HTMLVideoElement | null,
    x: number,
    y: number,
    w: number,
    h: number,
    placeholderText: string
  ) => {
    if (!video || !video.videoWidth || !video.videoHeight) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#334155';
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(placeholderText, x + w / 2, y + h / 2);
      ctx.textAlign = 'left';
      return;
    }

    try {
      const videoAspect = video.videoWidth / video.videoHeight;
      const targetAspect = w / h;
      let sx = 0, sy = 0, sWidth = video.videoWidth, sHeight = video.videoHeight;
      if (videoAspect > targetAspect) {
        sWidth = video.videoHeight * targetAspect;
        sx = (video.videoWidth - sWidth) / 2;
      } else {
        sHeight = video.videoWidth / targetAspect;
        sy = (video.videoHeight - sHeight) / 2;
      }
      ctx.drawImage(video, sx, sy, sWidth, sHeight, x, y, w, h);
    } catch {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(x, y, w, h);
    }
  };

  // 5. Dual-Party Composite Recording Engine (Side-by-Side: Client & Officer)
  const startRecording = () => {
    if (!isAdmin) return;

    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        return;
      }

      if (compositeAnimIdRef.current) {
        cancelAnimationFrame(compositeAnimIdRef.current);
        compositeAnimIdRef.current = null;
      }

      // Initialize virtual 720p HD composite canvas
      let canvas = compositeCanvasRef.current;
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.width = 1280;
        canvas.height = 720;
        compositeCanvasRef.current = canvas;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const clientDisplayName = sessionData?.clientId?.name || 'Client';

      // Real-time 25 FPS animation loop composing Client and Officer feeds
      const drawFrame = () => {
        // Deep Slate Background
        ctx.fillStyle = '#080c14';
        ctx.fillRect(0, 0, 1280, 720);

        // Header Bar
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 1280, 44);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText(`SEBI V-CIP DIGITAL VERIFICATION | SESSION: ${sessionId}`, 20, 28);
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`● REGULATORY AUDIT (${new Date().toLocaleTimeString('en-IN')})`, 1260, 28);
        ctx.textAlign = 'left';

        // Check if Admin camera is turned off
        const isCamOff = adminCamDisabledRef.current;

        if (!isCamOff) {
          // SIDE-BY-SIDE SPLIT SCREEN:
          // Left Box: CLIENT (x: 16, y: 54, w: 616, h: 604)
          drawVideoCover(ctx, remoteVideoRef.current, 16, 54, 616, 604, `Waiting for ${clientDisplayName}'s video...`);

          // Client Header Label
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.fillRect(16, 54, 616, 32);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 13px sans-serif';
          ctx.fillText(`👤 Client: ${clientDisplayName}`, 28, 75);

          // Left Box Border
          ctx.strokeStyle = '#2563eb';
          ctx.lineWidth = 2;
          ctx.strokeRect(16, 54, 616, 604);

          // Right Box: COMPLIANCE OFFICER / ADMIN (x: 648, y: 54, w: 616, h: 604)
          drawVideoCover(ctx, localVideoRef.current, 648, 54, 616, 604, 'Compliance Officer Camera');

          // Admin Header Label
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.fillRect(648, 54, 616, 32);
          ctx.fillStyle = '#10b981';
          ctx.font = 'bold 13px sans-serif';
          ctx.fillText('🛡️ Compliance Officer (Authorized Auditor)', 660, 75);

          // Right Box Border
          ctx.strokeStyle = '#059669';
          ctx.lineWidth = 2;
          ctx.strokeRect(648, 54, 616, 604);
        } else {
          // FULL SCREEN CLIENT (When Admin has disabled camera)
          drawVideoCover(ctx, remoteVideoRef.current, 16, 54, 1248, 604, `Waiting for ${clientDisplayName}'s video...`);

          // Client Header Label
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.fillRect(16, 54, 1248, 32);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 13px sans-serif';
          ctx.fillText(`👤 Client: ${clientDisplayName}`, 28, 75);

          ctx.fillStyle = '#94a3b8';
          ctx.font = 'italic 11px sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText('🛡️ Compliance Officer Camera: Disabled', 1250, 75);
          ctx.textAlign = 'left';

          ctx.strokeStyle = '#2563eb';
          ctx.lineWidth = 2;
          ctx.strokeRect(16, 54, 1248, 604);
        }

        // Bottom Footer Bar
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 666, 1280, 54);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px monospace';
        const geoText = geoData?.latitude ? `GPS: ${geoData.latitude.toFixed(4)}, ${geoData.longitude?.toFixed(4)}` : '';
        ctx.fillText(`SEBI V-CIP AUDIT | Timestamp: ${new Date().toLocaleString('en-IN')} | ${geoText} | Encrypted In-Person Verification`, 20, 698);

        compositeAnimIdRef.current = requestAnimationFrame(drawFrame);
      };

      drawFrame();

      // Capture composite stream at 25 FPS
      const canvasStream = canvas.captureStream(25);

      // Mix Audio from both parties
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          audioContextRef.current = audioCtx;
          const dest = audioCtx.createMediaStreamDestination();

          if (localStreamRef.current && localStreamRef.current.getAudioTracks().length > 0) {
            const localSource = audioCtx.createMediaStreamSource(localStreamRef.current);
            localSource.connect(dest);
          }

          if (remoteStreamRef.current && remoteStreamRef.current.getAudioTracks().length > 0) {
            const remoteSource = audioCtx.createMediaStreamSource(remoteStreamRef.current);
            remoteSource.connect(dest);
          }

          if (dest.stream.getAudioTracks().length > 0) {
            canvasStream.addTrack(dest.stream.getAudioTracks()[0]);
            console.log('🎙️ [Audio Mix] Combined Admin & Client audio channels.');
          }
        }
      } catch (audioErr) {
        console.warn('Audio mix warning:', audioErr);
        if (localStreamRef.current?.getAudioTracks()[0]) {
          canvasStream.addTrack(localStreamRef.current.getAudioTracks()[0]);
        }
      }

      // Pick supported mimeType
      let mimeType: string | undefined = undefined;
      const candidates = [
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4'
      ];
      for (const c of candidates) {
        if (MediaRecorder.isTypeSupported(c)) {
          mimeType = c;
          break;
        }
      }

      const recorderOptions: MediaRecorderOptions = {
        videoBitsPerSecond: 650000 // ~4.8MB per minute
      };
      if (mimeType) {
        recorderOptions.mimeType = mimeType;
      }

      const recorder = new MediaRecorder(canvasStream, recorderOptions);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
          console.log(`⏺️ [Composite Chunk] size=${event.data.size} bytes, total=${recordedChunksRef.current.length}`);
        }
      };

      recorder.onerror = (e) => {
        console.error('❌ [MediaRecorder Error]:', e);
      };

      recorder.onstop = () => {
        console.log('⏹️ [Composite Recorder Stopped]. Chunks in buffer:', recordedChunksRef.current.length);
        setIsRecording(false);
        if (compositeAnimIdRef.current) {
          cancelAnimationFrame(compositeAnimIdRef.current);
          compositeAnimIdRef.current = null;
        }
        if (audioContextRef.current) {
          try { audioContextRef.current.close(); } catch {}
          audioContextRef.current = null;
        }
        if (timerRef.current) clearInterval(timerRef.current);
      };

      recorder.start(1000); // 1-second chunks
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      console.log('🎬 [Dual-Party Video KYC Recording Active] Side-by-Side Client + Admin!');

      if (!timerRef.current) {
        timerRef.current = setInterval(() => {
          setRecordingSeconds(prev => prev + 1);
        }, 1000);
      }
    } catch (err) {
      console.error('❌ Failed to construct or start Composite MediaRecorder:', err);
    }
  };

  const stopMediaAndRecording = () => {
    if (compositeAnimIdRef.current) {
      cancelAnimationFrame(compositeAnimIdRef.current);
      compositeAnimIdRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch {}
      audioContextRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    if (timerRef.current) clearInterval(timerRef.current);

    // Stop local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
    }
  };

  // 5b. Cancel & Exit Room (Session remains active so parties can rejoin)
  const handleCancelAndExit = () => {
    stopMediaAndRecording();
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    router.push(isAdmin ? '/admin' : '/client');
  };

  // 6. Admin Ends & Submits Recording to Server Disk
  const handleAdminEndAndUpload = async () => {
    if (!isAdmin || uploading) return;

    if (!remoteConnected) {
      alert("Client is not currently connected in the verification room. You can only save and complete the session once the client has joined.");
      return;
    }

    try {
      setUploading(true);
      setSnapshotToast('⏳ Compressing & saving verification records to vault...');

      // Force flush any pending chunks from recorder
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.requestData();
        } catch (e) {
          console.warn('requestData error:', e);
        }
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          console.warn('recorder stop error:', e);
        }
      }
      if (timerRef.current) clearInterval(timerRef.current);

      // Wait 1.5 seconds for all ondataavailable chunks to be collected
      await new Promise(r => setTimeout(r, 1500));

      console.log(`📊 [Finish Call] Total chunks in buffer: ${recordedChunksRef.current.length}`);

      // If buffer is empty for any reason, create fallback recording from the current live video canvas
      let blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      if (blob.size === 0) {
        console.warn('⚠️ [Recording Warning] No video chunks captured! Generating fallback from camera stream...');
        const activeVideo = (remoteVideoRef.current && remoteVideoRef.current.videoWidth > 0 ? remoteVideoRef.current : localVideoRef.current);
        if (activeVideo && (activeVideo as any).captureStream) {
          try {
            const fallbackStream = (activeVideo as any).captureStream(15);
            const fallbackChunks: Blob[] = [];
            const tempRec = new MediaRecorder(fallbackStream);
            tempRec.ondataavailable = (e) => { if (e.data && e.data.size > 0) fallbackChunks.push(e.data); };
            tempRec.start();
            await new Promise(res => setTimeout(res, 800));
            tempRec.stop();
            await new Promise(res => setTimeout(res, 200));
            if (fallbackChunks.length > 0) {
              blob = new Blob(fallbackChunks, { type: 'video/webm' });
              console.log('✅ Fallback video generated, size:', blob.size);
            }
          } catch (e) {
            console.error('Fallback generation error:', e);
          }
        }
      }

      const formData = new FormData();
      formData.append('recording', blob, `${sessionId}_compressed.webm`);
      formData.append('durationSeconds', String(recordingSeconds || 1));
      if (geoData) {
        formData.append('geoData', JSON.stringify(geoData));
      }
      if (capturedPanSnapshot) {
        formData.append('panSnapshot', capturedPanSnapshot);
      }
      if (capturedFaceSnapshot) {
        formData.append('clientFaceSnapshot', capturedFaceSnapshot);
      }
      if (snapshotGallery && snapshotGallery.length > 0) {
        // Send up to 10 latest snapshots to prevent excessive payload
        const galleryToSend = snapshotGallery.slice(0, 10);
        formData.append('snapshots', JSON.stringify(galleryToSend));
      }

      console.log(`📤 [Video KYC] Uploading: chunks=${recordedChunksRef.current.length}, blobSize=${blob.size} bytes, snaps=${snapshotGallery.length}`);
      const res = await api.uploadVideoKycRecording(sessionId, formData);
      if (res?.success) {
        // Inform other participants that session successfully concluded
        if (socketRef.current) {
          socketRef.current.emit('end-session', { sessionId });
        }
        setUploadSuccess(true);
        setSessionCompleted(true);
        stopMediaAndRecording();
      } else {
        const errorMsg = res?.message || 'Failed to upload recording to server.';
        console.error('Upload error:', errorMsg);
        setSnapshotToast(`❌ ${errorMsg}`);
        alert(errorMsg);
      }
    } catch (err: any) {
      console.error('Upload failed:', err);
      const errMsg = err?.message || 'Network error occurred during recording upload.';
      setSnapshotToast(`❌ ${errMsg}`);
      alert(errMsg);
    } finally {
      setUploading(false);
    }
  };

  // 7. Admin Toggle Mic / Cam Controls
  const toggleAdminMic = () => {
    if (!isAdmin || !localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setAdminMicMuted(!audioTrack.enabled);
    }
  };

  const toggleAdminCam = () => {
    if (!isAdmin || !localStreamRef.current) return;
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setAdminCamDisabled(!videoTrack.enabled);
    }
  };

  // 8. Admin Instruction Sender
  const sendInstruction = (text: string) => {
    if (!isAdmin || !socketRef.current) return;
    socketRef.current.emit('admin-instruction', {
      sessionId,
      instruction: text
    });
    setAdminInstruction(text);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMediaAndRecording();
      if (socketRef.current) socketRef.current.disconnect();
      if (peerConnectionRef.current) peerConnectionRef.current.close();
    };
  }, []);

  // Format Timer
  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ---------------------------------------------------------------------------
  // RENDER: Loading or Error
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold">Connecting to Video KYC Room...</h2>
        <p className="text-sm text-slate-400 mt-2">Loading session data & SEBI compliance parameters</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6">
        <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-2xl p-6 text-center shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-100 mb-2">Video KYC Unavailable</h2>
          <p className="text-sm text-slate-400 mb-6">{errorMsg}</p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-xl text-sm transition"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: Session Completed Screen
  // ---------------------------------------------------------------------------
  if (sessionCompleted || sessionData?.status === 'COMPLETED' || sessionData?.status === 'APPROVED') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6">
        <div className="max-w-lg w-full bg-slate-900 border border-emerald-500/30 rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-100 mb-2">Video KYC Session Completed</h2>
          <p className="text-sm text-slate-400 mb-6">
            The video verification recording has been securely compressed and stored on the server disk for SEBI compliance auditing.
          </p>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-left mb-6 text-xs text-slate-300 space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Session ID:</span>
              <span className="font-mono font-medium text-slate-200">{sessionId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Duration:</span>
              <span className="font-semibold text-emerald-400">{formatTimer(recordingSeconds || sessionData?.durationSeconds || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Compliance Status:</span>
              <span className="font-bold text-emerald-400">{sessionData?.status || 'SUBMITTED FOR REVIEW'}</span>
            </div>
            {geoData?.latitude && (
              <div className="flex justify-between">
                <span className="text-slate-500">Geo-Coordinates:</span>
                <span className="font-mono text-slate-300">{geoData.latitude.toFixed(4)}, {geoData.longitude?.toFixed(4)}</span>
              </div>
            )}
          </div>

          <button
            onClick={() => router.push(isAdmin ? '/admin' : '/client')}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-sm transition shadow-lg shadow-emerald-600/20"
          >
            Go to {isAdmin ? 'Admin Compliance Desk' : 'Client Portal'}
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: Scheduled Appointment Waiting Screen (if appointment is in future)
  // ---------------------------------------------------------------------------
  const isScheduledSession = sessionData?.scheduleType === 'SCHEDULED' && sessionData?.scheduledAt;
  const scheduledTimeMs = isScheduledSession ? new Date(sessionData.scheduledAt).getTime() : 0;
  // Allow joining up to 5 minutes before scheduled appointment or if officer unlocked early
  const isTooEarly = isScheduledSession && !officerUnlockedEarly && sessionData.status === 'SCHEDULED' && (scheduledTimeMs - nowTime > 5 * 60 * 1000);

  if (isTooEarly) {
    const diffSecs = Math.max(0, Math.floor((scheduledTimeMs - nowTime) / 1000));
    const cdHours = Math.floor(diffSecs / 3600);
    const cdMins = Math.floor((diffSecs % 3600) / 60);
    const cdSecs = diffSecs % 60;
    const countdownFormatted = `${cdHours.toString().padStart(2, '0')}h : ${cdMins.toString().padStart(2, '0')}m : ${cdSecs.toString().padStart(2, '0')}s`;

    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6">
        <div className="max-w-xl w-full bg-slate-900 border border-indigo-500/30 rounded-2xl p-8 shadow-2xl text-center space-y-6 animate-in fade-in">
          <div className="w-16 h-16 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto">
            <Calendar className="w-8 h-8" />
          </div>

          <div>
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/30">
              Scheduled SEBI Verification
            </span>
            <h2 className="text-2xl font-bold text-slate-100 mt-3">Video KYC Appointment Confirmed</h2>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              This session has been scheduled in advance. The live verification room will activate automatically at your designated slot.
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="text-xs text-slate-400">Appointment Scheduled For:</div>
            <div className="text-lg font-bold text-slate-100 font-mono">
              {new Date(sessionData.scheduledAt).toLocaleString('en-IN', {
                dateStyle: 'full',
                timeStyle: 'short',
                timeZone: 'Asia/Kolkata'
              })}
            </div>
            
            <div className="pt-3 border-t border-slate-800/80">
              <div className="text-[11px] text-slate-400 mb-1">Room Activates In:</div>
              <div className="text-2xl font-black font-mono text-emerald-400 tracking-wider">
                {countdownFormatted}
              </div>
            </div>
          </div>

          {isAdmin ? (
            <div className="space-y-3 pt-2">
              <button
                onClick={async () => {
                  try {
                    await api.startEarlyVideoKycSession(sessionId);
                    setOfficerUnlockedEarly(true);
                  } catch {
                    setOfficerUnlockedEarly(true);
                  }
                }}
                className="w-full py-3.5 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2"
              >
                🚀 Start Session Early (Officer Override)
              </button>
              <p className="text-[11px] text-slate-400">
                As Compliance Officer, you can unlock the room early if the client is already available.
              </p>
            </div>
          ) : (
            <div className="p-4 bg-blue-950/20 border border-blue-500/20 rounded-xl text-xs text-blue-300 text-left space-y-2">
              <div className="font-semibold flex items-center gap-2 text-blue-200">
                <ShieldCheck className="w-4 h-4" /> Before Your Appointment:
              </div>
              <ul className="list-disc list-inside text-slate-400 space-y-1">
                <li>Please keep your original physical PAN card handy.</li>
                <li>Ensure you are in a quiet, well-lit environment.</li>
                <li>Stay on this page or re-open the link from your email at the scheduled time.</li>
              </ul>
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={() => router.push(isAdmin ? '/admin' : '/client')}
              className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: Client 2-Factor Email OTP Verification Screen
  // ---------------------------------------------------------------------------
  if (!isAdmin && !isOtpVerified) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6 animate-in fade-in">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
              <KeyRound className="w-7 h-7" />
            </div>
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
              SEBI Regulatory 2FA
            </span>
            <h2 className="text-xl font-bold text-slate-100">Enter Verification OTP</h2>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              To securely connect your Video KYC session, please enter the 4-digit verification code sent to your registered email.
            </p>
          </div>

          {/* Email Callout */}
          <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl text-center space-y-1">
            <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-blue-400" /> OTP sent to registered email:
            </div>
            <div className="text-sm font-semibold text-emerald-400 font-mono tracking-wide">
              {maskedEmail || 'your registered email'}
            </div>
          </div>

          {/* Client Details Preview */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-slate-950/50 border border-slate-800/80 rounded-lg">
              <span className="text-[10px] text-slate-400 block">Client Name</span>
              <span className="font-semibold text-slate-200 truncate block">
                {sessionData?.clientId?.name || 'Verified Client'}
              </span>
            </div>
            <div className="p-2.5 bg-slate-950/50 border border-slate-800/80 rounded-lg">
              <span className="text-[10px] text-slate-400 block">Registered PAN</span>
              <span className="font-mono font-bold text-blue-400 block">
                {sessionData?.clientId?.pan || 'N/A'}
              </span>
            </div>
          </div>

          {/* Error / Success Alerts */}
          {otpError && (
            <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-center gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{otpError}</span>
            </div>
          )}

          {otpSuccessMsg && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{otpSuccessMsg}</span>
            </div>
          )}

          {/* OTP Input Form */}
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-2 text-center">
                Enter 4-Digit Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                autoFocus
                value={otpInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setOtpInput(val);
                  setOtpError(null);
                  if (val.length === 4) {
                    setTimeout(() => {
                      api.verifyVideoKycOtp(sessionId, val).then((res: any) => {
                        if (res?.success) {
                          setIsOtpVerified(true);
                          if (typeof window !== 'undefined') {
                            sessionStorage.setItem(`vkyc_otp_verified_${sessionId}`, 'true');
                          }
                        } else {
                          setOtpError(res?.message || 'Invalid OTP code.');
                        }
                      }).catch((err: any) => {
                        setOtpError(err?.message || 'Verification failed.');
                      });
                    }, 100);
                  }
                }}
                placeholder="• • • •"
                className="w-full text-center tracking-[0.8em] font-mono font-black text-2xl py-3.5 px-4 bg-slate-950 border-2 border-slate-700 focus:border-blue-500 rounded-xl text-white outline-none transition placeholder:text-slate-600 shadow-inner"
              />
            </div>

            <button
              type="submit"
              disabled={verifyingOtp || otpInput.length < 4}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {verifyingOtp ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Verifying OTP...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" /> Verify & Continue
                </>
              )}
            </button>
          </form>

          {/* Resend OTP */}
          <div className="pt-2 text-center border-t border-slate-800/80">
            <button
              type="button"
              disabled={resendCooldown > 0 || resendingOtp}
              onClick={handleResendOtp}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium transition disabled:text-slate-500 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 mx-auto"
            >
              {resendingOtp ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Sending fresh code...
                </>
              ) : resendCooldown > 0 ? (
                <>Resend code in {resendCooldown}s</>
              ) : (
                <>Didn&apos;t receive code? Resend OTP to Email</>
              )}
            </button>
          </div>

          {/* Regulatory Footer */}
          <p className="text-[10px] text-slate-500 text-center leading-normal">
            SEBI V-CIP (Video Based Customer Identification Process) mandates two-factor verification to authenticate identity before live video streaming.
          </p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: Pre-Call Permission & Readiness Screen
  // ---------------------------------------------------------------------------
  if (!hasPermission) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6">
        <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-600/10 text-blue-400 rounded-xl flex items-center justify-center">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100">Live Video KYC & IPV Verification</h2>
              <p className="text-xs text-slate-400">SEBI Digital In-Person Verification (V-CIP) Session</p>
            </div>
          </div>

          {permissionError && (
            <div className="mb-6 p-4 bg-red-950/40 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>{permissionError}</div>
            </div>
          )}

          <div className="space-y-4 mb-6">
            <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-300">Client:</span>
              </div>
              <span className="text-xs font-semibold text-slate-100">
                {sessionData?.clientId?.name || 'Verified Client'}
              </span>
            </div>

            <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCard className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-300">Registered PAN:</span>
              </div>
              <span className="text-xs font-mono font-bold text-blue-400">
                {sessionData?.clientId?.pan || 'N/A'}
              </span>
            </div>

            <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Lock className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-slate-300">2-Factor Authentication:</span>
              </div>
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 font-mono">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                {isAdmin ? (sessionData?.otpCode ? `OTP Code: ${sessionData.otpCode}` : 'Officer Access') : 'Email OTP Verified'}
              </span>
            </div>
          </div>

          <div className="bg-blue-950/30 border border-blue-500/20 rounded-xl p-4 mb-6 text-xs text-blue-300 space-y-2">
            <div className="font-semibold flex items-center gap-2 text-blue-200">
              <ShieldCheck className="w-4 h-4" /> SEBI Compliance Instructions:
            </div>
            <ul className="list-disc list-inside text-slate-400 space-y-1">
              <li>Keep your original PAN card handy to display on camera.</li>
              <li>Read the on-screen consent statement aloud clearly when requested.</li>
              <li>Your audio, video, and geolocation are recorded for audit compliance.</li>
              <li>Clients cannot close the session prematurely; only the Compliance Officer approves.</li>
            </ul>
          </div>

          <button
            onClick={initializeMediaAndGeo}
            className="w-full py-3.5 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
          >
            <Camera className="w-5 h-5" /> Allow Camera & Start Video KYC
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: Live Two-Way Video KYC Call Room
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Header Bar */}
      <header className="h-16 border-b border-slate-800/80 px-6 flex items-center justify-between bg-slate-900/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
            <Radio className="w-5 h-5 animate-pulse text-red-500" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              SEBI Video KYC & IPV Room
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {isAdmin ? 'ADMIN / COMPLIANCE' : 'CLIENT CALL'}
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">
              Session: <span className="font-mono text-slate-300">{sessionId}</span>
            </p>
          </div>
        </div>

        {/* Live Status Indicators */}
        <div className="flex items-center gap-4 text-xs">
          {geoData?.latitude && (
            <div className="hidden sm:flex items-center gap-1.5 text-slate-400 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/60">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>{geoData.latitude.toFixed(2)}, {geoData.longitude?.toFixed(2)}</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono font-bold text-amber-300">{formatTimer(recordingSeconds)}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${remoteConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-xs text-slate-300 font-medium">
              {remoteConnected ? `${remoteUserName} Online` : 'Waiting for other party...'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Video Viewport & Consent Overlay */}
      <div className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-4 gap-4 max-w-7xl mx-auto w-full">
        {/* Left 3 Cols: Video Feeds */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="relative flex-1 min-h-[420px] bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center">
            {/* Primary Feed: Remote User */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              onLoadedMetadata={(e) => {
                const v = e.currentTarget;
                console.log('📹 [Remote Video] Metadata loaded:', v.videoWidth, 'x', v.videoHeight);
                v.play().catch(() => {});
              }}
              onCanPlay={(e) => {
                e.currentTarget.play().catch(() => {});
              }}
              className="w-full h-full object-cover"
            />

            {/* Live Recording Indicator Badge */}
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
              {isRecording ? (
                <div className="bg-red-600/90 text-white text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg backdrop-blur border border-red-400/40">
                  <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                  <span>REC {formatTimer(recordingSeconds)}</span>
                </div>
              ) : (
                <div className="bg-amber-600/90 text-white text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg backdrop-blur border border-amber-400/40">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  <span>STANDBY</span>
                </div>
              )}
            </div>

            {!remoteConnected && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 text-center p-6">
                <RefreshCw className="w-10 h-10 text-blue-500 animate-spin mb-3" />
                <h3 className="text-base font-semibold text-slate-200">
                  {isAdmin ? 'Waiting for Client to connect...' : 'Waiting for Compliance Officer to join...'}
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Both parties must be in the room to conduct the live 2-way verification.
                </p>
              </div>
            )}

            {/* Picture-in-Picture: Local User Feed */}
            <div className="absolute bottom-4 right-4 w-44 sm:w-56 h-32 sm:h-40 bg-slate-950 rounded-xl overflow-hidden border-2 border-slate-700 shadow-2xl z-10">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                onLoadedMetadata={(e) => {
                  e.currentTarget.play().catch(() => {});
                }}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[10px] text-slate-200 font-medium">
                You ({isAdmin ? 'Admin' : 'Client'})
              </div>
              {!isAdmin && (
                <div className="absolute bottom-2 right-2 bg-emerald-600/80 px-1.5 py-0.5 rounded text-[9px] text-white flex items-center gap-1 font-bold">
                  <Lock className="w-2.5 h-2.5" /> LOCKED ON
                </div>
              )}
            </div>

            {/* Instruction Floating Banner */}
            {adminInstruction && (
              <div className="absolute top-4 left-4 right-4 bg-indigo-600/90 backdrop-blur-md border border-indigo-400 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-3 animate-bounce">
                <Sparkles className="w-5 h-5 text-amber-300 shrink-0" />
                <div className="text-xs font-semibold">
                  Officer Instruction: <span className="font-bold underline">{adminInstruction}</span>
                </div>
              </div>
            )}
          </div>

          {/* Consent Statement Card (Prominent & Mandatory for Client to Read) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                <FileText className="w-4 h-4" /> SEBI REGULATORY CONSENT STATEMENT
              </div>
              <span className="text-[11px] px-2 py-0.5 bg-amber-500/10 text-amber-300 rounded-full border border-amber-500/30">
                Please Read Aloud On Camera
              </span>
            </div>
            <div className="p-3.5 bg-amber-950/20 border border-amber-500/20 rounded-xl text-sm text-slate-200 leading-relaxed font-medium">
              "{sessionData?.consentText}"
            </div>
          </div>
        </div>

        {/* Right 1 Col: Control Panel & Verification Toolbar */}
        <div className="flex flex-col gap-4">
          {/* Client Details & Security Code */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-400" /> Participant Details
            </h3>

            <div className="text-xs space-y-2 pt-1 border-t border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-400">Client Name:</span>
                <span className="font-semibold text-slate-100">{sessionData?.clientId?.name || 'Client'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Client PAN:</span>
                <span className="font-mono font-bold text-blue-400">{sessionData?.clientId?.pan || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Verification OTP:</span>
                <span className="font-mono font-black text-emerald-400 text-sm tracking-wider">
                  {sessionData?.otpCode}
                </span>
              </div>
            </div>
          </div>

          {/* ADMIN ONLY CONTROLS */}
          {isAdmin ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                  Compliance Officer Tools
                </h3>

                {/* Officer Mic & Video Toggles */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={toggleAdminMic}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      adminMicMuted ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    {adminMicMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    {adminMicMuted ? 'Unmute' : 'Mute Mic'}
                  </button>

                  <button
                    onClick={toggleAdminCam}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      adminCamDisabled ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    {adminCamDisabled ? <CameraOff className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
                    {adminCamDisabled ? 'Enable Cam' : 'Stop Cam'}
                  </button>
                </div>

                {/* Instant Officer Commands */}
                <div className="space-y-2">
                  <span className="text-[11px] text-slate-400 font-medium">Quick Prompts to Client:</span>
                  <div className="grid grid-cols-1 gap-1.5">
                    <button
                      onClick={() => sendInstruction('Please hold the FRONT of your original PAN card clearly to the camera.')}
                      className="py-1.5 px-3 bg-slate-800/80 hover:bg-slate-700/80 text-left rounded-lg text-xs text-slate-200 transition"
                    >
                      🪪 Show PAN (Front)
                    </button>
                    <button
                      onClick={() => sendInstruction('Please hold the BACK of your original PAN card clearly to the camera.')}
                      className="py-1.5 px-3 bg-slate-800/80 hover:bg-slate-700/80 text-left rounded-lg text-xs text-slate-200 transition"
                    >
                      🔄 Show PAN (Back)
                    </button>
                    <button
                      onClick={() => sendInstruction('Please read the Consent Statement shown on your screen aloud.')}
                      className="py-1.5 px-3 bg-slate-800/80 hover:bg-slate-700/80 text-left rounded-lg text-xs text-slate-200 transition"
                    >
                      🗣️ Read Consent Statement
                    </button>
                  </div>
                </div>

                {/* Capture Snapshots */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium">Evidence Snapshots:</span>
                    <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-bold">
                      {snapshotGallery.length} Taken
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => captureAndSendSnapshot('PAN')}
                      className="py-2 px-2.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition"
                    >
                      <Camera className="w-3.5 h-3.5" /> Snap PAN
                    </button>
                    <button
                      onClick={() => captureAndSendSnapshot('FACE')}
                      className="py-2 px-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition"
                    >
                      <User className="w-3.5 h-3.5" /> Snap Face
                    </button>
                  </div>

                  {/* Multiple Snapshots Gallery */}
                  {snapshotGallery.length > 0 && (
                    <div className="pt-2">
                      <div className="text-[10px] text-slate-400 mb-1 flex justify-between">
                        <span>Captured Gallery ({snapshotGallery.length}):</span>
                        <span className="text-[9px] text-emerald-400 font-medium">Auto-saving to Vault</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-950/80 rounded-lg border border-slate-800">
                        {snapshotGallery.map((snap, idx) => (
                          <div key={idx} className="relative group rounded overflow-hidden border border-slate-800 bg-black aspect-video flex items-center justify-center">
                            <img src={snap.base64} alt={snap.label} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex flex-col justify-end p-1 text-[8px] text-white">
                              <span className="font-bold truncate">{snap.type}</span>
                              <span className="text-slate-400 text-[7px]">{snap.time}</span>
                            </div>
                            <span className="absolute top-0.5 right-0.5 bg-slate-900/90 text-[8px] px-1 rounded font-bold text-slate-300">
                              #{snapshotGallery.length - idx}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Automated Recording Status Indicator */}
                <div className="pt-2">
                  {isRecording ? (
                    <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-xl flex items-center justify-between text-xs text-red-300 shadow-inner">
                      <span className="flex items-center gap-2 font-bold">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                        Auto-Recording Live ({formatTimer(recordingSeconds)})
                      </span>
                      <span className="text-[10px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full border border-red-500/30 uppercase tracking-wider font-mono">
                        SEBI AUDIT
                      </span>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center gap-2.5 text-xs text-slate-400">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                      <span>Recording Standby: Auto-starts when client connects</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons: Cancel vs Finish & Save */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                {remoteConnected ? (
                  /* CLIENT IS CONNECTED -> Show Finish & Save Recording + Secondary Cancel */
                  <>
                    <button
                      onClick={handleAdminEndAndUpload}
                      disabled={uploading}
                      className="w-full py-3.5 px-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {uploading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" /> Compressing & Saving...
                        </>
                      ) : (
                        <>
                          <StopCircle className="w-4 h-4" /> Finish Call & Save Recording
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={uploading}
                      onClick={handleCancelAndExit}
                      className="w-full py-2 px-3 bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl text-[11px] font-medium transition flex items-center justify-center gap-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Exit Session (Without Saving)
                    </button>
                  </>
                ) : (
                  /* CLIENT NOT CONNECTED YET -> Show ONLY Cancel & Exit Room (Can Rejoin Later) */
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleCancelAndExit}
                      className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold rounded-xl text-xs transition border border-slate-700 flex items-center justify-center gap-2 shadow-sm"
                    >
                      <XCircle className="w-4 h-4 text-slate-400" /> Cancel & Exit Room
                    </button>
                    <p className="text-[10px] text-slate-500 text-center leading-relaxed">
                      Session remains active. You and the client can rejoin anytime.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* CLIENT VIEW (Controls Locked) */
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <Lock className="w-4 h-4" /> Client Controls Locked
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  As per SEBI guidelines, your microphone and camera cannot be turned off during the video KYC session.
                </p>
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-300 space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                    <CheckCircle className="w-3.5 h-3.5" /> Camera Active
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                    <CheckCircle className="w-3.5 h-3.5" /> Audio Stream Active
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                    <CheckCircle className="w-3.5 h-3.5" /> Geotagging & IP Tracking Active
                  </div>
                </div>
              </div>

              <div className="p-3 bg-blue-950/30 border border-blue-500/20 rounded-xl text-[11px] text-blue-300 text-center">
                The compliance officer will conclude this session once your verification is complete.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
