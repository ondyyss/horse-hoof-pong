/**
 * HOOF PONG - FIRE EDITION (Optimized & Enhanced)
 * Refactored for better performance, maintainability, and UX
 */

// ============================================================================
// GAME CONSTANTS & CONFIGURATION
// ============================================================================

const GAME_CONFIG = {
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

const CONSTANTS = {
    COLORS: {
        primary: '#16a085',
        success: '#27ae60',
        success_hover: '#2ecc71',
        gold: '#f1c40f',
        error: '#e74c3c',
        info: '#2980b9',
        shadow: '#000000'
    },
    SPEEDS: {
        min_ball: 400,
        max_ball: 1100,
        force_multiplier: 3.8
    },
    PHYSICS: {
        ball_bounce: 0.7,
        ball_drag: 180,
        cup_radius: 16,
        hit_distance: 30,
        scale_threshold: 0.8
    },
    CUP_LAYOUTS: {
        10: [4, 3, 2, 1],
        6: [3, 2, 1],
        3: [2, 1],
        1: [1]
    },
    SHOT_TIMINGS: {
        max_shots_normal: 2,
        max_shots_bonus: 3,
        trajectory_duration: 200,
        ball_scale_duration: 600,
        transition_delay: 500
    },
    COMBO: {
        fireball_threshold: 2,
        messages: {
            1: 'HIT!',
            2: 'DOUBLE HIT!',
            3: 'TRIPLE HIT!'
        }
    }
};

// ============================================================================
// MENU SCENE
// ============================================================================

class MenuScene extends Phaser.Scene {
    constructor() { 
        super('MenuScene'); 
    }
    
    create() {
        const { width, height } = this.scale;
        
        // Title
        this.add.text(width / 2, 150, 'HOOF PONG\nFIRE EDITION', { 
            fontSize: '50px', 
            fill: CONSTANTS.COLORS.success, 
            align: 'center', 
            fontStyle: '900', 
            stroke: CONSTANTS.COLORS.shadow, 
            strokeThickness: 8 
        }).setOrigin(0.5);
        
        // Play Button with Enhanced Interactivity
        const playBtn = this.add.rectangle(width / 2, height / 2 - 20, 220, 70, 0x27ae60)
            .setInteractive({ useHandCursor: true });
        
        this.add.text(width / 2, height / 2 - 20, 'HRÁT', { 
            fontSize: '32px', 
            fill: '#fff', 
            fontStyle: 'bold' 
        }).setOrigin(0.5);
        
        playBtn.on('pointerdown', () => this.scene.start('GameScene'));
        playBtn.on('pointerover', () => playBtn.setFillStyle(0x2ecc71));
        playBtn.on('pointerout', () => playBtn.setFillStyle(0x27ae60));
        
        // Statistics Display
        this.displayStats(width, height);
    }
    
    displayStats(width, height) {
        const stats = this.getStats();
        
        const statsBox = this.add.graphics();
        statsBox.fillStyle(0x000000, 0.4);
        statsBox.fillRoundedRect(width / 2 - 150, height / 2 + 100, 300, 130, 15);
        
        const statsY = height / 2 + 125;
        this.add.text(width / 2, statsY, 'STATISTIKY', { 
            fontSize: '18px', 
            fill: CONSTANTS.COLORS.gold, 
            fontStyle: 'bold' 
        }).setOrigin(0.5);
        
        this.add.text(width / 2, statsY + 35, `Hry: ${stats.games}`, { 
            fontSize: '16px', 
            fill: '#fff' 
        }).setOrigin(0.5);
        
        const avgHits = stats.games > 0 ? (stats.totalHits / stats.games).toFixed(1) : 0;
        this.add.text(width / 2, statsY + 65, `Zásahů: ${stats.totalHits} (Ø ${avgHits})`, { 
            fontSize: '16px', 
            fill: '#fff' 
        }).setOrigin(0.5);
    }
    
    getStats() {
        return JSON.parse(localStorage.getItem('hoofPongStats') || '{"games":0,"totalHits":0}');
    }
}

// ============================================================================
// GAME SCENE
// ============================================================================

class GameScene extends Phaser.Scene {
    constructor() { 
        super('GameScene'); 
    }

    preload() {
        this.createGraphics();
    }
    
    createGraphics() {
        let g = this.make.graphics({ x: 0, y: 0, add: false });
        
        // Ball texture
        g.fillStyle(0xffffff); 
        g.fillCircle(12, 12, 12); 
        g.generateTexture('ball', 24, 24);
        
        // Fireball texture with animation effect
        g.clear(); 
        g.fillStyle(0xff4400); 
        g.fillCircle(12, 12, 12); 
        g.fillStyle(0xffcc00); 
        g.fillCircle(12, 12, 8); 
        g.generateTexture('fireball', 24, 24);
        
        // Shadow texture
        g.clear(); 
        g.fillStyle(0x000000, 0.3); 
        g.fillCircle(12, 12, 12); 
        g.generateTexture('shadow', 24, 24);
        
        // Cup texture - enhanced visual
        g.clear(); 
        g.fillStyle(0xc0392b); 
        g.fillCircle(20, 20, 20); 
        g.fillStyle(0xe74c3c); 
        g.fillCircle(20, 20, 17); 
        g.generateTexture('cup', 40, 40);
        
        // Trajectory dot
        g.clear(); 
        g.fillStyle(0xffffff, 0.6); 
        g.fillCircle(4, 4, 4); 
        g.generateTexture('dot', 8, 8);
        
        // Fire particle
        g.clear(); 
        g.fillStyle(0xff6600, 1); 
        g.fillRect(0, 0, 4, 4); 
        g.generateTexture('particle', 4, 4);
        
        g.destroy();
    }

    create() {
        const { width, height } = this.scale;
        
        // Initialize game state
        this.initializeGameState();
        
        // Create particles and trajectory
        this.createVisualEffects();
        
        // Spawn cups
        this.cups = this.physics.add.staticGroup();
        this.spawnCups(10); 
        
        // Create ball
        this.createBall(width, height);
        
        // Setup UI
        this.setupUI(width, height);
        
        // Setup input
        this.setupInputHandlers();
        
        // Start game
        this.updateUI();
        this.showRoundIntro();
    }
    
    initializeGameState() {
        this.gameState = {
            currentRound: 1,
            shotsInRound: 0,
            hitsInRound: 0,
            comboCount: 0,
            totalShots: 0,
            totalHits: 0,
            isFlying: false,
            hitRegistered: false,
            gameOver: false
        };
        this.swipeStart = null;
    }
    
    createVisualEffects() {
        // Trajectory dots
        this.dots = [];
        for (let i = 0; i < 12; i++) {
            this.dots.push(this.add.image(0, 0, 'dot').setAlpha(0).setDepth(10));
        }
        
        // Particle emitter for fireball
        this.emitter = this.add.particles(0, 0, 'particle', {
            speed: { min: 20, max: 100 }, 
            angle: { min: 0, max: 360 }, 
            scale: { start: 1, end: 0 },
            blendMode: 'ADD', 
            lifespan: 400, 
            emitting: false
        }).setDepth(19);
    }
    
    createBall(width, height) {
        this.ball = this.physics.add.sprite(width / 2, height - 110, 'ball')
            .setDepth(20)
            .setBounce(CONSTANTS.PHYSICS.ball_bounce)
            .setDrag(CONSTANTS.PHYSICS.ball_drag);
        
        this.ballShadow = this.add.sprite(width / 2, height - 100, 'shadow')
            .setAlpha(0.3)
            .setDepth(4);
        
        this.physics.add.collider(this.ball, this.cups);
    }
    
    setupUI(width, height) {
        this.uiText = this.add.text(20, 20, '', { 
            fontSize: '18px', 
            fill: '#fff', 
            fontStyle: 'bold' 
        }).setDepth(50);
        
        this.statsText = this.add.text(20, 45, '', { 
            fontSize: '16px', 
            fill: CONSTANTS.COLORS.gold, 
            fontStyle: 'bold' 
        }).setDepth(50);
        
        this.comboText = this.add.text(width/2, 250, '', { 
            fontSize: '48px', 
            fill: CONSTANTS.COLORS.gold, 
            fontStyle: '900', 
            stroke: CONSTANTS.COLORS.shadow, 
            strokeThickness: 6 
        }).setOrigin(0.5).setDepth(100).setAlpha(0);
    }
    
    setupInputHandlers() {
        this.input.on('pointerdown', (p) => {
            if (!this.gameState.isFlying && !this.gameState.gameOver) {
                this.swipeStart = { x: p.x, y: p.y };
            }
        });
        
        this.input.on('pointermove', (p) => {
            if (this.swipeStart) this.updateTrajectory(p);
        });
        
        this.input.on('pointerup', (p) => {
            if (this.swipeStart) this.handleSwipeEnd(p);
        });
    }

    spawnCups(count) {
        const cx = this.scale.width / 2;
        const sy = 120;
        const gap = 48;
        
        const layout = CONSTANTS.CUP_LAYOUTS[count] || [1];
        const targetPositions = this.calculateCupPositions(layout, cx, sy, gap);
        
        const existingCups = this.cups.getChildren();
        targetPositions.forEach((pos, index) => {
            if (existingCups[index]) {
                this.tweens.add({ 
                    targets: existingCups[index], 
                    x: pos.x, 
                    y: pos.y, 
                    duration: 600, 
                    ease: 'Back.Out', 
                    delay: index * 40 
                });
            } else {
                const c = this.cups.create(pos.x, -50, 'cup')
                    .setCircle(CONSTANTS.PHYSICS.cup_radius);
                this.tweens.add({ 
                    targets: c, 
                    y: pos.y, 
                    duration: 800, 
                    ease: 'Bounce.Out', 
                    delay: index * 60 
                });
            }
        });
    }
    
    calculateCupPositions(layout, cx, sy, gap) {
        const positions = [];
        layout.forEach((rowSize, rIdx) => {
            for (let i = 0; i < rowSize; i++) {
                positions.push({
                    x: cx - ((rowSize - 1) * gap / 2) + (i * gap),
                    y: sy + (rIdx * (gap * 0.85))
                });
            }
        });
        return positions;
    }

    updateTrajectory(p) {
        const dx = p.x - this.swipeStart.x;
        const dy = p.y - this.swipeStart.y;
        const angle = Math.atan2(dy, dx);
        const dist = Math.min(Math.sqrt(dx*dx + dy*dy), 220);
        
        this.dots.forEach((dot, i) => {
            const step = i / this.dots.length;
            dot.setPosition(
                this.ball.x + Math.cos(angle) * dist * 4 * step,
                this.ball.y + Math.sin(angle) * dist * 4 * step
            );
            dot.setAlpha((1 - step) * 0.8);
        });
    }

    handleSwipeEnd(p) {
        const dx = p.x - this.swipeStart.x;
        const dy = p.y - this.swipeStart.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        this.dots.forEach(d => d.setAlpha(0));
        
        if (dist > 30 && dy < 0) {
            this.shoot(Math.atan2(dy, dx), dist);
        }
        this.swipeStart = null;
    }

    shoot(angle, force) {
        this.gameState.isFlying = true;
        this.gameState.hitRegistered = false;
        this.gameState.shotsInRound++;
        this.gameState.totalShots++;
        
        const isBonusMode = this.gameState.comboCount >= CONSTANTS.COMBO.fireball_threshold;
        
        if (isBonusMode) {
            this.ball.setTexture('fireball');
            this.emitter.start();
        } else {
            this.ball.setTexture('ball');
            this.emitter.stop();
        }

        const speed = Math.min(
            Math.max(force * CONSTANTS.SPEEDS.force_multiplier, CONSTANTS.SPEEDS.min_ball),
            CONSTANTS.SPEEDS.max_ball
        );
        
        this.ball.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
        
        this.animateBallShot();
    }
    
    animateBallShot() {
        this.tweens.add({
            targets: this.ball, 
            scale: 1.3, 
            duration: CONSTANTS.SHOT_TIMINGS.trajectory_duration, 
            ease: 'Quad.Out',
            onComplete: () => {
                this.tweens.add({
                    targets: this.ball, 
                    scale: 0.6, 
                    duration: CONSTANTS.SHOT_TIMINGS.ball_scale_duration, 
                    yoyo: true, 
                    ease: 'Sine.InOut',
                    onUpdate: () => { 
                        if (this.ball.body) {
                            this.ball.body.checkCollision.none = 
                                (this.ball.scale < CONSTANTS.PHYSICS.scale_threshold);
                        }
                    }
                });
            }
        });
    }

    checkHit() {
        if (!this.gameState.isFlying || this.gameState.hitRegistered) return;
        
        this.cups.children.entries.forEach(cup => {
            const distance = Phaser.Math.Distance.Between(
                this.ball.x, this.ball.y, cup.x, cup.y
            );
            
            if (distance < CONSTANTS.PHYSICS.hit_distance && 
                this.ball.scale > CONSTANTS.PHYSICS.scale_threshold) {
                this.executeHit(cup);
            }
        });
    }

    executeHit(cup) {
        this.gameState.hitRegistered = true;
        this.gameState.isFlying = false;
        this.gameState.hitsInRound++;
        this.gameState.totalHits++;
        this.gameState.comboCount++;
        this.emitter.stop();

        const comboMsg = this.getComboMessage();
        this.showComboEffect(comboMsg);

        this.ball.setVelocity(0);
        this.tweens.killTweensOf(this.ball);
        
        this.tweens.add({
            targets: this.ball, 
            x: cup.x, 
            y: cup.y, 
            scale: 0.7, 
            alpha: 0.5, 
            duration: 200,
            onComplete: () => {
                cup.destroy();
                this.updateFormations();
                this.updateUI();
                this.time.delayedCall(CONSTANTS.SHOT_TIMINGS.transition_delay, () => this.nextStep());
            }
        });
    }
    
    getComboMessage() {
        const combo = this.gameState.comboCount;
        if (combo >= 3) return CONSTANTS.COMBO.messages[3];
        if (combo === 2) return CONSTANTS.COMBO.messages[2];
        return CONSTANTS.COMBO.messages[1];
    }

    showComboEffect(msg) {
        this.comboText.setText(msg).setAlpha(1).setScale(0.5);
        this.tweens.add({ 
            targets: this.comboText, 
            scale: 1.2, 
            duration: 400, 
            ease: 'Back.Out', 
            onComplete: () => {
                this.time.delayedCall(500, () => {
                    this.tweens.add({ 
                        targets: this.comboText, 
                        alpha: 0, 
                        duration: 200 
                    });
                });
            }
        });
    }

    finishShot() {
        if (!this.gameState.isFlying) return;
        
        this.gameState.isFlying = false;
        this.gameState.comboCount = 0;
        this.emitter.stop();
        
        this.popText('MISS', this.ball.x, this.ball.y - 40, CONSTANTS.COLORS.error);
        this.updateUI();
        
        this.tweens.add({ 
            targets: this.ball, 
            alpha: 0, 
            duration: 300, 
            onComplete: () => this.nextStep() 
        });
    }

    nextStep() {
        if (this.cups.countActive() === 0) {
            this.showVictory();
            return;
        }
        
        const maxShots = this.gameState.hitsInRound === 2 ? 
            CONSTANTS.SHOT_TIMINGS.max_shots_bonus : 
            CONSTANTS.SHOT_TIMINGS.max_shots_normal;
        
        if (this.gameState.shotsInRound >= maxShots) {
            this.gameState.currentRound++;
            this.gameState.shotsInRound = 0;
            this.gameState.hitsInRound = 0;
            this.showRoundIntro();
        } else if (this.gameState.shotsInRound === 2 && this.gameState.hitsInRound === 2) {
            this.popText("BONUS SHOT!", 225, 400, CONSTANTS.COLORS.success, 40);
        }
        
        this.updateUI();
        this.resetBall();
    }

    resetBall() {
        this.ball
            .setPosition(this.scale.width / 2, this.scale.height - 110)
            .setVelocity(0)
            .setScale(1)
            .setAlpha(1)
            .setTexture('ball');
        
        if (this.ball.body) {
            this.ball.body.checkCollision.none = false;
        }
        this.gameState.isFlying = false;
    }

    updateUI() {
        const max = (this.gameState.hitsInRound === 2 || this.gameState.shotsInRound > 2) ? 3 : 2;
        this.uiText.setText(
            `KOLO: ${this.gameState.currentRound} | HOD: ${this.gameState.shotsInRound}/${max}`
        );
        
        const success = this.gameState.totalShots === 0 ? 0 : 
            Math.round((this.gameState.totalHits / this.gameState.totalShots) * 100);
        
        this.statsText.setText(
            `ÚSPĚŠNOST: ${success}% | COMBO: ${this.gameState.comboCount}`
        );
    }

    showRoundIntro() {
        const t = this.add.text(
            this.scale.width / 2, 
            this.scale.height / 2, 
            `KOLO ${this.gameState.currentRound}`, 
            { 
                fontSize: '70px', 
                fill: '#fff', 
                fontStyle: '900', 
                stroke: CONSTANTS.COLORS.shadow, 
                strokeThickness: 10 
            }
        ).setOrigin(0.5).setDepth(200).setScale(0);
        
        this.tweens.add({ 
            targets: t, 
            scale: 1, 
            ease: 'Back.Out', 
            duration: 600, 
            onComplete: () => {
                this.time.delayedCall(600, () => {
                    this.tweens.add({ 
                        targets: t, 
                        alpha: 0, 
                        duration: 300, 
                        onComplete: () => t.destroy() 
                    });
                });
            }
        });
    }

    popText(txt, x, y, color, size = 32) {
        const t = this.add.text(x, y, txt, { 
            fontSize: size + 'px', 
            fill: color, 
            fontStyle: '900', 
            stroke: CONSTANTS.COLORS.shadow, 
            strokeThickness: 6 
        }).setOrigin(0.5).setDepth(100);
        
        this.tweens.add({ 
            targets: t, 
            y: y - 80, 
            alpha: 0, 
            duration: 800, 
            onComplete: () => t.destroy() 
        });
    }

    updateFormations() {
        const cupsLeft = this.cups.countActive();
        const relevantCounts = [6, 3, 1];
        
        if (relevantCounts.includes(cupsLeft)) {
            this.spawnCups(cupsLeft);
        }
    }

    saveStats() {
        const stats = JSON.parse(
            localStorage.getItem('hoofPongStats') || '{"games":0,"totalHits":0}'
        );
        stats.games += 1;
        stats.totalHits += this.gameState.totalHits;
        localStorage.setItem('hoofPongStats', JSON.stringify(stats));
    }

    showVictory() {
        this.gameState.gameOver = true;
        this.saveStats();
        
        const { width, height } = this.scale;
        
        // Semi-transparent overlay
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85)
            .setDepth(1000);
        
        // Victory text
        this.add.text(
            width / 2, 
            height / 2 - 80, 
            'VÝHRA!', 
            { 
                fontSize: '80px', 
                fill: CONSTANTS.COLORS.gold, 
                fontStyle: '900', 
                stroke: CONSTANTS.COLORS.shadow, 
                strokeThickness: 10 
            }
        ).setOrigin(0.5).setDepth(1001);
        
        // Statistics summary
        this.add.text(
            width / 2, 
            height / 2, 
            `Zásahy: ${this.gameState.totalHits}/${this.gameState.totalShots}\nÚspěšnost: ${Math.round((this.gameState.totalHits / this.gameState.totalShots) * 100)}%`, 
            { 
                fontSize: '20px', 
                fill: '#fff',
                align: 'center'
            }
        ).setOrigin(0.5).setDepth(1001);
        
        // Restart button
        const btnRestart = this.add.rectangle(width / 2, height / 2 + 100, 250, 60, 0x27ae60)
            .setInteractive({ useHandCursor: true })
            .setDepth(1001);
        
        this.add.text(width / 2, height / 2 + 100, 'HRÁT ZNOVU', { 
            fontSize: '24px', 
            fill: '#fff', 
            fontStyle: 'bold' 
        }).setOrigin(0.5).setDepth(1002);
        
        btnRestart.on('pointerdown', () => this.scene.restart());
        btnRestart.on('pointerover', () => btnRestart.setFillStyle(0x2ecc71));
        btnRestart.on('pointerout', () => btnRestart.setFillStyle(0x27ae60));
        
        // Menu button
        const btnMenu = this.add.rectangle(width / 2, height / 2 + 170, 250, 60, 0x2980b9)
            .setInteractive({ useHandCursor: true })
            .setDepth(1001);
        
        this.add.text(width / 2, height / 2 + 170, 'ZPĚT DO MENU', { 
            fontSize: '24px', 
            fill: '#fff', 
            fontStyle: 'bold' 
        }).setOrigin(0.5).setDepth(1002);
        
        btnMenu.on('pointerdown', () => this.scene.start('MenuScene'));
        btnMenu.on('pointerover', () => btnMenu.setFillStyle(0x4a9fd8));
        btnMenu.on('pointerout', () => btnMenu.setFillStyle(0x2980b9));
    }

    update() {
        if (!this.ball || this.gameState.gameOver) return;
        
        // Update shadow
        this.ballShadow.x = this.ball.x;
        this.ballShadow.y = this.ball.y + (this.ball.scale < 1 ? 25 : 10);
        this.ballShadow.setScale(this.ball.scale * 0.8);
        this.ballShadow.setAlpha(this.ball.alpha * 0.3);
        
        // Update particle emitter
        if (this.gameState.isFlying && this.gameState.comboCount >= CONSTANTS.COMBO.fireball_threshold) {
            this.emitter.setPosition(this.ball.x, this.ball.y);
        }
        
        // Check collisions and end conditions
        if (this.gameState.isFlying) {
            this.checkHit();
            
            const isOutOfBounds = this.ball.y < -50 || this.ball.y > 850;
            const isStalled = this.ball.body && this.ball.body.speed < 20 && this.ball.scale > 0.9;
            
            if (isOutOfBounds || isStalled) {
                this.finishShot();
            }
        }
    }
}

// ============================================================================
// GAME INITIALIZATION
// ============================================================================

GAME_CONFIG.scene = [MenuScene, GameScene];
new Phaser.Game(GAME_CONFIG);
