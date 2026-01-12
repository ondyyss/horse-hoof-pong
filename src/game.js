/**
 * HOOF PONG - PROGRESSIVE FORMATIONS
 * - Kelímky se přeskupují: 10 (4-3-2-1) -> 6 (3-2-1) -> 3 (2-1) -> 1 -> KONEC
 * - Fyzika odrazů zůstává zachována
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
        arcade: { 
            gravity: { y: 0 }, 
            debug: false
        } 
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
        g.clear(); g.fillStyle(0xffffff, 0.6); g.fillCircle(4, 4, 4); g.generateTexture('dot', 8, 8);
    }

    create() {
        const { width, height } = this.scale;
        this.currentRound = 1; 
        this.shotsInRound = 0; 
        this.totalShots = 0;
        this.totalHits = 0;
        this.isFlying = false;
        this.isPaused = false;
        this.gameOver = false;

        this.dots = [];
        for (let i = 0; i < 12; i++) {
            this.dots.push(this.add.image(0, 0, 'dot').setAlpha(0).setDepth(10));
        }

        this.cups = this.physics.add.staticGroup();
        this.spawnCups(10); 

        this.ball = this.physics.add.sprite(width / 2, height - 110, 'ball').setDepth(20);
        this.ball.setCollideWorldBounds(true).setBounce(0.6);
        this.ballShadow = this.add.sprite(width / 2, height - 100, 'shadow').setAlpha(0.3).setDepth(4);
        
        this.physics.add.collider(this.ball, this.cups);

        this.uiText = this.add.text(20, 20, '', { fontSize: '18px', fill: '#fff', fontStyle: 'bold' }).setDepth(50);
        this.statsText = this.add.text(20, 45, 'ÚSPĚŠNOST: 0%', { fontSize: '18px', fill: '#fff', fontStyle: 'bold' }).setDepth(50);
        
        const menuBtn = this.add.rectangle(width - 65, 40, 100, 45, 0x000000, 0.4).setInteractive().setDepth(100).setStrokeStyle(2, 0xffffff);
        this.add.text(width - 65, 40, 'MENU', { fontSize: '20px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(101);
        menuBtn.on('pointerdown', () => this.showExitConfirm());

        this.updateUI();
        this.showRoundIntro();

        this.input.on('pointerdown', (p) => {
            if (this.isFlying || this.isPaused || this.gameOver) return;
            this.swipeStart = { x: p.x, y: p.y };
        });

        this.input.on('pointermove', (p) => {
            if (this.isFlying || !this.swipeStart || this.isPaused || this.gameOver) return;
            this.updateTrajectory(p);
        });

        this.input.on('pointerup', (p) => {
            if (this.isFlying || !this.swipeStart || this.isPaused || this.gameOver) return;
            this.handleSwipeEnd(p);
        });
    }

    spawnCups(count) {
        this.cups.clear(true, true);
        const cx = this.scale.width / 2, sy = 120, gap = 44;
        let layout = count === 10 ? [4, 3, 2, 1] : (count === 6 ? [3, 2, 1] : (count === 3 ? [2, 1] : [1]));
        
        layout.forEach((rowSize, rIdx) => {
            for (let i = 0; i < rowSize; i++) {
                this.cups.create(cx - ((rowSize - 1) * gap / 2) + (i * gap), sy + (rIdx * (gap * 0.85)), 'cup').setCircle(18);
            }
        });
    }

    updateFormations() {
        const left = this.cups.countActive();
        // Pokud zbývá přesně 6, 3 nebo 1 kelímek, přeskládáme je doprostřed
        if ([6, 3, 1].includes(left)) {
            this.spawnCups(left);
        }
    }

    shoot(angle, force) {
        this.isFlying = true;
        this.shotsInRound++;
        this.totalShots++; 
        let speed = Math.min(Math.max(force * 3.5, 300), 1000);
        this.ball.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
        
        this.tweens.add({
            targets: this.ball, scale: 0.5, duration: 800, yoyo: true, ease: 'Quad.Out',
            onUpdate: () => {
                this.ball.body.checkCollision.none = (this.ball.scale < 0.75);
            },
            onComplete: () => { this.isFlying = false; this.checkLanding(); }
        });
    }

    checkLanding() {
        this.time.delayedCall(150, () => {
            this.ball.setVelocity(0);
            let hitFound = false;
            
            this.cups.children.entries.forEach(cup => {
                if (Phaser.Math.Distance.Between(this.ball.x, this.ball.y, cup.x, cup.y) < 30 && !hitFound) {
                    hitFound = true;
                    this.totalHits++;
                    this.popText("HIT!", cup.x, cup.y, '#f1c40f', 40);
                    cup.destroy(); 
                    this.updateFormations(); // PŘESKLÁDÁNÍ FORMACE
                }
            });

            if (!hitFound) {
                this.popText('MISS', this.ball.x, this.ball.y - 40, '#e74c3c', 40);
                this.tweens.add({ targets: this.ball, alpha: 0, duration: 400 });
            }

            this.updateUI();

            if (this.cups.countActive() === 0) {
                this.time.delayedCall(1000, () => this.showVictory());
            } else {
                this.time.delayedCall(900, () => this.processTurn());
            }
        });
    }

    processTurn() {
        if (this.gameOver || this.isPaused) return;
        if (this.shotsInRound >= 2) {
            this.currentRound++; 
            this.shotsInRound = 0;
            this.showRoundIntro();
        }
        this.updateUI(); 
        this.resetBall();
    }

    resetBall() {
        this.ball.setPosition(this.scale.width / 2, this.scale.height - 110).setVelocity(0).setScale(1).setAlpha(1);
        this.ball.body.checkCollision.none = false;
        this.isFlying = false;
    }

    updateUI() {
        this.uiText.setText(`KOLO: ${this.currentRound} | HOD: ${this.shotsInRound + 1}/2`);
        let acc = (this.totalShots === 0) ? 0 : Math.round((this.totalHits / this.totalShots) * 100);
        this.statsText.setText(`ÚSPĚŠNOST: ${acc}%`);
    }

    // Ostatní pomocné funkce (Trajectory, Intro, PopText, ExitConfirm, Victory)
    updateTrajectory(p) {
        const dx = p.x - this.swipeStart.x, dy = p.y - this.swipeStart.y;
        const angle = Math.atan2(dy, dx), dist = Math.min(Math.sqrt(dx*dx + dy*dy), 250);
        this.dots.forEach((dot, i) => {
            const step = (i / this.dots.length) * 0.7; 
            dot.setPosition(this.ball.x + Math.cos(angle) * dist * 4 * step, this.ball.y + Math.sin(angle) * dist * 4 * step);
            dot.setAlpha(1 - (i / this.dots.length));
        });
    }

    handleSwipeEnd(p) {
        const dx = p.x - this.swipeStart.x, dy = p.y - this.swipeStart.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        this.dots.forEach(d => d.setAlpha(0));
        if (dist > 30 && dy < 0) this.shoot(Math.atan2(dy, dx), dist);
        this.swipeStart = null;
    }

    showRoundIntro() {
        const t = this.add.text(this.scale.width/2, this.scale.height/2, `KOLO ${this.currentRound}`, {
            fontSize: '70px', fill: '#fff', fontStyle: '900', stroke: '#000', strokeThickness: 10
        }).setOrigin(0.5).setDepth(200).setScale(0);
        this.tweens.add({ targets: t, scale: 1, ease: 'Back.Out', duration: 600, onComplete: () => {
            this.time.delayedCall(800, () => { this.tweens.add({ targets: t, alpha: 0, duration: 400, onComplete: () => t.destroy() }); });
        }});
    }

    popText(txt, x, y, color, size = 32) {
        const t = this.add.text(x, y, txt, { fontSize: size+'px', fill: color, fontStyle: '900', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5).setDepth(100);
        this.tweens.add({ targets: t, y: y - 100, alpha: 0, duration: 800, onComplete: () => t.destroy() });
    }

    showExitConfirm() {
        if (this.isPaused || this.gameOver) return;
        this.isPaused = true;
        this.physics.world.pause();
        const { width, height } = this.scale;
        this.overlay = this.add.rectangle(width/2, height/2, width, height, 0x000000, 0.75).setDepth(500).setInteractive();
        this.dialog = this.add.container(width/2, height/2).setDepth(501);
        const panel = this.add.rectangle(0, 0, 320, 180, 0x2c3e50).setStrokeStyle(3, 0xffffff);
        const title = this.add.text(0, -40, 'ODEJÍT DO MENU?', { fontSize: '24px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
        const yesBtn = this.add.rectangle(-70, 40, 100, 45, 0xc0392b).setInteractive();
        const noBtn = this.add.rectangle(70, 40, 100, 45, 0x27ae60).setInteractive();
        this.dialog.add([panel, title, yesBtn, noBtn, 
            this.add.text(-70, 40, 'ANO', {fontSize: '18px', fill: '#fff', fontStyle: 'bold'}).setOrigin(0.5), 
            this.add.text(70, 40, 'NE', {fontSize: '18px', fill: '#fff', fontStyle: 'bold'}).setOrigin(0.5)]);
        yesBtn.on('pointerdown', () => this.scene.start('MenuScene'));
        noBtn.on('pointerdown', () => {
            this.isPaused = false; this.physics.world.resume(); this.overlay.destroy(); this.dialog.destroy();
        });
    }

    showVictory() {
        this.gameOver = true;
        const { width, height } = this.scale;
        const acc = Math.round((this.totalHits / this.totalShots) * 100);
        this.add.rectangle(width/2, height/2, width, height, 0x000000, 0.85).setDepth(1000);
        const panel = this.add.container(width/2, height/2).setDepth(1001);
        panel.add(this.add.text(0, -100, 'VÍTĚZSTVÍ!', { fontSize: '60px', fill: '#f1c40f', fontStyle: '900' }).setOrigin(0.5));
        panel.add(this.add.text(0, 0, `Celkem hodů: ${this.totalShots}\nÚspěšnost: ${acc}%`, { fontSize: '26px', fill: '#fff', align: 'center' }).setOrigin(0.5));
        const restartBtn = this.add.rectangle(0, 140, 220, 60, 0x27ae60).setInteractive();
        panel.add(restartBtn);
        panel.add(this.add.text(0, 140, 'HRÁT ZNOVU', { fontSize: '24px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5));
        restartBtn.on('pointerdown', () => this.scene.restart());
    }

    update() {
        if (this.ball && !this.isPaused) {
            this.ballShadow.x = this.ball.x;
            this.ballShadow.y = this.ball.y + (this.isFlying ? 20 : 10);
            this.ballShadow.setScale(this.ball.scale);
        }
    }
}

config.scene = [MenuScene, GameScene];
new Phaser.Game(config);
