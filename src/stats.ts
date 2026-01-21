import { Signal } from "./signal";

// Intentionally not persisted in browser storage but persisted across game runs
const seenAbilities: Set<string> = new Set();

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
        icon: HTMLImageElement,
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
            icon: HTMLImageElement,
            element: HTMLElement
        }[] = [];
        document.querySelectorAll<HTMLElement>('.ability').forEach((el) => {
            const id = el.dataset.ability ?? "";
            const name = el.querySelector("[data-ability-name]")?.innerHTML ?? "";
            const description = el.querySelector("[data-ability-description]")?.innerHTML ?? "";
            const bind = el.dataset.bind ?? "";
            const probability = parseFloat(el.dataset.abilityProbability ?? '0');
            const hue = el.style.getPropertyValue('--ability-hue') ?? '0deg';

            // Convert the SVG to an image element for later use
            let svg = el.querySelector('svg');
            // Modify the SVG to include the hue as a color
            svg = svg?.cloneNode(true) as SVGSVGElement;
            if(svg) {
                svg.style.color = `hsl(${hue}, 70%, 60%)`;
            }
            const svgData = new XMLSerializer().serializeToString(svg!);
            const svgBlob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
            const url = URL.createObjectURL(svgBlob);
            const icon = new Image();
            icon.width = 32;
            icon.height = 32;
            icon.src = url;

            abilities.push({
                id, name, description, bind, probability,
                styleHue: hue,
                element: el,
                icon: icon
            });
            totalProbability += probability;

            el.addEventListener('click', () => {
                this.checkAbilityBind(bind);
            });
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
                icon: ability.icon,
                count: 0
            });

            this.updateAbilityElement(ability.id);
        }
    }

    public selectAbility(): {
        id: string,
        icon: HTMLImageElement,
        color: string
    } {
        const rand = Math.random();
        let cumulative = 0;
        for(const [id, ability] of this.abilities) {
            cumulative += ability.normalizedProbability;
            if(rand <= cumulative) {
                return { id, icon: ability.icon, color: `hsl(${ability.styleHue}, 70%, 60%)` };
            }
        }
        
        throw new Error("no ability selected. check ability probabilities");
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
        
        ability.element.animate([
            { transform: 'scale(1)' },
            { transform: 'scale(1.1)' },
            { transform: 'scale(1)' },
        ], { duration: 200, easing: 'ease-out' });
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