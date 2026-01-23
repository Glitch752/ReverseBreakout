import { Body, Chain, Vec2, World } from "planck";
import { Ball } from "./ball";
import { Block } from "./block";
import { Signal } from "./signal";

const INITIAL_ARENA_ASPECT_RATIO = 16 / 9;

const BLOCKS_X = 10;
const BLOCKS_Y = 5;
const BLOCK_PADDING = 0.01;
const BLOCK_TOTAL_HEIGHT = 0.3;
const BLOCK_LAYER_WIDTH = (1 / BLOCKS_X) * INITIAL_ARENA_ASPECT_RATIO;
const BLOCK_LAYER_HEIGHT = (1 / BLOCKS_Y) * BLOCK_TOTAL_HEIGHT;

// Fill a rectangle where the top and bottom edges follow a wavy pattern
function wavyRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
    const waveAmplitude = 0.005;
    const wavelength = width / 10;
    const segments = width / wavelength * 2;

    const wave = (t: number) => {
        // Triangle wave
        return 2 * Math.abs(2 * (t - Math.floor(t + 0.5))) - 1;
    };

    // Top edge
    ctx.beginPath();
    for(let i = 0; i <= segments; i++) {
        const t = i / segments;
        const px = x + t * width;
        const py = y + waveAmplitude * wave(t * (width / wavelength));
        if(i === 0) {
            ctx.moveTo(px, py);
        } else {
            ctx.lineTo(px, py);
        }
    }
    // Bottom edge
    for(let i = segments; i >= 0; i--) {
        const t = i / segments;
        const px = x + t * width;
        const py = y + height + waveAmplitude * wave(t * (width / wavelength));
        ctx.lineTo(px, py);
    }
    ctx.closePath();

    ctx.fill();
}

export class Level {
    public levelDimensions: [number, number] = [INITIAL_ARENA_ASPECT_RATIO * 1.05, 1.05];
    private blocks: Block[] = [];

    private addedBlockLayers: number = 1;
    private blockOffsetY: number = 0;

    private layerMovementSpeed: number = 0.003; // units per second
    /** A higher hit difficulty increases the chances that blocks require multiple hits to be destroyed */
    private hitDifficulty: number = 0;

    public spawnPowerUp = new Signal<[
        { x: number, y: number }, // Initial position
        { x: number, y: number } // Initial velocity
    ]>();

    private lowestBlockY: number = 0;
    public gameOver(): boolean {
        return this.lowestBlockY > 0.5;
    }

    public update(world: World, deltaTime: number) {
        this.hitDifficulty += 0.005 * deltaTime;
        this.layerMovementSpeed += 0.00004 * deltaTime;

        let effectiveLayerMovementSpeed = this.layerMovementSpeed;
        
        // If there are no more blocks, add layers quickly
        if(this.lowestBlockY < -0.4) {
            effectiveLayerMovementSpeed *= 10;
        }

        // Slowly move blocks down over time
        this.blockOffsetY += effectiveLayerMovementSpeed * deltaTime;

        let lowestBlockY = -Infinity;

        // Remove destroyed blocks
        for(let i = this.blocks.length - 1; i >= 0; i--) {
            const block = this.blocks[i];
            if(block.isDestroyed()) {
                block.destroy(world);
                this.blocks.splice(i, 1);
            }
            
            block.y += effectiveLayerMovementSpeed * deltaTime;
            
            const blockY = block.y + block.height;
            if(blockY > lowestBlockY) {
                lowestBlockY = blockY;
            }
        }

        this.lowestBlockY = lowestBlockY;

        // Add new block layers as needed
        if(this.blockOffsetY >= BLOCK_LAYER_HEIGHT) {
            this.blockOffsetY -= BLOCK_LAYER_HEIGHT;
            this.addedBlockLayers++;
            let layersOnCreation = this.addedBlockLayers;

            for(let x = 0; x < BLOCKS_X; x++) {
                const hue = this.addedBlockLayers * -60;
                const hits = Math.ceil(this.hitDifficulty + Math.random());
                setTimeout(() => {
                    const block = new Block(
                        x * BLOCK_LAYER_WIDTH + BLOCK_PADDING - INITIAL_ARENA_ASPECT_RATIO / 2,
                        -BLOCK_LAYER_HEIGHT + BLOCK_PADDING - 0.5 + this.blockOffsetY + (this.addedBlockLayers - layersOnCreation) * BLOCK_LAYER_HEIGHT,
                        BLOCK_LAYER_WIDTH - BLOCK_PADDING * 2,
                        BLOCK_LAYER_HEIGHT - BLOCK_PADDING * 2,
                        hits, hue,
                        true
                    );
                    this.blocks.push(block);
                    block.addToWorld(world);
                    this.attachPowerUpSpawner(block);
                }, Math.random() * 1000);
            }
        }
    }

    private attachPowerUpSpawner(block: Block) {
        block.spawnPowerUp.connect(() => {
            const pos = {
                x: block.x + block.width / 2,
                y: block.y + block.height / 2 - 0.02
            };
            const vel = {
                x: (Math.random() - 0.5) * 0.2,
                y: -0.2
            };
            this.spawnPowerUp.emit(pos, vel);
        });
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
            this.attachPowerUpSpawner(block);
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
                new Vec2(-2, 0),
                new Vec2(2, 0),
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

    private warningSlew: number = 0;

    /**
     * Draw the level background
     */
    public draw(ctx: CanvasRenderingContext2D, deltaTime: number) {
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

        const spacing = 0.02;
        for(let x = -INITIAL_ARENA_ASPECT_RATIO / 2 * 1.1; x <= INITIAL_ARENA_ASPECT_RATIO / 2 * 1.1; x += spacing) {
            ctx.beginPath();
            for(let y = -0.5; y <= 0.5; y += 0.1) {
                const offsetX = 0.02 * Math.sin(10 * (y + 0.5) + 5 * x);
                ctx.lineTo(x + offsetX, y);
            }
            ctx.stroke();
        }
 
        ctx.restore();

        let warning = this.lowestBlockY > 0.25 ? 1 : 0;
        this.warningSlew += (warning - this.warningSlew) * (1 - Math.pow(0.05, deltaTime));

        // Draw a warning line if the blocks are getting too low
        if(this.warningSlew > 0.01) {
            ctx.globalAlpha = this.warningSlew * (Math.sin(Date.now() / 400) * 0.25 + 0.5) * 0.1;
            // Orange warning area
            ctx.fillStyle = `rgba(255, 165, 50)`;
            wavyRect(ctx, -INITIAL_ARENA_ASPECT_RATIO / 2, 0.25, INITIAL_ARENA_ASPECT_RATIO, 0.25);
            // Red death area
            ctx.fillStyle = `rgba(255, 50, 50)`;
            wavyRect(ctx, -INITIAL_ARENA_ASPECT_RATIO / 2, 0.5, INITIAL_ARENA_ASPECT_RATIO, 0.03);
            ctx.globalAlpha = 1.0;
        }
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