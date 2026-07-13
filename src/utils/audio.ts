// Futuristic cyber sound generator using native Web Audio API
// No assets required, fully dynamic synthesis matching the Luminal theme!

let audioCtx: AudioContext | null = null;

const getAudioContext = (): AudioContext => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

// Outgoing / Incoming Ring states
let activeRingerInterval: any = null;
let activeRingerNodes: AudioNode[] = [];

export const audioEffects = {
  // 1. Message Sent: Swift, high-tech upward chirp
  playMessageSent: () => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1400, now + 0.12);
      
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {
      console.warn('Audio play failed:', e);
    }
  },

  // 2. Message Received: Soft twin-frequency harmonic chime
  playMessageReceived: () => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      
      // Node 1: Primary tone
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(950, now);
      osc1.frequency.setValueAtTime(1200, now + 0.06);
      gain1.gain.setValueAtTime(0.06, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      
      // Node 2: Secondary harmony
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(475, now);
      osc2.frequency.setValueAtTime(600, now + 0.06);
      gain2.gain.setValueAtTime(0.03, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      
      osc1.start(now);
      osc2.start(now);
      
      osc1.stop(now + 0.25);
      osc2.stop(now + 0.25);
    } catch (e) {
      console.warn('Audio play failed:', e);
    }
  },

  // 3. Start Outgoing Ring: Elegant sonar ping loop
  startOutgoingRing: () => {
    audioEffects.stopAllRinging();
    try {
      const ctx = getAudioContext();
      
      const playPing = () => {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.4);
        
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now);
        osc.stop(now + 1.2);
      };
      
      playPing();
      activeRingerInterval = setInterval(playPing, 2000);
    } catch (e) {
      console.warn('Audio play failed:', e);
    }
  },

  // 4. Start Incoming Ring: Electronic alarm radar pulse loop
  startIncomingRing: () => {
    audioEffects.stopAllRinging();
    try {
      const ctx = getAudioContext();
      
      const playRadar = () => {
        const now = ctx.currentTime;
        
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(523.25, now); // C5
        osc1.frequency.linearRampToValueAtTime(659.25, now + 0.15); // E5
        osc1.frequency.linearRampToValueAtTime(523.25, now + 0.3);
        
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(261.63, now); // C4
        osc2.frequency.linearRampToValueAtTime(329.63, now + 0.15); // E4
        osc2.frequency.linearRampToValueAtTime(261.63, now + 0.3);
        
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        
        osc1.start(now);
        osc2.start(now);
        
        osc1.stop(now + 0.8);
        osc2.stop(now + 0.8);
      };
      
      playRadar();
      activeRingerInterval = setInterval(playRadar, 1500);
    } catch (e) {
      console.warn('Audio play failed:', e);
    }
  },

  // Stop any active looping ringtone
  stopAllRinging: () => {
    if (activeRingerInterval) {
      clearInterval(activeRingerInterval);
      activeRingerInterval = null;
    }
    activeRingerNodes.forEach(node => {
      try {
        (node as any).stop();
      } catch (e) {}
    });
    activeRingerNodes = [];
  },

  // 5. Call Connected: Dynamic sci-fi uplink sweep
  playCallConnected: () => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.5);
      
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(300, now);
      filter.frequency.exponentialRampToValueAtTime(2500, now + 0.5);
      
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.6);
    } catch (e) {
      console.warn('Audio play failed:', e);
    }
  },

  // 6. Call Disconnected: Downward mechanical node release
  playCallDisconnected: () => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.4);
      
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.4);
    } catch (e) {
      console.warn('Audio play failed:', e);
    }
  }
};
