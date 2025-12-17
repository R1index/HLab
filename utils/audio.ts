
// Simple synth to avoid asset dependencies
let audioCtx: AudioContext | null = null;

// --- Audio Configuration Types ---
type WaveType = 'sine' | 'square' | 'sawtooth' | 'triangle';

interface FactionAudioProfile {
    baseFreqs: number[];     // Chord progression frequencies
    bassType: WaveType;      // Waveform for bass
    melodyType: WaveType;    // Waveform for melody
    tempoMs: number;         // Speed of sequencer
    filterBase: number;      // Lowpass filter cutoff start
    filterModDepth: number;  // How much LFO affects filter
    glitchChance: number;    // Probability of digital noise
    reverbTail: number;      // Simulated reverb release time
    detuneAmount: number;    // Thickness of sound
    panWidth: number;        // Stereo width
}

interface AudioState {
    oscillators: OscillatorNode[];
    gainNodes: GainNode[];
    filterNode: BiquadFilterNode | null;
    lfo: OscillatorNode | null;
    timeoutId: any;
    isPlaying: boolean;
    step: number;
    currentProfile: FactionAudioProfile;
    intensity: 'normal' | 'high';
}

// Global volume state (0.0 to 1.0)
let globalVolume = 0.5;
// Synth is naturally loud, so we scale the max output
const MASTER_ATTENUATION = 0.3; 

// --- Faction Themes (Sonic Logos) ---
const THEMES: Record<string, FactionAudioProfile> = {
    // Default / OmniCorp: Stable, clean, corporate, major-ish
    default: {
        baseFreqs: [65.41, 87.31, 98.00, 65.41], // C2 -> F2 -> G2 -> C2
        bassType: 'triangle',
        melodyType: 'sine',
        tempoMs: 250,
        filterBase: 300,
        filterModDepth: 100,
        glitchChance: 0.05,
        reverbTail: 1.0,
        detuneAmount: 5,
        panWidth: 0.5
    },
    omnicorp: {
        baseFreqs: [65.41, 87.31, 98.00, 130.81],
        bassType: 'triangle',
        melodyType: 'sine',
        tempoMs: 250,
        filterBase: 350,
        filterModDepth: 50, // Very stable
        glitchChance: 0.02, // Clean signal
        reverbTail: 0.5,
        detuneAmount: 2,
        panWidth: 0.4
    },
    // Red Cell: Aggressive, fast, minor, distorted (sawtooth)
    red_cell: {
        baseFreqs: [55.00, 51.91, 73.42, 61.74], // A1 -> G#1 -> D2 -> B1 (Tension)
        bassType: 'sawtooth',
        melodyType: 'sawtooth',
        tempoMs: 140, // Fast
        filterBase: 500, // Brighter
        filterModDepth: 300, // Heavy breathing
        glitchChance: 0.25, // Unstable
        reverbTail: 0.2, // Tight
        detuneAmount: 15, // Thick/Dissonant
        panWidth: 0.8
    },
    // Neural Net: Computing, arpeggiated, square waves (8-bit feel), complex chords
    neural_net: {
        baseFreqs: [65.41, 77.78, 51.91, 103.83], // Cm9 feel
        bassType: 'square',
        melodyType: 'square',
        tempoMs: 120, // High speed processing
        filterBase: 400,
        filterModDepth: 0, // Robotic/Static
        glitchChance: 0.1,
        reverbTail: 0.1, // Very dry
        detuneAmount: 0, // Precise
        panWidth: 1.0 // Wide data bus
    },
    // Void Syndicate: Dark, slow, deep drone, low pitch
    void_syndicate: {
        baseFreqs: [32.70, 34.65, 30.87, 32.70], // C1 -> C#1 -> B0 (Dark semitones)
        bassType: 'sine', // Sub bass
        melodyType: 'triangle',
        tempoMs: 600, // Very slow
        filterBase: 100, // Deep
        filterModDepth: 200,
        glitchChance: 0.05,
        reverbTail: 3.0, // Massive space
        detuneAmount: 10,
        panWidth: 0.3
    },
    // Aegis: Heavy, steady, industrial
    aegis_systems: {
        baseFreqs: [49.00, 49.00, 51.91, 55.00], // G1 march
        bassType: 'square',
        melodyType: 'sawtooth',
        tempoMs: 300,
        filterBase: 200,
        filterModDepth: 50,
        glitchChance: 0.0,
        reverbTail: 0.4,
        detuneAmount: 8,
        panWidth: 0.2 // Mono/Focused
    },
    // BioSyn: Organic, weird, detuned, fluid
    bio_syn: {
        baseFreqs: [69.30, 73.42, 65.41, 77.78], 
        bassType: 'sawtooth',
        melodyType: 'triangle',
        tempoMs: 280,
        filterBase: 300,
        filterModDepth: 400, // Heavy modulation "breathing"
        glitchChance: 0.08,
        reverbTail: 1.5, // Wet
        detuneAmount: 25, // Very detuned/organic
        panWidth: 0.7
    },
    // Neon Covenant: Ethereal, high pitch, shimmering
    neon_covenant: {
        baseFreqs: [130.81, 155.56, 174.61, 196.00], // C3 Major 7th feel
        bassType: 'triangle',
        melodyType: 'sine',
        tempoMs: 200,
        filterBase: 800, // High pass feel
        filterModDepth: 150,
        glitchChance: 0.15, // "Sparkles"
        reverbTail: 2.0,
        detuneAmount: 12,
        panWidth: 0.9
    }
};

let audioState: AudioState = {
    oscillators: [],
    gainNodes: [],
    filterNode: null,
    lfo: null,
    timeoutId: null,
    isPlaying: false,
    step: 0,
    currentProfile: THEMES.default,
    intensity: 'normal'
};

const getCtx = () => {
  if (!audioCtx && typeof window !== 'undefined') {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (Ctx) {
        audioCtx = new Ctx();
    }
  }
  return audioCtx;
};

export const initAudio = () => {
    const ctx = getCtx();
    if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
    }
};

export const setAudioVolume = (volume: number) => {
    globalVolume = Math.max(0, Math.min(1, volume));
    
    // Update active music volume smoothly
    const ctx = getCtx();
    if (ctx && audioState.isPlaying && audioState.gainNodes[0]) {
        // GainNode[0] is the master music bus
        const newGain = globalVolume * MASTER_ATTENUATION;
        audioState.gainNodes[0].gain.setTargetAtTime(newGain, ctx.currentTime, 0.1);
    }
};

export const updateMusicTheme = (themeId: string) => {
    const newProfile = THEMES[themeId] || THEMES.default;
    audioState.currentProfile = newProfile;
    
    // If playing, apply some immediate parameters to feel responsive
    if (audioState.isPlaying && audioState.filterNode && audioState.lfo && audioState.gainNodes[1]) {
        const ctx = getCtx();
        if (!ctx) return;
        const now = ctx.currentTime;
        
        // Glide filter to new baseline (respecting intensity)
        const baseFreq = audioState.intensity === 'high' ? newProfile.filterBase + 400 : newProfile.filterBase;
        audioState.filterNode.frequency.exponentialRampToValueAtTime(baseFreq, now + 2);
        
        try {
            audioState.gainNodes[1].gain.linearRampToValueAtTime(newProfile.filterModDepth, now + 2);
        } catch(e) {}
    }
};

export const setMusicIntensity = (level: 'normal' | 'high') => {
    if (audioState.intensity === level) return;
    audioState.intensity = level;

    const ctx = getCtx();
    if (!ctx || !audioState.isPlaying || !audioState.filterNode) return;
    const now = ctx.currentTime;
    const profile = audioState.currentProfile;

    if (level === 'high') {
        // Ramp up filter for excitement
        audioState.filterNode.frequency.exponentialRampToValueAtTime(profile.filterBase + 400, now + 1.0);
    } else {
        // Ramp down to normal
        audioState.filterNode.frequency.exponentialRampToValueAtTime(profile.filterBase, now + 2.0);
    }
};

const STEPS_PER_CHORD = 16; 

export const startMusic = () => {
    const ctx = getCtx();
    if (!ctx || audioState.isPlaying) return;

    audioState.isPlaying = true;
    audioState.step = 0;

    // Master Bus
    const musicBus = ctx.createGain();
    // Apply initial volume
    musicBus.gain.value = globalVolume * MASTER_ATTENUATION; 
    musicBus.connect(ctx.destination);
    audioState.gainNodes.push(musicBus);

    // Filter (The "Character" of the sound)
    const startFreq = audioState.intensity === 'high' ? audioState.currentProfile.filterBase + 400 : audioState.currentProfile.filterBase;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = startFreq;
    filter.Q.value = 1.0;
    filter.connect(musicBus);
    audioState.filterNode = filter;

    // LFO (The "Movement")
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.1; // Slow cycle
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = audioState.currentProfile.filterModDepth;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();
    audioState.lfo = lfo;
    audioState.gainNodes.push(lfoGain);

    // Bass Drones (Dynamic)
    const bassOscillators: OscillatorNode[] = [];
    
    // Create 3 bass oscillators for width
    [-1, 0, 1].forEach(offset => {
        const osc = ctx.createOscillator();
        osc.type = audioState.currentProfile.bassType;
        osc.frequency.value = audioState.currentProfile.baseFreqs[0];
        osc.detune.value = offset * audioState.currentProfile.detuneAmount;
        osc.connect(filter);
        osc.start();
        bassOscillators.push(osc);
    });
    audioState.oscillators.push(...bassOscillators);

    const scheduleNextStep = () => {
        if (!audioState.isPlaying || !ctx) return;

        const profile = audioState.currentProfile;
        const currentStep = audioState.step;
        const chordIndex = Math.floor(currentStep / STEPS_PER_CHORD) % profile.baseFreqs.length;
        const currentRoot = profile.baseFreqs[chordIndex];
        const isHighIntensity = audioState.intensity === 'high';

        const now = ctx.currentTime;

        // 1. Update Bass Chord
        if (currentStep % STEPS_PER_CHORD === 0) {
            bassOscillators.forEach((osc, i) => {
                const detune = (i - 1) * profile.detuneAmount;
                // In high intensity, bass becomes Sawtooth for more grit, regardless of profile
                osc.type = isHighIntensity ? 'sawtooth' : profile.bassType; 
                osc.detune.linearRampToValueAtTime(detune, now + 1.0);
                osc.frequency.exponentialRampToValueAtTime(currentRoot, now + 0.5);
            });
        }

        // 2. Procedural Melody
        // More notes in high intensity
        const noteChance = isHighIntensity ? 0.65 : 0.35;
        if (Math.random() < noteChance) {
             playMelodyNote(ctx, musicBus, currentRoot, profile, isHighIntensity);
        }

        // 3. Atmosphere / Glitch
        // More glitches in high intensity
        const glitchChance = isHighIntensity ? profile.glitchChance * 2 : profile.glitchChance;
        if (Math.random() < glitchChance) {
            playGlitch(ctx, musicBus, profile);
        }

        audioState.step++;
        
        // Faster tempo in high intensity
        const currentTempo = isHighIntensity ? profile.tempoMs * 0.6 : profile.tempoMs;
        
        // Recursive loop allows dynamic tempo changes
        audioState.timeoutId = setTimeout(scheduleNextStep, currentTempo);
    };

    scheduleNextStep();
};

const playMelodyNote = (ctx: AudioContext, dest: AudioNode, rootFreq: number, profile: FactionAudioProfile, highIntensity: boolean) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    // Scale intervals relative to root
    const intervals = [1, 1.2, 1.25, 1.5, 1.75]; // Min/Maj mix
    const interval = intervals[Math.floor(Math.random() * intervals.length)];
    
    // Octave logic: Neural net/Neon go high, Void goes low
    let octave = 2;
    if (profile.melodyType === 'square') octave = 3;
    if (profile.melodyType === 'sine') octave = 4;
    if (rootFreq < 40) octave = 3; // Boost low roots

    // In high intensity, shift up an octave for urgency
    if (highIntensity && Math.random() > 0.5) octave += 1;

    osc.frequency.value = rootFreq * interval * octave;
    osc.type = profile.melodyType;
    
    // Envelope
    const now = ctx.currentTime;
    const attack = highIntensity ? 0.02 : 0.05; // Sharper attack
    const release = highIntensity ? profile.reverbTail * 0.5 : profile.reverbTail; // Shorter tail
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.05, now + attack); 
    gain.gain.exponentialRampToValueAtTime(0.001, now + attack + release); 
    
    // Panner for width
    const panner = ctx.createStereoPanner();
    panner.pan.value = (Math.random() * profile.panWidth * 2) - profile.panWidth;

    osc.connect(gain);
    gain.connect(panner);
    panner.connect(dest);
    
    osc.start();
    osc.stop(now + attack + release + 0.1);
};

const playGlitch = (ctx: AudioContext, dest: AudioNode, profile: FactionAudioProfile) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    if (profile.melodyType === 'square') {
        // 8-bit noise
        osc.type = 'square';
        osc.frequency.setValueAtTime(100 + Math.random() * 500, now);
        osc.frequency.linearRampToValueAtTime(50, now + 0.1);
    } else {
        // High freq blip
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(2000 + Math.random() * 3000, now);
    }
    
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    
    osc.connect(gain);
    gain.connect(dest);
    osc.start();
    osc.stop(now + 0.15);
};

export const stopMusic = () => {
    audioState.isPlaying = false;
    
    audioState.oscillators.forEach(osc => {
        try { osc.stop(); osc.disconnect(); } catch(e){}
    });
    audioState.gainNodes.forEach(g => g.disconnect());
    if (audioState.filterNode) audioState.filterNode.disconnect();
    if (audioState.lfo) { try{ audioState.lfo.stop(); audioState.lfo.disconnect(); } catch(e){} }
    if (audioState.timeoutId) clearTimeout(audioState.timeoutId);

    audioState = {
        ...audioState,
        oscillators: [],
        gainNodes: [],
        filterNode: null,
        lfo: null,
        timeoutId: null,
        isPlaying: false,
        step: 0,
        intensity: 'normal'
    };
};

export const playSound = (type: 'click' | 'success' | 'fail' | 'hover' | 'tick' | 'spawn') => {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    
    if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
    }
    
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    const now = ctx.currentTime;
    
    // Scale gain by global volume (and master attenuation to match music)
    const vol = globalVolume; 
    
    switch (type) {
      case 'click':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
        gainNode.gain.setValueAtTime(0.1 * vol, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01 * vol, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      case 'spawn':
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, now);
        gainNode.gain.setValueAtTime(0.05 * vol, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01 * vol, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
        break;
      case 'success':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(880, now + 0.1);
        gainNode.gain.setValueAtTime(0.1 * vol, now);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
      case 'fail':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(50, now + 0.3);
        gainNode.gain.setValueAtTime(0.2 * vol, now);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
      case 'hover':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, now);
        gainNode.gain.setValueAtTime(0.02 * vol, now);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
        break;
    }
  } catch (e) {
    // Ignore audio errors
  }
};
