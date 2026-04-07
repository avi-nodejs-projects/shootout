// Synthwave music and sound effects using Web Audio API
const Audio = (() => {
    let ctx = null;
    let masterGain = null;
    let musicGain = null;
    let sfxGain = null;
    let musicPlaying = false;
    let musicNodes = [];
    let combatIntensity = 0;

    function init() {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = ctx.createGain();
        masterGain.gain.value = 0.5;
        masterGain.connect(ctx.destination);

        musicGain = ctx.createGain();
        musicGain.gain.value = 0.3;
        musicGain.connect(masterGain);

        sfxGain = ctx.createGain();
        sfxGain.gain.value = 0.6;
        sfxGain.connect(masterGain);
    }

    function ensureContext() {
        if (!ctx) init();
        if (ctx.state === 'suspended') ctx.resume();
    }

    // --- Synthwave Music Generator ---

    const BASS_NOTES = [55, 65.41, 73.42, 82.41]; // A1, C2, D2, E2
    const LEAD_NOTES = [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33]; // A3-D5 pentatonic

    function startMusic() {
        ensureContext();
        if (musicPlaying) return;
        musicPlaying = true;

        const bpm = 120;
        const beatLen = 60 / bpm;

        playBassLoop(beatLen);
        playDrumLoop(beatLen);
        playPadLoop(beatLen);
        playLeadLoop(beatLen);
    }

    function playBassLoop(beatLen) {
        if (!musicPlaying) return;
        const now = ctx.currentTime;
        const loopLen = beatLen * 8;

        for (let i = 0; i < 8; i++) {
            const note = BASS_NOTES[i % BASS_NOTES.length];
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();

            osc.type = 'sawtooth';
            osc.frequency.value = note;
            filter.type = 'lowpass';
            filter.frequency.value = 200 + combatIntensity * 300;

            gain.gain.setValueAtTime(0, now + i * beatLen);
            gain.gain.linearRampToValueAtTime(0.15, now + i * beatLen + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, now + (i + 0.8) * beatLen);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(musicGain);

            osc.start(now + i * beatLen);
            osc.stop(now + (i + 1) * beatLen);
        }

        setTimeout(() => playBassLoop(beatLen), loopLen * 1000 - 100);
    }

    function playDrumLoop(beatLen) {
        if (!musicPlaying) return;
        const now = ctx.currentTime;
        const loopLen = beatLen * 4;

        for (let i = 0; i < 4; i++) {
            // Kick on every beat
            playKick(now + i * beatLen);
            // Snare on 2 and 4
            if (i === 1 || i === 3) playSnare(now + i * beatLen);
            // Hi-hat on 8ths
            playHiHat(now + i * beatLen);
            playHiHat(now + i * beatLen + beatLen / 2);
        }

        setTimeout(() => playDrumLoop(beatLen), loopLen * 1000 - 100);
    }

    function playKick(time) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(40, time + 0.1);
        gain.gain.setValueAtTime(0.4, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
        osc.connect(gain);
        gain.connect(musicGain);
        osc.start(time);
        osc.stop(time + 0.2);
    }

    function playSnare(time) {
        const noise = ctx.createBufferSource();
        const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        noise.buffer = buffer;

        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 1000;
        gain.gain.setValueAtTime(0.2, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(musicGain);
        noise.start(time);
        noise.stop(time + 0.12);
    }

    function playHiHat(time) {
        const noise = ctx.createBufferSource();
        const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        noise.buffer = buffer;

        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 5000;
        gain.gain.setValueAtTime(0.06, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.03);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(musicGain);
        noise.start(time);
        noise.stop(time + 0.05);
    }

    function playPadLoop(beatLen) {
        if (!musicPlaying) return;
        const now = ctx.currentTime;
        const loopLen = beatLen * 16;

        const chords = [[220, 277.18, 329.63], [196, 246.94, 293.66], [174.61, 220, 261.63], [196, 246.94, 329.63]];

        chords.forEach((chord, ci) => {
            chord.forEach(freq => {
                const osc = ctx.createOscillator();
                const osc2 = ctx.createOscillator();
                const gain = ctx.createGain();
                const filter = ctx.createBiquadFilter();

                osc.type = 'sawtooth';
                osc.frequency.value = freq;
                osc2.type = 'sawtooth';
                osc2.frequency.value = freq * 1.005;

                filter.type = 'lowpass';
                filter.frequency.value = 600;

                const start = now + ci * beatLen * 4;
                gain.gain.setValueAtTime(0, start);
                gain.gain.linearRampToValueAtTime(0.04, start + beatLen);
                gain.gain.setValueAtTime(0.04, start + beatLen * 3);
                gain.gain.linearRampToValueAtTime(0, start + beatLen * 4);

                osc.connect(filter);
                osc2.connect(filter);
                filter.connect(gain);
                gain.connect(musicGain);

                osc.start(start);
                osc.stop(start + beatLen * 4 + 0.1);
                osc2.start(start);
                osc2.stop(start + beatLen * 4 + 0.1);
            });
        });

        setTimeout(() => playPadLoop(beatLen), loopLen * 1000 - 100);
    }

    function playLeadLoop(beatLen) {
        if (!musicPlaying) return;
        if (combatIntensity < 0.3) {
            setTimeout(() => playLeadLoop(beatLen), beatLen * 8 * 1000 - 100);
            return;
        }

        const now = ctx.currentTime;
        const loopLen = beatLen * 8;
        const pattern = [0, 2, 4, 5, 4, 2, 3, 1];

        pattern.forEach((ni, i) => {
            const freq = LEAD_NOTES[ni];
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'square';
            osc.frequency.value = freq;

            const start = now + i * beatLen;
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.08 * combatIntensity, start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, start + beatLen * 0.8);

            osc.connect(gain);
            gain.connect(musicGain);
            osc.start(start);
            osc.stop(start + beatLen);
        });

        setTimeout(() => playLeadLoop(beatLen), loopLen * 1000 - 100);
    }

    function stopMusic() {
        musicPlaying = false;
    }

    function setCombatIntensity(v) {
        combatIntensity = Math.max(0, Math.min(1, v));
    }

    // --- Sound Effects ---

    function playShoot(weaponName) {
        ensureContext();
        const now = ctx.currentTime;

        if (weaponName === 'Pistol') {
            const noise = createNoise(0.08);
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.value = 2000;
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(sfxGain);
            noise.start(now);
            noise.stop(now + 0.1);
        } else if (weaponName === 'Shotgun') {
            const noise = createNoise(0.15);
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 3000;
            gain.gain.setValueAtTime(0.5, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(sfxGain);
            noise.start(now);
            noise.stop(now + 0.2);
        } else if (weaponName === 'SMG') {
            const noise = createNoise(0.04);
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 4000;
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(sfxGain);
            noise.start(now);
            noise.stop(now + 0.05);
        }
    }

    function playReload() {
        ensureContext();
        const now = ctx.currentTime;
        [800, 1200, 600].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.15, now + i * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.1);
            osc.connect(gain);
            gain.connect(sfxGain);
            osc.start(now + i * 0.15);
            osc.stop(now + i * 0.15 + 0.12);
        });
    }

    function playMonsterHurt() {
        ensureContext();
        const now = ctx.currentTime;
        const noise = createNoise(0.1);
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 500;
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(sfxGain);
        noise.start(now);
        noise.stop(now + 0.12);
    }

    function playMonsterDeath() {
        ensureContext();
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.4);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.connect(gain);
        gain.connect(sfxGain);
        osc.start(now);
        osc.stop(now + 0.45);
    }

    function playPlayerHurt() {
        ensureContext();
        const now = ctx.currentTime;
        const noise = createNoise(0.12);
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;
        const distortion = ctx.createWaveShaper();
        distortion.curve = makeDistortionCurve(200);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        noise.connect(distortion);
        distortion.connect(filter);
        filter.connect(gain);
        gain.connect(sfxGain);
        noise.start(now);
        noise.stop(now + 0.15);
    }

    function playPickup() {
        ensureContext();
        const now = ctx.currentTime;
        [523.25, 659.25, 783.99].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.15, now + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.15);
            osc.connect(gain);
            gain.connect(sfxGain);
            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 0.2);
        });
    }

    function playFootstep() {
        ensureContext();
        const now = ctx.currentTime;
        const noise = createNoise(0.03);
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 800;
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.03);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(sfxGain);
        noise.start(now);
        noise.stop(now + 0.04);
    }

    // Helpers
    function createNoise(duration) {
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        return source;
    }

    function makeDistortionCurve(amount) {
        const samples = 256;
        const curve = new Float32Array(samples);
        for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1;
            curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
        }
        return curve;
    }

    return {
        init, startMusic, stopMusic, setCombatIntensity,
        playShoot, playReload, playMonsterHurt, playMonsterDeath,
        playPlayerHurt, playPickup, playFootstep
    };
})();
