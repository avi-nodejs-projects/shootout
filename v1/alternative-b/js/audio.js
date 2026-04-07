// Synthwave music & SFX — Neon aesthetic
const Audio = (() => {
    let ctx = null;
    let masterGain, musicGain, sfxGain;
    let musicPlaying = false;
    let combatIntensity = 0;
    let musicState = 'idle'; // idle, exploring, combat

    function init() {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = ctx.createGain();
        masterGain.gain.value = 0.5;
        masterGain.connect(ctx.destination);
        musicGain = ctx.createGain();
        musicGain.gain.value = 0.25;
        musicGain.connect(masterGain);
        sfxGain = ctx.createGain();
        sfxGain.gain.value = 0.6;
        sfxGain.connect(masterGain);
    }

    function ensureCtx() {
        if (!ctx) init();
        if (ctx.state === 'suspended') ctx.resume();
    }

    // --- Music ---
    const BPM = 110;
    const BEAT = 60 / BPM;
    const NOTES_Am = [220, 261.63, 293.66, 329.63, 392]; // A minor pentatonic

    function startMusic() {
        ensureCtx();
        if (musicPlaying) return;
        musicPlaying = true;
        scheduleSubBass();
        scheduleBassLine();
        scheduleDrums();
        schedulePad();
        scheduleLead();
    }

    function scheduleSubBass() {
        if (!musicPlaying) return;
        const now = ctx.currentTime;
        const loop = BEAT * 8;
        const roots = [55, 55, 65.41, 55];
        roots.forEach((f, i) => {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = f;
            g.gain.setValueAtTime(0.18, now + i * BEAT * 2);
            g.gain.exponentialRampToValueAtTime(0.01, now + (i + 1) * BEAT * 2);
            osc.connect(g); g.connect(musicGain);
            osc.start(now + i * BEAT * 2);
            osc.stop(now + (i + 1) * BEAT * 2 + 0.1);
        });
        setTimeout(() => scheduleSubBass(), loop * 1000 - 50);
    }

    function scheduleBassLine() {
        if (!musicPlaying) return;
        const now = ctx.currentTime;
        const loop = BEAT * 8;
        const pattern = [0, 0, 2, 0, 3, 0, 2, 4, 0, 0, 2, 0, 1, 0, 3, 0];
        pattern.forEach((ni, i) => {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            const flt = ctx.createBiquadFilter();
            osc.type = 'sawtooth';
            osc.frequency.value = NOTES_Am[ni] / 2;
            flt.type = 'lowpass';
            flt.frequency.value = 300 + combatIntensity * 600;
            const t = now + i * BEAT / 2;
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.12, t + 0.02);
            g.gain.exponentialRampToValueAtTime(0.01, t + BEAT / 2 - 0.02);
            osc.connect(flt); flt.connect(g); g.connect(musicGain);
            osc.start(t); osc.stop(t + BEAT / 2);
        });
        setTimeout(() => scheduleBassLine(), loop * 1000 - 50);
    }

    function scheduleDrums() {
        if (!musicPlaying) return;
        const now = ctx.currentTime;
        const loop = BEAT * 4;
        for (let i = 0; i < 4; i++) {
            const t = now + i * BEAT;
            // Kick
            const kick = ctx.createOscillator();
            const kg = ctx.createGain();
            kick.type = 'sine';
            kick.frequency.setValueAtTime(160, t);
            kick.frequency.exponentialRampToValueAtTime(35, t + 0.12);
            kg.gain.setValueAtTime(0.35, t);
            kg.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
            kick.connect(kg); kg.connect(musicGain);
            kick.start(t); kick.stop(t + 0.2);
            // Snare on 2,4
            if (i === 1 || i === 3) {
                const sn = createNoiseBuf(0.08);
                const sg = ctx.createGain();
                const sf = ctx.createBiquadFilter();
                sf.type = 'highpass'; sf.frequency.value = 1500;
                sg.gain.setValueAtTime(0.18, t);
                sg.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
                sn.connect(sf); sf.connect(sg); sg.connect(musicGain);
                sn.start(t); sn.stop(t + 0.1);
            }
            // Hi-hats on 16ths
            for (let h = 0; h < 4; h++) {
                const ht = t + h * BEAT / 4;
                const hh = createNoiseBuf(0.03);
                const hg = ctx.createGain();
                const hf = ctx.createBiquadFilter();
                hf.type = 'highpass'; hf.frequency.value = 7000;
                hg.gain.setValueAtTime(0.04 + (h === 0 ? 0.03 : 0), ht);
                hg.gain.exponentialRampToValueAtTime(0.01, ht + 0.02);
                hh.connect(hf); hf.connect(hg); hg.connect(musicGain);
                hh.start(ht); hh.stop(ht + 0.03);
            }
        }
        setTimeout(() => scheduleDrums(), loop * 1000 - 50);
    }

    function schedulePad() {
        if (!musicPlaying) return;
        const now = ctx.currentTime;
        const loop = BEAT * 16;
        const chords = [[220, 261.63, 329.63], [196, 246.94, 293.66], [174.61, 220, 261.63], [196, 261.63, 329.63]];
        chords.forEach((ch, ci) => {
            ch.forEach(f => {
                for (let d = 0; d < 2; d++) {
                    const osc = ctx.createOscillator();
                    const g = ctx.createGain();
                    const flt = ctx.createBiquadFilter();
                    osc.type = 'sawtooth';
                    osc.frequency.value = f * (1 + d * 0.004);
                    flt.type = 'lowpass';
                    flt.frequency.value = 800 + Math.sin(ci) * 200;
                    const st = now + ci * BEAT * 4;
                    g.gain.setValueAtTime(0, st);
                    g.gain.linearRampToValueAtTime(0.035, st + BEAT);
                    g.gain.setValueAtTime(0.035, st + BEAT * 3);
                    g.gain.linearRampToValueAtTime(0, st + BEAT * 4);
                    osc.connect(flt); flt.connect(g); g.connect(musicGain);
                    osc.start(st); osc.stop(st + BEAT * 4 + 0.1);
                }
            });
        });
        setTimeout(() => schedulePad(), loop * 1000 - 50);
    }

    function scheduleLead() {
        if (!musicPlaying) return;
        if (combatIntensity < 0.3) {
            setTimeout(() => scheduleLead(), BEAT * 8 * 1000 - 50);
            return;
        }
        const now = ctx.currentTime;
        const pattern = [4, 3, 2, 0, 2, 3, 4, 4];
        pattern.forEach((ni, i) => {
            const f = NOTES_Am[ni] * 2;
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            const dly = ctx.createDelay();
            const dlyG = ctx.createGain();
            osc.type = 'square';
            osc.frequency.value = f;
            dly.delayTime.value = BEAT / 2;
            dlyG.gain.value = 0.3;
            const t = now + i * BEAT;
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.06 * combatIntensity, t + 0.01);
            g.gain.exponentialRampToValueAtTime(0.01, t + BEAT * 0.7);
            osc.connect(g); g.connect(musicGain);
            osc.connect(dly); dly.connect(dlyG); dlyG.connect(musicGain);
            osc.start(t); osc.stop(t + BEAT);
        });
        setTimeout(() => scheduleLead(), BEAT * 8 * 1000 - 50);
    }

    function stopMusic() { musicPlaying = false; }
    function setCombatIntensity(v) { combatIntensity = Math.max(0, Math.min(1, v)); }

    // --- SFX ---
    function playShoot(weaponName) {
        ensureCtx();
        const now = ctx.currentTime;
        if (weaponName === 'Pistol') {
            const o = ctx.createOscillator(); const g = ctx.createGain();
            o.type = 'square'; o.frequency.setValueAtTime(800, now); o.frequency.exponentialRampToValueAtTime(200, now + 0.06);
            g.gain.setValueAtTime(0.25, now); g.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
            o.connect(g); g.connect(sfxGain); o.start(now); o.stop(now + 0.08);
        } else if (weaponName === 'Shotgun') {
            const n = createNoiseBuf(0.12); const g = ctx.createGain(); const f = ctx.createBiquadFilter();
            f.type = 'lowpass'; f.frequency.value = 2000;
            g.gain.setValueAtTime(0.45, now); g.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
            n.connect(f); f.connect(g); g.connect(sfxGain); n.start(now); n.stop(now + 0.15);
        } else if (weaponName === 'Plasma Rifle') {
            const o = ctx.createOscillator(); const g = ctx.createGain();
            o.type = 'sine'; o.frequency.setValueAtTime(200, now); o.frequency.linearRampToValueAtTime(2000, now + 0.08);
            g.gain.setValueAtTime(0.2, now); g.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
            o.connect(g); g.connect(sfxGain); o.start(now); o.stop(now + 0.15);
            // Echo
            const o2 = ctx.createOscillator(); const g2 = ctx.createGain();
            o2.type = 'sine'; o2.frequency.value = 1200;
            g2.gain.setValueAtTime(0, now + 0.05); g2.gain.linearRampToValueAtTime(0.08, now + 0.07); g2.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            o2.connect(g2); g2.connect(sfxGain); o2.start(now + 0.05); o2.stop(now + 0.22);
        }
    }

    function playReload() {
        ensureCtx();
        const now = ctx.currentTime;
        [800, 1200, 600].forEach((f, i) => {
            const o = ctx.createOscillator(); const g = ctx.createGain();
            o.type = 'sine'; o.frequency.value = f;
            g.gain.setValueAtTime(0.12, now + i * 0.12); g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.12 + 0.08);
            o.connect(g); g.connect(sfxGain); o.start(now + i * 0.12); o.stop(now + i * 0.12 + 0.1);
        });
    }

    function playMonsterHurt() {
        ensureCtx();
        const now = ctx.currentTime;
        const n = createNoiseBuf(0.06); const g = ctx.createGain(); const f = ctx.createBiquadFilter();
        f.type = 'bandpass'; f.frequency.value = 400;
        g.gain.setValueAtTime(0.2, now); g.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
        n.connect(f); f.connect(g); g.connect(sfxGain); n.start(now); n.stop(now + 0.08);
    }

    function playMonsterDeath() {
        ensureCtx();
        const now = ctx.currentTime;
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = 'sawtooth'; o.frequency.setValueAtTime(400, now); o.frequency.exponentialRampToValueAtTime(40, now + 0.3);
        g.gain.setValueAtTime(0.2, now); g.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        o.connect(g); g.connect(sfxGain); o.start(now); o.stop(now + 0.4);
        // Noise burst
        const n = createNoiseBuf(0.15); const ng = ctx.createGain();
        ng.gain.setValueAtTime(0.15, now); ng.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        n.connect(ng); ng.connect(sfxGain); n.start(now); n.stop(now + 0.18);
    }

    function playPlayerHurt() {
        ensureCtx();
        const now = ctx.currentTime;
        const n = createNoiseBuf(0.1); const g = ctx.createGain(); const f = ctx.createBiquadFilter();
        f.type = 'lowpass'; f.frequency.value = 300;
        const dist = ctx.createWaveShaper();
        dist.curve = makeDistCurve(300);
        g.gain.setValueAtTime(0.3, now); g.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        n.connect(dist); dist.connect(f); f.connect(g); g.connect(sfxGain); n.start(now); n.stop(now + 0.12);
    }

    function playPickup() {
        ensureCtx();
        const now = ctx.currentTime;
        [523.25, 659.25, 783.99].forEach((f, i) => {
            const o = ctx.createOscillator(); const g = ctx.createGain();
            o.type = 'sine'; o.frequency.value = f;
            g.gain.setValueAtTime(0.12, now + i * 0.07); g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.07 + 0.12);
            o.connect(g); g.connect(sfxGain); o.start(now + i * 0.07); o.stop(now + i * 0.07 + 0.15);
        });
    }

    function playFootstep() {
        ensureCtx();
        const now = ctx.currentTime;
        const n = createNoiseBuf(0.025); const g = ctx.createGain(); const f = ctx.createBiquadFilter();
        f.type = 'lowpass'; f.frequency.value = 600;
        g.gain.setValueAtTime(0.04, now); g.gain.exponentialRampToValueAtTime(0.01, now + 0.025);
        n.connect(f); f.connect(g); g.connect(sfxGain); n.start(now); n.stop(now + 0.03);
    }

    function playMonsterAlert() {
        ensureCtx();
        const now = ctx.currentTime;
        const o = ctx.createOscillator(); const g = ctx.createGain(); const f = ctx.createBiquadFilter();
        o.type = 'sawtooth'; o.frequency.value = 80;
        const lfo = ctx.createOscillator(); const lg = ctx.createGain();
        lfo.frequency.value = 5; lg.gain.value = 20;
        lfo.connect(lg); lg.connect(o.frequency);
        f.type = 'lowpass'; f.frequency.value = 200;
        g.gain.setValueAtTime(0.15, now); g.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        o.connect(f); f.connect(g); g.connect(sfxGain);
        o.start(now); o.stop(now + 0.45); lfo.start(now); lfo.stop(now + 0.45);
    }

    // Helpers
    function createNoiseBuf(dur) {
        const len = ctx.sampleRate * dur;
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        const s = ctx.createBufferSource(); s.buffer = buf; return s;
    }

    function makeDistCurve(amt) {
        const c = new Float32Array(256);
        for (let i = 0; i < 256; i++) { const x = (i * 2) / 256 - 1; c[i] = ((Math.PI + amt) * x) / (Math.PI + amt * Math.abs(x)); }
        return c;
    }

    return { init, startMusic, stopMusic, setCombatIntensity, playShoot, playReload,
        playMonsterHurt, playMonsterDeath, playPlayerHurt, playPickup, playFootstep, playMonsterAlert };
})();
