class SlewableNumber {
    private currentValue: number;
    private targetValue: number;
    private slewRate: number; // units per second
    
    constructor(initialValue: number, slewRate: number) {
        this.currentValue = initialValue;
        this.targetValue = initialValue;
        this.slewRate = slewRate;
    }

    public setTarget(value: number) {
        this.targetValue = value;
    }

    public update(deltaTime: number) {
        const delta = this.targetValue - this.currentValue;
        const maxDelta = this.slewRate * deltaTime;
        if(Math.abs(delta) <= maxDelta) {
            this.currentValue = this.targetValue;
        } else {
            this.currentValue += Math.sign(delta) * maxDelta;
        }
    }
    public get value(): number {
        return this.currentValue;
    }
}

const ease = (t: number): number => {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
};

export class TimeScaleManager {
    public timeScale: number = 1.0;

    private gameRunningRate: SlewableNumber = new SlewableNumber(1.0, 2.0);
    private slowMotionRate: SlewableNumber = new SlewableNumber(1.0, 2.0);
    private uiHintRate: SlewableNumber = new SlewableNumber(1.0, 2.0);
    private pointSelectionRate: SlewableNumber = new SlewableNumber(1.0, 3.0);

    public get slowMotionEase(): number {
        return ease(this.slowMotionRate.value);
    }
    public get uiHintEase(): number {
        return ease(this.uiHintRate.value);
    }
    public get gameOverEase(): number {
        return ease(1.0 - this.gameRunningRate.value);
    }

    public update(deltaTime: number, gameRunning: boolean, pointSelectionActive: boolean) {
        this.gameRunningRate.setTarget(gameRunning ? 1.0 : 0.0);
        this.pointSelectionRate.setTarget(pointSelectionActive && gameRunning ? 0.03 : 1.0);

        this.gameRunningRate.update(deltaTime);
        this.slowMotionRate.update(deltaTime);
        this.uiHintRate.update(deltaTime);
        this.pointSelectionRate.update(deltaTime);

        this.timeScale = ease(this.gameRunningRate.value) * ease(this.slowMotionRate.value) * ease(this.uiHintRate.value) * this.pointSelectionRate.value;
    }

    public setSlowMotion(active: boolean) {
        this.slowMotionRate.setTarget(active ? 0.4 : 1.0);
    }

    public setUIHint(active: boolean) {
        this.uiHintRate.setTarget(active ? 0.2 : 1.0);
    }
}