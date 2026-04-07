const Input = (() => {
    const keys = {};

    function init() {
        document.addEventListener('keydown', e => {
            keys[e.code] = true;
            if (e.code === 'KeyT') {
                PlayerAI.setEnabled(!PlayerAI.isEnabled());
                HUD.showMessage(PlayerAI.isEnabled() ? 'AI Autopilot ON' : 'AI Autopilot OFF');
            }
            if (e.code === 'Digit1') Weapons.switchTo(0);
            if (e.code === 'Digit2') Weapons.switchTo(1);
            if (e.code === 'Digit3') Weapons.switchTo(2);
            if (e.code === 'KeyR') { Weapons.startReload(performance.now() / 1000); Audio.playReload(); }
            if (e.code === 'KeyC') {
                const p = Player.getState();
                p.inCover = !p.inCover;
                HUD.showMessage(p.inCover ? 'In cover' : 'Left cover');
            }
        });
        document.addEventListener('keyup', e => { keys[e.code] = false; });
    }

    function handleManualInput(dt) {
        if (PlayerAI.isEnabled()) return;
        const p = Player.getState();
        if (!p.alive) return;

        let fwd = 0, str = 0;
        if (keys['KeyW'] || keys['ArrowUp']) fwd = 1;
        if (keys['KeyS'] || keys['ArrowDown']) fwd = -1;
        if (keys['KeyA']) str = -1;
        if (keys['KeyD']) str = 1;
        p.sprinting = !!keys['ShiftLeft'];
        Player.move(fwd, str, dt);
        if (keys['ArrowLeft']) Player.turn(-1, dt);
        if (keys['ArrowRight']) Player.turn(1, dt);
        if (keys['Space']) Player.shoot(performance.now() / 1000);
    }

    return { init, handleManualInput };
})();
