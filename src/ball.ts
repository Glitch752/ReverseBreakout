import { Circle, Body, World, Fixture, Contact, Vec2 } from "planck";
import { Block } from "./block";
import { Paddle } from "./paddle";
import type { Particles } from "./particles";
import { PowerUp } from "./powerUp";

export class Ball {
    public static readonly MIN_BALL_VELOCITY = 0.7;
    public static readonly MAX_BALL_VELOCITY = 3.0;
    
    private ballBody: Body | null;
    private destroyed: boolean = false;
    /** When slingshotted, we drop most velocity on the next contact to prevent excessive speed */
    private slingshotted: boolean = false;

    private ghostModeTimer: number = 0;
    public isGhost(): boolean {
        return this.ghostModeTimer > 0;
    }
    
    constructor(private initialPosition: { x: number, y: number }, private initialVelocity: { x: number, y: number }, public radius: number) {
        this.radius = radius;
        this.ballBody = null;
        
        // Normalize initial velocity to ensure consistent speed
        const velVec = new Vec2(initialVelocity.x, initialVelocity.y);
        velVec.normalize();
        velVec.mul(Ball.MIN_BALL_VELOCITY);
        this.initialVelocity = { x: velVec.x, y: velVec.y };
    }

    public cloneWithAngleOffset(angleOffset: number): Ball {
        const speed = Math.sqrt(this.initialVelocity.x * this.initialVelocity.x + this.initialVelocity.y * this.initialVelocity.y);
        const currentAngle = Math.atan2(this.initialVelocity.y, this.initialVelocity.x);
        const newAngle = currentAngle + angleOffset;
        const newVelocity = {
            x: Math.cos(newAngle) * speed,
            y: Math.sin(newAngle) * speed
        };
        return new Ball(this.position, newVelocity, this.radius);
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

        if(this.ghostModeTimer > 0) {
            ctx.strokeStyle = `rgba(255, 255, 255, ${Math.sin((this.ghostModeTimer * 15)) * 0.5 + 0.5})`;
        }
        
        ctx.beginPath();
        ctx.arc(position.x, position.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    /**
    * Update the ball.
    */
    public update(deltaTime: number) {
        if(!this.ballBody) return;
        
        if(this.ghostModeTimer > 0) {
            this.ghostModeTimer -= deltaTime;
            if(this.ghostModeTimer < 0) this.ghostModeTimer = 0;
        }

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
    
    public handleCollision(contact: Contact, otherFixture: Fixture, particles: Particles) {
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
            otherUserData.hit(particles);

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
            otherUserData.collect(this);
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

        // In ghost mode, don't respond to collisions with blocks
        if(this.isGhost() && otherUserData instanceof Block) return;
        
        // As velocity increases, we decrease restitution to balance extreme speeds a bit
        let restitution = 1.0 - (this.velocity.length() - Ball.MIN_BALL_VELOCITY) / (Ball.MAX_BALL_VELOCITY - Ball.MIN_BALL_VELOCITY) * 0.3;
        restitution = Math.max(0.5, Math.min(1.0, restitution));

        if(this.slingshotted && otherUserData instanceof Block) {
            restitution *= 0.45;
        }

        if(otherUserData instanceof Paddle) {
            // Paddles don't create a direct reflection; it depends on where on the paddle we hit
            const paddle = otherUserData;
            const paddlePos = paddle.centerX;
            const paddleWidth = paddle.width;
            const ballPos = this.ballBody.getPosition();
            const relativeIntersectX = ballPos.x - paddlePos;
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
    
    public applyExplosionImpulse(explosionX: number, explosionY: number, force: number) {
        if(!this.ballBody) return;

        const ballPos = this.ballBody.getPosition();
        const dir = new Vec2(ballPos.x - explosionX, ballPos.y - explosionY);
        dir.normalize();
        dir.mul(force);

        this.ballBody.applyLinearImpulse(dir, this.ballBody.getWorldCenter());
        this.slingshotted = true;
    }

    public slingshot(x: number, y: number) {
        if(!this.ballBody) return;

        this.ballBody.applyLinearImpulse(new Vec2(x, y), this.ballBody.getWorldCenter());
        this.slingshotted = true;
    }

    public teleportTo(x: number, y: number) {
        if(!this.ballBody) return;

        this.ballBody.setPosition(new Vec2(x, y));
    }

    public setGhostMode(duration: number) {
        this.ghostModeTimer = duration;
    }

    public destroy(world: World) {
        if(this.ballBody) {
            world.destroyBody(this.ballBody);
            this.ballBody = null;
        }
        this.destroyed = true;
    }
}