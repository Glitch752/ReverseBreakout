import { Ball } from "./ball";
import { Block } from "./block";

const ARENA_ASPECT_RATIO = 16 / 9;

export class Level {
    public minimumScreenDimensions: [number, number] = [ARENA_ASPECT_RATIO, 1.0];

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
                x: 0.5,
                y: -0.5
            }, 0.015)
        ];
    }
}