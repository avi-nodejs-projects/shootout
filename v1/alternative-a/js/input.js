// Keyboard input handler for manual override
const Input = (() => {
    const keys = {};

    function init() {
        document.addEventListener('keydown', e => {
            keys[e.code] = true;

            // Toggle AI with T
            if (e.code === 'KeyT') {
                PlayerAI.setEnabled(!PlayerAI.isEnabled());
                HUD.showMessage(PlayerAI.isEnabled() ? 'AI Autopilot ON' : 'AI Autopilot OFF');
            }

            // Manual weapon switch
            if (e.code === 'Digit1') Weapons.switchTo(0);
            if (e.code === 'Digit2') Weapons.switchTo(1);
            if (e.code === 'Digit3') Weapons.switchTo(2);

            // Manual reload
            if (e.code === 'KeyR') {
                Weapons.startReload(performance.now() / 1000);
                Audio.playReload();
            }
        });

        document.addEventListener('keyup', e => {
            keys[e.code] = false;
        });
    }

    function handleManualInput(dt) {
        if (PlayerAI.isEnabled()) return;

        const p = Player.getState();
        if (!p.alive) return;

        // Movement
        let forward = 0, strafe = 0;
        if (keys['KeyW'] || keys['ArrowUp']) forward = 1;
        if (keys['KeyS'] || keys['ArrowDown']) forward = -1;
        if (keys['KeyA']) strafe = -1;
        if (keys['KeyD']) strafe = 1;

        Player.move(forward, strafe, dt);

        // Turning
        if (keys['ArrowLeft']) Player.turn(-1, dt);
        if (keys['ArrowRight']) Player.turn(1, dt);

        // Shooting
        if (keys['Space']) {
            Player.shoot(performance.now() / 1000);
        }
    }

    function isDown(code) {
        return !!keys[code];
    }

    return { init, handleManualInput, isDown };
})();
