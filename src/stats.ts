import { Signal } from "./signal";

// Intentionally not persisted in browser storage but persisted across game runs
const seenAbilities: Set<string> = new Set();
const ABILITY_HINT_DURATION = 4.0;

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
        element: HTMLElement,
        useCooldown: number,
        currentCooldown: number
    }> = new Map();

    public activateAbility = new Signal<[string]>();
    public abilityHintShown = new Signal<[boolean]>();

    private abilityHintTime: number = 0;
    private queuedAbilityHints: string[] = [];

    public energyIcon: HTMLImageElement = this.createColoredSvgImage(
        `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M9 15H5.9q-.6 0-.888-.537t.063-1.038l7.475-10.75q.25-.35.65-.487t.825.012t.625.525t.15.8L14 10h3.875q.65 0 .913.575t-.163 1.075L10.4 21.5q-.275.325-.675.425t-.775-.075t-.587-.537t-.163-.788z"/></svg>`,
        '#ecca66'
    );
    public explodeyIcon: HTMLImageElement = this.createColoredSvgImage(
        `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M8.65 20.8q2.275 0 3.888-1.612T14.15 15.3q0-.775-.213-1.525T13.3 12.35l-.65-1.025l1.05-1.8l-2.6-1.5l-1.05 1.8h-1.1q-2.35 0-4.087 1.5T3.125 15.25q0 2.3 1.613 3.925T8.65 20.8M21 8.8q-.425 0-.712-.288T20 7.8t.288-.712T21 6.8h1q.425 0 .713.288T23 7.8t-.288.713T22 8.8zm-5.5-5.5q-.425 0-.712-.287T14.5 2.3v-1q0-.425.288-.712T15.5.3t.713.288t.287.712v1q0 .425-.288.713T15.5 3.3m3.175 1.325q-.275-.275-.275-.7t.275-.7L19.4 2.5q.275-.275.7-.275t.7.275t.275.7t-.275.7l-.725.725q-.275.275-.7.275t-.7-.275M17 7.55q-.125 0-.25-.025t-.25-.1l-.875-.5q-.35-.2-.763-.087t-.612.462l-.125.2l1 .575q.525.3.688.9t-.138 1.125L15 11.3q.575.9.863 1.913t.287 2.087q0 3.125-2.187 5.313T8.65 22.8t-5.312-2.212T1.15 15.25t2.163-5.288T8.6 7.8h.325L9.6 6.625q.3-.55.9-.712t1.15.162l.75.425l.125-.2q.575-1.075 1.8-1.4t2.3.3l.85.475q.225.125.375.362t.15.513q0 .425-.288.712T17 7.55"/></svg>`,
        '#888888'
    );

    private createColoredSvgImage(svg: SVGElement | string, color: string): HTMLImageElement {
        // Modify the SVG to include the hue as a color
        if(typeof svg === 'string') {
            const element = document.createElement('div');
            element.innerHTML = svg;
            svg = element.querySelector('svg')!;
        } else {
            svg = svg?.cloneNode(true) as SVGSVGElement;
        }

        if(svg) svg.style.color = color;
        const svgData = new XMLSerializer().serializeToString(svg!);
        const svgBlob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
        const url = URL.createObjectURL(svgBlob);
        const icon = new Image();
        icon.width = 32;
        icon.height = 32;
        icon.src = url;

        return icon;
    }

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
            element: HTMLElement,
            cooldown: number
        }[] = [];
        document.querySelectorAll<HTMLElement>('.ability').forEach((el) => {
            const id = el.dataset.ability ?? "";
            const cooldown = parseFloat(el.dataset.abilityCooldown ?? '0');
            const name = el.querySelector("[data-ability-name]")?.innerHTML ?? "";
            const description = el.querySelector("[data-ability-description]")?.innerHTML ?? "";
            const bind = el.dataset.bind ?? "";
            const probability = parseFloat(el.dataset.abilityProbability ?? '0');
            const hue = el.style.getPropertyValue('--ability-hue') ?? '0deg';

            // Convert the SVG to an image element for later use
            let svg = el.querySelector('svg');
            const icon = this.createColoredSvgImage(svg!, `hsl(${hue}, 70%, 60%)`);

            abilities.push({
                id, name, description, bind, probability,
                styleHue: hue,
                element: el,
                icon: icon,
                cooldown: cooldown
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
                count: 0,
                useCooldown: ability.cooldown,
                currentCooldown: 0
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
        if(this.abilityHintTime > 0) {
            // If any keys are pressed while the hint is shown, skip the hint
            this.abilityHintTime = 0.01;
            return;
        }

        for(const [id, ability] of this.abilities) {
            if(ability.bind.toLowerCase() === key.toLowerCase() && ability.count > 0 && ability.currentCooldown <= 0) {
                ability.count -= 1;
                this.updateAbilityElement(id);

                ability.element.animate([
                    { transform: 'scale(1)' },
                    { transform: 'scale(0.9)' },
                    { transform: 'scale(1)' },
                ], { duration: 200, easing: 'ease-out' });

                this.activateAbility.emit(id);
                ability.currentCooldown = ability.useCooldown;
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

        // seenAbilities
        if(!seenAbilities.has(id)) {
            if(this.abilityHintTime > 0) {
                // Hint already shown; queue
                this.queuedAbilityHints.push(id);
                return;
            }
            this.showAbilityHint(id);
        }
        seenAbilities.add(id);
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
        
        const cooldownFraction = ability.currentCooldown / ability.useCooldown;
        ability.element.style.setProperty('--ability-cooldown', `${cooldownFraction * 100}%`);
    }

    private showAbilityHint(id: string) {
        this.abilityHintTime = ABILITY_HINT_DURATION;
        this.abilityHintShown.emit(true);

        const ability = this.abilities.get(id);
        if(!ability) return;

        const hintElement = document.getElementById('abilityHint') as HTMLDivElement;

        document.getElementById('new-ability-hint-name')!.innerHTML = ability.name;
        document.getElementById('new-ability-hint-description')!.innerHTML = ability.description;
        hintElement.style.setProperty('--ability-hue', ability.styleHue);

        hintElement.classList.add('visible');
    }

    public addEnergy(amount: number) {
        this.energy += amount;
        if(this.energy > 1) this.energy = 1;
    }

    public update(deltaTime: number, realDeltaTime: number) {
        if(this.abilityHintTime > 0) {
            this.abilityHintTime -= realDeltaTime;
            if(this.abilityHintTime <= 0) {
                this.abilityHintTime = 0;

                const hintElement = document.getElementById('abilityHint') as HTMLDivElement;
                hintElement.classList.remove('visible');

                if(this.queuedAbilityHints.length > 0) {
                    const nextAbilityId = this.queuedAbilityHints.shift()!;
                    setTimeout(() => {
                        this.showAbilityHint(nextAbilityId);
                    }, 250);
                } else {
                    this.abilityHintShown.emit(false);
                }
            }
        }

        this.time += deltaTime;

        // Regenerate energy over time
        this.energy += realDeltaTime * 0.1;
        if(this.energy > 1) this.energy = 1;

        // Update HUD
        this.timeValueElement.textContent = this.formatTime();
        // this.scoreValueElement.textContent = this.score.toString();
        this.energyFillElement.style.width = `${this.energy * 100}%`;

        // Update ability cooldowns
        for(const [_id, ability] of this.abilities) {
            if(ability.currentCooldown > 0) {
                ability.currentCooldown -= deltaTime;
                if(ability.currentCooldown < 0) ability.currentCooldown = 0;

                const cooldownFraction = ability.currentCooldown / ability.useCooldown;
                ability.element.style.setProperty('--ability-cooldown', `${cooldownFraction * 100}%`);
            }
        }
    }

    public getAbilityCooldown(id: string): number {
        const ability = this.abilities.get(id);
        if(!ability) return 0;
        return ability.useCooldown;
    }

    /** Returns the portion of the requested energy that was able to be taken (0 to 1) */
    public tryTakeEnergy(amount: number): number {
        if(this.energy >= amount) {
            this.energy -= amount;
            return 1;
        }
        const portion = this.energy / amount;
        this.energy = 0;
        return portion;
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