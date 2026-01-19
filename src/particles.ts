const conversionCtx = document.createElement("canvas").getContext("2d")!;

function getColorComponents(color: string): [number, number, number] {
    conversionCtx.fillStyle = color;
    let r = parseInt(conversionCtx.fillStyle.slice(1, 3), 16);
    let g = parseInt(conversionCtx.fillStyle.slice(3, 5), 16);
    let b = parseInt(conversionCtx.fillStyle.slice(5, 7), 16);
    return [r, g, b];
}

export class Particles {
    private particles: {
        x: number;
        y: number;
        lifetime: number;
        vx: number;
        vy: number;
        color: string;
    }[] = [];

    /**
     * Emit a particle at the given position with the given velocity and lifetime.
     */
    public emit(x: number, y: number, vx: number, vy: number, lifetime: number, color: string) {
        this.particles.push({ x, y, vx, vy, lifetime, color });
    }

    /**
     * Randomize a color slightly by adjusting its RGB components.
     */
    private randomizeColor(color: [number, number, number], amount: number): string {
        let [r, g, b] = color;
        r += (Math.random() * 2 - 1) * amount * 255;
        g += (Math.random() * 2 - 1) * amount * 255;
        b += (Math.random() * 2 - 1) * amount * 255;
        return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
    }

    /**
     * Emit a burst of particles spread across the outline of a rectangle.
     */
    public emitRectBurst(x: number, y: number, width: number, height: number, count: number, speed: number, lifetime: number, colorString: string) {
        const color = getColorComponents(colorString);
        
        const perimeter = 2 * (width + height);
        for(let i = 0; i < count; i++) {
            const dist = Math.random() * perimeter;
            let px: number, py: number;
            if(dist < width) {
                // Top edge
                px = x + dist;
                py = y;
            } else if(dist < width + height) {
                // Right edge
                px = x + width;
                py = y + (dist - width);
            } else if(dist < 2 * width + height) {
                // Bottom edge
                px = x + (dist - width - height);
                py = y + height;
            } else {
                // Left edge
                px = x;
                py = y + (dist - 2 * width - height);
            }
            this.emit(px, py, (Math.random() - 0.5) * speed, (Math.random() - 0.5) * speed, lifetime * (0.5 + Math.random() * 0.5), this.randomizeColor(color, 0.1));
        }
    }

    /**
     * Emit a directional burst of particles from a point.
     */
    public emitDirectionalBurst(x: number, y: number, directionX: number, directionY: number, spread: number, count: number, speed: number, lifetime: number, colorString: string) {
        const color = getColorComponents(colorString);

        const dirLength = Math.sqrt(directionX * directionX + directionY * directionY);
        const normDirX = directionX / dirLength;
        const normDirY = directionY / dirLength;
        for(let i = 0; i < count; i++) {
            const angle = (Math.random() - 0.5) * spread;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            const vx = (normDirX * cos - normDirY * sin) * speed * (0.5 + Math.random() * 0.5);
            const vy = (normDirX * sin + normDirY * cos) * speed * (0.5 + Math.random() * 0.5);
            this.emit(x, y, vx, vy, lifetime * (0.5 + Math.random() * 0.5), this.randomizeColor(color, 0.1));
        }
    }

    /**
     * Update all particles.
     * @param deltaTime Time elapsed since last update in seconds.
     */
    public update(deltaTime: number) {
        for(let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.lifetime -= deltaTime;
            if(p.lifetime <= 0) {
                this.particles.splice(i, 1);
                continue;
            }
            p.x += p.vx * deltaTime;
            p.y += p.vy * deltaTime;
        }
    }

    /**
     * Draw all particles.
     * The canvas should be appropriately transformed such that drawing scaled to the canvas in world space is moved to screen space.
     * @param ctx The rendering context.
     */
    public draw(ctx: CanvasRenderingContext2D) {
        const fadeTime = 0.5;
        for(const p of this.particles) {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = Math.max(0, Math.min(1, p.lifetime / fadeTime));
            ctx.fillRect(p.x - 0.001, p.y - 0.001, 0.002, 0.002);
        }
        ctx.globalAlpha = 1.0;
    }
}