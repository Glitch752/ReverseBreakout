import { Box, type Body, type World } from "planck";
import type { Ball } from "./ball";

enum PaddleAIMode {
    FOLLOW_BALL_AVERAGE,
    FOLLOW_SINGLE_BALL,
    FOLLOW_LOWEST_BALL
}

class PIDController {
    private integral: number = 0;
    private previousError: number = 0;
    constructor(private kP: number, private kI: number, private kD: number) {
    }
    
    public update(target: number, current: number, deltaTime: number): number {
        const error = target - current;
        this.integral += error * deltaTime;
        const derivative = (error - this.previousError) / deltaTime;
        this.previousError = error;
        return this.kP * error + this.kI * this.integral + this.kD * derivative;
    }
}

export class Paddle {
    private outlineColor: string = 'white';

    private maxSpeed: number = 2.0; // units per second
    private velocity: number = 0.0;
    private pidController: PIDController = new PIDController(2.0, 0.01, 0.05);

    private aiMode: PaddleAIMode = PaddleAIMode.FOLLOW_LOWEST_BALL;

    private paddleBody: Body | null = null;

    constructor(public x: number, public y: number, public width: number, public height: number) {
    }

    /**
     * Add the paddle to the physics world.
     */
    public addToWorld(world: World) {
        this.paddleBody = world.createBody({
            type: 'kinematic',
            position: { x: this.x + this.width / 2, y: this.y + this.height / 2 },
        });

        this.paddleBody.createFixture({
            shape: new Box(this.width / 2, this.height / 2, { x: 0, y: 0 }, 0),
            friction: 0.0,
            density: 1.0,
            userData: this,
        });
    }

    /**
     * Draw the paddle on the 2D rendering context.
     * The canvas should be appropriately transformed such that drawing scaled to the canvas in world space is moved to screen space.
     */
    public draw(ctx: CanvasRenderingContext2D) {
        const x = this.x;
        const y = this.y;
        const width = this.width;
        const height = this.height;
        
        ctx.strokeStyle = this.outlineColor;
        ctx.lineWidth = 0.003;
        ctx.strokeRect(x, y, width, height);
    }
    
    /**
     * Update the paddle based on its AI mode.
     */
    public update(deltaTime: number, balls: Ball[]) {
        // Clamp to arena bounds
        const arenaHalfWidth = 0.5 * 16 / 9;

        if(this.x < -arenaHalfWidth) this.x = -arenaHalfWidth;
        if(this.x + this.width > arenaHalfWidth) this.x = arenaHalfWidth - this.width;

        if(balls.length === 0) {
            this.velocity *= Math.pow(0.01, deltaTime);
            this.x += this.velocity * deltaTime;
            return;
        }
        
        let targetX: number = this.x + this.width / 2;
        switch(this.aiMode) {
            case PaddleAIMode.FOLLOW_BALL_AVERAGE: {
                let sumX = 0;
                for(const ball of balls) {
                    sumX += ball.position.x;
                }
                targetX = sumX / balls.length;
                break;
            }
            case PaddleAIMode.FOLLOW_SINGLE_BALL: {
                targetX = balls[0].position.x;
                break;
            }
            case PaddleAIMode.FOLLOW_LOWEST_BALL: {
                let lowestBall = balls[0];
                for(const ball of balls) {
                    if(ball.position.y > lowestBall.position.y) {
                        lowestBall = ball;
                    }
                }
                targetX = lowestBall.position.x;
                break;
            }
        }

        const centerX = this.x + this.width / 2;
        // Smooth paddle movement and make it feel less robotic with a PID controller
        this.velocity = this.pidController.update(targetX, centerX, deltaTime);
        // Clamp velocity to max speed
        if(this.velocity > this.maxSpeed) this.velocity = this.maxSpeed;
        if(this.velocity < -this.maxSpeed) this.velocity = -this.maxSpeed;

        this.x += this.velocity * deltaTime;

        // Update paddle body position
        if(this.paddleBody) {
            this.paddleBody.setPosition({ x: this.x + this.width / 2, y: this.y + this.height / 2 });
        }
    }
}