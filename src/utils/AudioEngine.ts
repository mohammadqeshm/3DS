/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export class WindAudioSynth {
  private ctx: AudioContext | null = null;
  private noiseSource: AudioBufferSourceNode | null = null;
  private whistleFilter: BiquadFilterNode | null = null;
  private rumbleFilter: BiquadFilterNode | null = null;
  private whistleGain: GainNode | null = null;
  private rumbleGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  
  private lfo: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;
  
  private initialized = false;
  private isPlaying = false;

  constructor() {
    // Left empty, init must be triggered by user gesture
  }

  public init() {
    if (this.initialized) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        console.warn("Web Audio API is not supported in this browser.");
        return;
      }
      this.ctx = new AudioCtx();
      this.setupNodes();
      this.initialized = true;
    } catch (e) {
      console.error("Failed to initialize Web Audio Context:", e);
    }
  }

  private setupNodes() {
    if (!this.ctx) return;

    // 1. Generate White Noise Buffer
    const bufferSize = 2 * this.ctx.sampleRate; // 2 seconds of noise
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    // 2. Create Noise Source node
    this.noiseSource = this.ctx.createBufferSource();
    this.noiseSource.buffer = noiseBuffer;
    this.noiseSource.loop = true;

    // 3. Create filters for different wind sounds
    // Whistling (resonant bandpass)
    this.whistleFilter = this.ctx.createBiquadFilter();
    this.whistleFilter.type = "bandpass";
    this.whistleFilter.Q.value = 5.0; // Resonant spike
    this.whistleFilter.frequency.value = 350;

    // Deep Rumble (lowpass)
    this.rumbleFilter = this.ctx.createBiquadFilter();
    this.rumbleFilter.type = "lowpass";
    this.rumbleFilter.frequency.value = 80;

    // 4. Create internal gain stages
    this.whistleGain = this.ctx.createGain();
    this.whistleGain.gain.value = 0.05;

    this.rumbleGain = this.ctx.createGain();
    this.rumbleGain.gain.value = 0.3;

    // 5. Create master gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0; // Starts silent until unmuted

    // 6. Whistle Modulation LFO (simulates swirling wind gusts)
    this.lfo = this.ctx.createOscillator();
    this.lfo.type = "sine";
    this.lfo.frequency.value = 0.25; // Slow modulation: once every 4 seconds

    this.lfoGain = this.ctx.createGain();
    this.lfoGain.gain.value = 120; // modulating filter cutoff by +/- 120 Hz

    // Connect LFO to modulate whistle filter cutoff frequency
    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.whistleFilter.frequency);

    // 7. Route audio paths
    // Noise -> Whistle Filter -> Whistle Gain -> Master Gain
    this.noiseSource.connect(this.whistleFilter);
    this.whistleFilter.connect(this.whistleGain);
    this.whistleGain.connect(this.masterGain);

    // Noise -> Rumble Filter -> Rumble Gain -> Master Gain
    this.noiseSource.connect(this.rumbleFilter);
    this.rumbleFilter.connect(this.rumbleGain);
    this.rumbleGain.connect(this.masterGain);

    // Master Gain -> Destination
    this.masterGain.connect(this.ctx.destination);

    // Start playback nodes (suspended state starts silent)
    this.noiseSource.start(0);
    this.lfo.start(0);
    this.isPlaying = true;
  }

  public setParams(speed: number, volume: number, enabled: boolean) {
    if (!this.initialized) {
      if (enabled) {
        this.init();
      } else {
        return;
      }
    }

    if (!this.ctx || !this.masterGain || !this.whistleFilter || !this.rumbleFilter || !this.whistleGain || !this.rumbleGain || !this.lfoGain) return;

    // Handle resume state if suspended (browser security policies)
    if (enabled && this.ctx.state === "suspended") {
      this.ctx.resume();
    }

    // If disabled or speed is zero, set volume to zero smoothly
    if (!enabled || speed <= 1) {
      this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      return;
    }

    // Normalizing inputs
    const normSpeed = speed / 120; // 0.0 to 1.0
    const normVol = volume / 100;   // 0.0 to 1.0

    // Master volume scales with general volume control + square of speed to simulate wind power energy
    const targetMasterVolume = normVol * (0.15 + (normSpeed * 0.45));
    this.masterGain.gain.setTargetAtTime(targetMasterVolume, this.ctx.currentTime, 0.15);

    // Shifting filter frequency centers based on wind speed
    // Higher winds = higher pitch whistles
    const baseWhistleFreq = 220 + (normSpeed * 500); // 220Hz to 720Hz
    this.whistleFilter.frequency.setValueAtTime(baseWhistleFreq, this.ctx.currentTime);
    
    // Gust fluctuation depth depends on wind speed
    const targetLfoGain = 60 + (normSpeed * 180); // larger sweeps with heavy winds
    this.lfoGain.gain.setValueAtTime(targetLfoGain, this.ctx.currentTime);

    // Filter sharpness (Q) goes up with wind speed for a thinner, higher whistle sound
    const targetQ = 2.0 + (normSpeed * 10.0); // Q between 2.0 and 12.0
    this.whistleFilter.Q.setTargetAtTime(targetQ, this.ctx.currentTime, 0.2);

    // Deep rumble cutoff shifts higher with extreme wind force
    const targetRumbleFreq = 45 + (normSpeed * 100); // 45Hz to 145Hz
    this.rumbleFilter.frequency.setTargetAtTime(targetRumbleFreq, this.ctx.currentTime, 0.3);

    // Balance between whistle component and rumble component based on wind speed
    // Low speeds = mostly deep rumbling
    // High speeds = whistling takes over
    const targetWhistleGain = 0.02 + (normSpeed * 0.08);
    this.whistleGain.gain.setTargetAtTime(targetWhistleGain, this.ctx.currentTime, 0.2);

    const targetRumbleGain = 0.25 + (normSpeed * 0.15);
    this.rumbleGain.gain.setTargetAtTime(targetRumbleGain, this.ctx.currentTime, 0.2);
  }

  public stop() {
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }
  }
}
