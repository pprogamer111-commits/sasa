// Web Audio API Voice Changer Engine for Luminal Link
// Fully dynamic real-time digital signal processing (DSP) without external libraries!

let audioCtx: AudioContext | null = null;
let sourceNode: MediaStreamAudioSourceNode | null = null;
let destinationStreamNode: MediaStreamAudioDestinationNode | null = null;

// Audio nodes for effects
let ringModulatorOsc: OscillatorNode | null = null;
let ringModulatorGain: GainNode | null = null;
let delayNode: DelayNode | null = null;
let delayFeedbackGain: GainNode | null = null;
let filterNode: BiquadFilterNode | null = null;
let directGain: GainNode | null = null;
let effectGain: GainNode | null = null;

export type VoiceEffectType = 'normal' | 'cyborg' | 'demon' | 'alien';

export function applyVoiceEffect(stream: MediaStream, effect: VoiceEffectType): MediaStream {
  // If no audio track exists, return original stream
  const audioTrack = stream.getAudioTracks()[0];
  if (!audioTrack) return stream;

  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return stream;

    // Clean up any previous context
    cleanupVoiceChanger();

    audioCtx = new AudioCtx();
    sourceNode = audioCtx.createMediaStreamSource(stream);
    destinationStreamNode = audioCtx.createMediaStreamDestination();

    directGain = audioCtx.createGain();
    effectGain = audioCtx.createGain();

    directGain.connect(destinationStreamNode);
    effectGain.connect(destinationStreamNode);

    if (effect === 'normal') {
      // Just route directly
      directGain.gain.setValueAtTime(1.0, audioCtx.currentTime);
      effectGain.gain.setValueAtTime(0.0, audioCtx.currentTime);
      sourceNode.connect(directGain);
    } else if (effect === 'cyborg') {
      // --- CYBORG EFFECT (Ring Modulation) ---
      // Uses a fast oscillator to modulate the gain of the audio signal, creating a metallic, cybernetic voice.
      directGain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      effectGain.gain.setValueAtTime(1.2, audioCtx.currentTime);

      const modulator = audioCtx.createGain();
      ringModulatorOsc = audioCtx.createOscillator();
      ringModulatorOsc.type = 'sawtooth';
      ringModulatorOsc.frequency.setValueAtTime(65, audioCtx.currentTime); // Low metallic buzz

      // Filter to keep it sharp
      filterNode = audioCtx.createBiquadFilter();
      filterNode.type = 'bandpass';
      filterNode.frequency.setValueAtTime(1000, audioCtx.currentTime);
      filterNode.Q.setValueAtTime(1.5, audioCtx.currentTime);

      // Connect graph
      sourceNode.connect(filterNode);
      filterNode.connect(modulator);
      
      ringModulatorOsc.connect(modulator.gain);
      modulator.connect(effectGain);

      ringModulatorOsc.start();
      sourceNode.connect(directGain);
    } else if (effect === 'demon') {
      // --- DEEP VOID DEMON EFFECT ---
      // Low pass filtering + deep pitch shifting delay loop to produce a sinister, heavy cosmic demon pitch.
      directGain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      effectGain.gain.setValueAtTime(1.5, audioCtx.currentTime);

      filterNode = audioCtx.createBiquadFilter();
      filterNode.type = 'lowpass';
      filterNode.frequency.setValueAtTime(450, audioCtx.currentTime); // Cut high frequencies

      delayNode = audioCtx.createDelay(0.5);
      delayNode.delayTime.setValueAtTime(0.08, audioCtx.currentTime); // Low delay for sub-harmonics

      delayFeedbackGain = audioCtx.createGain();
      delayFeedbackGain.gain.setValueAtTime(0.45, audioCtx.currentTime);

      // Connect feedback loop
      sourceNode.connect(filterNode);
      filterNode.connect(delayNode);
      delayNode.connect(delayFeedbackGain);
      delayFeedbackGain.connect(delayNode); // loop back
      
      delayNode.connect(effectGain);
      sourceNode.connect(directGain);
    } else if (effect === 'alien') {
      // --- ALIEN ECHO CHIPMUNK EFFECT ---
      // High pass filtering + rapid slapback delay to emulate a high-pitched alien comm channel.
      directGain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      effectGain.gain.setValueAtTime(1.4, audioCtx.currentTime);

      filterNode = audioCtx.createBiquadFilter();
      filterNode.type = 'highpass';
      filterNode.frequency.setValueAtTime(1200, audioCtx.currentTime); // High pass filter for squeaky space feel

      delayNode = audioCtx.createDelay(0.2);
      delayNode.delayTime.setValueAtTime(0.04, audioCtx.currentTime);

      delayFeedbackGain = audioCtx.createGain();
      delayFeedbackGain.gain.setValueAtTime(0.35, audioCtx.currentTime);

      sourceNode.connect(filterNode);
      filterNode.connect(delayNode);
      delayNode.connect(delayFeedbackGain);
      delayFeedbackGain.connect(delayNode);

      delayNode.connect(effectGain);
      sourceNode.connect(directGain);
    }

    // Combine output stream with any existing video tracks
    const processedTracks: MediaStreamTrack[] = [
      ...destinationStreamNode.stream.getAudioTracks()
    ];
    
    // Add video tracks if any
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      processedTracks.push(videoTrack);
    }

    return new MediaStream(processedTracks);
  } catch (err) {
    console.error('Failed to initialize Voice Changer DSP:', err);
    return stream;
  }
}

export function cleanupVoiceChanger() {
  try {
    if (ringModulatorOsc) {
      ringModulatorOsc.stop();
      ringModulatorOsc = null;
    }
    ringModulatorGain = null;
    delayNode = null;
    delayFeedbackGain = null;
    filterNode = null;
    directGain = null;
    effectGain = null;
    
    if (sourceNode) {
      sourceNode.disconnect();
      sourceNode = null;
    }
    if (audioCtx) {
      if (audioCtx.state !== 'closed') {
        audioCtx.close();
      }
      audioCtx = null;
    }
  } catch (e) {
    console.warn('Voice Changer cleanup error:', e);
  }
}
