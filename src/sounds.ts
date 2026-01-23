export enum SoundType {
    BallLost = "ballLost.wav",
    Bounce = "bounce.wav",
    BounceLight = "bounceLight.wav",
    BouncePaddle = "bouncePaddle.wav",
    BreakBlock = "breakBlock.wav",
    Explosion = "explosion.wav",
    GameOver = "gameOver.wav",
    LaserShoot = "laserShoot.wav",
    Launch = "launch.wav",
    PickupEnergy = "pickupEnergy.wav",
    PowerUp = "powerUp.wav",
    SlowMotion = "slowMotion.wav",
    SlowMotionResume = "slowMotionResume.wav",
    Teleport = "teleport.wav",
    UsePowerUp = "usePowerUp.wav"
}

export class Sounds {
    private static audioContext: AudioContext | null = null;
    private static soundBuffers: Map<SoundType, AudioBuffer> = new Map();

    public static async init() {
        if(this.audioContext !== null) return;
        this.audioContext = new AudioContext();
        
        const soundPromises: Promise<void>[] = [];
        for(const soundTypeKey in SoundType) {
            const soundType = SoundType[soundTypeKey as keyof typeof SoundType];
            const soundPromise = fetch(`sounds/${soundType}`)
                .then(response => response.arrayBuffer())
                .then(arrayBuffer => this.audioContext!.decodeAudioData(arrayBuffer))
                .then(audioBuffer => {
                    this.soundBuffers.set(soundType, audioBuffer);
                });
            soundPromises.push(soundPromise);
        }
        await Promise.all(soundPromises);
    }

    public static play(soundType: SoundType, pitch: number = 1.0, volume: number = 1.0, pitchRandomness: number = 0.2) {
        if(this.audioContext === null) return;
        const buffer = this.soundBuffers.get(soundType);
        if(!buffer) return;

        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = pitch + (Math.random() * 2 - 1) * pitchRandomness;
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = volume;
        source.connect(gainNode).connect(this.audioContext.destination);
        source.start(0);

        source.onended = () => {
            source.disconnect();
            gainNode.disconnect();
        };
    }
}