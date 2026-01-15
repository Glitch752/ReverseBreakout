import './index.css';
import { World } from 'planck';
import { Shader2DCanvas } from './Shader2DCanvas';
import bloomFragmentShader from './bloom.frag?raw';
import { Block } from './block';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const shader = new Shader2DCanvas(canvas, {
    fragment: bloomFragmentShader
});
shader.setUniform1i('bloom_spread', 0.5);
shader.setUniform1i('bloom_intensity', 0.75);

const world = new World({
    gravity: { x: 0, y: 0 },
    allowSleep: true
});

const blocks: Block[] = [];
const BLOCKS_X = 10;
const BLOCKS_Y = 5;
const ARENA_ASPECT_RATIO = 16 / 9;
const BLOCK_PADDING_X = 0.003;
const BLOCK_PADDING_Y = BLOCK_PADDING_X * ARENA_ASPECT_RATIO;

for(let y = 0; y < BLOCKS_Y; y++) {
    for(let x = 0; x < BLOCKS_X; x++) {
        const block = new Block(
            x / BLOCKS_X * ARENA_ASPECT_RATIO + BLOCK_PADDING_X,
            y / BLOCKS_Y * 0.3 + BLOCK_PADDING_Y,
            1 / (BLOCKS_X - BLOCK_PADDING_X * 2),
            0.3 / (BLOCKS_Y - BLOCK_PADDING_Y * 2),
            1
        );
        block.addToWorld(world);
        blocks.push(block);
    }
}

const camera: {
    /** Camera center X */
    x: number,
    /** Camera center Y */
    y: number,
    /** Camera zoom level - higher is more zoomed in */
    zoom: number
} = {
    x: 0.5,
    y: 0.5,
    zoom: 1.0
};

function update(deltaTime: number) {
    world.step(deltaTime / 1000);
    
    // Remove destroyed blocks
    for(let i = blocks.length - 1; i >= 0; i--) {
        if(blocks[i].isDestroyed()) {
            blocks[i].destroy(world);
            blocks.splice(i, 1);
        }
    }
}

const ctx = shader.getContext2D();

let lastTime = 0;
function draw(time: number) {
    const deltaTime = time - lastTime;
    lastTime = time;

    update(deltaTime);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = '#040408';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Scale world space to screen space
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // Translate according to camera
    ctx.translate(-camera.x + 0.5 / camera.zoom, -camera.y + 0.5 / camera.zoom);
    // Apply zoom and aspect ratio
    let screenScale = 1.0;

    ctx.scale(screenScale * camera.zoom, screenScale * camera.zoom);

    for(const block of blocks) {
        block.draw(ctx);
    }

    // Balls
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(canvas.width / 2 + Math.sin(Date.now() / 1000) * 50, canvas.height / 2, 20, 0, Math.PI * 2);
    ctx.fill();

    shader.render();

    requestAnimationFrame(draw);
}
requestAnimationFrame(draw);