import { Circle, Body, World } from "planck";

export class Ball {
    private ballBody: Body | null;

    constructor(public x: number, public y: number, public radius: number) {
        this.radius = radius;
        this.ballBody = null;
    }

    /**
     * Draw the ball on the 2D rendering context.  
     * The canvas should be appropriately transformed such that drawing scaled to the canvas size is moved to screen space.
     */
    public draw(ctx: CanvasRenderingContext2D) {

    }

    public addToWorld(world: World) {
        this.ballBody = world.createBody({
            type: 'dynamic',
            position: { x: this.x, y: this.y },
            bullet: true,
        });
        this.ballBody.createFixture({
            shape: new Circle(this.radius),
            density: 1.0,
            restitution: 1.0,
            friction: 0.0,
            userData: this,
        });
        this.ballBody.setLinearDamping(0);
    }
}