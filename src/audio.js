// Battlezone - Audio System using Web Audio API

class AudioManager {
    constructor() {
        this.context = null;
        this.enabled = true;
        this.masterVolume = 0.5;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;

        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.context.createGain();
            this.masterGain.gain.value = this.masterVolume;
            this.masterGain.connect(this.context.destination);
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
            this.enabled = false;
        }
    }

    resume() {
        if (this.context && this.context.state === 'suspended') {
            this.context.resume();
        }
    }

    setVolume(volume) {
        this.masterVolume = Utils.clamp(volume, 0, 1);
        if (this.masterGain) {
            this.masterGain.gain.value = this.masterVolume;
        }
    }

    toggle() {
        this.enabled = !this.enabled;
        if (this.masterGain) {
            this.masterGain.gain.value = this.enabled ? this.masterVolume : 0;
        }
    }

    // Generate a simple tone
    playTone(frequency, duration, type = 'square', volume = 0.3) {
        if (!this.enabled || !this.context) return;

        const oscillator = this.context.createOscillator();
        const gainNode = this.context.createGain();

        oscillator.type = type;
        oscillator.frequency.value = frequency;

        gainNode.gain.setValueAtTime(volume, this.context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);

        oscillator.start();
        oscillator.stop(this.context.currentTime + duration);
    }

    // Radar beep sound
    playRadarBeep() {
        if (!this.enabled || !this.context) return;

        const now = this.context.currentTime;

        // High-pitched beep
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.15);
    }

    // Shot firing sound
    playShot() {
        if (!this.enabled || !this.context) return;

        const now = this.context.currentTime;

        // Low frequency thump
        const osc1 = this.context.createOscillator();
        const gain1 = this.context.createGain();

        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(150, now);
        osc1.frequency.exponentialRampToValueAtTime(50, now + 0.2);

        gain1.gain.setValueAtTime(0.4, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        osc1.connect(gain1);
        gain1.connect(this.masterGain);

        osc1.start(now);
        osc1.stop(now + 0.2);

        // High frequency crack
        const osc2 = this.context.createOscillator();
        const gain2 = this.context.createGain();

        osc2.type = 'square';
        osc2.frequency.setValueAtTime(800, now);
        osc2.frequency.exponentialRampToValueAtTime(200, now + 0.1);

        gain2.gain.setValueAtTime(0.2, now);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

        osc2.connect(gain2);
        gain2.connect(this.masterGain);

        osc2.start(now);
        osc2.stop(now + 0.1);
    }

    // Explosion sound - loud and dramatic
    playExplosion() {
        if (!this.enabled || !this.context) return;

        const now = this.context.currentTime;
        const duration = 0.8;

        // Create noise-based explosion with longer duration
        const bufferSize = this.context.sampleRate * duration;
        const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const data = buffer.getChannelData(0);

        // Fill with decaying noise
        for (let i = 0; i < bufferSize; i++) {
            const envelope = Math.exp(-i / (bufferSize * 0.15));
            data[i] = (Math.random() * 2 - 1) * envelope;
        }

        const noise = this.context.createBufferSource();
        noise.buffer = buffer;

        // Low pass filter for deep rumble
        const filter = this.context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3000, now);
        filter.frequency.exponentialRampToValueAtTime(80, now + duration);

        const gain = this.context.createGain();
        gain.gain.setValueAtTime(0.7, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        noise.start(now);
        noise.stop(now + duration);

        // Deep bass boom
        const bassOsc = this.context.createOscillator();
        const bassGain = this.context.createGain();

        bassOsc.type = 'sine';
        bassOsc.frequency.setValueAtTime(60, now);
        bassOsc.frequency.exponentialRampToValueAtTime(20, now + 0.4);

        bassGain.gain.setValueAtTime(0.6, now);
        bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

        bassOsc.connect(bassGain);
        bassGain.connect(this.masterGain);

        bassOsc.start(now);
        bassOsc.stop(now + 0.4);

        // Secondary explosion crack
        const crackOsc = this.context.createOscillator();
        const crackGain = this.context.createGain();

        crackOsc.type = 'sawtooth';
        crackOsc.frequency.setValueAtTime(400, now);
        crackOsc.frequency.exponentialRampToValueAtTime(100, now + 0.15);

        crackGain.gain.setValueAtTime(0.4, now);
        crackGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        crackOsc.connect(crackGain);
        crackGain.connect(this.masterGain);

        crackOsc.start(now);
        crackOsc.stop(now + 0.15);
    }

    // Hit sound (when projectile hits something)
    playHit() {
        if (!this.enabled || !this.context) return;

        const now = this.context.currentTime;

        // Sharp metallic ping
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.15);
    }

    // Power-up collect sound
    playPowerUp() {
        if (!this.enabled || !this.context) return;

        const now = this.context.currentTime;

        // Ascending chime
        const notes = [400, 500, 600, 800];

        notes.forEach((freq, i) => {
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();

            osc.type = 'sine';
            osc.frequency.value = freq;

            const startTime = now + i * 0.08;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(startTime);
            osc.stop(startTime + 0.15);
        });
    }

    // Level up sound
    playLevelUp() {
        if (!this.enabled || !this.context) return;

        const now = this.context.currentTime;

        // Fanfare
        const notes = [262, 330, 392, 523]; // C4, E4, G4, C5

        notes.forEach((freq, i) => {
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();

            osc.type = 'square';
            osc.frequency.value = freq;

            const startTime = now + i * 0.15;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.25, startTime + 0.05);
            gain.gain.setValueAtTime(0.25, startTime + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.25);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(startTime);
            osc.stop(startTime + 0.25);
        });
    }

    // Game over sound
    playGameOver() {
        if (!this.enabled || !this.context) return;

        const now = this.context.currentTime;

        // Descending tones
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 1.0);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 1.0);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 1.0);
    }

    // Engine sound (continuous)
    startEngine() {
        if (!this.enabled || !this.context || this.engineOsc) return;

        this.engineOsc = this.context.createOscillator();
        this.engineGain = this.context.createGain();

        this.engineOsc.type = 'sawtooth';
        this.engineOsc.frequency.value = 40;

        this.engineGain.gain.value = 0.05;

        // Low pass filter
        this.engineFilter = this.context.createBiquadFilter();
        this.engineFilter.type = 'lowpass';
        this.engineFilter.frequency.value = 200;

        this.engineOsc.connect(this.engineFilter);
        this.engineFilter.connect(this.engineGain);
        this.engineGain.connect(this.masterGain);

        this.engineOsc.start();
    }

    updateEngine(speed) {
        if (!this.engineOsc) return;

        // Change pitch based on speed
        const baseFreq = 40;
        const maxFreq = 80;
        const freq = baseFreq + Math.abs(speed) * (maxFreq - baseFreq) / 10;

        this.engineOsc.frequency.value = freq;
        this.engineGain.gain.value = 0.03 + Math.abs(speed) * 0.02;
    }

    stopEngine() {
        if (this.engineOsc) {
            this.engineOsc.stop();
            this.engineOsc = null;
        }
    }
}

// Make available globally
window.AudioManager = AudioManager;
