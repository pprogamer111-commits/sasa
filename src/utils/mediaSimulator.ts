// High-fidelity fallback MediaStream generator for environments lacking camera/microphone hardware
// This ensures the application never crashes when testing real-time call features in sandboxed views!

export const createMockStream = (): MediaStream => {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');
  
  let angle = 0;
  const drawInterval = setInterval(() => {
    if (!ctx) return;
    // Dark futuristic cockpit theme
    ctx.fillStyle = '#050508';
    ctx.fillRect(0, 0, 640, 480);
    
    // Matrix style neon grids
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x < 640; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 480);
      ctx.stroke();
    }
    for (let y = 0; y < 480; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(640, y);
      ctx.stroke();
    }

    // Scanning green/cyan line
    const sweepY = (Math.sin(angle * 0.4) + 1.0) * 240;
    ctx.fillStyle = 'rgba(6, 182, 212, 0.05)';
    ctx.fillRect(0, sweepY - 20, 640, 40);
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, sweepY);
    ctx.lineTo(640, sweepY);
    ctx.stroke();
    
    // Core cybernetic pulsating sphere
    const cx = 320;
    const cy = 240;
    const radius = 95 + Math.sin(angle) * 15;
    angle += 0.04;
    
    const grad = ctx.createRadialGradient(cx, cy, 5, cx, cy, radius);
    grad.addColorStop(0, 'rgba(6, 182, 212, 0.35)');
    grad.addColorStop(0.5, 'rgba(99, 102, 241, 0.12)');
    grad.addColorStop(1, 'rgba(8, 8, 10, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    // Orbit rings
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, radius * 1.3, radius * 0.4, angle * 0.2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(99, 102, 241, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(cx, cy, radius * 1.5, radius * 0.3, -angle * 0.4, 0, Math.PI * 2);
    ctx.stroke();
    
    // Core HUD Labels
    ctx.fillStyle = 'rgba(6, 182, 212, 0.85)';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('LUMINAL COGNITIVE FEED', cx, cy - 140);
    
    ctx.font = '10px monospace';
    ctx.fillStyle = 'rgba(99, 102, 241, 0.7)';
    ctx.fillText('FALLBACK SYSTEM SIMULATOR ONLINE', cx, cy + 145);
    ctx.fillText('E2E HANDSHAKE BYPASS IN EFFECT', cx, cy + 160);

    // Audio frequency line simulation
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 120; x <= 520; x += 8) {
      const distanceToCenter = Math.abs(x - cx);
      const amp = Math.max(0, (200 - distanceToCenter) / 200) * 35;
      const waveY = cy + Math.sin(x * 0.08 - angle * 4) * amp * Math.cos(angle * 1.5);
      if (x === 120) ctx.moveTo(x, waveY);
      else ctx.lineTo(x, waveY);
    }
    ctx.stroke();

  }, 50);

  // Safely extract video track
  let videoTrack: MediaStreamTrack | null = null;
  const canvasStream = (canvas as any).captureStream 
    ? (canvas as any).captureStream(24) 
    : (canvas as any).mozCaptureStream 
      ? (canvas as any).mozCaptureStream(24) 
      : null;

  if (canvasStream) {
    videoTrack = canvasStream.getVideoTracks()[0];
  } else {
    // Ultimate fallback if captureStream is entirely unsupported: construct blank dummy track
    try {
      const dummyCanvas = document.createElement('canvas');
      dummyCanvas.width = 1;
      dummyCanvas.height = 1;
      const stream = (dummyCanvas as any).captureStream(1);
      videoTrack = stream.getVideoTracks()[0];
    } catch (e) {}
  }

  // Create silent/sub-harmonic audio oscillator track safely
  let audioTrack: MediaStreamTrack | null = null;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      const audioCtx = new AudioCtx();
      const dst = audioCtx.createMediaStreamDestination();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, audioCtx.currentTime); // Ambient sub hum
      gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
      
      osc.connect(gain);
      gain.connect(dst);
      osc.start();
      
      audioTrack = dst.stream.getAudioTracks()[0];
    }
  } catch (e) {
    console.warn('Audio track simulation skipped:', e);
  }

  const tracks: MediaStreamTrack[] = [];
  if (videoTrack) tracks.push(videoTrack);
  if (audioTrack) tracks.push(audioTrack);

  const stream = new MediaStream(tracks);

  // Safely wrap stops to prevent memory leak
  stream.getTracks().forEach(track => {
    const origStop = track.stop;
    track.stop = function() {
      clearInterval(drawInterval);
      if (origStop) origStop.apply(this);
    };
  });

  return stream;
};

// Robust, adaptive MediaStream retrieval that maximizes use of real camera/mic hardware
// If some hardware is missing or blocked, it merges the available real track with a simulated track
export async function getRobustUserMedia(): Promise<MediaStream> {
  if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
    console.warn('navigator.mediaDevices.getUserMedia not available, using full mock stream');
    return createMockStream();
  }

  // Configuration 1: Try to get both real video and real audio
  try {
    const fullStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    console.log('Successfully acquired real camera and microphone tracks.');
    return fullStream;
  } catch (err) {
    console.warn('Dual-track getUserMedia failed. Attempting graceful single-track fallbacks:', err);
  }

  // Configuration 2: Try to get real video only
  let realVideoTrack: MediaStreamTrack | null = null;
  let realVideoStream: MediaStream | null = null;
  try {
    realVideoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    realVideoTrack = realVideoStream.getVideoTracks()[0] || null;
    console.log('Successfully acquired real camera track only.');
  } catch (err) {
    console.warn('Real camera-only track access failed or denied:', err);
  }

  // Configuration 3: Try to get real audio only
  let realAudioTrack: MediaStreamTrack | null = null;
  let realAudioStream: MediaStream | null = null;
  try {
    realAudioStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
    realAudioTrack = realAudioStream.getAudioTracks()[0] || null;
    console.log('Successfully acquired real microphone track only.');
  } catch (err) {
    console.warn('Real microphone-only track access failed or denied:', err);
  }

  // Blend available real hardware tracks with mock fallback tracks
  const tracks: MediaStreamTrack[] = [];
  const mockStream = createMockStream();

  if (realVideoTrack) {
    tracks.push(realVideoTrack);
  } else {
    console.log('Adding simulated holographic video stream track.');
    tracks.push(mockStream.getVideoTracks()[0]);
  }

  if (realAudioTrack) {
    tracks.push(realAudioTrack);
  } else {
    console.log('Adding simulated sub-harmonic audio stream track.');
    tracks.push(mockStream.getAudioTracks()[0]);
  }

  return new MediaStream(tracks);
}

