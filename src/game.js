/**
 * KONFIGURACE HRY - HORSE HOOF PONG (HIT & MISS UPDATE)
 */
const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 450,
    height: 800,
    backgroundColor: '#16a085',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0 }, debug: false }
    },
    scene: [] 
};

class MenuScene extends Phaser.Scene {
    constructor() { super('MenuScene'); }
    create() {
        const { width, height } = this.scale;
        let bg = this.add.graphics();
        bg.fillGradientStyle(0x1abc9c, 0x1abc9c, 0x16a085, 0x16a085, 1);
        bg.fillRect(0, 0, width, height);

        this.add.text(width / 2, 100, 'HOOF PONG', { 
            fontSize: '64px', fill: '#fff', align: 'center', fontStyle: '900', stroke: '#000', strokeThickness: 6
        }).setOrigin(0.5);

        this.playerName = localStorage.getItem('hoofName') || 'Hráč';
        const nameTxt = this.add.text(width / 2, 180, `👤 ${this.playerName}`, { 
            fontSize: '22px', fill: '#ffcc00', fontStyle: 'bold'
        }).setOrigin(0.5).setInteractive();

        nameTxt.on('pointerdown', () => {
            const n = prompt("Zadej své jméno:", this.playerName);
            if (n) { this.playerName = n; localStorage.setItem('hoofName', n); nameTxt.setText(`👤 ${n}`); }
        });

        const playBtn = this.add.rectangle(width / 2, 280, 220, 60, 0x27ae60).setInteractive();
        this.add.text(width / 2, 280, 'START HRY', { fontSize: '24px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
        playBtn.on('pointerdown', () => this.scene.start('GameScene'));

        this.add.text(width / 2, 380, '--- HISTORIE HER ---', { fontSize: '18px', fill: '#fff', alpha: 0.8 }).setOrigin(0.5);
        this.drawHistory();

        const bestAcc = localStorage.getItem('hoofBestAcc') || '0';
        this.add.text(width / 2, 350, `NEJLEPŠÍ ÚSPĚŠNOST: ${bestAcc}%`, { fontSize: '16px', fill: '#f1c40f' }).setOrigin(0.5);
    }

    drawHistory() {
        const { width } = this.scale;
        let history = JSON.parse(localStorage.getItem('hoofHistory') || '[]');
        history.reverse().slice(0, 5).forEach((game, index) => {
            const yPos = 420 + (index * 45);
            this.add.rectangle(width/2, yPos, 380, 35, 0x000, 0.2).setOrigin(0.5);
            const dateStr = game.date.split(' ')[0];
            const text = `${dateStr}  |  Kolo: ${game.round}  |  Acc: ${game.acc}%`;
            this.add.text(width/2, yPos, text, { fontSize: '16px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
        });
    }
}

class GameScene extends Phaser.Scene {
    constructor() { super('GameScene'); }

    preload() {
        this.generateTextures();
    }

    generateTextures() {
        let g = this.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0xffffff); g.fillCircle(12, 12, 12);
        g.generateTexture('ball', 24, 24);
        g.clear(); g.fillStyle(0x000000, 0.3); g.fillCircle(12, 12, 12);
        g.generateTexture('shadow', 24, 24);
        g.clear(); 
        g.fillStyle(0xc0392b); g.fillCircle(20, 20, 20); 
        g.fillStyle(0xe74c3c); g.fillCircle(20, 20, 17);
        g.lineStyle(2, 0xffffff, 0.5); g.strokeCircle(20, 20, 18);
        g.generateTexture('cup', 40, 40);
        g.clear(); g.fillStyle(0x3e2723); g.fillRoundedRect(0, 0, 80, 50, 10);
        g.generateTexture('hoof', 80, 50);
        g.clear(); g.fillStyle(0xf1c40f); g.fillCircle(3, 3, 3);
        g.generateTexture('splash_drop', 6, 6);
    }

    create() {
        const { width, height } = this.scale;
        this.totalShots = 0; this.totalHits = 0; this.currentRound = 1;
        this.shotsInRound = 0; this.hitsInRound = 0; this.canShoot = true;
        this.isConfirmingExit = false;
        this.comboCount = 0;

        this.splashManager = this.add.particles(0, 0, 'splash_drop', {
            speed: { min: -150, max: 150 }, angle: { min: 220, max: 320 },
            scale: { start: 1, end: 0 }, lifespan: 600, gravityY: 500, emitting: false
        }).setDepth(10);

        this.trajectoryGraphics = this.add.graphics().setDepth(1);
        this.cups = this.physics.add.staticGroup();
        this.spawnCups(10);

        this.ballShadow = this.add.sprite(width / 2, height - 100, 'shadow').setAlpha(0.3).setDepth(4);
        this.hoof = this.add.sprite(width / 2, height - 70, 'hoof').setDepth(5);
        this.ball = this.physics.add.sprite(width / 2, height - 110, 'ball').setCircle(12).setDepth(20);

        this.uiText = this.add.text(20, 20, 'KOLO: 1', { fontSize: '20px', fill: '#fff', fontStyle: 'bold' }).setDepth(30);
        this.statsText = this.add.text(20, 50, 'ÚSPĚŠNOST: 0%', { fontSize: '16px', fill: '#ffcc00' }).setDepth(30);
        
        const menuBtn = this.add.text(width - 20, 20, '✖ MENU', { fontSize: '20px', fill: '#fff', fontStyle: 'bold' }).setOrigin(1, 0).setInteractive().setDepth(30);
        menuBtn.on('pointerdown', () => this.confirmExit());

        this.infoText = this.add.text(width / 2, height / 2, '', { 
            fontSize: '52px', fill: '#f1c40f', fontStyle: '900', stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(50);

        this.setupExitDialog();

        this.input.on('pointerdown', p => { if (this.canShoot && !this.isConfirmingExit) this.swipeStart = { x: p.x, y: p.y }; });
        this.input.on('pointermove', p => { if (this.swipeStart && this.canShoot) this.drawTrajectory(p); });
        this.input.on('pointerup', p => { this.trajectoryGraphics.clear(); this.handleSwipe(p); });
    }

    drawTrajectory(pointer) {
        this.trajectoryGraphics.clear();
        this.trajectoryGraphics.lineStyle(3, 0xffffff, 0.4);
        const dx = (pointer.x - this.swipeStart.x) * 2.2;
        const dy = (pointer.y - this.swipeStart.y) * 3.5;
        if (dy < -30) {
            for (let i = 1; i <= 8; i++) {
                let t = i / 10;
                this.trajectoryGraphics.fillCircle(this.ball.x + dx * t, this.ball.y + dy * t, 3);
            }
        }
    }

    handleSwipe(pointer) {
        if (!this.canShoot || !this.swipeStart || this.isConfirmingExit) return;
        const dx = (pointer.x - this.swipeStart.x) * 2.2;
        const dy = (pointer.y - this.swipeStart.y) * 3.5;

        if (dy < -50) {
            this.canShoot = false;
            this.shotsInRound++;
            this.totalShots++;
            this.ball.setVelocity(dx, dy);
            const flightDuration = Math.abs(dy) * 1.8;

            this.tweens.add({
                targets: this.ball,
                scale: 0.4,
                duration: flightDuration / 2,
                yoyo: true,
                ease: 'Quad.Out',
                onComplete: () => { this.checkLanding(); }
            });
        }
        this.swipeStart = null;
    }

    checkLanding() {
        this.ball.setVelocity(0);
        let hitFound = false;

        this.cups.children.entries.forEach(cup => {
            const dist = Phaser.Math.Distance.Between(this.ball.x, this.ball.y, cup.x, cup.y);
            if (dist < 25 && !hitFound) {
                hitFound = true;
                this.comboCount++;
                this.showComboText(cup.x, cup.y);
                
                this.cameras.main.shake(150, 0.015);
                this.splashManager.emitParticleAt(cup.x, cup.y, 20);
                cup.destroy();
                this.hitsInRound++;
                this.totalHits++;
                this.updateStats();
                this.updateFormations();
            }
        });

        if (!hitFound) {
            this.comboCount = 0;
            this.showMissText(); // NOVÉ: Zobrazení MISS
            this.tweens.add({
                targets: this.ball,
                y: this.ball.y + 50,
                alpha: 0,
                duration: 400,
                onComplete: () => this.processTurn()
            });
        } else {
            this.time.delayedCall(800, () => this.processTurn()); // Prodloužená pauza po zásahu
        }
    }

    showComboText(x, y) {
        let txt = "HIT!";
        let color = "#ffffff";
        if (this.comboCount === 2) { txt = "DOUBLE HIT!"; color = "#f1c40f"; }
        else if (this.comboCount >= 3) { txt = "TRIPLE HIT!!!"; color = "#e67e22"; }

        const floatingText = this.add.text(x, y - 20, txt, {
            fontSize: '32px', fill: color, fontStyle: '900', stroke: '#000', strokeThickness: 5
        }).setOrigin(0.5).setDepth(40);

        this.tweens.add({
            targets: floatingText,
            y: y - 120,
            alpha: 0,
            scale: 1.4,
            duration: 1200, // Déle na obrazovce
            ease: 'Cubic.out',
            onComplete: () => floatingText.destroy()
        });
    }

    // NOVÉ: Funkce pro nápis MISS
    showMissText() {
        const { width, height } = this.scale;
        const missText = this.add.text(width / 2, height / 2, "MISS", {
            fontSize: '60px', fill: '#e74c3c', fontStyle: '900', stroke: '#000', strokeThickness: 6
        }).setOrigin(0.5).setDepth(40).setAlpha(0).setScale(0.5);

        this.tweens.add({
            targets: missText,
            alpha: 1,
            scale: 1.2,
            duration: 300,
            ease: 'Back.out',
            onComplete: () => {
                // Jemné zatřesení s textem
                this.tweens.add({
                    targets: missText,
                    x: width / 2 + 5,
                    duration: 50,
                    yoyo: true,
                    repeat: 4
                });
                // Po chvíli zmizí
                this.time.delayedCall(800, () => {
                    this.tweens.add({
                        targets: missText,
                        alpha: 0,
                        scale: 1.5,
                        duration: 300,
                        onComplete: () => missText.destroy()
                    });
                });
            }
        });
    }

    update() {
        if (this.ball && !this.canShoot) {
            this.ballShadow.x = this.ball.x;
            this.ballShadow.y = this.ball.y + (this.ball.scale * 20);
            this.ballShadow.setScale(this.ball.scale);
        }
    }

    spawnCups(count) {
        this.cups.clear(true, true);
        const cx = this.scale.width / 2;
        const sy = 150; const gap = 40; 
        let layout = count === 10 ? [4, 3, 2, 1] : (count === 6 ? [3, 2, 1] : (count === 3 ? [2, 1] : [1]));
        layout.forEach((rowSize, rIdx) => {
            for (let i = 0; i < rowSize; i++) {
                const x = cx - ((rowSize - 1) * gap / 2) + (i * gap);
                const y = sy + (rIdx * (gap * 0.866));
                this.cups.create(x, y, 'cup').setCircle(18).setDepth(2);
            }
        });
    }

    updateStats() {
        const acc = Math.round((this.totalHits / this.totalShots) * 100);
        this.statsText.setText(`ÚSPĚŠNOST: ${acc}%`);
        const best = localStorage.getItem('hoofBestAcc') || 0;
        if (acc > best && this.totalShots > 5) localStorage.setItem('hoofBestAcc', acc);
    }

    updateFormations() {
        const left = this.cups.countActive();
        if ([6, 3, 1].includes(left)) this.spawnCups(left);
        else if (left === 0) { this.saveGameToHistory(); this.showBanner("VÍTĚZ!"); this.time.delayedCall(2000, () => this.scene.start('MenuScene')); }
    }

    processTurn() {
        if (this.shotsInRound >= 2) {
            this.currentRound++;
            this.uiText.setText(`KOLO: ${this.currentRound}`); 
            this.showBanner(`KOLO ${this.currentRound}`);
            this.shotsInRound = 0; this.hitsInRound = 0;
            this.resetBall();
        } else {
            this.resetBall();
        }
    }

    resetBall() {
        this.ball.setPosition(this.scale.width / 2, this.scale.height - 110).setVelocity(0).setScale(1).setAlpha(1);
        this.ballShadow.setPosition(this.scale.width / 2, this.scale.height - 100).setScale(1).setVisible(true);
        this.canShoot = true;
    }

    setupExitDialog() {
        const { width, height } = this.scale;
        this.exitOverlay = this.add.container(0, 0).setDepth(100).setVisible(false);
        const bg = this.add.rectangle(0, 0, width, height, 0x000000, 0.8).setOrigin(0);
        const box = this.add.rectangle(width/2, height/2, 300, 200, 0x2c3e50).setOrigin(0.5);
        const txt = this.add.text(width/2, height/2 - 40, 'OPRAVDU ODEJÍT?', { fontSize: '24px', fill: '#fff' }).setOrigin(0.5);
        const yesBtn = this.add.text(width/2 - 60, height/2 + 40, 'ANO', { fontSize: '28px', fill: '#e74c3c', fontStyle: 'bold' }).setOrigin(0.5).setInteractive();
        const noBtn = this.add.text(width/2 + 60, height/2 + 40, 'NE', { fontSize: '28px', fill: '#2ecc71', fontStyle: 'bold' }).setOrigin(0.5).setInteractive();
        yesBtn.on('pointerdown', () => { this.saveGameToHistory(); this.scene.start('MenuScene'); });
        noBtn.on('pointerdown', () => { this.exitOverlay.setVisible(false); this.isConfirmingExit = false; });
        this.exitOverlay.add([bg, box, txt, yesBtn, noBtn]);
    }

    saveGameToHistory() {
        if (this.totalShots === 0) return;
        let history = JSON.parse(localStorage.getItem('hoofHistory') || '[]');
        const acc = Math.round((this.totalHits / this.totalShots) * 100);
        history.push({ date: new Date().toLocaleString('cs-CZ'), round: this.currentRound, acc: acc });
        localStorage.setItem('hoofHistory', JSON.stringify(history));
    }

    confirmExit() { this.isConfirmingExit = true; this.exitOverlay.setVisible(true); }

    showBanner(txt) {
        this.infoText.setText(txt).setAlpha(1).setScale(0);
        this.tweens.add({ targets: this.infoText, alpha: 1, scale: 1, duration: 400, ease: 'Back.out' });
        this.time.delayedCall(1200, () => this.tweens.add({ targets: this.infoText, alpha: 0, scale: 0, duration: 400 }));
    }
}

config.scene = [MenuScene, GameScene];
new Phaser.Game(config);
