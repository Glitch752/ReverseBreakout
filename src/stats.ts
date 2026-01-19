export class Stats {
    public energy: number = 1;
    public score: number = 0;

    constructor() {

    }

    public update(deltaTime: number) {
        // Regenerate energy over time
        this.energy += deltaTime * 0.1;
        if(this.energy > 1) this.energy = 1;
    }

    public tryTakeEnergy(amount: number): boolean {
        if(this.energy >= amount) {
            this.energy -= amount;
            return true;
        }
        return false;
    }

    public draw(ctx: CanvasRenderingContext2D) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }
}