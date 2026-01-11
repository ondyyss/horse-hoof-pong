/**
 * HOOF PONG - PERFECT CENTER CALIBRATION
 * Kompletní kód: Střed baru = střed kelímků.
 */
const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 450,
    height: 800,
    backgroundColor: '#16a085',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } }
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
        const playBtn = this.add.rectangle(width / 2, height / 2, 220, 70, 0x27ae60).setInteractive();
        this.add.text(width / 2, height / 2, 'START', { fontSize: '32px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
        playBtn.on('pointerdown', () => this.scene.start('GameScene'));
    }
}

class GameScene extends Phaser.Scene {
    constructor() { super('GameScene'); }

    preload() {
        let g = this.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0xffffff); g.fillCircle(12, 12, 12); g.generateTexture('ball', 24, 24);
        g.clear(); g.fillStyle(0x000000, 0.3); g.fillCircle(12, 12, 12); g.generateTexture('shadow', 24, 24);
        g.clear(); g.fillStyle(0xc0392b); g.fillCircle(20, 20, 20); g.fillStyle(0xe74c3c); g.fillCircle(20, 20, 17); g.generateTexture('cup', 40, 40);
        g.clear(); g.fillStyle(0x3e2723); g.fillRoundedRect(0, 0, 80, 50, 10); g.generateTexture('hoof', 80, 50);
        g.clear(); g.fillStyle(0xffa500); g.fillCircle(4, 4, 4); g.generateTexture('fire1', 8, 8);
        g.clear(); g.fillStyle(0xffff00); g.fillCircle(2, 2, 2); g.generateTexture('fire2', 4, 4);
    }

    create() {
        const { width, height } = this.scale;
        this.currentRound = 1; this.shotsInRound = 0; this.hitsInRound = 0;
        this.isFlying = false; this.aimingState = 'IDLE';

        // --- POWER BAR S PLYNULÝM GRADIENTEM ---
        this.powerValue = 0;
        this.powerDir = 1;
        this.barContainer = this.add.container(width - 50, height / 2).setVisible(false).setDepth(100);
        
        let barBg = this.add.graphics();
        barBg.fillStyle(0x000000, 0.6);
        barBg.fillRoundedRect(-15, -105, 30, 210, 8);

        // Gradient: Horní půlka (Zelená -> Žlutá -> Červená)
        barBg.fillGradientStyle(0xff0000, 0xff0000, 0x00ff00, 0x00ff00, 1);
        barBg.fillRect(-10, -100, 20, 100);
        // Gradient: Spodní půlka (Zelená -> Žlutá -> Červená)
        barBg.fillGradientStyle(0x00ff00, 0x00ff00, 0xff0000, 0xff0000, 1);
        barBg.fillRect(-10, 0, 20, 100);

        this.barContainer.add(barBg);
        this.pointer = this.add.rectangle(0, 0, 40, 6, 0xffffff).setDepth(101).setStrokeStyle(2, 0x000000);
        this.barContainer.add(this.pointer);

        // --- OBJEKTY ---
        this.aimLine = this.add.graphics().setDepth(10);
        this.cups = this.physics.add.staticGroup();
        this.spawnCups(10);

        this.ball = this.physics.add.sprite(width / 2, height - 110, 'ball').setDepth(20);
        this.ballShadow = this.add.sprite(width / 2, height - 100, 'shadow').setAlpha(0.3).setDepth(4);
        this.hoof = this.add.sprite(width / 2, height - 70, 'hoof').setDepth(5);

        this.uiText = this.add.text(20, 20, '', { fontSize: '20px', fill: '#fff', fontStyle: 'bold' }).setDepth(50);
        this.updateUI();

        this.input.on('pointerdown', () => this.handleDown());
        this.input.on('pointermove', (p) => this.handleMove(p));
        this.input.on('pointerup', () => this.handleUp());
    }

    handleDown() {
        if (this.isFlying) return;
        if (this.aimingState === 'IDLE') {
            this.aimingState = 'AIMING';
        } else if (this.aimingState === 'POWER') {
            this.shoot();
        }
    }

    handleMove(pointer) {
        if (this.aimingState === 'AIMING') {
            this.aimAngle = Phaser.Math.Angle.Between(this.ball.x, this.ball.y, pointer.x, pointer.y);
        }
    }

    handleUp() {
        if (this.aimingState === 'AIMING') {
            this.aimingState = 'POWER';
            this.powerValue = 0; 
            this.powerDir = 1;
            this.barContainer.setVisible(true);
        }
    }

    update() {
        this.aimLine.clear();
        if (this.aimingState === 'AIMING') {
            this.aimLine.lineStyle(3, 0xffffff, 0.3);
            this.aimLine.lineBetween(this.ball.x, this.ball.y, this.ball.x + Math.cos(this.aimAngle) * 100, this.ball.y + Math.sin(this.aimAngle) * 100);
        }

        if (this.aimingState === 'POWER') {
            this.powerValue += this.powerDir * 0.015; 
            if (this.powerValue >= 1 || this.powerValue <= 0) this.powerDir *= -1;
            this.pointer.y = 100 - (this.powerValue * 200);
        }

        if (this.ball) {
            this.ballShadow.x = this.ball.x;
            this.ballShadow.y = this.ball.y + 20;
            if (this.shotsInRound === 2 && this.hitsInRound === 2) {
                this.emitFire(!this.isFlying);
                this.ball.setTint(0xffaa00);
            } else { this.ball.clearTint(); }
        }
    }

    shoot() {
        this.isFlying = true;
        this.barContainer.setVisible(false);
        this.aimingState = 'IDLE';
        this.shotsInRound++;

        // --- KALIBRACE SÍLY ---
        // Střed (0.5) = přesný zásah do středu formace (cca 620 rychlost)
        // Rozptyl: od 450 (příliš slabé) do 790 (příliš silné)
        const minSpeed = 450;
        const maxSpeed = 790;
        const finalSpeed = minSpeed + (this.powerValue * (maxSpeed - minSpeed));

        this.ball.setVelocity(Math.cos(this.aimAngle) * finalSpeed, Math.sin(this.aimAngle) * finalSpeed);

        this.tweens.add({
            targets: this.ball, scale: 0.4, duration: 650, yoyo: true, ease: 'Quad.Out',
            onComplete: () => { this.isFlying = false; this.checkLanding(); }
        });
    }

    checkLanding() {
        this.ball.setVelocity(0);
        let hitFound = false;
        this.cups.children.entries.forEach(cup => {
            if (Phaser.Math.Distance.Between(this.ball.x, this.ball.y, cup.x, cup.y) < 26 && !hitFound) {
                hitFound = true; this.hitsInRound++;
                let msg = (this.shotsInRound === 3) ? "TRIPLE FIRE!" : (this.hitsInRound === 2 ? "DOUBLE HIT!" : "HIT!");
                this.popText(msg, cup.x, cup.y, '#f1c40f');
                cup.destroy(); this.updateFormations();
            }
        });

        if (!hitFound) {
            this.popText('MISS', this.scale.width / 2, this.scale.height / 2, '#e74c3c', 60);
            this.tweens.add({ targets: this.ball, y: this.ball.y + 40, alpha: 0, duration: 400 });
        }
        this.time.delayedCall(900, () => this.processTurn());
    }

    popText(txt, x, y, color, size = 32) {
        const t = this.add.text(x, y, txt, { fontSize: size + 'px', fill: color, fontStyle: '900', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5).setDepth(100);
        this.tweens.add({ targets: t, y: y - 100, alpha: 0, scale: 1.5, duration: 800, onComplete: () => t.destroy() });
    }

    processTurn() {
        let hasTriple = (this.hitsInRound === 2 && this.shotsInRound === 2);
        if (this.shotsInRound >= 3 || (this.shotsInRound === 2 && !hasTriple)) {
            this.currentRound++; this.shotsInRound = 0; this.hitsInRound = 0;
        }
        this.updateUI(); this.resetBall();
    }

    resetBall() {
        this.ball.setPosition(this.scale.width / 2, this.scale.height - 110).setVelocity(0).setScale(1).setAlpha(1);
        this.aimingState = 'IDLE';
    }

    updateUI() {
        let max = (this.hitsInRound === 2 && this.shotsInRound >= 2) ? 3 : 2;
        this.uiText.setText(`KOLO: ${this.currentRound} | HOD: ${this.shotsInRound + 1}/${max}`);
    }

    spawnCups(count) {
        this.cups.clear(true, true);
        const cx = this.scale.width / 2, sy = 150, gap = 42; 
        let layout = count === 10 ? [4, 3, 2, 1] : (count === 6 ? [3, 2, 1] : (count === 3 ? [2, 1] : [1]));
        layout.forEach((rowSize, rIdx) => {
            for (let i = 0; i < rowSize; i++) {
                this.cups.create(cx - ((rowSize - 1) * gap / 2) + (i * gap), sy + (rIdx * (gap * 0.866)), 'cup').setCircle(18);
            }
        });
    }

    updateFormations() {
        const left = this.cups.countActive();
        if ([6, 3, 1].includes(left)) this.spawnCups(left);
        else if (left === 0) this.spawnCups(10);
    }

    emitFire(isIdle) {
        const p = this.add.sprite(this.ball.x + (Math.random() * 10 - 5), this.ball.y, Math.random() > 0.5 ? 'fire1' : 'fire2');
        p.setDepth(19);
        this.tweens.add({ targets: p, y: isIdle ? p.y - 40 : p.y + 20, alpha: 0, duration: 400, onComplete: () => p.destroy() });
    }
}

config.scene = [MenuScene, GameScene];
new Phaser.Game(config);
