export class Stats {
    public energy: number = 1;
    // public score: number = 0;
    public time: number = 0;

    private timeValueElement: HTMLSpanElement = document.getElementById('timeHud') as HTMLSpanElement;
    private scoreValueElement: HTMLSpanElement = document.getElementById('scoreHud') as HTMLSpanElement;
    private energyFillElement: HTMLDivElement = document.getElementById('energyFill') as HTMLDivElement;

    constructor() {

    }

    public update(deltaTime: number) {
        this.time += deltaTime;

        // Regenerate energy over time
        this.energy += deltaTime * 0.1;
        if(this.energy > 1) this.energy = 1;

        // Update HUD
        this.timeValueElement.textContent = this.formatTime();
        // this.scoreValueElement.textContent = this.score.toString();
        this.energyFillElement.style.width = `${this.energy * 100}%`;
    }

    public tryTakeEnergy(amount: number): boolean {
        if(this.energy >= amount) {
            this.energy -= amount;
            return true;
        }
        return false;
    }     

    private formatTime(): string {
        let totalSeconds = Math.floor(this.time);
        const minutes = Math.floor(totalSeconds / 60);
        totalSeconds -= minutes * 60;
        const seconds = totalSeconds;
        const secondFraction = (this.time - Math.floor(this.time));

        return `${minutes}:${seconds.toString().padStart(2, '0')}.${secondFraction.toFixed(3).slice(2)}`;
    }
}