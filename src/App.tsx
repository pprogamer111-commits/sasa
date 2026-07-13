import { useState, useEffect, useRef } from 'react';
import { User, Message, SignalData } from './types';
import { GlowBackground } from './components/GlowBackground';
import { RegisterForm } from './components/RegisterForm';
import { ProfileSettings } from './components/ProfileSettings';
import { ChatPanel } from './components/ChatPanel';
import { VideoCallPanel } from './components/VideoCallPanel';
import { ThreeDCard } from './components/ThreeDCard';
import { audioEffects } from './utils/audio';
import {
  supabase,
  isSupabaseConfigured,
  mapProfileToUser,
  mapMessageToType,
  ensureProfileExists,
  updateUserStatus
} from './lib/supabase';

import { createMockStream, getRobustUserMedia } from './utils/mediaSimulator';
import { VoiceEffectType, applyVoiceEffect, cleanupVoiceChanger } from './utils/voiceChanger';
import { 
  Users, 
  MessageSquare, 
  Tv, 
  Settings, 
  Power, 
  Sparkles, 
  Radio, 
  ShieldCheck, 
  PhoneCall, 
  Search, 
  Menu, 
  X,
  Volume2
} from 'lucide-react';

export default function App() {
  // Authentication & Directory State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedContact, setSelectedContact] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Supabase Dynamic Health & Fallback State
  const [useSupabase, setUseSupabase] = useState(false);
  const [isSupabaseChecking, setIsSupabaseChecking] = useState(isSupabaseConfigured);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);
  
  // UI states
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // For mobile responsiveness
  const [typingStates, setTypingStates] = useState<Record<string, boolean>>({});

  // WebRTC & Call State
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [activeCallContact, setActiveCallContact] = useState<User | null>(null);

  // Voice & Visual effects states
  const [voiceEffect, setVoiceEffect] = useState<VoiceEffectType>('normal');
  const [visualEffect, setVisualEffect] = useState<string>('normal');
  const rawLocalStreamRef = useRef<MediaStream | null>(null);
  
  // Ringing State (Receiving incoming P2P call)
  const [incomingCall, setIncomingCall] = useState<{
    fromUserId: string;
    signal: SignalData;
  } | null>(null);

  // References for WebRTC
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const sseSourceRef = useRef<EventSource | null>(null);

  // RTC Configuration - standard public Google STUN server for ice candidates
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  // --- SUPABASE HEALTH AND ACCESSIBILITY CHECK ---
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setIsSupabaseChecking(false);
      setUseSupabase(false);
      return;
    }

    // Force-enable Supabase as we have valid credentials configured
    setUseSupabase(true);

    const checkSupabaseHealth = async () => {
      try {
        // Run a gentle check to verify if the tables are set up correctly
        const { error } = await supabase.from('profiles').select('id').limit(1);
        if (error) {
          throw new Error(`Profiles table query returned an error: ${error.message}`);
        }
        console.log('Supabase Cloud connection established & schema verified.');
        setSupabaseError(null);
      } catch (err: any) {
        console.warn('Supabase database status check warning:', err);
        setSupabaseError(err.message || 'Connection check timeout');
      } finally {
        setIsSupabaseChecking(false);
      }
    };

    checkSupabaseHealth();
  }, []);

  // --- PERSIST AUTHENTICATION ---
  useEffect(() => {
    if (isSupabaseChecking) return;

    if (useSupabase && supabase) {
      // 1. Check existing session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          const userId = session.user.id;
          supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single()
            .then(({ data: profile }) => {
              if (profile) {
                setCurrentUser(mapProfileToUser(profile));
                fetchUsers();
              }
            });
        }
      });

      // 2. Listen to changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          const userId = session.user.id;
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
          if (profile) {
            setCurrentUser(mapProfileToUser(profile));
            fetchUsers();
          }
        } else {
          setCurrentUser(null);
          setSelectedContact(null);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    } else {
      // Fallback: Local Storage
      const savedUser = localStorage.getItem('luminal_user');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser) as User;
          setCurrentUser(parsed);
          fetchUsers();
        } catch (err) {
          localStorage.removeItem('luminal_user');
        }
      }
    }
  }, [isSupabaseChecking, useSupabase]);

  // Sync messaging when a contact is chosen
  useEffect(() => {
    if (currentUser && selectedContact) {
      fetchMessages(currentUser.id, selectedContact.id);
    }
  }, [selectedContact, currentUser]);

  // Synchronize Voice Changer FX Dynamically
  useEffect(() => {
    if (!rawLocalStreamRef.current) return;
    
    console.log('Voice effect changing to:', voiceEffect);
    const processed = applyVoiceEffect(rawLocalStreamRef.current, voiceEffect);
    setLocalStream(processed);

    // Dynamic track replacement for WebRTC PeerConnection
    if (peerConnectionRef.current) {
      try {
        const audioTrack = processed.getAudioTracks()[0];
        if (audioTrack) {
          const senders = peerConnectionRef.current.getSenders();
          const audioSender = senders.find(s => s.track && s.track.kind === 'audio');
          if (audioSender) {
            audioSender.replaceTrack(audioTrack)
              .then(() => console.log('Successfully swapped WebRTC sender track to voice effect:', voiceEffect))
              .catch(e => console.warn('Failed to swap WebRTC track:', e));
          }
        }
      } catch (err) {
        console.warn('WebRTC track swapping not supported in current handshake status:', err);
      }
    }
  }, [voiceEffect]);

  // Fetch all users on mount/update
  const fetchUsers = async () => {
    if (useSupabase && supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('username', { ascending: true });
        if (error) throw error;
        if (data) {
          setUsers(data.map(mapProfileToUser));
        }
      } catch (err) {
        console.error('Failed to query user directory from Supabase:', err);
      }
      return;
    }

    // Fallback Local API
    if (import.meta.env.PROD) {
      console.warn('Local API directory lookup bypassed in production build.');
      return;
    }
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error('Failed to query user directory:', err);
    }
  };

  // Fetch Message History
  const fetchMessages = async (userId: string, contactId: string) => {
    if (useSupabase && supabase) {
      try {
        let query = supabase.from('messages').select('*');
        if (contactId === 'all') {
          query = query.eq('recipient_id', 'all');
        } else {
          query = query.or(`and(sender_id.eq.${userId},recipient_id.eq.${contactId}),and(sender_id.eq.${contactId},recipient_id.eq.${userId})`);
        }
        const { data, error } = await query.order('timestamp', { ascending: true });
        if (error) throw error;
        if (data) {
          setMessages(data.map(mapMessageToType));
        }
      } catch (err) {
        console.error('Failed to sync history from Supabase:', err);
      }
      return;
    }

    // Fallback Local API
    if (import.meta.env.PROD) {
      console.warn('Local API messages sync bypassed in production build.');
      return;
    }
    try {
      const res = await fetch(`/api/messages?userId=${userId}&contactId=${contactId}`);
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error('Failed to sync history:', err);
    }
  };

  // --- REAL-TIME EVENT ENGINE (SUPABASE OR SSE FALLBACK) ---
  useEffect(() => {
    if (!currentUser) return;

    if (useSupabase && supabase) {
      // 1. Live profile status/directory updates
      const profilesChannel = supabase
        .channel('profiles_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
          const updatedProfile = payload.new as any;
          if (!updatedProfile) return;
          const mapped = mapProfileToUser(updatedProfile);
          
          setUsers((prev) => {
            if (!prev.some((u) => u.id === mapped.id)) {
              return [...prev, mapped];
            }
            return prev.map((u) => (u.id === mapped.id ? mapped : u));
          });

          setSelectedContact((prev) => {
            if (prev && prev.id === mapped.id) {
              return mapped;
            }
            return prev;
          });
        })
        .subscribe();

      // 2. Live messaging channel
      const messagesChannel = supabase
        .channel('messages_changes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          const newMsg = mapMessageToType(payload.new);
          
          if (
            newMsg.recipientId === 'all' || 
            newMsg.senderId === currentUser.id || 
            newMsg.recipientId === currentUser.id
          ) {
            if (newMsg.senderId !== currentUser.id) {
              audioEffects.playMessageReceived();
            }

            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          }
        })
        .subscribe();

      // 3. WebRTC signaling channel via Broadcast
      const signalingChannel = supabase.channel('signaling_channel');
      signalingChannel
        .on('broadcast', { event: 'signal' }, async ({ payload }) => {
          if (payload.to !== currentUser.id) return;
          const signal = payload.signal as SignalData;

          if (signal.type === 'offer') {
            audioEffects.startIncomingRing();
            setIncomingCall({ fromUserId: payload.from, signal });
          } else if (signal.type === 'answer') {
            audioEffects.stopAllRinging();
            audioEffects.playCallConnected();
            if (peerConnectionRef.current) {
              await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signal.sdp));
            }
          } else if (signal.type === 'ice-candidate') {
            if (peerConnectionRef.current && signal.candidate) {
              try {
                await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(signal.candidate));
              } catch (e) {
                console.error('Error adding received ICE candidate', e);
              }
            }
          } else if (signal.type === 'hangup') {
            handleCleanCallState();
          }
        })
        .subscribe();

      // Update presence to online
      updateUserStatus(currentUser.id, 'online');

      // Beforeunload event to mark offline on tab close
      const handleBeforeUnload = () => {
        updateUserStatus(currentUser.id, 'offline');
      };
      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        profilesChannel.unsubscribe();
        messagesChannel.unsubscribe();
        signalingChannel.unsubscribe();
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    } else {
      // Fallback: Local Server-Sent Events (SSE)
      if (import.meta.env.PROD) {
        console.warn('Local SSE EventSource subscription bypassed in production build.');
        return;
      }
      const source = new EventSource(`/api/events?userId=${currentUser.id}`);
      sseSourceRef.current = source;

      source.addEventListener('message', (event) => {
        const data = JSON.parse(event.data) as Message;
        if (data.senderId !== currentUser.id) {
          audioEffects.playMessageReceived();
        }
        setMessages((prev) => {
          if (prev.some(m => m.id === data.id)) return prev;
          return [...prev, data];
        });
      });

      source.addEventListener('typing', (event) => {
        const data = JSON.parse(event.data);
        setTypingStates((prev) => ({
          ...prev,
          [data.contactId]: data.typing
        }));
      });

      source.addEventListener('user_status', (event) => {
        const data = JSON.parse(event.data);
        setUsers((prev) =>
          prev.map((u) => (u.id === data.userId ? { ...u, status: data.status } : u))
        );
        setSelectedContact((prev) => {
          if (prev && prev.id === data.userId) {
            return { ...prev, status: data.status };
          }
          return prev;
        });
      });

      source.addEventListener('user_joined', (event) => {
        const data = JSON.parse(event.data) as User;
        setUsers((prev) => {
          if (prev.some(u => u.id === data.id)) return prev;
          return [...prev, data];
        });
      });

      source.addEventListener('user_updated', (event) => {
        const data = JSON.parse(event.data) as User;
        setUsers((prev) => prev.map((u) => (u.id === data.id ? data : u)));
        setSelectedContact((prev) => {
          if (prev && prev.id === data.id) {
            return data;
          }
          return prev;
        });
      });

      source.addEventListener('call_signal', async (event) => {
        const data = JSON.parse(event.data);
        const signal = data.signal as SignalData;

        if (signal.type === 'offer') {
          audioEffects.startIncomingRing();
          setIncomingCall({ fromUserId: data.from, signal });
        } else if (signal.type === 'answer') {
          audioEffects.stopAllRinging();
          audioEffects.playCallConnected();
          if (peerConnectionRef.current) {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          }
        } else if (signal.type === 'ice-candidate') {
          if (peerConnectionRef.current && signal.candidate) {
            try {
              await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(signal.candidate));
            } catch (e) {
              console.error('Error adding received ICE candidate', e);
            }
          }
        } else if (signal.type === 'hangup') {
          handleCleanCallState();
        }
      });

      source.onerror = (e) => {
        console.warn('SSE Disconnected. Attempting auto reconnection...', e);
      };

      return () => {
        source.close();
      };
    }
  }, [currentUser]);

  // --- ACTIONS ---

  // User Authentication (Login or Register with password)
  const handleAuth = async (
    username: string, 
    password: string, 
    action: 'login' | 'register', 
    name?: string, 
    bio?: string, 
    avatarSeed?: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsAuthLoading(true);
    try {
      if (useSupabase && supabase) {
        const email = `${username.toLowerCase().trim()}@luminal.mesh`;
        
        if (action === 'register') {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                username: username.toLowerCase().trim(),
                name: name || username,
                avatar_seed: avatarSeed || `avatar-${Math.floor(Math.random() * 1000)}`,
                bio: bio || 'Explorer of the glowing grid.'
              }
            }
          });
          
          if (error) throw error;
          if (data.user) {
            const userModel = await ensureProfileExists(
              data.user.id,
              username,
              name || username,
              avatarSeed || `avatar-${Math.floor(Math.random() * 1000)}`,
              bio || 'Explorer of the glowing grid.'
            );
            setCurrentUser(userModel);
            await fetchUsers();
            return { success: true };
          }
        } else {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
          });
          if (error) throw error;
          if (data.user) {
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
            if (profile) {
              setCurrentUser(mapProfileToUser(profile));
              await updateUserStatus(data.user.id, 'online');
              await fetchUsers();
            }
            return { success: true };
          }
        }
        return { success: false, error: 'Handshake incomplete' };
      }

      // Fallback: Local API
      if (import.meta.env.PROD) {
        throw new Error('Local API authentication is unavailable in production. Please check your Supabase credentials.');
      }
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, action, name, bio, avatarSeed })
      });
      const data = await res.json();
      if (res.ok && data.user) {
        localStorage.setItem('luminal_user', JSON.stringify(data.user));
        setCurrentUser(data.user);
        await fetchUsers();
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Authentication handshake failed' };
      }
    } catch (err: any) {
      console.error('Authentication link failure:', err);
      return { success: false, error: err.message || 'Network linkage disruption' };
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Update profile
  const handleUpdateProfile = async (name: string, bio: string, avatarSeed: string) => {
    if (!currentUser) return;
    
    if (useSupabase && supabase) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({
            name,
            bio,
            avatar_seed: avatarSeed
          })
          .eq('id', currentUser.id);
          
        if (error) throw error;
        
        setCurrentUser((prev) => {
          if (!prev) return null;
          return { ...prev, name, bio, avatarSeed };
        });
        
        await fetchUsers();
      } catch (err) {
        console.error('Failed to save node state to Supabase:', err);
      }
      return;
    }

    // Fallback: Local API
    if (import.meta.env.PROD) {
      console.warn('Local API profile update bypassed in production build.');
      return;
    }
    try {
      const res = await fetch('/api/users/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, name, bio, avatarSeed })
      });
      const data = await res.json();
      if (data.user) {
        localStorage.setItem('luminal_user', JSON.stringify(data.user));
        setCurrentUser(data.user);
      }
    } catch (err) {
      console.error('Failed to save node state:', err);
    }
  };

  // Send real-time chat message
  const handleSendMessage = async (text: string) => {
    if (!currentUser || !selectedContact) return;
    audioEffects.playMessageSent();

    if (useSupabase && supabase) {
      try {
        const { error } = await supabase
          .from('messages')
          .insert({
            sender_id: currentUser.id,
            recipient_id: selectedContact.id,
            text,
            timestamp: Date.now()
          });

        if (error) throw error;

        // Trigger local Simulated AI Responses if target is an AI Contact
        if (selectedContact.isAI) {
          setTimeout(() => {
            setTypingStates((prev) => ({ ...prev, [selectedContact.id]: true }));
          }, 400);

          setTimeout(async () => {
            setTypingStates((prev) => ({ ...prev, [selectedContact.id]: false }));

            let replyText = "Fascinating query on the Luminal channel. I am processing the neural frequency.";
            if (selectedContact.id === 'ai-zara') {
              const replies = [
                "My quantum frequencies are aligning. I see your signal clear and glowing.",
                "Our node telemetry reports a 0.2ms phase alignment. Beautiful message telemetry.",
                "The interactive 3D particle state is fluctuating in harmony with your inputs.",
                "Zara here. Ready for a real-time voice or video hologram call? Just press the Call icon!"
              ];
              replyText = replies[Math.floor(Math.random() * replies.length)];
            } else if (selectedContact.id === 'ai-kael') {
              const replies = [
                "Core system running flawlessly. No UI glitches detected in this Sector.",
                "WebRTC signals are structured. Launching a video call with me will trigger the 3D Audio Visualizer simulation.",
                "Glow levels optimized to 88% intensity. Eye-strain levels minimized.",
                "Codebase validated. Low-latency is achieved via in-memory event dispatch."
              ];
              replyText = replies[Math.floor(Math.random() * replies.length)];
            } else if (selectedContact.id === 'ai-neo') {
              const replies = [
                "Connection fully sandboxed. Keys are stored client-side.",
                "End-to-peer data packets are streaming smoothly. No security leakages detected.",
                "Cybersecurity protocol active. Ready to initiate encrypted neural interface.",
                "Always remember to test multi-client mesh call by logging in on another private window!"
              ];
              replyText = replies[Math.floor(Math.random() * replies.length)];
            }

            await supabase
              .from('messages')
              .insert({
                sender_id: selectedContact.id,
                recipient_id: currentUser.id,
                text: replyText,
                timestamp: Date.now()
              });

          }, 1800);
        }
      } catch (err) {
        console.error('Broadcasting Supabase packet failure:', err);
      }
      return;
    }

    // Fallback: Local API
    if (import.meta.env.PROD) {
      console.warn('Local API message sending bypassed in production build.');
      return;
    }
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: currentUser.id,
          recipientId: selectedContact.id,
          text
        })
      });
    } catch (err) {
      console.error('Broadcasting packet failure:', err);
    }
  };

  // Sign out / Terminate node
  const handleSignOut = async () => {
    if (currentUser && useSupabase && supabase) {
      await updateUserStatus(currentUser.id, 'offline');
      await supabase.auth.signOut();
    }
    
    localStorage.removeItem('luminal_user');
    setCurrentUser(null);
    setSelectedContact(null);
    if (sseSourceRef.current) {
      sseSourceRef.current.close();
    }
  };

  // --- WEBRTC CORE IMPLEMENTATION ---

  const handleCleanCallState = () => {
    // Play release/disconnect chime
    if (isCallActive || incomingCall) {
      audioEffects.playCallDisconnected();
    }
    audioEffects.stopAllRinging();

    // Reset voice and visual effects
    setVoiceEffect('normal');
    setVisualEffect('normal');
    cleanupVoiceChanger();

    // Stop camera and mic tracks
    if (rawLocalStreamRef.current) {
      rawLocalStreamRef.current.getTracks().forEach((track) => track.stop());
      rawLocalStreamRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    // Release peer connection resources
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setIsCallActive(false);
    setActiveCallContact(null);
    setIncomingCall(null);
  };

  // Initiate an Outgoing Call
  const handleStartCall = async () => {
    if (!currentUser || !selectedContact) return;
    
    // Set UI states immediately
    setIsCallActive(true);
    setActiveCallContact(selectedContact);

    // Start outgoing ring sound effect
    audioEffects.startOutgoingRing();

    const stream = await getRobustUserMedia();
    rawLocalStreamRef.current = stream;
    const processed = applyVoiceEffect(stream, voiceEffect);
    setLocalStream(processed);

    try {
      // If calling a simulated AI Bot, we skip WebRTC peer setup and let the local visualizer handle it!
      if (selectedContact.isAI) {
        audioEffects.stopAllRinging();
        audioEffects.playCallConnected();
        return;
      }

      // 2. Setup RTCPeerConnection for P2P connection
      const pc = new RTCPeerConnection(rtcConfig);
      peerConnectionRef.current = pc;

      // 3. Bind local media tracks to peer connection
      processed.getTracks().forEach((track) => {
        pc.addTrack(track, processed);
      });

      // 4. Capture remote stream track events
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      };

      // 5. Gather & dispatch ICE candidates to peer through signaling channel
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal(currentUser.id, selectedContact.id, {
            type: 'ice-candidate',
            candidate: event.candidate,
            from: currentUser.id,
            to: selectedContact.id
          });
        }
      };

      // 6. Generate SDP offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // 7. Route offer to recipient
      sendSignal(currentUser.id, selectedContact.id, {
        type: 'offer',
        sdp: offer,
        from: currentUser.id,
        to: selectedContact.id
      });

    } catch (err) {
      console.error('Failed to establish WebRTC handshake channels:', err);
      handleCleanCallState();
    }
  };

  // Accept Incoming WebRTC Call
  const handleAcceptIncomingCall = async () => {
    if (!currentUser || !incomingCall) return;

    // Stop ring sound and play connected sound immediately
    audioEffects.stopAllRinging();
    audioEffects.playCallConnected();

    const callerId = incomingCall.fromUserId;
    const callerUser = users.find(u => u.id === callerId) || {
      id: callerId,
      username: 'node-mesh',
      name: 'Unknown Explorer',
      avatarSeed: 'unknown',
      status: 'online'
    } as User;

    setIsCallActive(true);
    setActiveCallContact(callerUser);

    const stream = await getRobustUserMedia();
    rawLocalStreamRef.current = stream;
    const processed = applyVoiceEffect(stream, voiceEffect);
    setLocalStream(processed);

    try {
      // 2. Setup PeerConnection
      const pc = new RTCPeerConnection(rtcConfig);
      peerConnectionRef.current = pc;

      // 3. Attach tracks
      processed.getTracks().forEach((track) => {
        pc.addTrack(track, processed);
      });

      // 4. Bind remote track
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      };

      // 5. Gather ICE Candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal(currentUser.id, callerId, {
            type: 'ice-candidate',
            candidate: event.candidate,
            from: currentUser.id,
            to: callerId
          });
        }
      };

      // 6. Load caller's Offer SDP
      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.signal.sdp));

      // 7. Generate Answer SDP
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // 8. Route Answer back to caller
      sendSignal(currentUser.id, callerId, {
        type: 'answer',
        sdp: answer,
        from: currentUser.id,
        to: callerId
      });

      // Reset incoming notification
      setIncomingCall(null);

    } catch (err) {
      console.error('Error accepting incoming WebRTC connection:', err);
      handleHangupCall();
    }
  };

  // Decline Incoming Call
  const handleDeclineIncomingCall = () => {
    if (!currentUser || !incomingCall) return;

    // Stop ring sound and play release sound
    audioEffects.stopAllRinging();
    audioEffects.playCallDisconnected();

    sendSignal(currentUser.id, incomingCall.fromUserId, {
      type: 'hangup',
      from: currentUser.id,
      to: incomingCall.fromUserId
    });
    setIncomingCall(null);
  };

  // Terminate Active Call Session
  const handleHangupCall = () => {
    if (currentUser && activeCallContact) {
      sendSignal(currentUser.id, activeCallContact.id, {
        type: 'hangup',
        from: currentUser.id,
        to: activeCallContact.id
      });
    }
    handleCleanCallState();
  };

  // General signal routing helper
  const sendSignal = async (from: string, to: string, signal: any) => {
    if (useSupabase && supabase) {
      try {
        const signalingChannel = supabase.channel('signaling_channel');
        await signalingChannel.send({
          type: 'broadcast',
          event: 'signal',
          payload: { from, to, signal }
        });
      } catch (err) {
        console.error('Supabase signaling relay failed:', err);
      }
      return;
    }

    // Fallback Local API
    if (import.meta.env.PROD) {
      console.warn('Local API WebRTC signaling bypassed in production build.');
      return;
    }
    try {
      await fetch('/api/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, signal })
      });
    } catch (err) {
      console.error('Signaling relay failed:', err);
    }
  };

  // Filter user directory on query
  const filteredUsers = users
    .filter(u => u.id !== currentUser?.id)
    .filter(u => 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <div className="relative min-h-screen text-slate-100 flex flex-col font-sans overflow-hidden bg-[#08080A]">
      {/* Dynamic 60fps Ambient Glow Background */}
      <GlowBackground />

      {/* Auth Screen Overlay */}
      {!currentUser ? (
        <div className="flex-1 flex items-center justify-center py-10">
          <RegisterForm 
            onAuth={handleAuth} 
            isLoading={isAuthLoading || isSupabaseChecking} 
            useSupabase={useSupabase} 
            supabaseError={supabaseError}
          />
        </div>
      ) : (
        /* CORE APPLICATION LAYOUT */
        <div className="flex-1 flex flex-col h-screen overflow-hidden" id="core-app">
          
          {/* Top Global Glow Header bar */}
          <header className="h-16 shrink-0 border-b border-white/10 bg-[#09090D]/50 backdrop-blur-xl px-6 flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              {/* Collapsible Mobile Sidebar Menu Button */}
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="md:hidden p-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white transition-colors"
              >
                {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 p-0.5 shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                  <div className="w-full h-full bg-[#08080A] rounded-[6px] flex items-center justify-center">
                    <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
                  </div>
                </div>
                <div>
                  <span className="font-display font-semibold text-white tracking-tight text-sm sm:text-base shadow-glow-cyan">
                    LUMINAL
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400/80 ml-2 hidden sm:inline">
                    v2.4.0 MESH-NET
                  </span>
                </div>
              </div>
            </div>

            {/* Profile Bar */}
            <div className="flex items-center gap-4">
              <div 
                onClick={() => setIsProfileOpen(true)}
                className="flex items-center gap-3 cursor-pointer bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/40 py-1.5 px-3 rounded-xl transition-all"
              >
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-cyan-950/40 p-0.5">
                  <img
                    src={`https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${currentUser.avatarSeed}`}
                    alt="Current profile"
                    className="w-full h-full"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-white text-xs font-semibold">{currentUser.name}</p>
                  <p className="text-[9px] font-mono text-cyan-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_5px_#22d3ee]" />
                    SECURE NODE
                  </p>
                </div>
                <Settings className="w-4 h-4 text-slate-400 hover:text-white transition-colors ml-1" />
              </div>

              {/* Log Out */}
              <button
                onClick={handleSignOut}
                className="p-2.5 rounded-xl bg-red-600/10 hover:bg-red-600 border border-red-500/20 hover:border-red-500 text-red-400 hover:text-white transition-all cursor-pointer"
                title="Disconnect Terminal Node"
              >
                <Power className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* MAIN CONTAINER */}
          <div className="flex-1 flex overflow-hidden relative">
            
            {/* Sidebar Directory list */}
            <aside
              className={`absolute md:static top-0 bottom-0 left-0 w-80 bg-[#08080A]/95 md:bg-black/30 border-r border-white/10 backdrop-blur-2xl md:backdrop-blur-none z-30 flex flex-col transition-transform duration-300 ${
                isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
              }`}
            >
              {/* Directory Filter search */}
              <div className="p-4 border-b border-white/10">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search node directories..."
                    className="w-full bg-black/40 border border-white/10 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder-slate-600 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Directory Scroller */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5" style={{ contentVisibility: 'auto' }}>
                <div className="flex items-center justify-between px-2 mb-2">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                    Available Handshakes ({filteredUsers.length})
                  </span>
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                </div>

                {filteredUsers.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-600">
                    No active link routes found
                  </div>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelected = selectedContact?.id === u.id;
                    const isTyping = !!typingStates[u.id];
                    return (
                      <div
                        key={u.id}
                        onClick={() => {
                          setSelectedContact(u);
                          setIsSidebarOpen(false); // Close menu on mobile selection
                        }}
                        className={`w-full text-left flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-500/10 border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                            : 'bg-white/2 border-transparent hover:bg-white/5 hover:border-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Avatar representation */}
                          <div className="relative shrink-0">
                            <div className={`w-9 h-9 rounded-lg p-0.5 bg-gradient-to-tr ${
                              u.status === 'online' ? 'from-cyan-400 to-indigo-600' : 'from-slate-800 to-slate-900'
                            }`}>
                              <div className="w-full h-full bg-slate-950 rounded-[7px] flex items-center justify-center overflow-hidden">
                                <img
                                  src={`https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${u.avatarSeed}`}
                                  alt={u.name}
                                  className="w-7 h-7"
                                  referrerPolicy="no-referrer"
                                  />
                              </div>
                            </div>
                            <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#08080A] ${
                              u.status === 'online' ? 'bg-cyan-400 shadow-[0_0_5px_#22d3ee]' : 'bg-slate-700'
                            }`} />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <p className="text-xs font-semibold text-white truncate max-w-[120px]">{u.name}</p>
                              {u.isAI && (
                                <span className="bg-cyan-500/20 text-[8px] text-cyan-300 font-mono px-1 rounded-sm">
                                  BOT
                                </span>
                              )}
                            </div>
                            {isTyping ? (
                              <p className="text-[10px] text-cyan-400 font-mono animate-pulse">transmitting...</p>
                            ) : (
                              <p className="text-[10px] text-slate-500 truncate max-w-[140px]">{u.bio || 'Exploring...'}</p>
                            )}
                          </div>
                        </div>

                        {/* Call icons right inside sidebar directory for speed */}
                        {u.status === 'online' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedContact(u);
                              handleStartCall();
                            }}
                            className="p-1.5 rounded-lg hover:bg-cyan-500/10 text-slate-500 hover:text-cyan-400 transition-colors"
                            title="Direct Voice Call"
                          >
                            <Tv className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </aside>

            {/* Main Interactive Screen Segment */}
            <main className="flex-1 flex flex-col overflow-hidden p-4 md:p-6 z-10">
              {selectedContact ? (
                /* Chat layout open */
                <ChatPanel
                  currentUser={currentUser}
                  contact={selectedContact}
                  messages={messages}
                  isTyping={!!typingStates[selectedContact.id]}
                  onSendMessage={handleSendMessage}
                  onStartCall={handleStartCall}
                />
              ) : (
                /* 3D Holographic Landing Desk when no chat active */
                <div className="flex-1 flex items-center justify-center text-center p-4">
                  <ThreeDCard className="p-8 max-w-lg border-white/10 shadow-[0_0_40px_rgba(6,182,212,0.1)] bg-[#09090D]/80 rounded-3xl">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 mb-6 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                      <Tv className="w-8 h-8 text-cyan-400" />
                    </div>
                    <h2 className="text-xl font-display font-medium text-white mb-3 shadow-glow-cyan">
                      Holographic Communication Deck
                    </h2>
                    <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed mb-6">
                      Establish quantum fiber links with registered nodes in the mesh. Try calling zara (our Quantum AI chatbot) for a voice-reactive 3D stream visualization.
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto text-left">
                      <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
                        <div className="flex items-center gap-2 mb-1">
                          <MessageSquare className="w-4 h-4 text-cyan-400" />
                          <h4 className="text-xs font-semibold text-white">Instant Messaging</h4>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-normal">
                          Exchange messages instantly with low-latency client-server relays.
                        </p>
                      </div>

                      <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
                        <div className="flex items-center gap-2 mb-1">
                          <Radio className="w-4 h-4 text-indigo-400" />
                          <h4 className="text-xs font-semibold text-white">WebRTC Video Call</h4>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-normal">
                          True browser-to-browser P2P calls. Open another private tab to experience it.
                        </p>
                      </div>
                    </div>
                  </ThreeDCard>
                </div>
              )}
            </main>
          </div>

          {/* Profile/System Node Settings popup overlay */}
          {isProfileOpen && (
            <ProfileSettings
              currentUser={currentUser}
              onUpdate={handleUpdateProfile}
              onClose={() => setIsProfileOpen(false)}
            />
          )}

          {/* Incoming Call ringing window */}
          {incomingCall && (
            <div className="fixed inset-0 bg-[#08080A]/90 backdrop-blur-xl z-50 flex items-center justify-center p-4">
              <div className="w-full max-w-sm bg-[#09090D] border border-cyan-500/50 rounded-3xl p-6 shadow-[0_0_50px_rgba(6,182,212,0.35)] text-center relative overflow-hidden animate-bounce">
                {/* Scan lines decoration */}
                <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent pointer-events-none" />
                
                <div className="w-20 h-20 rounded-full bg-cyan-500/20 border border-cyan-500 flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                  <PhoneCall className="w-10 h-10 text-cyan-400" />
                </div>

                <h3 className="text-white text-lg font-semibold tracking-tight shadow-glow-cyan">Incoming Hologram Transmission</h3>
                <p className="text-slate-400 text-xs font-mono mt-1 mb-6">
                  ID: {incomingCall.fromUserId}
                </p>

                <div className="flex gap-4">
                  <button
                    onClick={handleDeclineIncomingCall}
                    className="flex-1 bg-red-600 hover:bg-red-500 text-white font-medium text-sm py-2.5 rounded-xl transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)] cursor-pointer"
                  >
                    Decline
                  </button>
                  <button
                    onClick={handleAcceptIncomingCall}
                    className="flex-1 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-medium text-sm py-2.5 rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-pointer animate-pulse"
                  >
                    Accept Call
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Full Screen Interactive Video Call Interface */}
          {isCallActive && activeCallContact && (
            <VideoCallPanel
              currentUser={currentUser}
              contact={activeCallContact}
              localStream={localStream}
              remoteStream={remoteStream}
              onHangup={handleHangupCall}
              voiceEffect={voiceEffect}
              setVoiceEffect={setVoiceEffect}
              visualEffect={visualEffect}
              setVisualEffect={setVisualEffect}
            />
          )}

        </div>
      )}
    </div>
  );
}
