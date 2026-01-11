/**
 * KONFIGURACE HRY - HORSE HOOF PONG (KROK 3: TRAJEKTORIE & KULATÉ KELÍMKY)
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

        this.add.text(width / 2, 180, 'HOOF PONG', { 
            fontSize: '64px', fill: '#fff', align: 'center', fontStyle: '900', stroke: '#000', strokeThickness: 6
        }).setOrigin(0.5);

        this.playerName = localStorage.getItem('hoofName') || 'Hráč';
        const nameTxt = this.add.text(width / 2, 320, `👤 ${this.playerName}`, { 
            fontSize: '22px', fill: '#ffcc00', fontStyle: 'bold'
        }).setOrigin(0.5).setInteractive();

        nameTxt.on('pointerdown', () => {
            const n = prompt("Zadej své jméno:", this.playerName);
            if (n) { this.playerName = n; localStorage.setItem('hoofName', n); nameTxt.setText(`👤 ${n}`); }
        });

        const playBtn = this.add.rectangle(width / 2, 450, 220, 70, 0x27ae60).setInteractive();
        this.add.text(width / 2, 450, 'START HRY', { fontSize: '28px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
        playBtn.on('pointerdown', () => this.scene.start('GameScene'));
    }
}

class GameScene extends Phaser.Scene {
    constructor() { super('GameScene'); }

    preload() {
        this.generateTextures();
    }

    generateTextures() {
        let g = this.make.graphics({ x: 0, y: 0, add: false });
        
        // Míček
        g.fillStyle(0xffffff); g.fillCircle(12, 12, 12);
        g.generateTexture('ball', 24, 24);
        
        // Stín
        g.clear(); g.fillStyle(0x000000, 0.3); g.fillCircle(12, 12, 12);
        g.generateTexture('shadow', 24, 24);
        
        // KULATÝ KELÍMEK (upraveno na kruh)
        g.clear(); 
        g.fillStyle(0xc0392b); g.fillCircle(20, 20, 20); // Spodní vrstva
        g.fillStyle(0xe74c3c); g.fillCircle(20, 20, 17); // Horní vnitřek
        g.lineStyle(2, 0xffffff, 0.5); g.strokeCircle(20, 20, 18); // Okraj
        g.generateTexture('cup', 40, 40);
        
        // Kopyto
        g.clear(); g.fillStyle(0x3e2723); g.fillRoundedRect(0, 0, 80, 50, 10);
        g.generateTexture('hoof', 80, 50);

        // Částice (Splash)
        g.clear(); g.fillStyle(0xf1c40f); g.fillCircle(3, 3, 3);
        g.generateTexture('splash_drop', 6, 6);
    }

    create() {
        const { width, height } = this.scale;
        this.currentRound = 1; this.shotsInRound = 0; this.hitsInRound = 0; this.canShoot = true;

        this.splashManager = this.add.particles(0, 0, 'splash_drop', {
            speed: { min: -150, max: 150 },
            angle: { min: 220, max: 320 },
            scale: { start: 1, end: 0 },
            lifespan: 600,
            gravityY: 500,
            emitting: false
        });

        // GRAFIKA PRO TRAJEKTORII
        this.trajectoryGraphics = this.add.graphics();

        this.cups = this.physics.add.staticGroup();
        this.spawnCups(10);

        this.ballShadow = this.add.sprite(width / 2, height - 100, 'shadow').setAlpha(0.3);
        this.hoof = this.add.sprite(width / 2, height - 70, 'hoof');
        this.ball = this.physics.add.sprite(width / 2, height - 110, 'ball').setCircle(12);

        this.uiText = this.add.text(20, 20, 'KOLO: 1', { fontSize: '24px', fill: '#fff', fontStyle: 'bold' });
        this.infoText = this.add.text(width / 2, height / 2, '', { 
            fontSize: '52px', fill: '#f1c40f', fontStyle: '900', stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5);

        this.input.on('pointerdown', p => {
            if (!this.canShoot) return;
            this.swipeStart = { x: p.x, y: p.y };
        });

        this.input.on('pointermove', p => {
            if (this.swipeStart && this.canShoot) this.drawTrajectory(p);
        });

        this.input.on('pointerup', p => {
            this.trajectoryGraphics.clear();
            this.handleSwipe(p);
        });
        
        this.showBanner(`PŘIPRAVIT...`);
    }

    drawTrajectory(pointer) {
        this.trajectoryGraphics.clear();
        this.trajectoryGraphics.lineStyle(3, 0xffffff, 0.5);
        
        const dx = (pointer.x - this.swipeStart.x) * 2.2;
        const dy = (pointer.y - this.swipeStart.y) * 3.5;

        // Vykreslíme tečkovanou čáru směru
        if (dy < -30) {
            let startX = this.ball.x;
            let startY = this.ball.y;
            
            for (let i = 1; i <= 10; i++) {
                let t = i / 10;
                let tx = startX + dx * t * 0.2;
                let ty = startY + dy * t * 0.2;
                this.trajectoryGraphics.fillCircle(tx, ty, 3);
            }
        }
    }

    update() {
        if (this.ball) {
            this.ballShadow.x = this.ball.x;
            this.ballShadow.y = this.ball.y + 10 + (1 - this.ball.scale) * 50;
            this.ballShadow.setScale(this.ball.scale * 0.8);
        }
    }

    spawnCups(count) {
        this.cups.clear(true, true);
        const cx = this.scale.width / 2;
        const sy = 150;
        const radius = 20; // Poloměr kulatého kelímku
        const gap = radius * 2; // Rozestup přesně na dotyk

        let layout = count === 10 ? [4, 3, 2, 1] : (count === 6 ? [3, 2, 1] : (count === 3 ? [2, 1] : [1]));

        layout.forEach((rowSize, rIdx) => {
            for (let i = 0; i < rowSize; i++) {
                const x = cx - ((rowSize - 1) * gap / 2) + (i * gap);
                const y = sy + (rIdx * (gap * 0.866)); // 0.866 zajistí, že řady do sebe zapadnou (trojúhelníková mřížka)
                let cup = this.cups.create(x, y, 'cup');
                cup.setCircle(radius);
                cup.refreshBody();
            }
        });
    }

    handleSwipe(pointer) {
        if (!this.canShoot || !this.swipeStart) return;
        const dx = pointer.x - this.swipeStart.x;
        const dy = pointer.y - this.swipeStart.y;
        if (dy < -40) {
            this.canShoot = false; this.shotsInRound++;
            this.ball.body.setVelocity(dx * 2.2, dy * 3.5);
            this.tweens.add({ targets: this.ball, scale: 0.45, duration: 600, ease: 'Cubic.out', onComplete: () => this.checkResult() });
        }
        this.swipeStart = null;
    }

    checkResult() {
        this.time.delayedCall(150, () => {
            this.physics.overlap(this.ball, this.cups, (b, cup) => {
                this.cameras.main.shake(150, 0.015);
                this.splashManager.emitParticleAt(cup.x, cup.y, 20);
                cup.destroy();
                this.hitsInRound++;
                this.updateFormations();
            });
            this.processTurn();
        });
    }

    updateFormations() {
        const left = this.cups.countActive();
        if (left === 6 || left === 3 || left === 1) this.spawnCups(left);
        else if (left === 0) { this.showBanner("VÍTĚZ!"); this.time.delayedCall(2000, () => this.scene.start('MenuScene')); }
    }

    processTurn() {
        if (this.shotsInRound === 2 && this.hitsInRound === 2 && !this.bonusActive) {
            this.bonusActive = true; this.showBanner("BONUS!"); this.time.delayedCall(1200, () => this.resetBall());
        } else if (this.shotsInRound >= (this.bonusActive ? 3 : 2)) {
            this.currentRound++;
            this.time.delayedCall(1200, () => {
                this.shotsInRound = 0; this.hitsInRound = 0; this.bonusActive = false;
                this.uiText.setText(`KOLO: ${this.currentRound}`); this.showBanner(`KOLO ${this.currentRound}`);
                this.resetBall();
            });
        } else { this.resetBall(); }
    }

    showBanner(txt) {
        this.infoText.setText(txt).setAlpha(1).setScale(0);
        this.tweens.add({ targets: this.infoText, alpha: 1, scale: 1, duration: 400, ease: 'Back.out' });
        this.time.delayedCall(1200, () => this.tweens.add({ targets: this.infoText, alpha: 0, scale: 0, duration: 400 }));
    }

    resetBall() {
        this.ball.setPosition(this.scale.width / 2, this.scale.height - 110).setVelocity(0).setScale(1);
        this.canShoot = true; this.swipeStart = null;
    }
}

config.scene = [MenuScene, GameScene];
new Phaser.Game(config);
