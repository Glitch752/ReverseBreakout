export class ScoreTracker {
    private static readonly STORAGE_KEY: string = 'reverse-breakout-best-score';
    private static bestScore: number | null = null;

    public static getBestTime(): number | null {
        if(this.bestScore === null) {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if(stored !== null) {
                this.bestScore = parseFloat(stored);
            }
        }
        return this.bestScore;
    }

    public static submitTime(score: number) {
        const bestTime = this.getBestTime();
        if(bestTime === null || score > bestTime) {
            this.bestScore = score;
            localStorage.setItem(this.STORAGE_KEY, score.toString());
        }
    }
    
    public static formatTime(time: number): string {
        let totalSeconds = Math.floor(time);
        const minutes = Math.floor(totalSeconds / 60);
        totalSeconds -= minutes * 60;
        const seconds = totalSeconds;
        const secondFraction = (time - Math.floor(time));

        return `${minutes}:${seconds.toString().padStart(2, '0')}.${secondFraction.toFixed(3).slice(2)}`;
    }
}