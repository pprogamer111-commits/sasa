export interface User {
  id: string;
  username: string;
  name: string;
  avatarSeed: string;
  status: 'online' | 'offline';
  bio?: string;
  isAI?: boolean;
}

export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  text: string;
  timestamp: number;
}

export interface CallSession {
  id: string;
  hostId: string;
  guestId: string;
  status: 'idle' | 'ringing' | 'connected' | 'ended';
}

export interface SignalData {
  type: 'offer' | 'answer' | 'ice-candidate' | 'hangup';
  sdp?: any;
  candidate?: any;
  from: string;
  to: string;
}
