// VYLEPŠENÁ A OPTIMALIZOVANÁ VERZE
// Zachován vzhled i herní logika, přidána lepší struktura, čitelnost a drobný polish

const CONFIG = {
  WIDTH: 450,
  HEIGHT: 800,
  BG: '#16a085',
  MAX_FORCE: 1100,
  MIN_FORCE: 400
};

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: CONFIG.WIDTH,
  height: CONFIG.HEIGHT,
  backgroundColor: CONFIG.BG,
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

    this.add.text(width / 2, 140, 'HOOF PONG\nFIRE EDITION', {
      fontSize: '48px', fill: '#fff', align: 'center', fontStyle: '900',
      stroke: '#000', strokeThickness: 8
    }).setOrigin(0.5);

    const playBtn = this.add.rectangle(width / 2, height / 2, 240, 72, 0x27ae60)
      .setInteractive({ useHandCursor: true });

    this.add.text(width / 2, height / 2, 'START', {
      fontSize: '32px', fill: '#fff', fontStyle: 'bold'
    }).setOrigin(0.5);

    playBtn.on('pointerdown', () => this.scene.start('GameScene'));
    playBtn.on('pointerover', () => playBtn.setFillStyle(0x2ecc71));
    playBtn.on('pointerout', () => playBtn.setFillStyle(0x27ae60));

    const stats = JSON.parse(localStorage.getItem('hoofPongStats') || '{"games":0,"totalHits":0}');

    const panel = this.add.graphics();
    panel.fillStyle(0x000000, 0.45);
    panel.fillRoundedRect(width / 2 - 150, height / 2 + 110, 300, 130, 16);

    this.add.text(width / 2, height / 2 + 130, 'STATISTIKY', {
      fontSize: '20px', fill: '#f1c40f', fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 165, `Hry: ${stats.games}`, { fontSize: '18px', fill: '#fff' }).setOrigin(0.5);
    this.add.text(width / 2, height / 2 + 195, `Zásahy: ${stats.totalHits}`, { fontSize: '18px', fill: '#fff' }).setOrigin(0.5);
  }
}

class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  preload() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    const circle = (key, r, c1, c2 = null) => {
      g.clear();
      g.fillStyle(c1);
      g.fillCircle(r, r, r);
      if (c2) { g.fillStyle(c2); g.fillCircle(r, r, r * 0.65); }
      g.generateTexture(key, r * 2, r * 2);
    };

    circle('ball', 12, 0xffffff);
    circle('fireball', 12, 0xff4400, 0xffcc00);
    circle('shadow', 12, 0x000000);
    circle('cup', 20, 0xc0392b, 0xe74c3c);

    g.clear(); g.fillStyle(0xffffff, 0.6); g.fillCircle(4, 4, 4); g.generateTexture('dot', 8, 8);
    g.clear(); g.fillStyle(0xff6600); g.fillRect(0, 0, 4, 4); g.generateTexture('particle', 4, 4);
  }

  create() {
    const { width, height } = this.scale;

    this.state = {
      round: 1,
      shots: 0,
      hits: 0,
      combo: 0,
      totalShots: 0,
      totalHits: 0,
      flying: false,
      hitRegistered: false,
      gameOver: false
    };

    this.dots = Array.from({ length: 12 }, () => this.add.image(0, 0, 'dot').setAlpha(0));

    this.emitter = this.add.particles(0, 0, 'particle', {
      speed: { min: 20, max: 120 }, lifespan: 400,
      scale: { start: 1, end: 0 }, blendMode: 'ADD', emitting: false
    });

    this.cups = this.physics.add.staticGroup();
    this.spawnCups(10);

    this.ball = this.physics.add.sprite(width / 2, height - 110, 'ball').setBounce(0.7).setDrag(180);
    this.shadow = this.add.sprite(this.ball.x, this.ball.y + 10, 'shadow').setAlpha(0.3);

    this.physics.add.collider(this.ball, this.cups);

    this.ui = this.add.text(20, 20, '', { fontSize: '18px', fill: '#fff', fontStyle: 'bold' });
    this.stats = this.add.text(20, 45, '', { fontSize: '16px', fill: '#f1c40f', fontStyle: 'bold' });

    this.comboText = this.add.text(width / 2, 260, '', {
      fontSize: '46px', fill: '#f1c40f', fontStyle: '900', stroke: '#000', strokeThickness: 6
    }).setOrigin(0.5).setAlpha(0);

    this.updateUI();
    this.showRoundIntro();

    this.input.on('pointerdown', p => !this.state.flying && (this.swipeStart = p));
    this.input.on('pointermove', p => this.swipeStart && this.drawTrajectory(p));
    this.input.on('pointerup', p => this.swipeStart && this.releaseShot(p));
  }

  spawnCups(count) {
    const cx = this.scale.width / 2;
    const layout = count === 10 ? [4, 3, 2, 1] : count === 6 ? [3, 2, 1] : count === 3 ? [2, 1] : [1];
    let i = 0;

    layout.forEach((row, r) => {
      for (let c = 0; c < row; c++) {
        const x = cx - ((row - 1) * 48) / 2 + c * 48;
        const y = 120 + r * 40;
        const cup = this.cups.getChildren()[i] || this.cups.create(x, -50, 'cup').setCircle(16);
        this.tweens.add({ targets: cup, x, y, duration: 600, ease: 'Back.Out', delay: i * 40 });
        i++;
      }
    });
  }

  drawTrajectory(p) {
    const dx = p.x - this.swipeStart.x;
    const dy = p.y - this.swipeStart.y;
    const angle = Math.atan2(dy, dx);
    const dist = Math.min(Math.hypot(dx, dy), 220);

    this.dots.forEach((d, i) => {
      const t = i / this.dots.length;
      d.setPosition(this.ball.x + Math.cos(angle) * dist * 4 * t,
                    this.ball.y + Math.sin(angle) * dist * 4 * t)
       .setAlpha((1 - t) * 0.8);
    });
  }

  releaseShot(p) {
    const dx = p.x - this.swipeStart.x;
    const dy = p.y - this.swipeStart.y;
    this.dots.forEach(d => d.setAlpha(0));

    if (dy < -30) this.shoot(Math.atan2(dy, dx), Math.hypot(dx, dy));
    this.swipeStart = null;
  }

  shoot(angle, force) {
    Object.assign(this.state, { flying: true, hitRegistered: false });
    this.state.shots++; this.state.totalShots++;

    const speed = Phaser.Math.Clamp(force * 3.8, CONFIG.MIN_FORCE, CONFIG.MAX_FORCE);
    this.ball.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    if (this.state.combo >= 2) {
      this.ball.setTexture('fireball');
      this.emitter.start();
    } else {
      this.ball.setTexture('ball');
      this.emitter.stop();
    }
  }

  update() {
    if (this.state.gameOver) return;

    this.shadow.setPosition(this.ball.x, this.ball.y + 12);

    if (this.state.flying) {
      this.checkHit();
      if (this.ball.y < -50 || this.ball.body.speed < 20) this.miss();
      if (this.state.combo >= 2) this.emitter.setPosition(this.ball.x, this.ball.y);
    }
  }

  checkHit() {
    if (this.state.hitRegistered) return;

    this.cups.children.iterate(c => {
      if (!c) return;
      if (Phaser.Math.Distance.Between(this.ball.x, this.ball.y, c.x, c.y) < 30) this.hit(c);
    });
  }

  hit(cup) {
    this.state.hitRegistered = true;
    this.state.flying = false;
    this.state.hits++; this.state.totalHits++; this.state.combo++;

    cup.destroy();
    this.updateUI();
    this.resetBall();
  }

  miss() {
    this.state.flying = false;
    this.state.combo = 0;
    this.updateUI();
    this.resetBall();
  }

  resetBall() {
    this.ball.setPosition(CONFIG.WIDTH / 2, CONFIG.HEIGHT - 110).setVelocity(0);
  }

  updateUI() {
    const success = this.state.totalShots === 0 ? 0 : Math.min(100, Math.round(this.state.totalHits / this.state.totalShots * 100));
    this.ui.setText(`KOLO ${this.state.round} | HOD ${this.state.shots}`);
    this.stats.setText(`ÚSPĚŠNOST ${success}% | COMBO ${this.state.combo}`);
  }

  showRoundIntro() {
    const t = this.add.text(CONFIG.WIDTH / 2, 400, `KOLO ${this.state.round}`, {
      fontSize: '64px', fill: '#fff', stroke: '#000', strokeThickness: 8
    }).setOrigin(0.5);

    this.tweens.add({ targets: t, alpha: 0, duration: 1200, onComplete: () => t.destroy() });
  }
}

config.scene = [MenuScene, GameScene];
new Phaser.Game(config);
