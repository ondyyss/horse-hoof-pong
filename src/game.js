/**
 * KONFIGURACE HRY - HOOF PONG (POWER BAR UPDATE)
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

class GameScene extends Phaser.Scene {
    constructor() { super('GameScene'); }
    preload() { this.generateTextures(); }

    generateTextures() {
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
        this.isFlying = false;

        // Stavy míření
        this.aimingState = 'IDLE'; // IDLE, AIMING, POWER
        this.aimAngle = 0;
        this.powerValue = 0;
        this.powerDir = 1;

        // Grafika míření a baru
        this.aimLine = this.add.graphics();
        this.powerBarBg = this.add.rectangle(width - 40, height / 2, 20, 200, 0x000000, 0.5).setVisible(false);
        this.powerBarFill = this.add.rectangle(width - 40, height / 2 + 100, 20, 0, 0xffcc00).setOrigin(0.5, 1).setVisible(false);

        this.cups = this.physics.add.staticGroup();
        this.spawnCups(10);
        
        this.ballShadow = this.add.sprite(width / 2, height - 100, 'shadow').setAlpha(0.3).setDepth(4);
        this.hoof = this.add.sprite(width / 2, height - 70, 'hoof').setDepth(5);
        this.ball = this.physics.add.sprite(width / 2, height - 110, 'ball').setCircle(12).setDepth(20);

        this.uiText = this.add.text(20, 20, '', { fontSize: '20px', fill: '#fff', fontStyle: 'bold' }).setDepth(30);
        this.updateUI();

        this.input.on('pointerdown', p => this.handlePointerDown(p));
        this.input.on('pointermove', p => this.handlePointerMove(p));
        this.input.on('pointerup', p => this.handlePointerUp(p));
    }

    handlePointerDown(pointer) {
        if (this.isFlying) return;

        if (this.aimingState === 'IDLE') {
            this.aimingState = 'AIMING';
        } else if (this.aimingState === 'POWER') {
            this.shoot();
        }
    }

    handlePointerMove(pointer) {
        if (this.aimingState === 'AIMING') {
            const dx = pointer.x - this.ball.x;
            const dy = pointer.y - this.ball.y;
            this.aimAngle = Math.atan2(dy, dx);
        }
    }

    handlePointerUp() {
        if (this.aimingState === 'AIMING') {
            this.aimingState = 'POWER';
            this.powerBarBg.setVisible(true);
            this.powerBarFill.setVisible(true);
        }
    }

    update(time, delta) {
        // Grafika mířidla
        this.aimLine.clear();
        if (this.aimingState === 'AIMING') {
            this.aimLine.lineStyle(2, 0xffffff, 0.5);
            const length = 100;
            this.aimLine.lineBetween(this.ball.x, this.ball.y, 
                this.ball.x + Math.cos(this.aimAngle) * length, 
                this.ball.y + Math.sin(this.aimAngle) * length);
        }

        // Animace Power Baru
        if (this.aimingState === 'POWER') {
            this.powerValue += this.powerDir * 0.05;
            if (this.powerValue >= 1 || this.powerValue <= 0) this.powerDir *= -1;
            this.powerBarFill.height = this.powerValue * 200;
            this.powerBarFill.fillColor = this.powerValue > 0.8 ? 0xff0000 : 0xffcc00;
        }

        // Stín a oheň (stejné jako předtím)
        if (this.ball) {
            this.ballShadow.x = this.ball.x;
            this.ballShadow.y = this.ball.y + (this.ball.scale * 20);
            this.ballShadow.setScale(this.ball.scale);
            if (this.shotsInRound === 2 && this.hitsInRound === 2) {
                this.emitFire(!this.isFlying);
                this.ball.setTint(0xffaa00);
            } else { this.ball.clearTint(); }
        }
    }

    shoot() {
        this.aimingState = 'IDLE';
        this.isFlying = true;
        this.shotsInRound++;
        
        // Výpočet síly (projekce do rychlosti)
        const finalPower = 400 + (this.powerValue * 600);
        const vx = Math.cos(this.aimAngle) * finalPower;
        const vy = Math.sin(this.aimAngle) * finalPower;

        this.ball.setVelocity(vx, vy);
        this.powerBarBg.setVisible(false);
        this.powerBarFill.setVisible(false);
        this.powerValue = 0;

        this.tweens.add({
            targets: this.ball, scale: 0.4, duration: 600, yoyo: true,
            onComplete: () => { this.isFlying = false; this.checkLanding(); }
        });
    }

    // --- Zbytek logiky (checkLanding, processTurn, spawnCups) zůstává stejný jako v předchozí verzi ---

    checkLanding() {
        this.ball.setVelocity(0);
        let hitFound = false;
        this.cups.children.entries.forEach(cup => {
            const dist = Phaser.Math.Distance.Between(this.ball.x, this.ball.y, cup.x, cup.y);
            if (dist < 25 && !hitFound) {
                hitFound = true;
                this.hitsInRound++;
                cup.destroy();
                this.updateFormations();
            }
        });
        this.time.delayedCall(800, () => this.processTurn());
    }

    processTurn() {
        let hasTripleBonus = (this.hitsInRound === 2 && this.shotsInRound === 2);
        if (this.shotsInRound >= 3 || (this.shotsInRound === 2 && !hasTripleBonus)) {
            this.currentRound++; this.shotsInRound = 0; this.hitsInRound = 0;
        }
        this.updateUI();
        this.resetBall();
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
        const left = this.cups.countActive();
        if ([6, 3, 1].includes(left)) this.spawnCups(left);
        else if (left === 0) { this.spawnCups(10); }
    }

    emitFire(isIdle) {
        const p = this.add.sprite(this.ball.x + (Math.random() * 10 - 5), this.ball.y, Math.random() > 0.5 ? 'fire1' : 'fire2');
        p.setDepth(19).setScale(this.ball.scale);
        this.tweens.add({ targets: p, y: isIdle ? p.y - 40 : p.y + 20, alpha: 0, duration: 400, onComplete: () => p.destroy() });
    }
}

config.scene = [MenuScene, GameScene];
new Phaser.Game(config);
