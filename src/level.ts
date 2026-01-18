import { Chain, Vec2 } from "planck";
import { Ball } from "./ball";
import { Block } from "./block";

const ARENA_ASPECT_RATIO = 16 / 9;

export class Level {
    public minimumScreenDimensions: [number, number] = [ARENA_ASPECT_RATIO * 1.05, 1.05];

    public getBlocks(): Block[] {
        const blocks: Block[] = [];

        const BLOCKS_X = 10;
        const BLOCKS_Y = 5;
        const BLOCK_PADDING = 0.01;
        const BLOCK_TOTAL_HEIGHT = 0.3;
        
        for(let y = 0; y < BLOCKS_Y; y++) {
            for(let x = 0; x < BLOCKS_X; x++) {
                const block = new Block(
                    x * (1 / BLOCKS_X) * ARENA_ASPECT_RATIO + BLOCK_PADDING - ARENA_ASPECT_RATIO / 2,
                    y * (1 / BLOCKS_Y) * BLOCK_TOTAL_HEIGHT + BLOCK_PADDING - 0.5,
                    (1 / BLOCKS_X) * ARENA_ASPECT_RATIO - BLOCK_PADDING * 2,
                    (1 / BLOCKS_Y) * BLOCK_TOTAL_HEIGHT - BLOCK_PADDING * 2,
                    1
                );
                blocks.push(block);
            }
        }

        return blocks;
    }

    public getInitialBalls(): Ball[] {
        return [
            new Ball({
                x: 0.0,
                y: 0.2
            }, {
                x: Math.random() * 0.5 - 0.25,
                y: -0.5
            }, 0.015)
        ];
    }

    public getBorders(): Chain {
        // Create border chain shape
        return new Chain([
            new Vec2(-ARENA_ASPECT_RATIO / 2, -0.5),
            new Vec2(ARENA_ASPECT_RATIO / 2, -0.5),
            new Vec2(ARENA_ASPECT_RATIO / 2, 0.5),
            new Vec2(-ARENA_ASPECT_RATIO / 2, 0.5),
        ], true);
    }

    /**
     * Draw the level background
     */
    public draw(ctx: CanvasRenderingContext2D) {
        ctx.strokeStyle = "#111111";

        // Clip to arena borders
        ctx.save();

        ctx.beginPath();
        ctx.moveTo(-ARENA_ASPECT_RATIO / 2, -0.5);
        ctx.lineTo(ARENA_ASPECT_RATIO / 2, -0.5);
        ctx.lineTo(ARENA_ASPECT_RATIO / 2, 0.5);
        ctx.lineTo(-ARENA_ASPECT_RATIO / 2, 0.5);
        ctx.closePath();
        ctx.clip();

        const spacing = 0.01;
        for(let x = -ARENA_ASPECT_RATIO / 2 * 1.1; x <= ARENA_ASPECT_RATIO / 2 * 1.1; x += spacing) {
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
        ctx.strokeRect(-ARENA_ASPECT_RATIO / 2, -0.5, ARENA_ASPECT_RATIO, 1.0);
    }
}