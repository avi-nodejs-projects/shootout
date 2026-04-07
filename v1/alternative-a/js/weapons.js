// Weapon system
const Weapons = (() => {
    let inventory = [];
    let currentIndex = 0;

    function reset() {
        inventory = [];
        currentIndex = 0;
        // Start with pistol
        addWeapon('PISTOL');
    }

    function addWeapon(type) {
        if (inventory.find(w => w.type === type)) return false;
        const def = CONFIG.WEAPONS[type];
        inventory.push({
            type,
            name: def.name,
            clip: def.clipSize,
            reserve: def.reserveAmmo,
            clipSize: def.clipSize,
            damage: def.damage,
            fireRate: def.fireRate,
            range: def.range,
            reloadTime: def.reloadTime,
            infiniteAmmo: def.infiniteAmmo,
            spread: def.spread || 0,
            pellets: def.pellets || 1,
            spreadAngle: def.spreadAngle || 0,
            lastFireTime: 0,
            reloading: false,
            reloadStartTime: 0,
        });
        currentIndex = inventory.length - 1;
        return true;
    }

    function current() {
        return inventory[currentIndex] || null;
    }

    function switchWeapon(dir) {
        if (inventory.length <= 1) return;
        currentIndex = (currentIndex + dir + inventory.length) % inventory.length;
    }

    function switchTo(index) {
        if (index >= 0 && index < inventory.length) {
            currentIndex = index;
        }
    }

    function canFire(now) {
        const w = current();
        if (!w || w.reloading) return false;
        if (w.clip <= 0) return false;
        if (now - w.lastFireTime < w.fireRate) return false;
        return true;
    }

    function fire(now) {
        const w = current();
        if (!canFire(now)) return null;
        w.clip--;
        w.lastFireTime = now;

        // Auto-reload when empty
        if (w.clip <= 0 && (w.reserve > 0 || w.infiniteAmmo)) {
            startReload(now);
        }

        return w;
    }

    function startReload(now) {
        const w = current();
        if (!w || w.reloading) return;
        if (w.clip >= w.clipSize) return;
        if (!w.infiniteAmmo && w.reserve <= 0) return;
        w.reloading = true;
        w.reloadStartTime = now;
    }

    function updateReload(now) {
        const w = current();
        if (!w || !w.reloading) return false;
        if (now - w.reloadStartTime >= w.reloadTime) {
            const needed = w.clipSize - w.clip;
            if (w.infiniteAmmo) {
                w.clip = w.clipSize;
            } else {
                const loaded = Math.min(needed, w.reserve);
                w.clip += loaded;
                w.reserve -= loaded;
            }
            w.reloading = false;
            return true;
        }
        return false;
    }

    function addAmmo(type, amount) {
        const w = inventory.find(w => w.type === type);
        if (w && !w.infiniteAmmo) {
            w.reserve += amount;
            return true;
        }
        return false;
    }

    function getInventory() {
        return inventory;
    }

    return { reset, addWeapon, current, switchWeapon, switchTo, canFire, fire, startReload, updateReload, addAmmo, getInventory };
})();
