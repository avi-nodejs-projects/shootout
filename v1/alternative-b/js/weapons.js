const Weapons = (() => {
    let inventory = [];
    let currentIndex = 0;

    function reset() { inventory = []; currentIndex = 0; addWeapon('PISTOL'); }

    function addWeapon(type) {
        if (inventory.find(w => w.type === type)) return false;
        const d = CONFIG.WEAPONS[type];
        inventory.push({
            type, name: d.name, clip: d.clipSize, reserve: d.reserveAmmo,
            clipSize: d.clipSize, damage: d.damage, fireRate: d.fireRate,
            range: d.range, reloadTime: d.reloadTime, infiniteAmmo: d.infiniteAmmo,
            spread: d.spread || 0, pellets: d.pellets || 1,
            spreadAngle: d.spreadAngle || 0, color: d.color,
            projectile: d.projectile || false,
            lastFireTime: 0, reloading: false, reloadStartTime: 0,
        });
        currentIndex = inventory.length - 1;
        return true;
    }

    function current() { return inventory[currentIndex] || null; }
    function switchTo(i) { if (i >= 0 && i < inventory.length) currentIndex = i; }
    function switchWeapon(dir) { if (inventory.length > 1) currentIndex = (currentIndex + dir + inventory.length) % inventory.length; }

    function canFire(now) {
        const w = current();
        if (!w || w.reloading || w.clip <= 0) return false;
        return now - w.lastFireTime >= w.fireRate;
    }

    function fire(now) {
        const w = current();
        if (!canFire(now)) return null;
        w.clip--;
        w.lastFireTime = now;
        if (w.clip <= 0 && (w.reserve > 0 || w.infiniteAmmo)) startReload(now);
        return w;
    }

    function startReload(now) {
        const w = current();
        if (!w || w.reloading || w.clip >= w.clipSize) return;
        if (!w.infiniteAmmo && w.reserve <= 0) return;
        w.reloading = true;
        w.reloadStartTime = now;
    }

    function updateReload(now) {
        const w = current();
        if (!w || !w.reloading) return false;
        if (now - w.reloadStartTime >= w.reloadTime) {
            const needed = w.clipSize - w.clip;
            if (w.infiniteAmmo) { w.clip = w.clipSize; }
            else { const loaded = Math.min(needed, w.reserve); w.clip += loaded; w.reserve -= loaded; }
            w.reloading = false;
            return true;
        }
        return false;
    }

    function addAmmo(type, amount) {
        const w = inventory.find(w => w.type === type);
        if (w && !w.infiniteAmmo) { w.reserve += amount; return true; }
        return false;
    }

    function getInventory() { return inventory; }

    return { reset, addWeapon, current, switchTo, switchWeapon, canFire, fire, startReload, updateReload, addAmmo, getInventory };
})();
