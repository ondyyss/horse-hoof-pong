/**
 * KONFIGURACE HRY - HOOF PONG (COMPLETE STABLE VERSION)
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
    }
};

class MenuScene extends Phaser.Scene {
    constructor() { super('MenuScene'); }
    create() {
        const { width, height } = this.scale;
        let bg = this.add.graphics();
        bg.fillGradientStyle(0x1abc9c, 0x1abc9c, 0x16a085, 0x16a085, 1);
        bg.fillRect(0, 0, width, height);

        this.add.text(width / 2, 150, 'HOOF PONG', { 
            fontSize: '64px', fill: '#fff', fontStyle: '900', stroke: '#000', strokeThickness: 8 
        }).setOrigin(0.5);

        const playBtn = this.add.rectangle(width / 2, height / 2, 250, 70, 0x27ae60).setInteractive();
        this.add.text(width / 2, height / 2, 'START HRY', { 
            fontSize: '32px', fill: '#fff', fontStyle: 'bold' 
        }).setOrigin(0.5);

        playBtn.on('pointerdown', () => this.scene.start('GameScene'));
        
        this.add.text(width / 2, height - 100, 'Tref 2x za sebou pro FIREBALL!', { 
            fontSize: '18px', fill: '#fff', alpha: 0.8 
        }).setOrigin(0.5);
    }
}

class GameScene extends Phaser.Scene {
    constructor() { super('GameScene'); }

    preload() {
        // Generování textur přímo v kódu (bez nutnosti externích obrázků)
        let g = this.make.graphics({ x: 0, y: 0, add: false });
        
        g.fillStyle(0xffffff); g.fillCircle(12, 12, 12); 
        g.generateTexture('ball', 24, 24);

        g.clear(); g.fillStyle(0x000000, 0.3); g.fillCircle(12, 12, 12); 
        g.generateTexture('shadow', 24, 24);

        g.clear(); g.fillStyle(0xc0392b); g.fillCircle(20, 20, 20); 
        g.fillStyle(0xe74c3c); g.fillCircle(20, 20, 17);
        g.generateTexture('cup', 40, 40);

        g.clear(); g.fillStyle(0x3e2723); g.fillRoundedRect(0, 0, 80, 50, 10); 
        g.generateTexture('hoof', 80, 50);

        g.clear(); g.fillStyle(0xffa500); g.fillCircle(4, 4, 4); 
        g.generateTexture('fire1', 8, 8);
        
        g.clear(); g.fillStyle(0xffff00); g.fillCircle(2, 2, 2); 
        g.generateTexture('fire2', 4, 4);
    }

    create() {
        const { width, height } = this.scale;
        
        // Logika hry
        this.currentRound = 1;
        this.shotsInRound = 0;
        this.comboCount = 0;
        this.totalHits = 0;
        this.totalShots = 0;
        this.canShoot = true;
        this.isFlying = false;

        // Objekty
        this.cups = this.physics.add.staticGroup();
        this.spawnCups(10);
        
        this.ballShadow = this.add.sprite(width / 2, height - 100, 'shadow').setAlpha(0.3).setDepth(4);
        this.hoof = this.add.sprite(width / 2, height - 70, 'hoof').setDepth(5);
        this.ball = this.physics.add.sprite(width / 2, height - 110, 'ball').setCircle(12).setDepth(20);

        // UI
        this.uiText = this.add.text(20, 20, '', { fontSize: '22px', fill: '#fff', fontStyle: 'bold' }).setDepth(30);
        this.updateUI();

        this.infoText = this.add.text(width / 2, height / 2, '', { 
            fontSize: '52px', fill: '#f1c40f', fontStyle: '900', stroke: '#000', strokeThickness: 6 
        }).setOrigin(0.5).setDepth(50);

        // Ovládání
        this.input.on('pointerdown', p => { if (this.canShoot) this.swipeStart = { x: p.x, y: p.y }; });
        this.input.on('pointerup', p => { this.handleSwipe(p); });
    }

    update() {
        if (this.ball) {
            this.ballShadow.x = this.ball.x;
            this.ballShadow.y = this.ball.y + (this.ball.scale * 20);
            this.ballShadow.setScale(this.ball.scale);

            // Efekt ohně (pokud jsou v tomto kole 2 hity)
            if (this.comboCount >= 2) {
                this.emitFire(!this.isFlying);
                this.ball.setTint(0xffaa00);
            } else {
                this.ball.clearTint();
            }
        }
    }

    emitFire(isIdle) {
        const p = this.add.sprite(this.ball.x + (Math.random() * 10 - 5), this.ball.y, Math.random() > 0.5 ? 'fire1' : 'fire2');
        p.setDepth(19).setScale(this.ball.scale);
        this.tweens.add({
            targets: p,
            x: p.x + (Math.random() * 40 - 20),
            y: p.y - (isIdle ? 50 : -30),
            alpha: 0, scale: 0, duration: 400,
            onComplete: () => p.destroy()
        });
    }

    handleSwipe(pointer) {
        if (!this.canShoot || !this.swipeStart) return;
        const dx = (pointer.x - this.swipeStart.x) * 2.2;
        const dy = (pointer.y - this.swipeStart.y) * 3.5;

        if (dy < -50) {
            this.canShoot = false;
            this.isFlying = true;
            this.shotsInRound++;
            this.totalShots++;
            this.updateUI();
            this.ball.setVelocity(dx, dy);

            const flightDuration = Math.abs(dy) * 1.8;
            this.tweens.add({
                targets: this.ball, scale: 0.4, duration: flightDuration / 2, yoyo: true, ease: 'Quad.Out',
                onComplete: () => { this.isFlying = false; this.checkLanding(); }
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
                this.totalHits++;
                this.showComboText(cup.x, cup.y);
                cup.destroy();
                this.updateFormations();
            }
        });

        if (!hitFound) {
            this.showMissText(() => this.processTurn());
            this.tweens.add({ targets: this.ball, y: this.ball.y + 50, alpha: 0, duration: 400 });
        } else {
            this.time.delayedCall(800, () => this.processTurn());
        }
    }

    processTurn() {
        if (this.shotsInRound >= 3) {
            this.currentRound++;
            this.shotsInRound = 0;
            this.comboCount = 0; // Reset comba pro nové kolo
            this.showBanner(`KOLO ${this.currentRound}`);
            this.updateUI();
            this.resetBall();
        } else {
            this.resetBall();
        }
    }

    updateUI() {
        this.uiText.setText(`KOLO: ${this.currentRound} | HODY: ${3 - this.shotsInRound}`);
    }

    resetBall() {
        this.ball.setPosition(this.scale.width / 2, this.scale.height - 110).setVelocity(0).setScale(1).setAlpha(1);
        this.canShoot = true;
    }

    showComboText(x, y) {
        let txt = "HIT!"; 
        if (this.comboCount === 2) txt = "DOUBLE HIT!";
        if (this.comboCount === 3) txt = "TRIPLE HIT!!!";
        
        const t = this.add.text(x, y - 20, txt, { fontSize: '32px', fill: '#fff', fontStyle: '900', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5).setDepth(40);
        this.tweens.add({ targets: t, y: y - 100, alpha: 0, duration: 1000, onComplete: () => t.destroy() });
    }

    showMissText(callback) {
        const { width, height } = this.scale;
        const m = this.add.text(width / 2, height / 2, "MISS", { fontSize: '60px', fill: '#e74c3c', fontStyle: '900', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5).setDepth(40);
        this.tweens.add({ targets: m, scale: 1.2, duration: 200, yoyo: true, repeat: 1, onComplete: () => {
            this.time.delayedCall(500, () => { 
                this.tweens.add({ targets: m, alpha: 0, duration: 200, onComplete: () => { m.destroy(); callback(); } }); 
            });
        }});
    }

    spawnCups(count) {
        this.cups.clear(true, true);
        const cx = this.scale.width / 2, sy = 150, gap = 40; 
        let layout = count === 10 ? [4, 3, 2, 1] : (count === 6 ? [3, 2, 1] : (count === 3 ? [2, 1] : [1]));
        layout.forEach((rowSize, rIdx) => {
            for (let i = 0; i < rowSize; i++) {
                const x = cx - ((rowSize - 1) * gap / 2) + (i * gap);
                const y = sy + (rIdx * (gap * 0.866));
                this.cups.create(x, y, 'cup').setCircle(18).setDepth(2);
            }
        });
    }

    updateFormations() {
        if (this.cups.countActive() === 0) {
            this.showBanner("VÍTĚZ!");
            this.time.delayedCall(2000, () => this.scene.start('MenuScene'));
        }
    }

    showBanner(txt) {
        this.infoText.setText(txt).setAlpha(1).setScale(0);
        this.tweens.add({ targets: this.infoText, scale: 1, duration: 400, ease: 'Back.out' });
        this.time.delayedCall(1200, () => this.tweens.add({ targets: this.infoText, alpha: 0, duration: 400 }));
    }
}

// Spuštění hry - POZOR na pole scene!
const game = new Phaser.Game({
    ...config,
    scene: [MenuScene, GameScene]
});
