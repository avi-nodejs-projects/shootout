// Floor-adaptive synthwave music
const Audio = (() => {
    let ctx, masterGain, musicGain, sfxGain;
    let musicPlaying = false;
    let combatIntensity = 0;
    let currentBPM = 100;

    function init() {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = ctx.createGain(); masterGain.gain.value = 0.5; masterGain.connect(ctx.destination);
        musicGain = ctx.createGain(); musicGain.gain.value = 0.25; musicGain.connect(masterGain);
        sfxGain = ctx.createGain(); sfxGain.gain.value = 0.6; sfxGain.connect(masterGain);
    }

    function ensureCtx() { if (!ctx) init(); if (ctx.state === 'suspended') ctx.resume(); }

    function setBPM(bpm) { currentBPM = bpm; }

    function startMusic() {
        ensureCtx();
        if (musicPlaying) return;
        musicPlaying = true;
        scheduleLoop();
    }

    function scheduleLoop() {
        if (!musicPlaying) return;
        const beat = 60 / currentBPM;
        const now = ctx.currentTime;
        const loopLen = beat * 8;

        // Kick (always)
        for (let i = 0; i < 8; i++) {
            if (i % 2 === 0) {
                const o = ctx.createOscillator(); const g = ctx.createGain();
                o.type = 'sine';
                o.frequency.setValueAtTime(150, now + i * beat);
                o.frequency.exponentialRampToValueAtTime(35, now + i * beat + 0.12);
                g.gain.setValueAtTime(0.3, now + i * beat);
                g.gain.exponentialRampToValueAtTime(0.01, now + i * beat + 0.15);
                o.connect(g); g.connect(musicGain);
                o.start(now + i * beat); o.stop(now + i * beat + 0.2);
            }
        }

        // Bass (exploring+)
        const bassNotes = [55, 55, 65.41, 55, 73.42, 55, 65.41, 82.41];
        bassNotes.forEach((f, i) => {
            const o = ctx.createOscillator(); const g = ctx.createGain(); const fl = ctx.createBiquadFilter();
            o.type = 'sawtooth'; o.frequency.value = f;
            fl.type = 'lowpass'; fl.frequency.value = 200 + combatIntensity * 400;
            g.gain.setValueAtTime(0, now + i * beat);
            g.gain.linearRampToValueAtTime(0.1, now + i * beat + 0.03);
            g.gain.exponentialRampToValueAtTime(0.01, now + (i + 0.8) * beat);
            o.connect(fl); fl.connect(g); g.connect(musicGain);
            o.start(now + i * beat); o.stop(now + (i + 1) * beat);
        });

        // Snare (exploring+)
        for (let i = 0; i < 4; i++) {
            const t = now + (i * 2 + 1) * beat;
            const n = noiseBuf(0.08); const g = ctx.createGain(); const f = ctx.createBiquadFilter();
            f.type = 'highpass'; f.frequency.value = 1200;
            g.gain.setValueAtTime(0.15, t); g.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
            n.connect(f); f.connect(g); g.connect(musicGain);
            n.start(t); n.stop(t + 0.1);
        }

        // Hi-hats
        for (let i = 0; i < 16; i++) {
            const t = now + i * beat / 2;
            const n = noiseBuf(0.02); const g = ctx.createGain(); const f = ctx.createBiquadFilter();
            f.type = 'highpass'; f.frequency.value = 6000;
            g.gain.setValueAtTime(0.03 + (i % 2 === 0 ? 0.02 : 0), t);
            g.gain.exponentialRampToValueAtTime(0.01, t + 0.02);
            n.connect(f); f.connect(g); g.connect(musicGain);
            n.start(t); n.stop(t + 0.025);
        }

        // Pad
        const chords = [[110, 130.81, 164.81], [98, 123.47, 146.83]];
        chords.forEach((ch, ci) => {
            ch.forEach(freq => {
                const o = ctx.createOscillator(); const g = ctx.createGain();
                o.type = 'sawtooth'; o.frequency.value = freq;
                const st = now + ci * beat * 4;
                g.gain.setValueAtTime(0, st);
                g.gain.linearRampToValueAtTime(0.03, st + beat);
                g.gain.setValueAtTime(0.03, st + beat * 3);
                g.gain.linearRampToValueAtTime(0, st + beat * 4);
                o.connect(g); g.connect(musicGain);
                o.start(st); o.stop(st + beat * 4 + 0.1);
            });
        });

        // Combat lead
        if (combatIntensity > 0.4) {
            const notes = [220, 261.63, 293.66, 329.63, 293.66, 261.63, 220, 196];
            notes.forEach((f, i) => {
                const o = ctx.createOscillator(); const g = ctx.createGain();
                o.type = 'square'; o.frequency.value = f;
                const t = now + i * beat;
                g.gain.setValueAtTime(0, t);
                g.gain.linearRampToValueAtTime(0.05 * combatIntensity, t + 0.01);
                g.gain.exponentialRampToValueAtTime(0.01, t + beat * 0.7);
                o.connect(g); g.connect(musicGain);
                o.start(t); o.stop(t + beat);
            });
        }

        setTimeout(() => scheduleLoop(), loopLen * 1000 - 50);
    }

    function stopMusic() { musicPlaying = false; }
    function setCombatIntensity(v) { combatIntensity = Math.max(0, Math.min(1, v)); }

    // SFX
    function playShoot(name) {
        ensureCtx(); const now = ctx.currentTime;
        if (name === 'Pistol') {
            const n = noiseBuf(0.06); const g = ctx.createGain(); const f = ctx.createBiquadFilter();
            f.type = 'highpass'; f.frequency.value = 2500;
            g.gain.setValueAtTime(0.25, now); g.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
            n.connect(f); f.connect(g); g.connect(sfxGain); n.start(now); n.stop(now + 0.08);
        } else if (name === 'Shotgun') {
            const n = noiseBuf(0.12); const g = ctx.createGain(); const f = ctx.createBiquadFilter();
            f.type = 'lowpass'; f.frequency.value = 2500;
            g.gain.setValueAtTime(0.45, now); g.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
            n.connect(f); f.connect(g); g.connect(sfxGain); n.start(now); n.stop(now + 0.15);
        } else if (name === 'Rifle') {
            const n = noiseBuf(0.04); const g = ctx.createGain(); const f = ctx.createBiquadFilter();
            f.type = 'bandpass'; f.frequency.value = 3000;
            g.gain.setValueAtTime(0.3, now); g.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
            n.connect(f); f.connect(g); g.connect(sfxGain); n.start(now); n.stop(now + 0.05);
        } else if (name === 'Rocket') {
            const o = ctx.createOscillator(); const g = ctx.createGain();
            o.type = 'sawtooth'; o.frequency.setValueAtTime(100, now); o.frequency.linearRampToValueAtTime(400, now + 0.15);
            g.gain.setValueAtTime(0.3, now); g.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            o.connect(g); g.connect(sfxGain); o.start(now); o.stop(now + 0.35);
        }
    }

    function playReload() {
        ensureCtx(); const now = ctx.currentTime;
        [600, 900, 500].forEach((f, i) => {
            const o = ctx.createOscillator(); const g = ctx.createGain();
            o.type = 'sine'; o.frequency.value = f;
            g.gain.setValueAtTime(0.1, now + i * 0.15); g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.08);
            o.connect(g); g.connect(sfxGain); o.start(now + i * 0.15); o.stop(now + i * 0.15 + 0.1);
        });
    }

    function playMonsterHurt() {
        ensureCtx(); const now = ctx.currentTime;
        const n = noiseBuf(0.08); const g = ctx.createGain(); const f = ctx.createBiquadFilter();
        f.type = 'lowpass'; f.frequency.value = 400;
        g.gain.setValueAtTime(0.2, now); g.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        n.connect(f); f.connect(g); g.connect(sfxGain); n.start(now); n.stop(now + 0.1);
    }

    function playMonsterDeath() {
        ensureCtx(); const now = ctx.currentTime;
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = 'sawtooth'; o.frequency.setValueAtTime(300, now); o.frequency.exponentialRampToValueAtTime(40, now + 0.4);
        g.gain.setValueAtTime(0.25, now); g.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        o.connect(g); g.connect(sfxGain); o.start(now); o.stop(now + 0.45);
    }

    function playBossRoar() {
        ensureCtx(); const now = ctx.currentTime;
        const o = ctx.createOscillator(); const g = ctx.createGain(); const f = ctx.createBiquadFilter();
        o.type = 'sawtooth'; o.frequency.value = 50;
        const lfo = ctx.createOscillator(); const lg = ctx.createGain();
        lfo.frequency.value = 8; lg.gain.value = 30;
        lfo.connect(lg); lg.connect(o.frequency);
        f.type = 'lowpass'; f.frequency.value = 300;
        g.gain.setValueAtTime(0.35, now); g.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
        o.connect(f); f.connect(g); g.connect(sfxGain);
        o.start(now); o.stop(now + 0.85); lfo.start(now); lfo.stop(now + 0.85);
    }

    function playPlayerHurt() {
        ensureCtx(); const now = ctx.currentTime;
        const n = noiseBuf(0.1); const g = ctx.createGain(); const f = ctx.createBiquadFilter();
        f.type = 'lowpass'; f.frequency.value = 300;
        g.gain.setValueAtTime(0.3, now); g.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        n.connect(f); f.connect(g); g.connect(sfxGain); n.start(now); n.stop(now + 0.12);
    }

    function playPickup() {
        ensureCtx(); const now = ctx.currentTime;
        [523.25, 659.25, 783.99].forEach((f, i) => {
            const o = ctx.createOscillator(); const g = ctx.createGain();
            o.type = 'sine'; o.frequency.value = f;
            g.gain.setValueAtTime(0.12, now + i * 0.07); g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.07 + 0.12);
            o.connect(g); g.connect(sfxGain); o.start(now + i * 0.07); o.stop(now + i * 0.07 + 0.15);
        });
    }

    function playKeyPickup() {
        ensureCtx(); const now = ctx.currentTime;
        [440, 554.37, 659.25, 880].forEach((f, i) => {
            const o = ctx.createOscillator(); const g = ctx.createGain();
            o.type = 'triangle'; o.frequency.value = f;
            g.gain.setValueAtTime(0.15, now + i * 0.1); g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.2);
            o.connect(g); g.connect(sfxGain); o.start(now + i * 0.1); o.stop(now + i * 0.1 + 0.25);
        });
    }

    function playElevator() {
        ensureCtx(); const now = ctx.currentTime;
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(60, now); o.frequency.linearRampToValueAtTime(200, now + 1.5);
        g.gain.setValueAtTime(0.15, now); g.gain.setValueAtTime(0.15, now + 1); g.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
        o.connect(g); g.connect(sfxGain); o.start(now); o.stop(now + 1.6);
    }

    function playFootstep() {
        ensureCtx(); const now = ctx.currentTime;
        const n = noiseBuf(0.025); const g = ctx.createGain(); const f = ctx.createBiquadFilter();
        f.type = 'lowpass'; f.frequency.value = 600;
        g.gain.setValueAtTime(0.04, now); g.gain.exponentialRampToValueAtTime(0.01, now + 0.025);
        n.connect(f); f.connect(g); g.connect(sfxGain); n.start(now); n.stop(now + 0.03);
    }

    function noiseBuf(dur) {
        const len = ctx.sampleRate * dur;
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        const s = ctx.createBufferSource(); s.buffer = buf; return s;
    }

    return {
        init, startMusic, stopMusic, setCombatIntensity, setBPM,
        playShoot, playReload, playMonsterHurt, playMonsterDeath, playBossRoar,
        playPlayerHurt, playPickup, playKeyPickup, playElevator, playFootstep
    };
})();
