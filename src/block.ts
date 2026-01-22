import { Box, World, Body } from "planck";
import { Signal } from "./signal";
import type { Particles } from "./particles";

const BLOCK_FADE_IN_DURATION = 500; // milliseconds
const easeOutCubic = (t: number): number => {
    return 1 - Math.pow(1 - t, 3);
};

/**
 * A descructable Breakout block.
 */
export class Block {
    public outlineColor: string;
    private fillColor: string;

    private hitsRemaining: number;
    private blockBody?: Body;

    private creationTime: number = performance.now();

    public spawnPowerUp: Signal<[]> = new Signal<[]>();

    private _x: number;
    public get x(): number {
        return this._x;
    }
    public set x(value: number) {
        this._x = value;
        if(this.blockBody) {
            this.blockBody.setPosition({ x: this._x + this.width / 2, y: this.y + this.height / 2 });
        }
    }

    private _y: number;
    public get y(): number {
        return this._y;
    }
    public set y(value: number) {
        this._y = value;
        if(this.blockBody) {
            this.blockBody.setPosition({ x: this.x + this.width / 2, y: this._y + this.height / 2 });
        }
    }

    constructor(
        x: number, y: number, public width: number, public height: number,
        hitsRequired: number, hue: number,
        private fadeIn: boolean = false
    ) {
        this._x = x;
        this._y = y;

        this.hitsRemaining = hitsRequired;
        this.outlineColor = `hsl(${hue}, 100%, 80%)`;
        this.fillColor = `hsl(${hue}, 80%, 5%)`;
    }

    /**
     * Draw the block on the 2D rendering context.  
     * The canvas should be appropriately transformed such that drawing scaled to the canvas in world space is moved to screen space.
     */
    public draw(ctx: CanvasRenderingContext2D) {
        const x = this.x;
        let y = this.y;
        const width = this.width;
        const height = this.height;
        let startAlpha = ctx.globalAlpha;

        if(this.fadeIn) {
            const elapsed = performance.now() - this.creationTime;
            const t = Math.min(1, elapsed / BLOCK_FADE_IN_DURATION);
            const alpha = easeOutCubic(t);
            ctx.globalAlpha *= alpha;
            y -= height * (1 - alpha);
        }

        ctx.fillStyle = this.fillColor;
        ctx.fillRect(x, y, width, height);

        ctx.strokeStyle = this.outlineColor;
        ctx.lineWidth = 0.003;
        ctx.strokeRect(x, y, width, height);

        if(this.hitsRemaining > 1) {
            ctx.lineWidth = 0.001 * this.hitsRemaining;
            ctx.strokeRect(x + 0.01, y + 0.01, width - 0.02, height - 0.02);
        }

        ctx.globalAlpha = startAlpha;
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
            shape: new Box(this.width / 2, this.height / 2, { x: 0, y: 0 }, 0),
            friction: 0.0,
            density: 1.0,
            userData: this,
            filterCategoryBits: 0b10
        });
        this.blockBody.setAwake(false);
    }

    /**
     * Called when this block is hit by the ball.
     * Returns true if the block is destroyed.
     */
    public hit(particles: Particles): boolean {
        this.hitsRemaining--;

        if(this.hitsRemaining <= 0) {
            // Block was destroyed
            particles.emitRectBurst(
                this.x, this.y,
                this.width, this.height,
                50,
                0.2,
                0.5,
                this.outlineColor
            );
        }

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

        // Could use a dynamic scale for balanceing
        // if(Math.random() < 0.3) {
        this.spawnPowerUp.emit();
        // }
    }
}