// HOOF PONG – FIRE EDITION
// STABILNÍ VERZE
// ✔ vráceny HIT / DOUBLE HIT / TRIPLE HIT / MISS
// ✔ míček se NEODRÁŽÍ od zadní hrany
// ✔ vyšší obtížnost
// ✔ OPRAVENO počítání procent

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
      fontSize: '50px', fill: '#fff', align: 'center', fontStyle: '900',
      stroke: '#000', strokeThickness: 8
    }).setOrigin(0.5);

    const playBtn = this.add.rectangle(width / 2, height / 2 - 20, 220, 70, 0x27ae60)
      .setInteractive({ useHandCursor: true });

    this.add.text(width / 2, height / 2 - 20, 'START', {
      fontSize: '32px', fill: '#fff', fontStyle: 'bold'
    }).setOrigin(0.5);

    playBtn.on('pointerdown', () => this.scene.start('GameScene'));
    playBtn.on('pointerover', () => playBtn.setFillStyle(0x2ecc71));
    playBtn.on('pointerout', () => playBtn.setFillStyle(0x27ae60));
  }
}

class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  preload() {
    let g = this.make.graphics({ x: 0, y: 0, add: false });

    g.fillStyle(0xffffff); g.fillCircle(12, 12, 12); g.generateTexture('ball', 24, 24);
    g.clear(); g.fillStyle(0xff4400); g.fillCircle(12, 12, 12); g.fillStyle(0xffcc00); g.fillCircle(12, 12, 8); g.generateTexture('fireball', 24, 24);
    g.clear(); g.fillStyle(0x000000, 0.3); g.fillCircle(12, 12, 12); g.generateTexture('shadow', 24, 24);
    g.clear(); g.fillStyle(0xc0392b); g.fillCircle(20, 20, 20); g.fillStyle(0xe74c3c); g.fillCircle(20, 20, 17); g.generateTexture('cup', 40, 40);
    g.clear(); g.fillStyle(0xffffff, 0.6); g.fillCircle(4, 4, 4); g.generateTexture('dot', 8, 8);
    g.clear(); g.fillStyle(0xff6600); g.fillRect(0, 0, 4, 4); g.generateTexture('particle', 4, 4);
  }

  create() {
    const { width, height } = this.scale;

    this.currentRound = 1;
    this.shotsInRound = 0;
    this.hitsInRound = 0;
    this.comboCount = 0;
    this.totalShots = 0;
    this.totalHits = 0;
    this.isFlying = false;
    this.hitRegistered = false;
    this.gameOver = false;

    this.dots = [];
    for (let i = 0; i < 12; i++) this.dots.push(this.add.image(0, 0, 'dot').setAlpha(0));

    this.emitter = this.add.particles(0, 0, 'particle', {
      speed: { min: 30, max: 120 }, angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 }, lifespan: 400,
      blendMode: 'ADD', emitting: false
    });

    this.cups = this.physics.add.staticGroup();
    this.spawnCups(10);

    this.ball = this.physics.add.sprite(width / 2, height - 110, 'ball');
    this.ball.setBounce(0.4).setDrag(220); // vyšší obtížnost

    this.ballShadow = this.add.sprite(width / 2, height - 100, 'shadow').setAlpha(0.3);

    this.physics.add.collider(this.ball, this.cups);

    this.uiText = this.add.text(20, 20, '', { fontSize: '18px', fill: '#fff', fontStyle: 'bold' });
    this.statsText = this.add.text(20, 45, '', { fontSize: '16px', fill: '#f1c40f', fontStyle: 'bold' });

    this.comboText = this.add.text(width / 2, 250, '', {
      fontSize: '48px', fill: '#f1c40f', fontStyle: '900', stroke: '#000', strokeThickness: 6
    }).setOrigin(0.5).setAlpha(0);

    this.updateUI();
    this.showRoundIntro();

    this.input.on('pointerdown', p => {
      if (!this.isFlying && !this.gameOver)
        this.swipeStart = { x: p.x, y: p.y };
    });

    this.input.on('pointermove', p => {
      if (this.swipeStart) this.updateTrajectory(p);
    });

    this.input.on('pointerup', p => {
      if (this.swipeStart) this.handleSwipeEnd(p);
    });
  }

  spawnCups(count) {
    const cx = this.scale.width / 2, sy = 120, gap = 52; // větší mezery = těžší
    let layout = count === 10 ? [4, 3, 2, 1] : (count === 6 ? [3, 2, 1] : (count === 3 ? [2, 1] : [1]));
    let targetPositions = [];

    layout.forEach((rowSize, rIdx) => {
      for (let i = 0; i < rowSize; i++) {
        targetPositions.push({
          x: cx - ((rowSize - 1) * gap / 2) + (i * gap),
          y: sy + (rIdx * (gap * 0.9))
        });
      }
    });

    this.cups.clear(true, true);

    targetPositions.forEach((pos, index) => {
      const c = this.cups.create(pos.x, pos.y, 'cup').setCircle(16);
      c.refreshBody();
    });
  }

  updateTrajectory(p) {
    const dx = p.x - this.swipeStart.x;
    const dy = p.y - this.swipeStart.y;
    const angle = Math.atan2(dy, dx);
    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), 200); // kratší swipe

    this.dots.forEach((dot, i) => {
      const step = i / this.dots.length;
      dot.setPosition(
        this.ball.x + Math.cos(angle) * dist * 4 * step,
        this.ball.y + Math.sin(angle) * dist * 4 * step
      );
      dot.setAlpha((1 - step) * 0.7);
    });
  }

  handleSwipeEnd(p) {
    const dx = p.x - this.swipeStart.x;
    const dy = p.y - this.swipeStart.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    this.dots.forEach(d => d.setAlpha(0));

    if (dist > 40 && dy < -20) {
      this.shoot(Math.atan2(dy, dx), dist);
    }

    this.swipeStart = null;
  }

  shoot(angle, force) {
    this.isFlying = true;
    this.hitRegistered = false;
    this.shotsInRound++;
    this.totalShots++;

    if (this.comboCount >= 2) {
      this.ball.setTexture('fireball');
      this.emitter.start();
    } else {
      this.ball.setTexture('ball');
      this.emitter.stop();
    }

    let speed = Math.min(Math.max(force * 3.5, 420), 1000); // nižší max speed
    this.ball.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  update() {
    if (this.gameOver) return;

    this.ballShadow.x = this.ball.x;
    this.ballShadow.y = this.ball.y + 20;

    if (this.isFlying && this.comboCount >= 2)
      this.emitter.setPosition(this.ball.x, this.ball.y);

    if (this.isFlying) {
      this.checkHit();

      // ZRUŠEN ODRÁŽECÍ ZADNÍ WALL
      if (this.ball.y < -50 || this.ball.y > 820 || this.ball.x < -50 || this.ball.x > 500) {
        this.finishShot();
      }
    }
  }

  checkHit() {
    if (!this.isFlying || this.hitRegistered) return;

    this.cups.children.entries.forEach(cup => {
      if (Phaser.Math.Distance.Between(this.ball.x, this.ball.y, cup.x, cup.y) < 28 && this.ball.scale > 0.85) {
        this.executeHit(cup);
      }
    });
  }

  executeHit(cup) {
    this.hitRegistered = true;
    this.isFlying = false;
    this.hitsInRound++;
    this.totalHits++;
    this.comboCount++;

    let msg = 'HIT!';
    if (this.comboCount === 2) msg = 'DOUBLE HIT!';
    if (this.comboCount >= 3) msg = 'TRIPLE HIT!';
    this.showCombo(msg);

    this.ball.setVelocity(0);
    cup.destroy();

    this.updateUI();
    this.time.delayedCall(400, () => this.nextStep());
  }

  showCombo(text) {
    this.comboText.setText(text).setAlpha(1).setScale(0.6);
    this.tweens.add({
      targets: this.comboText,
      scale: 1.2,
      duration: 300,
      ease: 'Back.Out',
      onComplete: () => this.tweens.add({ targets: this.comboText, alpha: 0, duration: 300 })
    });
  }

  finishShot() {
    if (!this.isFlying) return;

    this.isFlying = false;
    this.comboCount = 0;

    this.showCombo('MISS');
    this.updateUI();

    this.time.delayedCall(300, () => this.nextStep());
  }

  nextStep() {
    if (this.cups.countActive() === 0) return this.showVictory();

    let maxShots = (this.hitsInRound === 2) ? 3 : 2;

    if (this.shotsInRound >= maxShots) {
      this.currentRound++;
      this.shotsInRound = 0;
      this.hitsInRound = 0;
      this.showRoundIntro();
    }

    this.resetBall();
    this.updateUI();
  }

  resetBall() {
    this.ball.setPosition(225, 690).setVelocity(0).setScale(1).setAlpha(1).setTexture('ball');
    this.isFlying = false;
  }

  updateUI() {
    let max = (this.hitsInRound === 2 || this.shotsInRound > 2) ? 3 : 2;
    this.uiText.setText(`KOLO: ${this.currentRound} | HOD: ${this.shotsInRound}/${max}`);

    const success = this.totalShots === 0 ? 0 : Math.round((this.totalHits / this.totalShots) * 100);
    this.statsText.setText(`ÚSPĚŠNOST: ${success}% | COMBO: ${this.comboCount}`);
  }

  showRoundIntro() {
    const t = this.add.text(225, 400, `KOLO ${this.currentRound}`, {
      fontSize: '70px', fill: '#fff', fontStyle: '900', stroke: '#000', strokeThickness: 10
    }).setOrigin(0.5);

    this.tweens.add({ targets: t, scale: 1, duration: 600, ease: 'Back.Out', onComplete: () => {
      this.time.delayedCall(600, () => this.tweens.add({ targets: t, alpha: 0, duration: 300, onComplete: () => t.destroy() }));
    }});
  }

  showVictory() {
    this.gameOver = true;

    this.add.rectangle(225, 400, 450, 800, 0x000000, 0.85);
    this.add.text(225, 350, 'VÝHRA!', {
      fontSize: '80px', fill: '#f1c40f', fontStyle: '900', stroke: '#000', strokeThickness: 10
    }).setOrigin(0.5);

    const r = this.add.rectangle(225, 500, 250, 60, 0x27ae60).setInteractive({ useHandCursor: true });
    this.add.text(225, 500, 'HRÁT ZNOVU', { fontSize: '24px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
    r.on('pointerdown', () => this.scene.restart());

    const m = this.add.rectangle(225, 580, 250, 60, 0x2980b9).setInteractive({ useHandCursor: true });
    this.add.text(225, 580, 'ZPĚT DO MENU', { fontSize: '24px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
    m.on('pointerdown', () => this.scene.start('MenuScene'));
  }
}

config.scene = [MenuScene, GameScene];
new Phaser.Game(config);
