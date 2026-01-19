import './index.css';
import { Vec2, World } from 'planck';
import { Shader2DCanvas } from './Shader2DCanvas';
import bloomFragmentShader from './bloom.frag?raw';
import { Block } from './block';
import { Ball } from './ball';
import { Camera } from './camera';
import { Level } from './level';
import { Paddle } from './paddle';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const shader = new Shader2DCanvas(canvas, {
    fragment: bloomFragmentShader
});
shader.setUniform1i('bloom_spread', 0.5);
shader.setUniform1i('bloom_intensity', 0.75);

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

document.getElementById("startButton")!.addEventListener("click", () => {
    if(!game) {
        game = new Game();
        document.getElementById("menu")!.style.display = "none";
    }
});

document.addEventListener('keydown', (event) => {
    if(game) game.onKeyDown(event);
});
document.addEventListener('keyup', (event) => {
    if(game) game.onKeyUp(event);
});

function showMenu() {
    game = null;
    document.getElementById("menu")!.style.display = "flex";
}

class Game {
    private world = new World({
        gravity: { x: 0, y: 0 },
        allowSleep: true
    });

    private level = new Level();
    private blocks: Block[] = this.level.getBlocks();
    private balls: Ball[] = this.level.getInitialBalls();
    private paddle: Paddle = new Paddle(0.0, 0.4, 0.15, 0.02);

    private camera = new Camera(0.0, 0.0, 1.0);

    constructor() {
        this.world.on("begin-contact", (contact) => {
            const fixtureA = contact.getFixtureA();
            const fixtureB = contact.getFixtureB();

            const userDataA = fixtureA.getUserData();
            const userDataB = fixtureB.getUserData();

            if(userDataA instanceof Block && userDataB instanceof Ball) {
                userDataA.hit();
            } else if(userDataB instanceof Block && userDataA instanceof Ball) {
                userDataB.hit();
            }

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
                ball.handleCollision(this.world, contact, otherFixture);
            }
        });

        this.world.createBody({
            type: 'static',
        }).createFixture({
            shape: this.level.getBorders(),
            restitution: 1.0,
            friction: 0.0,
        });

        for(const block of this.blocks) {
            block.addToWorld(this.world);
        }
        for(const ball of this.balls) {
            ball.addToWorld(this.world);
        }

        this.paddle.addToWorld(this.world);

        this.level.addDeathBody(this.world);
        
        // temporary
        // setInterval(() => {
        //     balls.push(level.getInitialBalls()[0]);
        //     balls[balls.length - 1].addToWorld(world);
        //     if(balls.length > 20) {
        //         balls[0].destroy(world);
        //         balls.splice(0, 1);
        //     }
        // }, 1000);

        this.camera.minimumScreenDimensions = this.level.minimumScreenDimensions;
    }

    private keysPressed: Set<string> = new Set();

    public onKeyDown(event: KeyboardEvent) {
        if(event.repeat) return;

        if(event.code === 'Escape') {
            showMenu();
            return;
        }

        this.keysPressed.add(event.code);
    }

    public onKeyUp(event: KeyboardEvent) {
        this.keysPressed.delete(event.code);
    }
    
    /**
     * @param deltaTime Delta time in seconds
     */
    private update(deltaTime: number) {
        // Input
        
        let xForce = 0;
        let yForce = 0;
        
        if(this.keysPressed.has('ArrowLeft') || this.keysPressed.has('KeyA')) xForce -= 1;
        if(this.keysPressed.has('ArrowRight') || this.keysPressed.has('KeyD')) xForce += 1;
        if(this.keysPressed.has('ArrowUp') || this.keysPressed.has('KeyW')) yForce -= 1;
        if(this.keysPressed.has('ArrowDown') || this.keysPressed.has('KeyS')) yForce += 1;
        
        const length = Math.sqrt(xForce * xForce + yForce * yForce);
        if(length > 0) {
            xForce /= length;
            yForce /= length;
        }
        
        for(const ball of this.balls) {
            if(ball.isDestroyed()) continue;

            ball.applyForce(xForce * 0.3 * deltaTime, yForce * 0.3 * deltaTime);
        }

        // Physics / updates
        const physicsSteps = 5;
        for(let i = 0; i < physicsSteps; i++) {
            this.world.step(deltaTime / physicsSteps, 4, 2);
        }
        this.world.clearForces();

        this.camera.trackBalls(this.balls, deltaTime);
        
        // Remove destroyed blocks
        for(let i = this.blocks.length - 1; i >= 0; i--) {
            if(this.blocks[i].isDestroyed()) {
                this.blocks[i].destroy(this.world);
                this.blocks.splice(i, 1);
            }
        }

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

        // Update paddle
        this.paddle.update(deltaTime, this.balls);

        // TODO: Level complete condition
    }

    private gameOver() {
        // TODO
        alert("Game Over!");
        showMenu();
    }
    
    private drawWorld() {
        for(const block of this.blocks) {
            block.draw(ctx);
        }

        for(const ball of this.balls) {
            ball.draw(ctx);
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
        this.level.draw(ctx);
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
        this.drawWorld();

        shader.render();
    }
}
