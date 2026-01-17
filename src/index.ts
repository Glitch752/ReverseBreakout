import './index.css';
import { World } from 'planck';
import { Shader2DCanvas } from './Shader2DCanvas';
import bloomFragmentShader from './bloom.frag?raw';
import { Block } from './block';
import { Ball } from './ball';
import { Camera } from './camera';
import { Level } from './level';

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

const level = new Level();

const blocks: Block[] = level.getBlocks();
for(const block of blocks) {
    block.addToWorld(world);
}

const balls: Ball[] = level.getInitialBalls();
for(const ball of balls) {
    ball.addToWorld(world);
}

// temporary
setInterval(() => {
    balls.push(level.getInitialBalls()[0]);
    balls[balls.length - 1].addToWorld(world);
    if(balls.length > 10) {
        balls[0].destroy(world);
        balls.splice(0, 1);
    }
}, 500);

const camera = new Camera(0.0, 0.0, 1.0);
camera.minimumScreenDimensions = level.minimumScreenDimensions;

/**
 * @param deltaTime Delta time in seconds
 */
function update(deltaTime: number) {
    world.step(deltaTime);
    world.clearForces();

    // camera.trackBalls(balls, deltaTime);
    
    // Remove destroyed blocks
    for(let i = blocks.length - 1; i >= 0; i--) {
        if(blocks[i].isDestroyed()) {
            blocks[i].destroy(world);
            blocks.splice(i, 1);
        }
    }

    // Remove destroyed balls
    for(let i = balls.length - 1; i >= 0; i--) {
        if(balls[i].isDestroyed()) {
            balls[i].destroy(world);
            balls.splice(i, 1);
        }
    }
}

const ctx = shader.getContext2D();

let lastTime = 0;
function draw(time: number) {
    const deltaTime = (time - lastTime) / 1000;
    lastTime = time;

    update(deltaTime);

    // Scale world space to screen space
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Background
    ctx.fillStyle = '#040408';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    camera.applyTransform(ctx);

    // Cheap perspective effect by drawing a scaled-down background centered on the camera first
    ctx.globalAlpha = 0.2;
    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(0.985, 0.985);
    ctx.translate(-camera.x, -camera.y);
    drawWorld();
    ctx.restore();

    ctx.globalAlpha = 1.0;
    drawWorld();

    shader.render();

    requestAnimationFrame(draw);
}
requestAnimationFrame(draw);

function drawWorld() {
    for(const block of blocks) {
        block.draw(ctx);
    }

    for(const ball of balls) {
        ball.draw(ctx);
    }
}