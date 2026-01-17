import { Box, World, Body } from "planck";

/**
 * A descructable Breakout block.
 */
export class Block {
    private outlineColor: string;
    private fillColor: string;

    private hitsRemaining: number;
    private blockBody?: Body;

    constructor(public x: number, public y: number, public width: number, public height: number, hitsRequired: number) {
        this.hitsRemaining = hitsRequired;
        this.outlineColor = `hsl(${y * 700}, 100%, 80%)`;
        this.fillColor = `hsl(${y * 700}, 80%, 5%)`;
    }

    /**
     * Draw the block on the 2D rendering context.  
     * The canvas should be appropriately transformed such that drawing scaled to the canvas in world space is moved to screen space.
     */
    public draw(ctx: CanvasRenderingContext2D) {
        const x = this.x;
        const y = this.y;
        const width = this.width;
        const height = this.height;

        ctx.fillStyle = this.fillColor;
        ctx.fillRect(x, y, width, height);

        ctx.strokeStyle = this.outlineColor;
        ctx.lineWidth = 0.003;
        ctx.strokeRect(x, y, width, height);

        // if(this.hitsRemaining > 1) {
        //     ctx.strokeStyle = 'white';
        //     ctx.lineWidth = this.hitsRemaining;
        //     ctx.strokeRect(x + this.hitsRemaining / 2, y + this.hitsRemaining / 2, width - this.hitsRemaining, height - this.hitsRemaining);
        // }
    }

    /**
     * Add the block to the physics world.
     */
    public addToWorld(world: World) {
        this.blockBody = world.createBody({
            type: 'static',
            position: { x: this.x + this.width / 2, y: this.y + this.height / 2 },
        });
        this.blockBody.createFixture({
            shape: new Box(this.width / 2, this.height / 2),
            friction: 0.0,
            density: 1.0,
            userData: this,
        });
    }

    /**
     * Called when this block is hit by the ball.
     * Returns true if the block is destroyed.
     */
    public hit(): boolean {
        this.hitsRemaining--;
        return this.hitsRemaining <= 0;
    }

    /**
     * Check if the block is destroyed.
     */
    public isDestroyed(): boolean {
        return this.hitsRemaining <= 0;
    }

    /**
     * Destroy the block and cleanup resources.
     */
    public destroy(world: World) {
        if(!this.blockBody) return;

        world.destroyBody(this.blockBody);
    }
}