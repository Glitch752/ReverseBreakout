import type { Ball } from "./ball";

export class Camera {
    public minimumScreenDimensions: [number, number] = [1.0, 1.0];

    constructor(public x: number, public y: number, public zoom: number) {
    }

    private getScreenScale(canvas: HTMLCanvasElement): number {
        return Math.min(canvas.width / this.minimumScreenDimensions[0], canvas.height / this.minimumScreenDimensions[1]);
    }

    public applyTransform(ctx: CanvasRenderingContext2D) {
        const canvas = ctx.canvas;
        const screenScale = this.getScreenScale(canvas);

        // Translate according to camera
        ctx.translate(-this.x * screenScale + canvas.width / 2, -this.y * screenScale + canvas.height / 2);
        ctx.scale(screenScale * this.zoom, screenScale * this.zoom);
    }

    public projectToWorld(screenX: number, screenY: number, canvas: HTMLCanvasElement): { x: number, y: number } {
        const screenScale = this.getScreenScale(canvas);
        const worldX = (screenX - canvas.width / 2) / (screenScale * this.zoom) + this.x / this.zoom;
        const worldY = (screenY - canvas.height / 2) / (screenScale * this.zoom) + this.y / this.zoom;
        return { x: worldX, y: worldY };
    }

    public trackBalls(balls: Ball[], deltaTime: number, gameOver: boolean, pointSelectionActive: boolean) {
        if(balls.length === 0 || gameOver || pointSelectionActive) {
            // Slowly return to center to show arena
            const lerpFactor = 1 - Math.pow((pointSelectionActive && !gameOver) ? 0.01 : 0.6, deltaTime);
            this.x += (0 - this.x) * lerpFactor;
            this.y += (0 - this.y) * lerpFactor;
            this.zoom += (0.8 - this.zoom) * lerpFactor;
            return;
        }

        // Calculate average position and maximum horizontal/vertical distance from average
        let minX = Infinity;
        let sumX = 0;
        let maxX = -Infinity;
        let minY = Infinity;
        let sumY = 0;
        let maxY = -Infinity;

        for(const ball of balls) {
            const pos = ball.position;
            sumX += pos.x;
            sumY += pos.y;
            if(pos.x < minX) minX = pos.x;
            if(pos.x > maxX) maxX = pos.x;
            if(pos.y < minY) minY = pos.y;
            if(pos.y > maxY) maxY = pos.y;
        }
        
        const avgX = sumX / balls.length;
        const avgY = sumY / balls.length;

        const targetZoomX = 1.2 / (maxX - minX);
        const targetZoomY = 1.2 / (maxY - minY);
        const targetZoom = Math.min(targetZoomX, targetZoomY, 1.0);
        
        const lerpFactor = 1 - Math.pow(0.01, deltaTime);
        this.x += (avgX - this.x) * lerpFactor;
        this.y += (avgY - this.y) * lerpFactor;
        this.zoom += (targetZoom - this.zoom) * lerpFactor;
    }
}