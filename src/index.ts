import './index.scss';
import { World } from 'planck';
import { Shader2DCanvas } from './Shader2DCanvas';
import bloomFragmentShader from './bloom.frag?raw';
import { Ball } from './ball';
import { Camera } from './camera';
import { Level } from './level';
import { Paddle } from './paddle';
import { Block } from './block';
import { Particles } from './particles';
import { Stats } from './stats';
import { PowerUp } from './powerUp';
import { TimeScaleManager } from './timeScaleManager';
import { ScoreTracker } from './scoreTracker';
import { Sounds, SoundType } from './sounds';

(async () => {
    await Sounds.init();
})();

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const shader = new Shader2DCanvas(canvas, {
    fragment: bloomFragmentShader
});
shader.setUniform1f('bloom_spread', 0.5);
shader.setUniform1f('bloom_intensity', 0.75);

const ctx = shader.getContext2D();

let game: Game | null = null;

let lastTime: number | null = null;

let menuBall: { x: number, y: number, vx: number, vy: number } = { x: 0.0, y: 0.0, vx: 200, vy: 300 };

let lastMouseX = canvas.width / 2;
let lastMouseY = canvas.height * 2 / 3;

window.addEventListener('mousemove', (event) => {
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
});

document.getElementById("scoreDisplay")!.innerText = `Best time: ${ScoreTracker.formatTime(ScoreTracker.getBestTime() ?? 0)}`;

function draw(time: number) {
    if(lastTime === null) lastTime = time - 16;
    const deltaTime = Math.min((time - lastTime) / 1000, 1 / 20);
    lastTime = time;

    requestAnimationFrame(draw);

    if(game) {
        game.draw(deltaTime);
    } else {
        // If on the menu, draw a little ball bouncing
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // This is just the menu, so we don't care about aspect ratio or anything fancy
        const ballRadius = 10;
        const restitution = 0.9;

        const width = canvas.width, height = canvas.height;

        // Bounce off of screen
        if(menuBall.x < width * -0.5 + ballRadius) {
            menuBall.x = width * -0.5 + ballRadius;
            menuBall.vx = -menuBall.vx * restitution;
        } else if(menuBall.x > width * 0.5 - ballRadius) {
            menuBall.x = width * 0.5 - ballRadius;
            menuBall.vx = -menuBall.vx * restitution;
        }
        if(menuBall.y < height * -0.5 + ballRadius) {
            menuBall.y = height * -0.5 + ballRadius;
            menuBall.vy = -menuBall.vy * restitution;
        } else if(menuBall.y > height * 0.5 - ballRadius) {
            menuBall.y = height * 0.5 - ballRadius;
            menuBall.vy = -menuBall.vy * restitution;
        }

        // Bounce off of data-bounce-menu-ball elements
        const bounceElements = document.querySelectorAll<HTMLElement>('[data-bounce-menu-ball]');
        bounceElements.forEach((el) => {
            const rect = el.getBoundingClientRect();
            const elLeft = rect.left * window.devicePixelRatio - width / 2;
            const elRight = rect.right * window.devicePixelRatio - width / 2;
            const elTop = rect.top * window.devicePixelRatio - height / 2;
            const elBottom = rect.bottom * window.devicePixelRatio - height / 2;

            if(menuBall.x + ballRadius > elLeft && menuBall.x - ballRadius < elRight &&
               menuBall.y + ballRadius > elTop && menuBall.y - ballRadius < elBottom) {
                // Simple approach: just reverse velocity based on which side is closer
                // This isn't ideal since the ball sometimes does weird things, but whatever... it's the menu.
                const distLeft = Math.abs(menuBall.x - elLeft);
                const distRight = Math.abs(menuBall.x - elRight);
                const distTop = Math.abs(menuBall.y - elTop);
                const distBottom = Math.abs(menuBall.y - elBottom);
                const minDist = Math.min(distLeft, distRight, distTop, distBottom);
                if(minDist === distLeft) {
                    menuBall.vx = -Math.abs(menuBall.vx) * restitution;
                } else if(minDist === distRight) {
                    menuBall.vx = Math.abs(menuBall.vx) * restitution;
                } else if(minDist === distTop) {
                    menuBall.vy = -Math.abs(menuBall.vy) * restitution;
                } else if(minDist === distBottom) {
                    menuBall.vy = Math.abs(menuBall.vy) * restitution;
                }

                // Slightly reduce element opacity
                const currentOpacity = parseFloat(getComputedStyle(el).opacity);
                el.style.opacity = Math.max(0.5, currentOpacity - 0.1).toString();
            }

            // Restore opacity over time
            const currentOpacity = parseFloat(getComputedStyle(el).opacity);
            el.style.opacity = Math.min(1.0, currentOpacity + 0.1 * deltaTime).toString();
        });

        // Update position
        menuBall.x += menuBall.vx * deltaTime;
        menuBall.y += menuBall.vy * deltaTime;
        
        // Draw ball
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.arc(
            canvas.width / 2 + menuBall.x,
            canvas.height / 2 + menuBall.y,
            ballRadius,
            0,
            Math.PI * 2
        );
        ctx.stroke();

        // Attract to the cursor
        const toMouseX = lastMouseX * window.devicePixelRatio - (canvas.width / 2 + menuBall.x);
        const toMouseY = lastMouseY * window.devicePixelRatio - (canvas.height / 2 + menuBall.y);
        const toMouseDist = Math.sqrt(toMouseX * toMouseX + toMouseY * toMouseY);
        if(toMouseDist > 1) {
            const toMouseNormX = toMouseX / toMouseDist;
            const toMouseNormY = toMouseY / toMouseDist;
            const velTowardMouse = menuBall.vx * toMouseNormX + menuBall.vy * toMouseNormY;
            const attractionStrength = toMouseDist * 10 - velTowardMouse;
            menuBall.vx += toMouseNormX * attractionStrength * deltaTime;
            menuBall.vy += toMouseNormY * attractionStrength * deltaTime;
        }

        shader.render();
    }
}

requestAnimationFrame(draw);

function startGame() {
    if(!game) {
        game = new Game();
        document.getElementById("menu")!.style.display = "none";
        document.getElementById("hud")!.style.display = 'block';
    }
}
document.getElementById("startButton")!.addEventListener("click", startGame);
document.getElementById("restart-button")!.addEventListener("click", () => {
    showMenu();
    startGame();
});
document.getElementById("menu-button")!.addEventListener("click", showMenu);

document.addEventListener('keydown', (event) => {
    if(game) game.onKeyDown(event);
});
document.addEventListener('keyup', (event) => {
    if(game) game.onKeyUp(event);
});
document.addEventListener('mousedown', (event) => {
    if(game) game.onMouseDown(event);
});

function showMenu() {
    game = null;
    document.getElementById("menu")!.style.display = "flex";
    document.querySelectorAll<HTMLElement>('[data-game-ui]').forEach((el) => {
        el.style.display = 'none';
    });
}

enum PointSelectionType {
    SlingshotAnchor,
    TeleportTarget
}

class Game {
    private world = new World({
        gravity: { x: 0, y: 0 },
        allowSleep: true
    });

    private level = new Level();
    private balls: Ball[] = this.level.getInitialBalls();
    private powerUps: PowerUp[] = [];
    private paddle: Paddle = new Paddle(0.0, 0.4, 0.15, 0.02);

    private camera = new Camera(0.0, 0.0, 1.0);
    private particles: Particles = new Particles();

    private stats: Stats = new Stats();

    private gameRunning: boolean = true;

    private timeScaleManager: TimeScaleManager = new TimeScaleManager();

    private pointSelection: {
        type: PointSelectionType,
        callback: ((x: number, y: number) => void),
        startTime: number
    } | null = null;

    constructor() {
        this.world.on("pre-solve", (contact) => {
            const fixtureA = contact.getFixtureA();
            const fixtureB = contact.getFixtureB();

            const userDataA = fixtureA.getUserData();
            const userDataB = fixtureB.getUserData();

            if((userDataA instanceof PowerUp && userDataB instanceof Ball) ||
                (userDataB instanceof PowerUp && userDataA instanceof Ball)) {
                contact.setEnabled(false);
            }

            if(
                (userDataA instanceof Ball && userDataA.isGhost()) ||
                (userDataB instanceof Ball && userDataB.isGhost())
            ) {
                contact.setEnabled(false);
            }
        })

        this.world.on("begin-contact", (contact) => {
            const fixtureA = contact.getFixtureA();
            const fixtureB = contact.getFixtureB();

            const userDataA = fixtureA.getUserData();
            const userDataB = fixtureB.getUserData();

            // Balls should always maintain their speed
            let ball: Ball | null = null;
            let ballFixture = null;
            let otherFixture = null;
            if(userDataA instanceof Ball) {
                ball = userDataA;
                ballFixture = fixtureA;
                otherFixture = fixtureB;
            } else if(userDataB instanceof Ball) {
                ball = userDataB;
                ballFixture = fixtureB;
                otherFixture = fixtureA;
            }
            
            if(ball && ballFixture && otherFixture) {
                ball.handleCollision(contact, otherFixture, this.particles);
            }
        });

        this.world.createBody({
            type: 'static',
        }).createFixture({
            shape: this.level.getBorders(),
            restitution: 1.0,
            friction: 0.0,
            filterCategoryBits: 0b100
        });

        this.level.initBlocksInWorld(this.world);
        for(const ball of this.balls) {
            ball.addToWorld(this.world);
        }

        this.paddle.addToWorld(this.world);

        this.level.addDeathBody(this.world);
        
        this.camera.minimumScreenDimensions = this.level.levelDimensions.map(v => v * 1.05) as [number, number];

        this.level.spawnPowerUp.connect((pos, vel) => {
            const rand = Math.random();
            if(rand < 0.5) {
                // Spawn a powerup
                let powerUp: PowerUp;
                if(rand < 0.1) {
                    // Energy
                    powerUp = new PowerUp(pos, vel, this.stats.energyIcon, true, '#ece8ae');
                    powerUp.collected.connect(() => {
                        this.stats.addEnergy(0.2);
                    });
                } else if(rand < 0.2) {
                    // Explodey thingy
                    powerUp = new PowerUp(pos, vel, this.stats.explodeyIcon, true, '#ff5555');
                    powerUp.collected.connect((ball) => {
                        this.particles.emitCircleBurst(
                            powerUp.position.x, powerUp.position.y,
                            0.03,
                            100,
                            0.6,
                            0.7,
                            '#ff5555'
                        );
                        // Move the explosion center down a bit for balance - makes it easier to launch balls upward
                        ball.applyExplosionImpulse(powerUp.position.x, powerUp.position.y + 0.05, 0.001);
                        Sounds.play(SoundType.Explosion);
                    });
                } else {
                    // Ability
                    const ability = this.stats.selectAbility();
                    powerUp = new PowerUp(pos, vel, ability.icon, false, ability.color);
                    powerUp.collected.connect(() => {
                        this.stats.addAbility(ability.id);
                    });
                }
                powerUp.addToWorld(this.world);
                this.powerUps.push(powerUp);
            }
        });

        this.stats.activateAbility.connect((abilityId) => {
            switch(abilityId) {
                case 'slowmotion':
                    this.timeScaleManager.setSlowMotion(true);
                    Sounds.play(SoundType.SlowMotion);
                    setTimeout(() => {
                        this.timeScaleManager.setSlowMotion(false);
                        Sounds.play(SoundType.SlowMotionResume);
                    }, this.stats.getAbilityCooldown(abilityId) * 1000 - 500);
                    break;
                case 'widen':
                    this.paddle.widen();
                    Sounds.play(SoundType.UsePowerUp);
                    break;
                case 'split':
                    const newBalls: Ball[] = [];
                    const newAngleOffset = Math.PI / 12;
                    for(const ball of this.balls) {
                        // Usually wouldn't happen, but we hard limit the number of balls to avoid performance issues
                        if(newBalls.length + this.balls.length >= 150) break;
                        if(ball.isDestroyed()) continue;
                        const splitBalls = [
                            ball.cloneWithAngleOffset(-newAngleOffset),
                            ball.cloneWithAngleOffset(newAngleOffset)
                        ];
                        for(const splitBall of splitBalls) {
                            splitBall.addToWorld(this.world);
                            newBalls.push(splitBall);
                        }
                    }
                    this.balls.push(...newBalls);
                    Sounds.play(SoundType.UsePowerUp);
                    break;
                case 'slingshot':
                    this.pointSelection = {
                        type: PointSelectionType.SlingshotAnchor,
                        callback: (x, y) => {
                            for(const ball of this.balls) {
                                if(ball.isDestroyed()) continue;
                                const ballPos = ball.position;
                                const dirX = x - ballPos.x;
                                const dirY = y - ballPos.y;
                                const dirLength = Math.sqrt(dirX * dirX + dirY * dirY);
                                if(dirLength > 0) {
                                    const slingshotStrength = 0.1;
                                    const impulseX = dirX / dirLength * slingshotStrength;
                                    const impulseY = dirY / dirLength * slingshotStrength;
                                    ball.slingshot(impulseX, impulseY);
                                    this.particles.emitLineBurst(
                                        ballPos.x, ballPos.y,
                                        x, y,
                                        100,
                                        0.9,
                                        0.6,
                                        '#ff89ff',
                                        0.5
                                    );
                                }
                            }
                            Sounds.play(SoundType.Launch);
                        },
                        startTime: performance.now()
                    };
                    break;
                case 'teleport':
                    this.pointSelection = {
                        type: PointSelectionType.TeleportTarget,
                        callback: (x, y) => {
                            for(const ball of this.balls) {
                                if(ball.isDestroyed()) continue;
                                this.particles.emitLineBurst(
                                    ball.position.x, ball.position.y,
                                    x, y,
                                    30,
                                    0.1,
                                    0.9,
                                    '#89ffff',
                                    0.9
                                );
                                ball.teleportTo(x + ball.velocity.x * 0.01, y + ball.velocity.y * 0.01);
                            }
                            Sounds.play(SoundType.Teleport);
                        },
                        startTime: performance.now()
                    };
                    break;
                case 'ghost':
                    for(const ball of this.balls) {
                        if(ball.isDestroyed()) continue;
                        ball.setGhostMode(this.stats.getAbilityCooldown(abilityId) / 2.0);
                    }
                    Sounds.play(SoundType.UsePowerUp);
                    break;
                case 'laser':
                    for(const ball of this.balls) {
                        if(ball.isDestroyed()) continue;
                        // Emit a raycast in 4 directions
                        const dirs = [
                            { x: 1, y: 0, len: this.level.levelDimensions[0] / 2 - ball.position.x },
                            { x: -1, y: 0, len: this.level.levelDimensions[0] / 2 + ball.position.x },
                            { x: 0, y: 1, len: this.level.levelDimensions[1] / 2 - ball.position.y },
                            { x: 0, y: -1, len: this.level.levelDimensions[1] / 2 + ball.position.y }
                        ];
                        const ballPos = ball.position;
                        for(const dir of dirs) {
                            const endX = ballPos.x + dir.x * dir.len;
                            const endY = ballPos.y + dir.y * dir.len;
                            this.world.rayCast(ballPos, { x: endX, y: endY }, (fixture, _point, _normal, _fraction) => {
                                const userData = fixture.getUserData();
                                if(userData instanceof Block) {
                                    userData.hit(this.particles);
                                }
                                return 1;
                            });

                            this.particles.emitLineBurst(
                                ballPos.x, ballPos.y,
                                endX, endY,
                                200 / this.balls.length,
                                0.4,
                                0.8,
                                '#f96d4e',
                                0.7
                            );
                        }
                    }
                    Sounds.play(SoundType.LaserShoot);
                    break;
            }
        });

        this.stats.abilityHintShown.connect((shown) => {
            this.timeScaleManager.setUIHint(shown);
        });
    }

    private keysPressed: Set<string> = new Set();

    public onKeyDown(event: KeyboardEvent) {
        if(event.repeat) return;

        if(!this.gameRunning && event.code === 'Escape') {
            showMenu();
            return;
        }
        if(!this.gameRunning) return;

        this.keysPressed.add(event.code);

        if(this.pointSelection) {
            if(performance.now() - this.pointSelection.startTime < 200) return; // Prevent likely-accidental immediate selection

            const worldPos = this.camera.projectToWorld(lastMouseX, lastMouseY, canvas);
            this.pointSelection.callback(worldPos.x, worldPos.y);
            this.pointSelection = null;
            return;
        }

        this.stats.checkAbilityBind(event.code);
    }

    public onKeyUp(event: KeyboardEvent) {
        this.keysPressed.delete(event.code);
    }

    public onMouseDown(event: MouseEvent) {
        if(!this.gameRunning) return;

        if(this.pointSelection) {
            if(performance.now() - this.pointSelection.startTime < 100) return; // Prevent likely-accidental immediate selection

            const worldPos = this.camera.projectToWorld(event.clientX, event.clientY, canvas);
            this.pointSelection.callback(worldPos.x, worldPos.y);
            this.pointSelection = null;
            return;
        }
    }

    private hadPointSelectionLastFrame: boolean = false;
    
    /**
     * @param deltaTime Delta time in seconds
     */
    private update(deltaTime: number) {
        if(this.level.gameOver() && this.gameRunning) {
            this.gameOver();
        }

        if((this.pointSelection !== null) !== this.hadPointSelectionLastFrame) {
            this.hadPointSelectionLastFrame = this.pointSelection !== null;
            document.getElementById("abilities")!.classList.toggle("inactive", this.pointSelection !== null);
        }

        this.camera.trackBalls(this.balls, deltaTime, !this.gameRunning, this.pointSelection !== null);

        // Update time scale manager
        this.timeScaleManager.update(deltaTime, this.gameRunning, this.pointSelection !== null);
        deltaTime *= this.timeScaleManager.timeScale;

        if(deltaTime <= 1e-7) return;
        
        // Update particles
        this.particles.update(deltaTime);

        this.stats.update(deltaTime, deltaTime / this.timeScaleManager.timeScale);

        // Input
        let xForce = 0, yForce = 0;
        if(this.keysPressed.has('ArrowLeft') || this.keysPressed.has('KeyA')) xForce -= 1;
        if(this.keysPressed.has('ArrowRight') || this.keysPressed.has('KeyD')) xForce += 1;
        if(this.keysPressed.has('ArrowUp') || this.keysPressed.has('KeyW')) yForce -= 1;
        if(this.keysPressed.has('ArrowDown') || this.keysPressed.has('KeyS')) yForce += 1;

        let length = Math.sqrt(xForce * xForce + yForce * yForce);
        if(length > 0) length /= this.stats.tryTakeEnergy(0.4 * deltaTime);
        
        if(length > 0.01) {
            xForce /= length;
            yForce /= length;

            for(const ball of this.balls) {
                if(ball.isDestroyed()) continue;

                ball.applyForce(xForce * 0.003, yForce * 0.003);
            }
        }

        // Physics / updates
        const physicsSteps = 5;
        for(let i = 0; i < physicsSteps; i++) {
            this.world.step(deltaTime / physicsSteps, 4, 2);
        }
        this.world.clearForces();
        
        this.level.update(this.world, deltaTime);

        // Remove destroyed balls
        for(let i = this.balls.length - 1; i >= 0; i--) {
            if(this.balls[i].isDestroyed()) {
                this.balls[i].destroy(this.world);
                this.balls.splice(i, 1);

                if(this.balls.length === 0) {
                    this.gameOver();
                }

                continue;
            }

            this.balls[i].update(deltaTime);
        }

        // Remove destroyed power-ups
        for(let i = this.powerUps.length - 1; i >= 0; i--) {
            if(this.powerUps[i].isDestroyed) {
                this.powerUps[i].destroy(this.world);
                this.powerUps.splice(i, 1);
                continue;
            }
            
            this.powerUps[i].update(deltaTime);
        }

        // Update paddle
        this.paddle.update(deltaTime, this.balls);
    }

    private gameOver() {
        this.gameRunning = false;
        const gameOverElement = document.getElementById("game-over")!;
        gameOverElement.classList.remove('visible');
        gameOverElement.style.display = 'flex';
        setTimeout(() => {
            gameOverElement.classList.add('visible');

            const reasonElement = document.getElementById("game-over-reason")!;
            reasonElement.textContent = this.balls.length === 0 ? "No more balls!" : "Blocks reached the bottom!";
            
            const timeSeconds = this.stats.time;
            ScoreTracker.submitTime(timeSeconds);

            const finalTimeElement = document.getElementById("final-time")!;
            finalTimeElement.textContent = `Time: ${ScoreTracker.formatTime(timeSeconds)}`;
            const bestTimeElement = document.getElementById("best-time")!;
            const bestTime = ScoreTracker.getBestTime() ?? timeSeconds;
            bestTimeElement.textContent = `Best time: ${ScoreTracker.formatTime(bestTime)}`;
        }, 500);
        Sounds.play(SoundType.GameOver);
    }
    
    private drawWorld() {
        for(const powerUp of this.powerUps) {
            powerUp.draw(ctx);
        }

        this.level.drawWorld(ctx);

        for(const ball of this.balls) {
            ball.draw(ctx);
        }

        if(this.pointSelection) {
            const { type: selectionType } = this.pointSelection;
            const worldPos = this.camera.projectToWorld(lastMouseX, lastMouseY, canvas);
            switch(selectionType) {
                case PointSelectionType.SlingshotAnchor:
                    // Draw a line from every ball to the mouse position
                    for(const ball of this.balls) {
                        if(ball.isDestroyed()) continue;
                        const ballPos = ball.position;
                        ctx.strokeStyle = 'rgba(255, 137, 255, 0.75)';
                        ctx.lineWidth = 0.003;
                        ctx.setLineDash([0.01, 0.01]);

                        // Move the start position toward the target
                        const dirX = worldPos.x - ballPos.x;
                        const dirY = worldPos.y - ballPos.y;
                        const dirLength = Math.sqrt(dirX * dirX + dirY * dirY);
                        
                        const startX = ballPos.x + (dirLength > 0 ? dirX / dirLength * ball.radius : 0);
                        const startY = ballPos.y + (dirLength > 0 ? dirY / dirLength * ball.radius : 0);
                        
                        ctx.beginPath();
                        ctx.moveTo(worldPos.x, worldPos.y);
                        ctx.lineTo(startX, startY);
                        ctx.stroke();

                        ctx.setLineDash([]);
                    }
                    break;
                case PointSelectionType.TeleportTarget:
                    // Draw a circle at the target position
                    ctx.strokeStyle = 'rgba(50, 200, 255, 0.7)';
                    ctx.lineWidth = 0.003;

                    ctx.beginPath();
                    ctx.arc(worldPos.x, worldPos.y, 0.015, 0, Math.PI * 2);
                    ctx.stroke();

                    for(const ball of this.balls) {
                        if(ball.isDestroyed()) continue;
                        const ballPos = ball.position;
                        ctx.strokeStyle = 'rgba(50, 200, 255, 0.3)';
                        ctx.lineWidth = 0.0025;
                        ctx.setLineDash([0.01, 0.01]);

                        ctx.beginPath();
                        ctx.moveTo(worldPos.x, worldPos.y);
                        ctx.lineTo(ballPos.x, ballPos.y);
                        ctx.stroke();

                        ctx.setLineDash([]);
                    }
                    break;
            }
        }

        this.paddle.draw(ctx);
    }

    public draw(deltaTime: number) {
        this.update(deltaTime);

        // Scale world space to screen space
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        // Background
        ctx.fillStyle = "#040408";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        this.camera.applyTransform(ctx);
        
        // Cheap perspective effect by drawing a scaled-down background centered on the camera first
        ctx.save();
        ctx.translate(this.camera.x, this.camera.y);
        ctx.scale(0.98, 0.98);
        ctx.translate(-this.camera.x, -this.camera.y);
        this.level.draw(ctx, deltaTime);
        this.level.drawBorder(ctx);
        ctx.restore();
        
        this.level.drawBorder(ctx);

        // Cheap perspective effect by drawing a scaled-down background centered on the camera first
        ctx.globalAlpha = 0.2;
        ctx.save();
        ctx.translate(this.camera.x, this.camera.y);
        ctx.scale(0.985, 0.985);
        ctx.translate(-this.camera.x, -this.camera.y);
        this.drawWorld();
        ctx.restore();

        ctx.globalAlpha = 1.0;
        this.particles.draw(ctx);
        this.drawWorld();

        // Apply a canvas filter based on slow motion
        const slowMotionEase = this.timeScaleManager.slowMotionEase;
        const uiHintEase = this.timeScaleManager.uiHintEase * 0.5 + 0.5;
        const gameOverEase = this.timeScaleManager.gameOverEase * 0.5 + 0.5;
        shader.setUniform1f('filter_amount', 1.0 - (slowMotionEase * uiHintEase * gameOverEase));
        shader.render();
    }
}
