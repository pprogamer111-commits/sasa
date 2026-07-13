import React, { useEffect, useRef, useState } from 'react';
import { User } from '../types';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Wifi, Eye, RefreshCw, Cpu, Activity, Sparkles, Volume2 } from 'lucide-react';
import { VoiceEffectType } from '../utils/voiceChanger';

interface VideoCallPanelProps {
  currentUser: User;
  contact: User;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onHangup: () => void;
  isIncomingCall?: boolean;
  voiceEffect: VoiceEffectType;
  setVoiceEffect: (effect: VoiceEffectType) => void;
  visualEffect: string;
  setVisualEffect: (effect: string) => void;
}

export const VideoCallPanel: React.FC<VideoCallPanelProps> = ({
  currentUser,
  contact,
  localStream,
  remoteStream,
  onHangup,
  isIncomingCall = false,
  voiceEffect,
  setVoiceEffect,
  visualEffect,
  setVisualEffect
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const audioCanvasRef = useRef<HTMLCanvasElement>(null);

  const [micActive, setMicActive] = useState(true);
  const [videoActive, setVideoActive] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [latency, setLatency] = useState(1);
  const [voiceVolume, setVoiceVolume] = useState(0);
  const [showEffectsPanel, setShowEffectsPanel] = useState(false);

  // Generate a dynamic SVG path for the real-time vocal wave line
  const getWavePath = (phaseOffset: number, amplitudeModifier: number) => {
    const points = [];
    const step = 2; // high density for a silky smooth wave curve
    const amp = (voiceVolume / 255) * 45 * amplitudeModifier;
    const time = performance.now() / 180; // dynamic time phase for fluid scrolling
    
    for (let x = 0; x <= 100; x += step) {
      // Smooth taper at edges (x = 0 and x = 100) so the wave stays anchored at center height
      const taper = Math.sin((x / 100) * Math.PI);
      
      // Overlapping sine waves for natural, liquid, sci-fi liquid voice signature look
      const y = 50 + Math.sin((x * 0.12) - time + phaseOffset) * amp * taper;
      points.push(`${x},${y}`);
    }
    
    return `M ${points.join(' L ')}`;
  };

  // Audio analyzer variables for holographic bot reactive sphere
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationRef = useRef<number | null>(null);

  // Increment call timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
      // Simulate highly variable but low-latency network telemetry
      setLatency(Math.floor(Math.random() * 3) + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync video element streams
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, videoActive]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Audio Analyzer for general voice reactivity (runs for both AI and real calls)
  useEffect(() => {
    if (localStream) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioCtx();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 64;

        const source = audioContext.createMediaStreamSource(localStream);
        source.connect(analyser);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        sourceRef.current = source;

        // Force resume in case it was created suspended
        if (audioContext.state === 'suspended') {
          audioContext.resume().catch(() => {});
        }

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const analyze = () => {
          if (!analyserRef.current) return;
          
          // Constantly ensure context is running
          if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume().catch(() => {});
          }

          analyserRef.current.getByteFrequencyData(dataArray);
          
          // Calculate average volume
          let total = 0;
          for (let i = 0; i < bufferLength; i++) {
            total += dataArray[i];
          }
          const avg = total / bufferLength;
          setVoiceVolume(avg); // 0 to 255 range

          animationRef.current = requestAnimationFrame(analyze);
        };
        analyze();
      } catch (err) {
        console.warn('Audio visualization failed or not supported in this frame sandbox', err);
      }
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (sourceRef.current) {
        try {
          sourceRef.current.disconnect();
        } catch (e) {}
      }
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch (e) {}
      }
    };
  }, [localStream]);

  // Render Bot Holographic Visualizer Canvas
  useEffect(() => {
    if (!contact.isAI) return;
    const canvas = audioCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 400);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 400);
    let angle = 0;

    const resizeHandler = () => {
      width = canvas.width = canvas.parentElement?.clientWidth || 400;
      height = canvas.height = canvas.parentElement?.clientHeight || 400;
    };
    window.addEventListener('resize', resizeHandler);

    const drawHolo = () => {
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      // Base radius plus voice reactivity modifier
      const baseRadius = Math.min(width, height) * 0.22;
      const reactivity = (voiceVolume / 255) * baseRadius * 0.85;
      const radius = baseRadius + reactivity;

      // Draw subtle background scanning lines
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i < height; i += 8) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(width, i);
        ctx.stroke();
      }

      // Draw interactive neon particle ring (3D illusion)
      const particleCount = 45;
      angle += 0.008;

      for (let i = 0; i < particleCount; i++) {
        const theta = (i / particleCount) * Math.PI * 2 + angle;
        // 3D projection look by compressing y
        const x = centerX + Math.cos(theta) * radius * (1.1 + Math.sin(angle * 2 + i) * 0.05);
        const y = centerY + Math.sin(theta) * radius * 0.5 * (1.1 + Math.cos(angle * 2 + i) * 0.05);

        // Particle size depends on depth (Z approximation)
        const size = (Math.sin(theta) + 1.2) * 2.2 + (voiceVolume / 255) * 5;

        // Core colors fading
        const hue = (180 + (i % 3) * 30) % 360; // cyans, blues, indigos
        ctx.fillStyle = `hsla(${hue}, 85%, 65%, ${0.5 + Math.sin(theta) * 0.4})`;
        ctx.shadowBlur = size * 2.5;
        ctx.shadowColor = `hsla(${hue}, 85%, 65%, 0.8)`;
        
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Draw futuristic central sphere orb
      const grad = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, radius * 0.8);
      grad.addColorStop(0, 'rgba(6, 182, 212, 0.4)');
      grad.addColorStop(0.5, 'rgba(99, 102, 241, 0.15)');
      grad.addColorStop(1, 'rgba(8, 8, 10, 0)');
      
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.8, 0, Math.PI * 2);
      ctx.fill();

      // Orbital Rings
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radius * 1.2, radius * 0.4, angle, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(99, 102, 241, 0.15)';
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radius * 1.4, radius * 0.3, -angle * 0.7, 0, Math.PI * 2);
      ctx.stroke();

      // Render overlay status lines inside visualizer
      ctx.fillStyle = 'rgba(6, 182, 212, 0.8)';
      ctx.font = '10px monospace';
      ctx.fillText(`NEURAL ENVELOPE: ACTIVE`, 20, height - 40);
      ctx.fillText(`SPEECH_GAIN: ${(voiceVolume / 2.55).toFixed(1)}%`, 20, height - 25);
      ctx.fillText(`SHADERS: RUNNING`, width - 140, height - 40);
      ctx.fillText(`CORE_TEMP: 34.2 °C`, width - 140, height - 25);

      requestAnimationFrame(drawHolo);
    };

    drawHolo();

    return () => {
      window.removeEventListener('resize', resizeHandler);
    };
  }, [contact.isAI, voiceVolume]);

  const toggleMic = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !micActive;
      });
      setMicActive(!micActive);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !videoActive;
      });
      setVideoActive(!videoActive);
    }
  };

  const handleInteraction = () => {
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(e => console.warn("Failed to resume audioContext:", e));
    }
  };

  // Helper to resolve CSS filter styles for visual camera effects
  const getVisualEffectStyle = (effect: string): React.CSSProperties => {
    switch (effect) {
      case 'holo':
        return {
          filter: 'hue-rotate(140deg) saturate(1.8) brightness(1.2) contrast(1.15)',
          boxShadow: 'inset 0 0 80px rgba(6, 182, 212, 0.4)'
        };
      case 'nightvision':
        return {
          filter: 'matrix(0, 0, 0, 0, 0,  0, 1.35, 0, 0, 0,  0, 0, 0, 0, 0,  0, 0, 0, 1, 0) brightness(1.25) contrast(1.45) saturate(1.5)',
          boxShadow: 'inset 0 0 80px rgba(34, 197, 94, 0.5)'
        };
      case 'neon':
        return {
          filter: 'invert(0.85) hue-rotate(240deg) contrast(1.6) saturate(1.85)',
          boxShadow: 'inset 0 0 80px rgba(236, 72, 153, 0.45)'
        };
      default:
        return {};
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      onClick={handleInteraction}
      className="fixed inset-0 bg-[#08080A] z-50 flex flex-col overflow-hidden select-none" 
      id="video-call-interface"
    >
      {/* Holographic Glowing Matrix Board (Ambient Frame) */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-cyan-500 via-indigo-600 to-cyan-400 shadow-[0_2px_15px_rgba(6,182,212,0.5)] z-20" />

      {/* Top Header Telemetry Panel */}
      <div className="relative z-10 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-[#08080A] to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center animate-pulse">
            <Cpu className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-white text-sm font-medium tracking-tight">
              Secure Core Signal
            </h2>
            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
              <span className="flex items-center gap-1 text-cyan-400">
                <Wifi className="w-3 h-3" /> E2E SECURE
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Activity className="w-3 h-3 text-indigo-400" /> {latency}ms DELAY
              </span>
            </div>
          </div>
        </div>

        {/* Floating Call duration */}
        <div className="bg-black/80 border border-white/10 rounded-full px-4 py-1.5 flex items-center gap-2 text-white font-mono text-xs shadow-lg">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>{formatTimer(callDuration)}</span>
        </div>
      </div>

      {/* Central Viewport - Video Streams / Hologram Bot */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden px-4">
        
        {/* Dynamic Visual Effect Matrix Shaders & Scanlines */}
        {visualEffect === 'holo' && (
          <div className="absolute inset-0 pointer-events-none z-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] opacity-40 animate-pulse" />
        )}
        {visualEffect === 'nightvision' && (
          <div className="absolute inset-0 pointer-events-none z-10 bg-[radial-gradient(circle,transparent_50%,rgba(0,30,0,0.5))] opacity-80">
            <div className="absolute top-4 left-6 flex items-center gap-2 font-mono text-green-400 text-xs tracking-wider animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping" />
              <span>ISO 3200 • REC</span>
            </div>
            <div className="absolute inset-0 bg-green-500/5 mix-blend-overlay opacity-30 bg-[radial-gradient(ellipse_at_center,transparent_20%,black_100%)]" />
          </div>
        )}
        {visualEffect === 'neon' && (
          <div className="absolute inset-0 pointer-events-none z-10 border-[6px] border-pink-500/20 mix-blend-color-dodge">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0),rgba(255,0,255,0.08)_50%,rgba(255,255,255,0))] bg-[length:100%_20px] animate-[bounce_3s_infinite]" />
          </div>
        )}

        {contact.isAI ? (
          // Bot Simulation Visualizer Canvas
          <div className="w-full h-full max-w-2xl max-h-[500px] bg-black/40 border border-white/10 rounded-3xl relative overflow-hidden shadow-[inset_0_0_50px_rgba(6,182,212,0.08)] flex items-center justify-center backdrop-blur-xl">
            {/* Hologram Vector Details */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Dynamic decorative grid */}
              <div className="absolute top-4 left-4 font-mono text-[9px] text-cyan-400/50 space-y-1">
                <p>&gt; LINK_ADDR: 0x8F91A2</p>
                <p>&gt; NODE_FREQ: 2.45GHz</p>
                <p>&gt; MESH_RELAY: SECTOR_4</p>
              </div>
              <div className="absolute top-4 right-4 font-mono text-[9px] text-indigo-400/50 text-right space-y-1">
                <p>&gt; CODEC: OPUS_SILK</p>
                <p>&gt; BITRATE: 128kbps</p>
                <p>&gt; DECRYPT_RSA: 2048</p>
              </div>
            </div>

            <canvas 
              ref={audioCanvasRef} 
              className="absolute inset-0 w-full h-full" 
              style={getVisualEffectStyle(visualEffect)}
            />
            
            {/* Bot Profile Detail */}
            <div className="absolute bottom-6 left-6 flex items-center gap-3 bg-[#09090D]/80 border border-white/10 rounded-2xl p-3 backdrop-blur-md z-10">
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-950 p-0.5">
                <img
                  src={`https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${contact.avatarSeed}`}
                  alt={contact.name}
                  className="w-full h-full"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <p className="text-white text-xs font-semibold">{contact.name}</p>
                <p className="text-cyan-400 text-[10px] font-mono shadow-glow-cyan">NEURAL SIMULATOR MODE</p>
              </div>
            </div>
          </div>
        ) : (
          // Real P2P Video Call Setup
          <div className="w-full h-full relative flex items-center justify-center">
            {remoteStream ? (
              // Remote video filling screen
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover rounded-3xl border border-white/10"
                style={getVisualEffectStyle(visualEffect)}
              />
            ) : (
              // Connecting state with spinning holograms
              <div className="flex flex-col items-center justify-center text-center p-8 bg-black/40 border border-white/10 rounded-3xl backdrop-blur-md">
                <div className="w-16 h-16 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin mb-4" />
                <h3 className="text-white text-base font-semibold shadow-glow-cyan">Connecting WebRTC Node</h3>
                <p className="text-slate-400 text-xs mt-1">Waiting for handshake response packet...</p>
              </div>
            )}
            
            {/* Holographic voice-reactive indicator target ring overlay (pulses based on voiceVolume) */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 flex items-center justify-center">
              <div 
                className="rounded-full border border-cyan-500/25 transition-all duration-75 flex items-center justify-center"
                style={{
                  width: `${90 + (voiceVolume / 255) * 140}px`,
                  height: `${90 + (voiceVolume / 255) * 140}px`,
                  backgroundColor: `rgba(6, 182, 212, ${(voiceVolume / 255) * 0.12})`,
                  boxShadow: `0 0 ${20 + (voiceVolume / 255) * 45}px rgba(6, 182, 212, ${(voiceVolume / 255) * 0.4})`,
                }}
              >
                <div 
                  className="rounded-full border border-indigo-500/30 transition-all duration-75"
                  style={{
                    width: `${45 + (voiceVolume / 255) * 70}px`,
                    height: `${45 + (voiceVolume / 255) * 70}px`,
                    backgroundColor: `rgba(99, 102, 241, ${(voiceVolume / 255) * 0.18})`,
                  }}
                />
              </div>
            </div>

            {/* Contact Name overlay */}
            <div className="absolute bottom-6 left-6 bg-black/80 border border-white/10 rounded-2xl px-4 py-2 text-white font-medium text-xs backdrop-blur-md z-10">
              {contact.name}
            </div>
          </div>
        )}

        {/* Small Floating Corner Local Stream (Your camera) */}
        {localStream && (
          <div className="absolute bottom-6 right-6 w-28 sm:w-40 aspect-[3/4] bg-black rounded-2xl border-2 border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.25)] overflow-hidden z-20 hover:scale-105 transition-transform duration-300">
            {videoActive ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
                style={getVisualEffectStyle(visualEffect)}
              />
            ) : (
              <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center text-center p-2">
                <VideoOff className="w-5 h-5 text-slate-600 mb-1" />
                <span className="text-[10px] text-slate-500">Camera Off</span>
              </div>
            )}
            <div className="absolute bottom-2 right-2 bg-black/60 rounded-md px-1.5 py-0.5 text-[9px] text-white/80 font-mono">
              YOU
            </div>
          </div>
        )}
      </div>

      {/* FLOATING CYBERNETIC EFFECTS PANEL (VOICE CHANGERS + MATRIX SHADERS) */}
      {showEffectsPanel && (
        <div className="absolute bottom-28 left-1/2 transform -translate-x-1/2 w-[92%] sm:w-96 max-w-md bg-[#0C0C10]/95 border border-cyan-500/30 rounded-2xl p-5 shadow-[0_0_40px_rgba(6,182,212,0.2)] backdrop-blur-xl z-30 transition-all duration-300">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <h3 className="text-white text-xs font-semibold tracking-wider uppercase">Cybernetic Link Modifiers</h3>
            </div>
            <button 
              onClick={() => setShowEffectsPanel(false)}
              className="text-slate-400 hover:text-white text-xs font-mono cursor-pointer"
            >
              [X] CLOSE
            </button>
          </div>

          {/* VOICE CHANGERS */}
          <div className="space-y-3 mb-5">
            <h4 className="text-[10px] font-mono text-cyan-400 tracking-wider uppercase flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5" /> Voice Neural Modulation
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'normal', name: 'Raw Vocal', desc: 'Direct bypass' },
                { id: 'cyborg', name: 'Cyborg Mod', desc: 'Ring Modulation' },
                { id: 'demon', name: 'Deep Void', desc: 'Low pitch pitch' },
                { id: 'alien', name: 'Alien Echo', desc: 'Highpass feedback' },
              ].map((fx) => (
                <button
                  key={fx.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setVoiceEffect(fx.id as VoiceEffectType);
                  }}
                  className={`flex flex-col text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                    voiceEffect === fx.id
                      ? 'bg-cyan-500/15 border-cyan-500 text-white shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                      : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/5 text-slate-400'
                  }`}
                >
                  <span className="text-xs font-semibold">{fx.name}</span>
                  <span className="text-[9px] text-slate-500 font-mono mt-0.5">{fx.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* CAMERA FILTERS */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-mono text-indigo-400 tracking-wider uppercase flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" /> Camera Visual Shaders
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'normal', name: 'Bypass Shaders', desc: 'Clean feed' },
                { id: 'holo', name: 'Holo Glitch', desc: 'Cyan scanline' },
                { id: 'nightvision', name: 'Night Vision', desc: 'Thermal phosphor' },
                { id: 'neon', name: 'Neon Invert', desc: 'Negative matrix' },
              ].map((sh) => (
                <button
                  key={sh.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setVisualEffect(sh.id);
                  }}
                  className={`flex flex-col text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                    visualEffect === sh.id
                      ? 'bg-indigo-500/15 border-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.25)]'
                      : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/5 text-slate-400'
                  }`}
                >
                  <span className="text-xs font-semibold">{sh.name}</span>
                  <span className="text-[9px] text-slate-500 font-mono mt-0.5">{sh.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Real-time Voice Reactive Waveform Line (Equalizer & Oscilloscope HUD) */}
      <div className="relative z-10 w-full max-w-md mx-auto px-6 mb-1.5 flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 font-mono text-[9px] tracking-widest text-cyan-400/80 uppercase">
          <span className={`w-1.5 h-1.5 rounded-full bg-cyan-400 ${voiceVolume > 8 ? 'animate-ping' : ''}`} />
          <span>Vocal Stream: {voiceVolume > 8 ? 'Modulating Signal' : 'Standby Mode'}</span>
        </div>
        
        {/* Continuous Liquid Oscilloscope Waves (SVG) */}
        <div className="w-full h-8 relative rounded-xl bg-black/40 border border-white/5 shadow-[inset_0_0_15px_rgba(6,182,212,0.05)] overflow-hidden flex items-center justify-center py-1">
          {/* Wave 1: Cyan primary wave */}
          <svg className="w-full h-full absolute inset-0 opacity-80" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path
              d={getWavePath(0, 1.0)}
              fill="none"
              stroke="#22d3ee"
              strokeWidth="2"
              className="transition-all duration-75"
            />
          </svg>
          
          {/* Wave 2: Purple secondary wave (slightly out of phase and lower amplitude) */}
          <svg className="w-full h-full absolute inset-0 opacity-50" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path
              d={getWavePath(Math.PI / 2, 0.7)}
              fill="none"
              stroke="#6366f1"
              strokeWidth="1.5"
              className="transition-all duration-75"
            />
          </svg>

          {/* Equalizer Spectrum Overlay */}
          <div className="absolute inset-x-4 bottom-1 flex items-end justify-between h-4 opacity-35 pointer-events-none">
            {Array.from({ length: 24 }).map((_, idx) => {
              const distanceToCenter = Math.abs(idx - 12) / 12;
              const taper = Math.max(0, 1 - distanceToCenter * distanceToCenter);
              const heightMultiplier = 0.2 + Math.sin(idx * 0.5) * 0.1;
              const barHeight = Math.max(2, (voiceVolume / 255) * 12 * heightMultiplier * taper);
              return (
                <div 
                  key={idx} 
                  className="w-[2px] bg-cyan-400/80 rounded-t-full transition-all duration-75"
                  style={{ height: `${barHeight}px` }}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Futuristic Floating Control Console (Mute, Video off, Hang up, Effects) */}
      <div className="relative z-10 pb-8 pt-4 px-6 bg-gradient-to-t from-[#08080A] to-transparent flex justify-center gap-4">
        {/* Toggle Audio */}
        <button
          onClick={toggleMic}
          className={`p-3.5 rounded-full border transition-all cursor-pointer ${
            micActive
              ? 'bg-[#09090D]/90 hover:bg-[#12121A]/90 border-white/10 text-slate-300 shadow-md'
              : 'bg-red-500/20 hover:bg-red-500/30 border-red-500/40 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
          }`}
          title={micActive ? 'Mute Mic' : 'Unmute Mic'}
        >
          {micActive ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        {/* Toggle Effects Panel */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowEffectsPanel(!showEffectsPanel);
          }}
          className={`p-3.5 rounded-full border transition-all cursor-pointer ${
            showEffectsPanel
              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
              : 'bg-[#09090D]/90 hover:bg-[#12121A]/90 border-white/10 text-slate-300 shadow-md'
          }`}
          title="Cybernetic Shader & Voice FX"
        >
          <Sparkles className="w-5 h-5" />
        </button>

        {/* Hang Up (Danger button) */}
        <button
          onClick={onHangup}
          className="p-4 rounded-full bg-red-600 hover:bg-red-500 hover:scale-105 text-white shadow-[0_0_25px_rgba(239,68,68,0.4)] active:scale-95 transition-all cursor-pointer"
          title="Disconnect Handshake"
        >
          <PhoneOff className="w-6 h-6" />
        </button>

        {/* Toggle Video */}
        <button
          onClick={toggleVideo}
          className={`p-3.5 rounded-full border transition-all cursor-pointer ${
            videoActive
              ? 'bg-[#09090D]/90 hover:bg-[#12121A]/90 border-white/10 text-slate-300 shadow-md'
              : 'bg-red-500/20 hover:bg-red-500/30 border-red-500/40 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
          }`}
          title={videoActive ? 'Disable Video' : 'Enable Video'}
        >
          {videoActive ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
};
