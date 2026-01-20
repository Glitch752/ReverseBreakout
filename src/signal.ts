/**
 * I like GDScript, okay?
 */
export class Signal<T extends[...any[]]> {
    private listeners: Array<(...args: T) => void> = [];

    public connect(listener: (...args: T) => void) {
        this.listeners.push(listener);
    }

    public emit(...args: T) {
        for(const listener of this.listeners) {
            listener(...args);
        }
    }

    public disconnect(listener: (...args: T) => void) {
        this.listeners = this.listeners.filter(l => l !== listener);
    }

    public clear() {
        this.listeners = [];
    }
}