import { Circle, Body, World, Fixture, Contact, Vec2 } from "planck";
import { Block } from "./block";
import { Paddle } from "./paddle";
import type { Particles } from "./particles";
import { PowerUp } from "./powerUp";
import type { Stats } from "./stats";

export class Ball {
    public static readonly MIN_BALL_VELOCITY = 0.7;
    public static readonly MAX_BALL_VELOCITY = 3.0;
    
    private ballBody: Body | null;
    private destroyed: boolean = false;
    
    constructor(private initialPosition: { x: number, y: number }, private initialVelocity: { x: number, y: number }, public radius: number) {
        this.radius = radius;
        this.ballBody = null;
        
        // Normalize initial velocity to ensure consistent speed
        const velVec = new Vec2(initialVelocity.x, initialVelocity.y);
        velVec.normalize();
        velVec.mul(Ball.MIN_BALL_VELOCITY);
        this.initialVelocity = { x: velVec.x, y: velVec.y };
    }
    
    /**
    * Get the position of the ball in world space.
    */
    public get position(): { x: number; y: number } {
        if(!this.ballBody) return { x: 0, y: 0 };
        return this.ballBody.getPosition();
    }

    /**
     * Get the velocity of the ball in world space.
     */
    public get velocity(): Vec2 {
        if(!this.ballBody) return new Vec2(0, 0);
        return this.ballBody.getLinearVelocity();
    }
    
    /**
    * Draw the ball on the 2D rendering context.  
    * The canvas should be appropriately transformed such that drawing scaled to the canvas size is moved to screen space.
    */
    public draw(ctx: CanvasRenderingContext2D) {
        if(!this.ballBody) return;
        
        const position = this.ballBody.getPosition();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 0.003;
        
        ctx.beginPath();
        ctx.arc(position.x, position.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    /**
    * Update the ball.
    */
    public update(deltaTime: number) {
        if(!this.ballBody) return;
        
        // Enforce max velocity
        const speed = this.ballBody.getLinearVelocity().length();
        if(speed > Ball.MAX_BALL_VELOCITY) {
            const v = this.ballBody.getLinearVelocity();
            v.normalize();
            v.mul(Ball.MAX_BALL_VELOCITY);
            this.ballBody.setLinearVelocity(v);
        }

        // Make sure the ball can't get "soft-locked" going sideways
        const v = this.ballBody.getLinearVelocity();
        if(Math.abs(v.y) < 0.2) {
            // Slowly add a tiny bit of velocity downward
            const adjustment = 0.5 * deltaTime;
            const newY = v.y + (v.y >= 0 ? adjustment : -adjustment);
            this.ballBody.setLinearVelocity({ x: v.x, y: newY });
        }

        // If the ball is unreasonably far from everything, destroy it as a fallback
        const pos = this.ballBody.getPosition();
        if(Math.abs(pos.x) > 2 || Math.abs(pos.y) > 2) {
            this.destroyed = true;
        }
    }
    
    public addToWorld(world: World) {
        this.ballBody = world.createBody({
            type: 'dynamic',
            position: this.initialPosition,
            linearVelocity: this.initialVelocity,
            bullet: true,
            fixedRotation: true
        });
        this.ballBody.createFixture({
            shape: new Circle(this.radius),
            density: 1.0,
            restitution: 1.0,
            friction: 0.0,
            userData: this
        });
        this.ballBody.setLinearDamping(0.0);
        this.ballBody.setAngularDamping(0.0);
    }
    
    public isDestroyed(): boolean {
        return this.destroyed;
    }
    
    public handleCollision(contact: Contact, otherFixture: Fixture, particles: Particles, stats: Stats) {
        if(!this.ballBody) return;
        
        const otherUserData = otherFixture.getUserData();
        if(otherUserData === "death") {
            this.destroyed = true;
            particles.emitCircleBurst(
                this.ballBody.getPosition().x,
                this.ballBody.getPosition().y,
                this.radius,
                40,
                0.3,
                0.5,
                'white'
            );
            return;
        }

        if(otherUserData instanceof Block) {
            if(otherUserData.hit()) {
                // Block was destroyed
                particles.emitRectBurst(
                    otherUserData.x,
                    otherUserData.y,
                    otherUserData.width,
                    otherUserData.height,
                    50,
                    0.2,
                    0.5,
                    otherUserData.outlineColor
                );
            }

            particles.emitDirectionalBurst(
                this.ballBody.getPosition().x,
                this.ballBody.getPosition().y,
                -this.velocity.x,
                -this.velocity.y,
                Math.PI / 3,
                30,
                0.25,
                0.5,
                otherUserData.outlineColor
            );
        }

        if(otherUserData instanceof PowerUp) {
            // Collect the power-up
            stats.addAbility(otherUserData.type);
            otherUserData.isDestroyed = true;
            particles.emitCircleBurst(
                otherUserData.position.x,
                otherUserData.position.y,
                otherUserData.radius,
                30,
                0.2,
                0.5,
                otherUserData.color
            );
            return;
        }
        
        // As velocity increases, we decrease restitution to balance extreme speeds a bit
        let restitution = 1.0 - (this.velocity.length() - Ball.MIN_BALL_VELOCITY) / (Ball.MAX_BALL_VELOCITY - Ball.MIN_BALL_VELOCITY) * 0.3;
        restitution = Math.max(0.5, Math.min(1.0, restitution));

        if(otherUserData instanceof Paddle) {
            // Paddles don't create a direct reflection; it depends on where on the paddle we hit
            const paddle = otherUserData;
            const paddlePos = paddle.x;
            const paddleWidth = paddle.width;
            const ballPos = this.ballBody.getPosition();
            const relativeIntersectX = (ballPos.x - paddlePos) - paddleWidth / 2;
            const normalizedRelativeIntersectionX = relativeIntersectX / (paddleWidth / 2);
            const bounceAngle = normalizedRelativeIntersectionX * (Math.PI / 3); // Max 60 degrees
            const speed = Math.max(Ball.MIN_BALL_VELOCITY, this.velocity.length() * restitution);
            
            const newVelocity = new Vec2(
                speed * Math.sin(bounceAngle) * 0.5 + this.velocity.x,
                -speed * Math.cos(bounceAngle)
            );
            this.ballBody.setLinearVelocity(newVelocity);

            particles.emitDirectionalBurst(
                this.ballBody.getPosition().x,
                this.ballBody.getPosition().y,
                this.velocity.x,
                -1,
                Math.PI / 3,
                20,
                0.2,
                0.3,
                'white'
            );
            return;
        }
        
        const v = this.ballBody.getLinearVelocity();
        const normal = contact.getWorldManifold(null)!.normal;
        
        const dot = v.x * normal.x + v.y * normal.y;
        
        const reflected = new Vec2(
            v.x - 2 * dot * normal.x,
            v.y - 2 * dot * normal.y
        );
        
        reflected.normalize();
        reflected.mul(Math.max(Ball.MIN_BALL_VELOCITY, v.length() * restitution));
        
        this.ballBody.setLinearVelocity(reflected);
    }
    
    public applyForce(x: number, y: number) {
        if(!this.ballBody) return;

        this.ballBody.applyForceToCenter(new Vec2(x, y));
    }
    
    public destroy(world: World) {
        if(this.ballBody) {
            world.destroyBody(this.ballBody);
            this.ballBody = null;
        }
        this.destroyed = true;
    }
}