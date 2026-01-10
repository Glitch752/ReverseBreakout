import './index.css';
import { World } from 'planck';
import { Shader2DCanvas } from './Shader2DCanvas';
import bloomFragmentShader from './bloom.frag?raw';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const shader = new Shader2DCanvas(canvas, bloomFragmentShader);
shader.setUniform1i('bloom_spread', 5);
shader.setUniform1i('bloom_intensity', 2);

const ctx = shader.getContext2D();

function draw() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(canvas.width / 2 + Math.sin(Date.now() / 1000) * 50, canvas.height / 2, 20, 0, Math.PI * 2);
    ctx.fill();

    shader.render();

    requestAnimationFrame(draw);
}
draw();