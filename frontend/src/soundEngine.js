// Pure Web Audio API SOC Sound & Emergency Alarm Synthesizer (Zero external MP3s needed)

class SOCSoundEngine {
    constructor() {
        this.ctx = null;
        this.ambientInterval = null;
        this.isAmbientPlaying = false;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // Subtle SOC Control Room Radar Pulse & Telemetry Hum
    startAmbient() {
        this.init();
        if (this.isAmbientPlaying) return;
        this.isAmbientPlaying = true;

        const playRadarPing = () => {
            if (!this.isAmbientPlaying || !this.ctx) return;
            const now = this.ctx.currentTime;

            // Soft low-frequency SOC room hum pulse
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(110, now);
            osc.frequency.exponentialRampToValueAtTime(55, now + 1.2);

            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(0.035, now + 0.15);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 1.45);

            // Subtle high-tech telemetry blip
            setTimeout(() => {
                if (!this.isAmbientPlaying || !this.ctx) return;
                const t = this.ctx.currentTime;
                const blip = this.ctx.createOscillator();
                const bGain = this.ctx.createGain();
                blip.type = 'triangle';
                blip.frequency.setValueAtTime(880, t);
                blip.frequency.setValueAtTime(1320, t + 0.06);
                bGain.gain.setValueAtTime(0.012, t);
                bGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
                blip.connect(bGain);
                bGain.connect(this.ctx.destination);
                blip.start(t);
                blip.stop(t + 0.15);
            }, 600);
        };

        playRadarPing();
        this.ambientInterval = setInterval(playRadarPing, 3500);
    }

    stopAmbient() {
        this.isAmbientPlaying = false;
        if (this.ambientInterval) {
            clearInterval(this.ambientInterval);
            this.ambientInterval = null;
        }
    }

    // Critical Cyberattack Siren + Voice Alert
    triggerCyberAttackAlarm(spokenWarning) {
        this.init();
        const now = this.ctx.currentTime;

        // 3-pulse urgent SOC breach siren
        for (let i = 0; i < 3; i++) {
            const start = now + i * 0.45;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(620, start);
            osc.frequency.linearRampToValueAtTime(980, start + 0.2);
            osc.frequency.linearRampToValueAtTime(540, start + 0.4);

            gain.gain.setValueAtTime(0.14, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.42);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(start);
            osc.stop(start + 0.43);
        }

        // Spoken AI SOC Warning
        if (spokenWarning && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(spokenWarning);
            utterance.rate = 1.05;
            utterance.pitch = 0.95;
            utterance.volume = 1.0;
            setTimeout(() => window.speechSynthesis.speak(utterance), 900);
        }
    }
}

export const socSound = new SOCSoundEngine();