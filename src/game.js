/**
 * KONFIGURACE HRY - HORSE HOOF PONG (VISUAL UPDATE)
 */
const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 450,
    height: 800,
    backgroundColor: '#16a085', // Základní barva stolu
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

/**
 * SCÉNA MENU
 */
class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    create() {
        const { width, height } = this.scale;

        // Pozadí s jemným přechodem
        let bg = this.add.graphics();
        bg.fillGradientStyle(0x1abc9c, 0x1abc9c, 0x16a085, 0x16a085, 1);
        bg.fillRect(0, 0, width, height);

        // Moderní Titulek
        this.add.text(width / 2, 180, 'HOOF PONG', { 
            fontSize: '64px', fill: '#fff', align: 'center', fontStyle: '900',
            stroke: '#000', strokeThickness: 6
        }).setOrigin(0.5);

        // Jméno hráče
        this.playerName = localStorage.getItem('hoofName') || 'Hráč';
        const nameBox = this.add.rectangle(width / 2, 320, 250, 40, 0x000, 0.2);
        const nameTxt = this.add.text(width / 2, 320, `👤 ${this.playerName}`, { 
            fontSize: '22px', fill: '#ffcc00', fontStyle: 'bold'
        }).setOrigin(0.5).setInteractive();

        nameTxt.on('pointerdown', () => {
            const n = prompt("Zadej své jméno:", this.playerName);
            if (n) { this.playerName = n; localStorage.setItem('hoofName', n); nameTxt.setText(`👤 ${n}`); }
        });

        // Tlačítko HRÁT
        const btnBg = this.add.renderTexture(width / 2, 450, 220, 70).setOrigin(0.5);
        const playBtn = this.add.rectangle(width / 2, 450, 220, 70, 0xffffff).setInteractive();
        playBtn.setAlpha(0.1);
        
        const playTxt = this.add.text(width / 2, 450, 'START HRY', { 
            fontSize: '28px', fill: '#fff', fontStyle: 'bold'
        }).setOrigin(0.5);

        playBtn.on('pointerover', () => playTxt.setScale(1.1));
        playBtn.on('pointerout', () => playTxt.setScale(1));
        playBtn.on('pointerdown', () => this.scene.start('GameScene'));

        // Branding
        this.add.text(width - 20, height - 20, 'Created by: Ondřej Kadlec', { 
            fontSize: '14px', fill: '#fff', alpha: 0.6
        }).setOrigin(1);
    }
}

/**
 * HLAVNÍ HERNÍ SCÉNA
 */
class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    preload() {
        this.generateAdvancedTextures();
    }

    generateAdvancedTextures() {
        let g = this.make.graphics({ x: 0, y: 0, add: false });
        
        // Míček s jemným odleskem
        g.fillStyle(0xffffff); g.fillCircle(12, 12, 12);
        g.fillStyle(0xdddddd); g.fillCircle(15, 10, 5);
        g.generateTexture('ball', 24, 24);
        
        // Stín míčku
        g.clear(); g.fillStyle(0x000000, 0.3); g.fillCircle(12, 12, 12);
        g.generateTexture('shadow', 24, 24);
        
        // Kelímek s okrajem (3D efekt)
        g.clear(); 
        g.fillStyle(0xc0392b); g.fillRect(0, 4, 36, 32); // Tělo
        g.fillStyle(0xe74c3c); g.fillRect(0, 0, 36, 6);  // Horní okraj
        g.generateTexture('cup', 36, 36);
        
        // Kopyto s detailem
        g.clear(); 
        g.fillStyle(0x3e2723); g.fillRoundedRect(0, 0, 80, 50, 10);
        g.fillStyle(0x5d4037); g.fillRoundedRect(5, 5, 70, 15, 5);
        g.generateTexture('hoof', 80, 50);
    }

    create() {
        const { width, height } = this.scale;
        
        // Pozadí stolu s hloubkou
        let table = this.add.graphics();
        table.fillGradientStyle(0x148f77, 0x148f77, 0x16a085, 0x16a085, 1);
        table.fillRect(0, 0, width, height);

        this.currentRound = 1;
        this.shotsInRound = 0;
        this.hitsInRound = 0;
        this.bonusActive = false;
        this.canShoot = true;

        this.cups = this.physics.add.staticGroup();
        this.spawnCups(10);

        // Stín (vytvořen dříve než míček, aby byl pod ním)
        this.ballShadow = this.add.sprite(width / 2, height - 100, 'shadow');
        this.ballShadow.setAlpha(0.3);

        this.hoof = this.add.sprite(width / 2, height - 70, 'hoof');
        this.ball = this.physics.add.sprite(width / 2, height - 110, 'ball');
        this.ball.setCircle(12);

        this.uiText = this.add.text(20, 20, 'KOLO: 1', { fontSize: '24px', fill: '#fff', fontStyle: 'bold' });
        this.infoText = this.add.text(width / 2, height / 2, '', { 
            fontSize: '52px', fill: '#f1c40f', fontStyle: '900', stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5);

        this.input.on('pointerdown', p => this.swipeStart = { x: p.x, y: p.y });
        this.input.on('pointerup', p => this.handleSwipe(p));

        this.showBanner(`PŘIPRAVIT...`);
    }

    update() {
        // Logika stínu - následuje míček, ale s mírným posunem pro efekt výšky
        if (this.ball) {
            this.ballShadow.x = this.ball.x;
            // Čím menší je míček (letí dál), tím výše je stín vůči němu
            let heightOffset = (1 - this.ball.scale) * 50; 
            this.ballShadow.y = this.ball.y + 10 + heightOffset;
            this.ballShadow.setScale(this.ball.scale * 0.8);
            this.ballShadow.setAlpha(this.ball.scale * 0.3);
        }
    }

    spawnCups(count) {
        this.cups.clear(true, true);
        const cx = this.scale.width / 2;
        const sy = 150;
        const gap = 52;
        let layout = count === 10 ? [4, 3, 2, 1] : (count === 6 ? [3, 2, 1] : (count === 3 ? [2, 1] : [1]));

        layout.forEach((rowSize, rIdx) => {
            for (let i = 0; i < rowSize; i++) {
                const x = cx - ((rowSize - 1) * gap / 2) + (i * gap);
                const y = sy + (rIdx * gap);
                let cup = this.cups.create(x, y, 'cup');
                cup.setOrigin(0.5);
                cup.refreshBody();
            }
        });
    }

    handleSwipe(pointer) {
        if (!this.canShoot || !this.swipeStart) return;
        const dx = pointer.x - this.swipeStart.x;
        const dy = pointer.y - this.swipeStart.y;

        if (dy < -40) {
            this.canShoot = false;
            this.shotsInRound++;
            
            // Pohyb míčku
            this.ball.body.setVelocity(dx * 2.2, dy * 3.5);
            
            // Efekt oblouku (zmenšení a následné mírné zvětšení při dopadu)
            this.tweens.add({
                targets: this.ball,
                scale: 0.45,
                duration: 600,
                ease: 'Cubic.out',
                onComplete: () => this.checkResult()
            });

            // Animace kopyta
            this.tweens.add({ targets: this.hoof, y: this.hoof.y - 30, duration: 100, yoyo: true });
        }
    }

    checkResult() {
        this.time.delayedCall(150, () => {
            let hit = false;
            this.physics.overlap(this.ball, this.cups, (b, cup) => {
                this.cameras.main.shake(100, 0.01); // Jemné zatřesení při trefě
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
        else if (left === 0) { 
            this.showBanner("VÍTĚZ!");
            this.time.delayedCall(2000, () => this.scene.start('MenuScene'));
        }
    }

    processTurn() {
        if (this.shotsInRound === 2 && this.hitsInRound === 2 && !this.bonusActive) {
            this.bonusActive = true;
            this.showBanner("BONUSOVÝ HOD!");
            this.time.delayedCall(1200, () => this.resetBall());
            return;
        }

        const max = this.bonusActive ? 3 : 2;
        if (this.shotsInRound >= max) {
            this.currentRound++;
            this.time.delayedCall(1200, () => {
                this.shotsInRound = 0; this.hitsInRound = 0; this.bonusActive = false;
                this.uiText.setText(`KOLO: ${this.currentRound}`);
                this.showBanner(`KOLO ${this.currentRound}`);
                this.resetBall();
            });
        } else {
            this.resetBall();
        }
    }

    showBanner(txt) {
        this.infoText.setText(txt).setAlpha(1).setScale(0);
        this.tweens.add({ targets: this.infoText, alpha: 1, scale: 1, duration: 400, ease: 'Back.out' });
        this.time.delayedCall(1200, () => {
            this.tweens.add({ targets: this.infoText, alpha: 0, scale: 0.5, duration: 400 });
        });
    }

    resetBall() {
        this.ball.setPosition(this.scale.width / 2, this.scale.height - 110).setVelocity(0).setScale(1);
        this.ballShadow.setPosition(this.scale.width / 2, this.scale.height - 100).setScale(1).setAlpha(0.3);
        this.canShoot = true;
        this.swipeStart = null;
    }
}

// Inicializace
config.scene = [MenuScene, GameScene];
const game = new Phaser.Game(config);
