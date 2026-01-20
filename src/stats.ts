import { Signal } from "./signal";

export class Stats {
    public energy: number = 1;
    // public score: number = 0;
    public time: number = 0;

    private timeValueElement: HTMLSpanElement = document.getElementById('timeHud') as HTMLSpanElement;
    private energyFillElement: HTMLDivElement = document.getElementById('energyFill') as HTMLDivElement;

    private abilities: Map<string, {
        name: string,
        description: string,
        bind: string,
        normalizedProbability: number,
        styleHue: string,
        count: number,
        element: HTMLElement
    }> = new Map();

    public activateAbility = new Signal<[string]>();

    constructor() {
        // Query ability elements from the HUD
        let totalProbability = 0;
        let abilities: {
            id: string,
            name: string,
            description: string,
            bind: string,
            probability: number,
            styleHue: string,
            element: HTMLElement
        }[] = [];
        document.querySelectorAll<HTMLElement>('.ability').forEach((el) => {
            const id = el.dataset.ability ?? "";
            const name = el.querySelector("[data-ability-name]")?.innerHTML ?? "";
            const description = el.querySelector("[data-ability-description]")?.innerHTML ?? "";
            const bind = el.dataset.bind ?? "";
            const probability = parseFloat(el.dataset.abilityProbability ?? '0');
            const hue = el.style.getPropertyValue('--ability-hue') ?? '0deg';

            abilities.push({
                id, name, description, bind, probability,
                styleHue: hue,
                element: el
            });
            totalProbability += probability;
        });

        // Normalize probabilities and store abilities
        for(const ability of abilities) {
            this.abilities.set(ability.id, {
                name: ability.name,
                description: ability.description,
                bind: ability.bind,
                normalizedProbability: ability.probability / totalProbability,
                styleHue: ability.styleHue,
                element: ability.element,
                count: 0
            });

            this.updateAbilityElement(ability.id);
        }
    }

    public checkAbilityBind(key: string) {
        for(const [id, ability] of this.abilities) {
            if(ability.bind.toLowerCase() === key.toLowerCase() && ability.count > 0) {
                ability.count -= 1;
                this.updateAbilityElement(id);

                ability.element.animate([
                    { transform: 'scale(1)' },
                    { transform: 'scale(0.9)' },
                    { transform: 'scale(1)' },
                ], { duration: 200, easing: 'ease-out' });

                this.activateAbility.emit(id);
                // TODO: ability actions
            }
        }
    }

    public addAbility(id: string) {
        const ability = this.abilities.get(id);
        if(!ability) return;
        ability.count += 1;
        this.updateAbilityElement(id);
    }

    private updateAbilityElement(id: string) {
        const ability = this.abilities.get(id);
        if(!ability) return;

        const countSpan = ability.element.querySelector('.count') as HTMLSpanElement;
        countSpan.textContent = `x${ability.count}`;
        if(ability.count > 1) {
            countSpan.classList.add('visible');
        } else {
            countSpan.classList.remove('visible');
        }

        const stackCounts: [number, string][] = [[0, '0'], [1, '1'], [2, '2'], [5, '3'], [10, '4']];
        for(const [threshold, className] of stackCounts) {
            if(ability.count >= threshold) ability.element.dataset.count = className;
        }
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