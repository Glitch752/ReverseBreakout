import { Circle, type Body, type World } from "planck";

const POWER_UP_RADIUS = 0.02;
const FADE_OUT_DURATION = 0.3;

const ease = (t: number): number => {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
};

export class PowerUp {
    private sensorBody: Body | null = null;

    private fadeOut: number = 0;
    public isDestroyed: boolean = false;

    public get position(): { x: number, y: number } {
        if(!this.sensorBody) return { x: 0, y: 0 };
        return this.sensorBody.getPosition();
    }

    public get radius(): number {
        return POWER_UP_RADIUS;
    }

    constructor(
        private initialPosition: { x: number, y: number },
        private initialVelocity: { x: number, y: number },
        public type: string,
        private icon: HTMLImageElement,
        public color: string,
    ) {
        // TODO: more power-up types
        // - Energy
        // - Explodey thingy
    }

    public addToWorld(world: World) {
        this.sensorBody = world.createBody({
            type: 'dynamic',
            position: this.initialPosition,
            linearVelocity: this.initialVelocity,
        });
        this.sensorBody.createFixture({
            shape: new Circle(POWER_UP_RADIUS),
            // isSensor: true,
            userData: this,
            filterMaskBits: 0b01
        });
    }

    public destroy(world: World) {
        if(this.sensorBody) {
            world.destroyBody(this.sensorBody);
            this.sensorBody = null;
        }
    }

    public update(deltaTime: number) {
        if(!this.sensorBody) return;

        this.sensorBody.applyForceToCenter({ x: 0, y: 5.0 }, true);

        if(this.sensorBody.getPosition().y - POWER_UP_RADIUS > 0.6) {
            this.fadeOut += deltaTime / FADE_OUT_DURATION;
            if(this.fadeOut >= 1) {
                this.isDestroyed = true;
            }
        }
    }

    public draw(ctx: CanvasRenderingContext2D) {
        if(!this.sensorBody) return;

        const pos = this.sensorBody.getPosition();

        const startAlpha = ctx.globalAlpha;

        if(this.fadeOut > 0) {
            const eased = ease(Math.min(this.fadeOut, 1));
            ctx.globalAlpha = startAlpha * (1 - eased);
        }

        ctx.strokeStyle = this.color;
        ctx.lineWidth = 0.002;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, POWER_UP_RADIUS, 0, Math.PI * 2);
        ctx.stroke();

        if(this.icon.complete) {
            // Draw the icon in the power-up color
            const size = POWER_UP_RADIUS * 1.5;
            ctx.drawImage(this.icon, pos.x - size / 2, pos.y - size / 2, size, size);
        }

        ctx.globalAlpha = startAlpha;
    }
}