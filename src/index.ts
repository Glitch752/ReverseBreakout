import './index.scss';
import { World } from 'planck';
import { Shader2DCanvas } from './Shader2DCanvas';
import bloomFragmentShader from './bloom.frag?raw';
import { Ball } from './ball';
import { Camera } from './camera';
import { Level } from './level';
import { Paddle } from './paddle';
import { Particles } from './particles';
import { Stats } from './stats';
import { PowerUp } from './powerUp';
import { TimeScaleManager } from './timeScaleManager';

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

function draw(time: number) {
    if(lastTime === null) lastTime = time - 16;
    const deltaTime = Math.min((time - lastTime) / 1000, 1 / 20);
    lastTime = time;

    if(game) {
        game.draw(deltaTime);
    } else {
        // If on the menu, draw a little ball bouncing
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // This is just the menu, so we don't care about aspect ratio or anything fancy
        const ballRadius = 10;
        const restitution = 0.9;

        // Bounce off of screen
        if(menuBall.x < canvas.width * -0.5 + ballRadius) {
            menuBall.x = canvas.width * -0.5 + ballRadius;
            menuBall.vx = -menuBall.vx * restitution;
        } else if(menuBall.x > canvas.width * 0.5 - ballRadius) {
            menuBall.x = canvas.width * 0.5 - ballRadius;
            menuBall.vx = -menuBall.vx * restitution;
        }
        if(menuBall.y < canvas.height * -0.5 + ballRadius) {
            menuBall.y = canvas.height * -0.5 + ballRadius;
            menuBall.vy = -menuBall.vy * restitution;
        } else if(menuBall.y > canvas.height * 0.5 - ballRadius) {
            menuBall.y = canvas.height * 0.5 - ballRadius;
            menuBall.vy = -menuBall.vy * restitution;
        }

        // Bounce off of data-bounce-menu-ball elements
        const bounceElements = document.querySelectorAll<HTMLElement>('[data-bounce-menu-ball]');
        bounceElements.forEach((el) => {
            const rect = el.getBoundingClientRect();
            const elLeft = rect.left - canvas.width / 2;
            const elRight = rect.right - canvas.width / 2;
            const elTop = rect.top - canvas.height / 2;
            const elBottom = rect.bottom - canvas.height / 2;

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
        const toMouseX = lastMouseX - (canvas.width / 2 + menuBall.x);
        const toMouseY = lastMouseY - (canvas.height / 2 + menuBall.y);
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

    requestAnimationFrame(draw);
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

// TEMPORARY
setTimeout(startGame, 500);

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

    private pointSelection: [PointSelectionType, ((x: number, y: number) => void)] | null = null;

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
        
        // temporary
        // setInterval(() => {
        //     this.balls.push(this.level.getInitialBalls()[0]);
        //     this.balls[this.balls.length - 1].addToWorld(this.world);
        //     if(this.balls.length > 20) {
        //         this.balls[0].destroy(this.world);
        //         this.balls.splice(0, 1);
        //     }
        // }, 2000);

        this.camera.minimumScreenDimensions = this.level.minimumScreenDimensions;

        this.level.spawnPowerUp.connect((pos, vel) => {
            const ability = this.stats.selectAbility();
            const powerUp = new PowerUp(pos, vel, ability.id, ability.icon, ability.color);
            powerUp.collected.connect(() => {
                this.stats.addAbility(ability.id);
            });
            powerUp.addToWorld(this.world);
            this.powerUps.push(powerUp);
        });

        this.stats.activateAbility.connect((abilityId) => {
            switch(abilityId) {
                case 'slowmotion':
                    this.timeScaleManager.setSlowMotion(true);
                    setTimeout(() => {
                        this.timeScaleManager.setSlowMotion(false);
                    }, this.stats.getAbilityCooldown(abilityId) * 1000 - 500);
                    break;
                case 'widen':
                    this.paddle.widen();
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
                    break;
                case 'slingshot':
                    this.pointSelection = [PointSelectionType.SlingshotAnchor, () => {
                        alert("TODO slingshot")
                    }];
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
            const [_, callback] = this.pointSelection;
            const worldPos = this.camera.projectToWorld(lastMouseX, lastMouseY, canvas);
            callback(worldPos.x, worldPos.y);
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
            const [_, callback] = this.pointSelection;
            const worldPos = this.camera.projectToWorld(event.clientX, event.clientY, canvas);
            callback(worldPos.x, worldPos.y);
            this.pointSelection = null;
            return;
        }
    }
    
    /**
     * @param deltaTime Delta time in seconds
     */
    private update(deltaTime: number) {
        if(this.level.gameOver() && this.gameRunning) {
            this.gameOver();
        }

        this.camera.trackBalls(this.balls, !this.gameRunning, deltaTime);

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

        let  length = Math.sqrt(xForce * xForce + yForce * yForce);
        if(length > 0 && !this.stats.tryTakeEnergy(0.4 * deltaTime)) length = 0;
        
        if(length > 0) {
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
        // TODO: Game over menu
        // setTimeout(() => {
        //     showMenu();
        // }, 5000);
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
            const [selectionType, _] = this.pointSelection;
            const worldPos = this.camera.projectToWorld(lastMouseX, lastMouseY, canvas);
            switch(selectionType) {
                case PointSelectionType.SlingshotAnchor:
                    // Draw a line from every ball to the mouse position
                    for(const ball of this.balls) {
                        if(ball.isDestroyed()) continue;
                        const ballPos = ball.position;
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                        ctx.lineWidth = 0.002;
                        
                        ctx.beginPath();
                        ctx.moveTo(ballPos.x, ballPos.y);
                        ctx.lineTo(worldPos.x, worldPos.y);
                        ctx.stroke();
                    }
                    break;
                case PointSelectionType.TeleportTarget:
                    // Draw a circle at the target position
                    ctx.strokeStyle = 'rgba(50, 200, 255, 0.7)';
                    ctx.lineWidth = 0.003;

                    ctx.beginPath();
                    ctx.arc(worldPos.x, worldPos.y, 0.02, 0, Math.PI * 2);
                    ctx.stroke();
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
        shader.setUniform1f('filter_amount', 1.0 - (slowMotionEase * uiHintEase));
        shader.render();
    }
}
