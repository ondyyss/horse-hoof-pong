/**
 * HOOF PONG - FIREBALL & COMBO EDITION
 * - Fireball se aktivuje až při Combu 2+.
 * - Bonusový hod po 2 zásazích v kole.
 * - Částicové efekty ohně.
 */
const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 450,
    height: 800,
    backgroundColor: '#16a085',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { 
        default: 'arcade', 
        arcade: { gravity: { y: 0 }, debug: false } 
    }
};

class MenuScene extends Phaser.Scene {
    constructor() { super('MenuScene'); }
    create() {
        const { width, height } = this.scale;
        this.add.text(width / 2, 150, 'HOOF PONG\nFIRE EDITION', { 
            fontSize: '50px', fill: '#fff', align: 'center', fontStyle: '900', stroke: '#000', strokeThickness: 8 
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
        // Míčky
        g.fillStyle(0xffffff); g.fillCircle(12, 12, 12); g.generateTexture('ball', 24, 24);
        g.clear(); g.fillStyle(0xff4400); g.fillCircle(12, 12, 12); g.fillStyle(0xffcc00); g.fillCircle(12, 12, 8); g.generateTexture('fireball', 24, 24);
        // Ostatní
        g.clear(); g.fillStyle(0x000000, 0.3); g.fillCircle(12, 12, 12); g.generateTexture('shadow', 24, 24);
        g.clear(); g.fillStyle(0xc0392b); g.fillCircle(20, 20, 20); g.fillStyle(0xe74c3c); g.fillCircle(20, 20, 17); g.generateTexture('cup', 40, 40);
        g.clear(); g.fillStyle(0xffffff, 0.6); g.fillCircle(4, 4, 4); g.generateTexture('dot', 8, 8);
        g.clear(); g.fillStyle(0xff6600, 1); g.fillRect(0, 0, 4, 4); g.generateTexture('particle', 4, 4);
    }

    create() {
        const { width, height } = this.scale;
        this.currentRound = 1; 
        this.shotsInRound = 0; 
        this.hitsInRound = 0; 
        this.comboCount = 0; 
        this.isFlying = false;
        this.hitRegistered = false;

        this.dots = [];
        for (let i = 0; i < 12; i++) this.dots.push(this.add.image(0, 0, 'dot').setAlpha(0).setDepth(10));

        // Částice pro oheň
        this.emitter = this.add.particles(0, 0, 'particle', {
            speed: { min: 20, max: 100 },
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 },
            blendMode: 'ADD',
            lifespan: 400,
            emitting: false
        }).setDepth(19);

        this.cups = this.physics.add.staticGroup();
        this.spawnCups(10); 

        this.ball = this.physics.add.sprite(width / 2, height - 110, 'ball').setDepth(20);
        this.ball.setBounce(0.7).setDrag(180);
        this.ballShadow = this.add.sprite(width / 2, height - 100, 'shadow').setAlpha(0.3).setDepth(4);
        
        this.physics.add.collider(this.ball, this.cups);

        this.uiText = this.add.text(20, 20, '', { fontSize: '18px', fill: '#fff', fontStyle: 'bold' }).setDepth(50);
        this.comboText = this.add.text(width/2, 250, '', { fontSize: '48px', fill: '#f1c40f', fontStyle: '900', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5).setDepth(100).setAlpha(0);
        
        this.updateUI();
        this.showRoundIntro();

        this.input.on('pointerdown', p => { if(!this.isFlying) this.swipeStart = { x: p.x, y: p.y }; });
        this.input.on('pointermove', p => { if(this.swipeStart) this.updateTrajectory(p); });
        this.input.on('pointerup', p => { if(this.swipeStart) this.handleSwipeEnd(p); });
    }

    spawnCups(count) {
        this.cups.clear(true, true);
        const cx = this.scale.width / 2, sy = 120, gap = 48;
        let layout = count === 10 ? [4, 3, 2, 1] : (count === 6 ? [3, 2, 1] : (count === 3 ? [2, 1] : [1]));
        layout.forEach((rowSize, rIdx) => {
            for (let i = 0; i < rowSize; i++) {
                this.cups.create(cx - ((rowSize - 1) * gap / 2) + (i * gap), sy + (rIdx * (gap * 0.85)), 'cup').setCircle(16);
            }
        });
    }

    updateTrajectory(p) {
        const dx = p.x - this.swipeStart.x, dy = p.y - this.swipeStart.y;
        const angle = Math.atan2(dy, dx), dist = Math.min(Math.sqrt(dx*dx + dy*dy), 220);
        this.dots.forEach((dot, i) => {
            const step = (i / this.dots.length);
            dot.setPosition(this.ball.x + Math.cos(angle) * dist * 4 * step, this.ball.y + Math.sin(angle) * dist * 4 * step);
            dot.setAlpha((1 - step) * 0.8);
        });
    }

    handleSwipeEnd(p) {
        const dx = p.x - this.swipeStart.x, dy = p.y - this.swipeStart.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        this.dots.forEach(d => d.setAlpha(0));
        if (dist > 30 && dy < 0) this.shoot(Math.atan2(dy, dx), dist);
        this.swipeStart = null;
    }

    shoot(angle, force) {
        this.isFlying = true;
        this.hitRegistered = false;
        this.shotsInRound++;
        
        // Fireball se aktivuje až při Combu 2 a více
        if (this.comboCount >= 2) {
            this.ball.setTexture('fireball');
            this.emitter.start();
        } else {
            this.ball.setTexture('ball');
            this.emitter.stop();
        }

        let speed = Math.min(Math.max(force * 3.8, 400), 1100);
        this.ball.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
        
        this.tweens.add({
            targets: this.ball, scale: 1.3, duration: 200, ease: 'Quad.Out',
            onComplete: () => {
                this.tweens.add({
                    targets: this.ball, scale: 0.6, duration: 600, yoyo: true, ease: 'Sine.InOut',
                    onUpdate: () => { this.ball.body.checkCollision.none = (this.ball.scale < 0.75); }
                });
            }
        });
    }

    checkHit() {
        if (!this.isFlying || this.hitRegistered) return;
        this.cups.children.entries.forEach(cup => {
            if (Phaser.Math.Distance.Between(this.ball.x, this.ball.y, cup.x, cup.y) < 30 && this.ball.scale > 0.8) {
                this.executeHit(cup);
            }
        });
    }

    executeHit(cup) {
        this.hitRegistered = true;
        this.isFlying = false;
        this.hitsInRound++;
        this.comboCount++;
        this.emitter.stop();

        let comboMsg = "HIT!";
        if (this.comboCount === 2) comboMsg = "DOUBLE HIT!";
        if (this.comboCount >= 3) comboMsg = "TRIPLE HIT!";
        this.showComboEffect(comboMsg);

        this.ball.setVelocity(0);
        this.tweens.killTweensOf(this.ball);
        this.tweens.add({
            targets: this.ball, x: cup.x, y: cup.y, scale: 0.7, alpha: 0.5, duration: 200,
            onComplete: () => {
                cup.destroy(); 
                this.updateFormations();
                this.updateUI();
                this.time.delayedCall(500, () => this.nextStep());
            }
        });
    }

    showComboEffect(msg) {
        this.comboText.setText(msg).setAlpha(1).setScale(0.5);
        this.tweens.add({ targets: this.comboText, scale: 1.2, duration: 400, ease: 'Back.Out', onComplete: () => {
            this.time.delayedCall(500, () => { this.tweens.add({ targets: this.comboText, alpha: 0, duration: 200 }); });
        }});
    }

    finishShot() {
        if (!this.isFlying) return;
        this.isFlying = false;
        this.comboCount = 0; 
        this.emitter.stop();
        this.popText('MISS', this.ball.x, this.ball.y - 40, '#e74c3c');
        this.tweens.add({ targets: this.ball, alpha: 0, duration: 300, onComplete: () => this.nextStep() });
    }

    nextStep() {
        if (this.cups.countActive() === 0) { this.showVictory(); return; }

        let maxShots = (this.hitsInRound === 2) ? 3 : 2;
        if (this.shotsInRound >= maxShots) {
            this.currentRound++;
            this.shotsInRound = 0;
            this.hitsInRound = 0;
            this.showRoundIntro();
        } else if (this.shotsInRound === 2 && this.hitsInRound === 2) {
            this.popText("BONUS SHOT!", 225, 400, '#2ecc71', 40);
        }
        this.updateUI();
        this.resetBall();
    }

    resetBall() {
        this.ball.setPosition(225, 690).setVelocity(0).setScale(1).setAlpha(1).setTexture('ball');
        this.ball.body.checkCollision.none = false;
        this.isFlying = false;
    }

    updateUI() {
        let max = (this.hitsInRound === 2 && this.shotsInRound >= 2) ? 3 : 2;
        this.uiText.setText(`KOLO: ${this.currentRound} | HOD: ${this.shotsInRound}/${max}\nCOMBO: ${this.comboCount}`);
    }

    showRoundIntro() {
        const t = this.add.text(225, 400, `KOLO ${this.currentRound}`, { fontSize: '70px', fill: '#fff', fontStyle: '900', stroke: '#000', strokeThickness: 10 }).setOrigin(0.5).setDepth(200).setScale(0);
        this.tweens.add({ targets: t, scale: 1, ease: 'Back.Out', duration: 600, onComplete: () => {
            this.time.delayedCall(600, () => { this.tweens.add({ targets: t, alpha: 0, duration: 300, onComplete: () => t.destroy() }); });
        }});
    }

    popText(txt, x, y, color, size = 32) {
        const t = this.add.text(x, y, txt, { fontSize: size+'px', fill: color, fontStyle: '900', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5).setDepth(100);
        this.tweens.add({ targets: t, y: y - 80, alpha: 0, duration: 800, onComplete: () => t.destroy() });
    }

    updateFormations() {
        const left = this.cups.countActive();
        if ([6, 3, 1].includes(left)) this.spawnCups(left);
    }

    showVictory() {
        this.add.rectangle(225, 400, 450, 800, 0x000000, 0.8).setDepth(1000);
        this.add.text(225, 400, 'VYČIŠTĚNO!', { fontSize: '60px', fill: '#f1c40f', fontStyle: '900' }).setOrigin(0.5).setDepth(1001);
        const btn = this.add.rectangle(225, 550, 200, 60, 0x27ae60).setInteractive().setDepth(1001);
        this.add.text(225, 550, 'RESTART', { fontSize: '24px', fill: '#fff' }).setOrigin(0.5).setDepth(1002);
        btn.on('pointerdown', () => this.scene.restart());
    }

    update() {
        if (!this.ball || this.gameOver) return;
        this.ballShadow.x = this.ball.x;
        this.ballShadow.y = this.ball.y + (this.ball.scale < 1 ? 25 : 10);
        this.ballShadow.setScale(this.ball.scale * 0.8);
        
        // Sledování částic za míčkem
        if (this.isFlying && this.comboCount >= 2) {
            this.emitter.setPosition(this.ball.x, this.ball.y);
        }

        if (this.isFlying) {
            this.checkHit();
            if (this.ball.y < -50 || this.ball.y > 850 || (this.ball.body.speed < 20 && this.ball.scale > 0.9)) this.finishShot();
        }
    }
}

config.scene = [MenuScene, GameScene];
new Phaser.Game(config);
