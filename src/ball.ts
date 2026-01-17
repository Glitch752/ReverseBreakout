import { Circle, Body, World, Box } from "planck";

export class Ball {
    private ballBody: Body | null;
    private destroyed: boolean = false;

    constructor(private initialPosition: { x: number, y: number }, private initialVelocity: { x: number, y: number }, public radius: number) {
        this.radius = radius;
        this.ballBody = null;
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
        ctx.lineWidth = 0.004;
        
        ctx.beginPath();
        ctx.arc(position.x, position.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
    }

    public addToWorld(world: World) {
        this.ballBody = world.createBody({
            type: 'dynamic',
            position: this.initialPosition,
            linearVelocity: this.initialVelocity,
            bullet: true,
        });
        this.ballBody.createFixture({
            // shape: new Circle(this.radius),
            shape: new Box(this.radius, this.radius),
            density: 1.0,
            restitution: 1.0,
            friction: 0.0,
            userData: this,
        });
        this.ballBody.setLinearDamping(0);
    }

    public isDestroyed(): boolean {
        return this.destroyed;
    }

    public destroy(world: World) {
        if(this.ballBody) {
            world.destroyBody(this.ballBody);
            this.ballBody = null;
        }
        this.destroyed = true;
    }
}