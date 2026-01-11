/**
 * KONFIGURACE HRY
 */
const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 450,
    height: 800,
    backgroundColor: '#1e8449', // Zelená barva stolu
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0 }, debug: false }
    },
    scene: [] // Scény definovány níže
};

/**
 * SCÉNA MENU
 */
class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    create() {
        const { width, height } = this.scale;

        // Titulek
        this.add.text(width / 2, 150, 'HOOF PONG\nBETA', { 
            fontSize: '52px', fill: '#fff', align: 'center', fontStyle: 'bold' 
        }).setOrigin(0.5);

        // Jméno hráče
        this.playerName = localStorage.getItem('hoofName') || 'Hráč';
        const nameTxt = this.add.text(width / 2, 280, `Jméno: ${this.playerName}`, { 
            fontSize: '24px', fill: '#ffcc00' 
        }).setOrigin(0.5).setInteractive();

        nameTxt.on('pointerdown', () => {
            const n = prompt("Zadej své jméno:", this.playerName);
            if (n) { this.playerName = n; localStorage.setItem('hoofName', n); nameTxt.setText(`Jméno: ${n}`); }
        });

        // Tlačítko START
        const playBtn = this.add.rectangle(width / 2, 420, 220, 70, 0x27ae60).setInteractive();
        this.add.text(width / 2, 420, 'HRÁT', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);
        playBtn.on('pointerdown', () => this.scene.start('GameScene'));

        // Branding
        this.add.text(width - 20, height - 20, 'Created by: Ondřej Kadlec', { 
            fontSize: '14px', fill: '#aaa' 
        }).setOrigin(1);
    }
}

/**
 * HERNÍ SCÉNA
 */
class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    preload() {
        // Generování grafiky přímo v kódu (BETA verze bez assets)
        let g = this.make.graphics({ x: 0, y: 0, add: false });
        
        // Míček
        g.fillStyle(0xffffff); g.fillCircle(10, 10, 10);
        g.generateTexture('ball', 20, 20);
        
        // Kelímek
        g.clear(); g.fillStyle(0xe74c3c); g.fillRect(0, 0, 36, 36);
        g.generateTexture('cup', 36, 36);
        
        // Kopyto
        g.clear(); g.fillStyle(0x5d4037); g.fillRect(0, 0, 70, 40);
        g.generateTexture('hoof', 70, 40);
    }

    create() {
        const { width, height } = this.scale;
        this.currentRound = 1;
        this.shotsInRound = 0;
        this.hitsInRound = 0;
        this.bonusActive = false;
        this.canShoot = true;

        this.cups = this.physics.add.staticGroup();
        this.spawnCups(10);

        this.hoof = this.add.sprite(width / 2, height - 70, 'hoof');
        this.ball = this.physics.add.sprite(width / 2, height - 110, 'ball');
        this.ball.setCircle(10);

        this.uiText = this.add.text(20, 20, 'Kolo: 1', { fontSize: '22px', fill: '#fff' });
        this.infoText = this.add.text(width / 2, height / 2, '', { 
            fontSize: '48px', fill: '#ffcc00', fontStyle: 'bold' 
        }).setOrigin(0.5);

        this.input.on('pointerdown', p => this.swipeStart = { x: p.x, y: p.y });
        this.input.on('pointerup', p => this.handleSwipe(p));

        this.showBanner(`KOLO ${this.currentRound}`);
    }

    spawnCups(count) {
        this.cups.clear(true, true);
        const cx = this.scale.width / 2;
        const sy = 130;
        const gap = 48;
        let layout = count === 10 ? [4, 3, 2, 1] : (count === 6 ? [3, 2, 1] : (count === 3 ? [2, 1] : [1]));

        layout.forEach((rowSize, rIdx) => {
            for (let i = 0; i < rowSize; i++) {
                const x = cx - ((rowSize - 1) * gap / 2) + (i * gap);
                const y = sy + (rIdx * gap);
                this.cups.create(x, y, 'cup');
            }
        });
    }

    handleSwipe(pointer) {
        if (!this.canShoot || !this.swipeStart) return;
        const dx = pointer.x - this.swipeStart.x;
        const dy = pointer.y - this.swipeStart.y;

        if (dy < -30) {
            this.canShoot = false;
            this.shotsInRound++;
            this.ball.body.setVelocity(dx * 2, dy * 3);
            
            this.tweens.add({
                targets: this.ball, scale: 0.5, duration: 600,
                onComplete: () => this.checkResult()
            });
        }
    }

    checkResult() {
        this.time.delayedCall(200, () => {
            let hit = false;
            this.physics.overlap(this.ball, this.cups, (b, cup) => {
                cup.destroy();
                this.hitsInRound++;
                hit = true;
                this.updateFormations();
            });
            this.processTurn();
        });
    }

    updateFormations() {
        const left = this.cups.countActive();
        if (left === 6) this.spawnCups(6);
        else if (left === 3) this.spawnCups(3);
        else if (left === 1) this.spawnCups(1);
        else if (left === 0) { alert("VÍTĚZSTVÍ!"); this.scene.start('MenuScene'); }
    }

    processTurn() {
        // Logika bonusového hodu
        if (this.shotsInRound === 2 && this.hitsInRound === 2 && !this.bonusActive) {
            this.bonusActive = true;
            this.showBanner("BONUSOVÝ HOD!");
            this.time.delayedCall(1000, () => this.resetBall());
            return;
        }

        const max = this.bonusActive ? 3 : 2;
        if (this.shotsInRound >= max) {
            this.currentRound++;
            this.time.delayedCall(1000, () => {
                this.shotsInRound = 0; this.hitsInRound = 0; this.bonusActive = false;
                this.uiText.setText(`Kolo: ${this.currentRound}`);
                this.showBanner(`KOLO ${this.currentRound}`);
                this.resetBall();
            });
        } else {
            this.resetBall();
        }
    }

    showBanner(txt) {
        this.infoText.setText(txt).setAlpha(1);
        this.tweens.add({ targets: this.infoText, alpha: 0, duration: 1500 });
    }

    resetBall() {
        this.ball.setPosition(this.scale.width / 2, this.scale.height - 110).setVelocity(0).setScale(1);
        this.canShoot = true;
        this.swipeStart = null;
    }
}

// Inicializace konfigurace
config.scene = [MenuScene, GameScene];
const game = new Phaser.Game(config);
