import { Body, Box, Chain, Vec2, World } from "planck";
import { Ball } from "./ball";
import { Block } from "./block";

const INITIAL_ARENA_ASPECT_RATIO = 16 / 9;

const BLOCKS_X = 10;
const BLOCKS_Y = 5;
const BLOCK_PADDING = 0.01;
const BLOCK_TOTAL_HEIGHT = 0.3;
const BLOCK_LAYER_WIDTH = (1 / BLOCKS_X) * INITIAL_ARENA_ASPECT_RATIO;
const BLOCK_LAYER_HEIGHT = (1 / BLOCKS_Y) * BLOCK_TOTAL_HEIGHT;

export class Level {
    public minimumScreenDimensions: [number, number] = [INITIAL_ARENA_ASPECT_RATIO * 1.05, 1.05];
    private blocks: Block[] = [];

    private addedBlockLayers: number = 1;
    private blockOffsetY: number = 0;

    private layerMovementSpeed: number = 0.01; // units per second
    /** A higher hit difficulty increases the chances that blocks require multiple hits to be destroyed */
    private hitDifficulty: number = 0;

    public update(world: World, deltaTime: number) {
        // Remove destroyed blocks
        for(let i = this.blocks.length - 1; i >= 0; i--) {
            if(this.blocks[i].isDestroyed()) {
                this.blocks[i].destroy(world);
                this.blocks.splice(i, 1);
            }
        }

        // Slowly move blocks down over time
        this.blockOffsetY += this.layerMovementSpeed * deltaTime;
        for(const block of this.blocks) {
            block.y += this.layerMovementSpeed * deltaTime;
        }

        // Add new block layers as needed
        if(this.blockOffsetY >= BLOCK_LAYER_HEIGHT) {
            this.blockOffsetY -= BLOCK_LAYER_HEIGHT;
            this.addedBlockLayers++;

            for(let x = 0; x < BLOCKS_X; x++) {
                const hue = this.addedBlockLayers * -60;
                const hits = Math.ceil(this.hitDifficulty) + Math.random();
                setTimeout(() => {
                    const block = new Block(
                        x * BLOCK_LAYER_WIDTH + BLOCK_PADDING - INITIAL_ARENA_ASPECT_RATIO / 2,
                        -BLOCK_LAYER_HEIGHT + BLOCK_PADDING - 0.5 + this.blockOffsetY,
                        BLOCK_LAYER_WIDTH - BLOCK_PADDING * 2,
                        BLOCK_LAYER_HEIGHT - BLOCK_PADDING * 2,
                        hits, hue,
                        true
                    );
                    this.blocks.push(block);
                    block.addToWorld(world);
                }, Math.random() * 1000);
            }
        }
    }

    public initBlocksInWorld(world: World) {
        for(let y = -1; y < BLOCKS_Y; y++) {
            for(let x = 0; x < BLOCKS_X; x++) {
                const hue = y * 60;
                const block = new Block(
                    x * BLOCK_LAYER_WIDTH + BLOCK_PADDING - INITIAL_ARENA_ASPECT_RATIO / 2,
                    y * BLOCK_LAYER_HEIGHT + BLOCK_PADDING - 0.5,
                    BLOCK_LAYER_WIDTH - BLOCK_PADDING * 2,
                    BLOCK_LAYER_HEIGHT - BLOCK_PADDING * 2,
                    1,
                    hue
                );
                this.blocks.push(block);
            }
        }

        for(const block of this.blocks) {
            block.addToWorld(world);
        }
    }

    public getInitialBalls(): Ball[] {
        return [
            new Ball({
                x: 0.0,
                y: 0.2
            }, {
                x: Math.random() * 0.5 - 0.25,
                y: -0.5
            }, 0.012)
        ];
    }

    public getBorders(): Chain {
        // Create border chain shape
        return new Chain([
            new Vec2(-INITIAL_ARENA_ASPECT_RATIO / 2, 0.5),
            new Vec2(-INITIAL_ARENA_ASPECT_RATIO / 2, -0.5),
            new Vec2(INITIAL_ARENA_ASPECT_RATIO / 2, -0.5),
            new Vec2(INITIAL_ARENA_ASPECT_RATIO / 2, 0.5),
        ], false);
    }

    public addDeathBody(world: World): Body {
        // Create a body for the death area (bottom of the screen)
        const deathBody = world.createBody({
            type: 'static',
            position: { x: 0, y: 0.55 }
        });
        deathBody.createFixture({
            shape: new Chain([
                new Vec2(-INITIAL_ARENA_ASPECT_RATIO / 2, 0),
                new Vec2(INITIAL_ARENA_ASPECT_RATIO / 2, 0),
            ], false),
            userData: 'death',
            isSensor: true
        });
        return deathBody;
    }

    /**
     * Draw the world elements in the level
     */
    public drawWorld(ctx: CanvasRenderingContext2D) {
        for(const block of this.blocks) {
            block.draw(ctx);
        }
    }

    /**
     * Draw the level background
     */
    public draw(ctx: CanvasRenderingContext2D) {
        ctx.strokeStyle = "#111111";

        // Clip to arena borders
        ctx.save();

        ctx.beginPath();
        ctx.moveTo(-INITIAL_ARENA_ASPECT_RATIO / 2, -0.5);
        ctx.lineTo(INITIAL_ARENA_ASPECT_RATIO / 2, -0.5);
        ctx.lineTo(INITIAL_ARENA_ASPECT_RATIO / 2, 0.5);
        ctx.lineTo(-INITIAL_ARENA_ASPECT_RATIO / 2, 0.5);
        ctx.closePath();
        ctx.clip();

        const spacing = 0.01;
        for(let x = -INITIAL_ARENA_ASPECT_RATIO / 2 * 1.1; x <= INITIAL_ARENA_ASPECT_RATIO / 2 * 1.1; x += spacing) {
            ctx.beginPath();
            for(let y = -0.5; y <= 0.5; y += 0.001) {
                const offsetX = 0.02 * Math.sin(10 * (y + 0.5) + 5 * x);
                ctx.lineTo(x + offsetX, y);
            }
            ctx.stroke();
        }

        ctx.restore();
    }

    /**
     * Draw the level border
     */
    public drawBorder(ctx: CanvasRenderingContext2D) {
        ctx.strokeStyle = "#111111";

        // Draw the border itself
        ctx.lineWidth = 0.005;

        // All borders except the bottom since it's the out-of-bounds area
        ctx.beginPath();
        ctx.moveTo(-INITIAL_ARENA_ASPECT_RATIO / 2, 0.5);
        ctx.lineTo(-INITIAL_ARENA_ASPECT_RATIO / 2, -0.5);
        ctx.lineTo(INITIAL_ARENA_ASPECT_RATIO / 2, -0.5);
        ctx.lineTo(INITIAL_ARENA_ASPECT_RATIO / 2, 0.5);
        ctx.stroke();
    }
}