import { Circle, Body, World, Box, Fixture, Contact, Vec2 } from "planck";
import { Block } from "./block";
import { Paddle } from "./paddle";

export class Ball {
    public static readonly MIN_BALL_VELOCITY = 0.7;
    
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
        
        // Make sure the ball can't get "soft-locked" going sideways
        const v = this.ballBody.getLinearVelocity();
        if(Math.abs(v.y) < 0.2) {
            // Slowly add a tiny bit of velocity downward
            const adjustment = 0.5 * deltaTime;
            const newY = v.y + (v.y >= 0 ? adjustment : -adjustment);
            this.ballBody.setLinearVelocity({ x: v.x, y: newY });
        }

        // If the ball is unreasonably far from everything, destroy it as a fallback
        
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
            userData: this,
        });
        this.ballBody.setLinearDamping(0.0);
        this.ballBody.setAngularDamping(0.0);
    }
    
    public isDestroyed(): boolean {
        return this.destroyed;
    }
    
    public handleCollision(world: World, contact: Contact, otherFixture: Fixture) {
        if(!this.ballBody) return;
        
        if(otherFixture.getUserData() === "death") {
            this.destroyed = true;
            return;
        }
        
        contact.setEnabled(false);
        
        const otherUserData = otherFixture.getUserData();
        if(otherUserData instanceof Paddle) {
            // The angle isn't a direct reflection; it depends on where on the paddle we hit
            const paddle = otherUserData;
            const paddlePos = paddle.x;
            const paddleWidth = paddle.width;
            const ballPos = this.ballBody.getPosition();
            const relativeIntersectX = (ballPos.x - paddlePos) - paddleWidth / 2;
            const normalizedRelativeIntersectionX = relativeIntersectX / (paddleWidth / 2);
            const bounceAngle = normalizedRelativeIntersectionX * (Math.PI / 3); // Max 60 degrees
            const speed = Math.max(Ball.MIN_BALL_VELOCITY, this.ballBody.getLinearVelocity().length());
            
            const newVelocity = new Vec2(
                speed * Math.sin(bounceAngle),
                -speed * Math.cos(bounceAngle)
            );
            this.ballBody.setLinearVelocity(newVelocity);
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
        reflected.mul(Math.max(Ball.MIN_BALL_VELOCITY, v.length()));
        
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