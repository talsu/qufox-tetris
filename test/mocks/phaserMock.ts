// Mock Phaser Classes

export class Scene {
    add: GameObjectFactory;
    make: GameObjectCreator;
    time: TimeManager;
    tweens: TweenManager;
    events: EventEmitter;
    cameras: {
        main: {
            shake: (...args: any[]) => void;
            preRender: () => void;
            width: number;
            height: number;
            zoom: number;
            worldView: { x: number; y: number };
        };
    };
    textures: {
        exists: (key: string) => boolean;
    };

    constructor() {
        this.add = new GameObjectFactory();
        this.make = new GameObjectCreator();
        this.time = new TimeManager();
        this.tweens = new TweenManager();
        this.events = new EventEmitter();
        this.cameras = {
            main: {
                shake: () => {},
                preRender: () => {},
                width: 800,
                height: 600,
                zoom: 1,
                worldView: { x: 0, y: 0 },
            },
        };
        this.textures = {
            exists: () => false,
        };
    }
}

export class EventEmitter {
    private listeners: {[key: string]: Function[]} = {};

    on(event: string, fn: Function) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(fn);
        return this;
    }

    emit(event: string, ...args: any[]) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(fn => fn(...args));
            return true;
        }
        return false;
    }

    off(event: string, fn: Function) {
        if (!this.listeners[event]) return this;
        this.listeners[event] = this.listeners[event].filter(f => f !== fn);
        return this;
    }

    addListener(event: string, fn: Function) { return this.on(event, fn); }
    removeListener(event: string, fn: Function) { return this.off(event, fn); }
    once(event: string, fn: Function) {
        const onceFn = (...args: any[]) => {
            fn(...args);
            this.off(event, onceFn);
        };
        this.on(event, onceFn);
        return this;
    }
}

export class GameObjectFactory {
    container(x: number, y: number): Container {
        return new Container(x, y);
    }
    graphics(): Graphics {
        return new Graphics();
    }
    image(x: number, y: number, key: string, frame?: string | number): Image {
        return new Image(x, y, key, frame);
    }
    text(x: number, y: number, content: string, style?: any): Text {
        return new Text(x, y, content, style);
    }
    particles(x: number, y: number, texture: string, config?: any) {
        return {
            x,
            y,
            texture,
            config,
            active: true,
            explode: () => {},
            emitParticleAt: () => {},
            destroy() {
                this.active = false;
            },
        };
    }
    tween(config: any): Tween {
        const tween = new Tween(config);
        if (config.onComplete) {
            // Execute async to allow assignment and proper flow
            setTimeout(() => {
                config.onComplete();
            }, config.duration || 1);
        }
        return tween;
    }
}

export class GameObjectCreator {
    graphics(config: any): Graphics {
        return new Graphics();
    }
}

export class GameObjects {
    static Container = class { constructor(scene, x, y) {} };
    static Graphics = class { constructor(scene) {} };
    static Image = class { constructor(scene, x, y, key) {} };
}

export class Container {
    x: number;
    y: number;
    width: number;
    height: number;
    list: any[] = [];
    visible: boolean = true;
    alpha: number = 1;
    scaleX: number = 1;
    scaleY: number = 1;
    depth: number = 0;
    active: boolean = true;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    add(child: any) {
        if (Array.isArray(child)) {
            this.list.push(...child);
        } else {
            this.list.push(child);
        }
        return this;
    }
    remove(child: any) {
        const index = this.list.indexOf(child);
        if (index > -1) this.list.splice(index, 1);
        return this;
    }
    destroy() {
        this.list = [];
        this.active = false;
    }
    setScale(x: number, y?: number) {
        this.scaleX = x;
        this.scaleY = y !== undefined ? y : x;
        return this;
    }
    setMask(mask: any) {
        return this;
    }
    setAlpha(alpha: number) {
        this.alpha = alpha;
        return this;
    }
    setVisible(visible: boolean) {
        this.visible = visible;
        return this;
    }
    setPosition(x: number, y: number) {
        this.x = x;
        this.y = y;
        return this;
    }
    setDepth(depth: number) {
        this.depth = depth;
        return this;
    }
    bringToTop(child: any) {
        const index = this.list.indexOf(child);
        if (index > -1) {
            this.list.splice(index, 1);
            this.list.push(child);
        }
        return this;
    }
    removeAll(destroy?: boolean) {
        if (destroy) {
            this.list.forEach(c => c.destroy && c.destroy());
        }
        this.list = [];
    }
    each(callback: Function) {
        this.list.forEach(c => callback(c));
    }
}

export class Graphics {
    x: number = 0;
    y: number = 0;
    alpha: number = 1;
    visible: boolean = true;
    scaleX: number = 1;
    scaleY: number = 1;

    fillStyle(color: number, alpha?: number) {}
    fillRect(x: number, y: number, width: number, height: number) {}
    lineStyle(width: number, color: number, alpha?: number) {}
    strokeRect(x: number, y: number, width: number, height: number) {}
    fillCircle(x: number, y: number, radius: number) {}
    generateTexture(key: string, width: number, height: number) {}
    clear() {}
    destroy() {}
    beginPath() {}
    createGeometryMask() { return {}; }
    setPosition(x: number, y: number) { this.x = x; this.y = y; return this; }
    setScale(x: number, y?: number) { this.scaleX = x; this.scaleY = y !== undefined ? y : x; return this; }
    setVisible(visible: boolean) { this.visible = visible; return this; }
}

export class Image {
    x: number;
    y: number;
    key: string;
    frame: string | number;
    originX: number = 0.5;
    originY: number = 0.5;
    visible: boolean = true;
    scaleX: number = 1;
    scaleY: number = 1;
    alpha: number = 1;

    constructor(x: number, y: number, key: string, frame?: string | number) {
        this.x = x;
        this.y = y;
        this.key = key;
        this.frame = frame;
    }

    setOrigin(x: number, y?: number) {
        this.originX = x;
        this.originY = y !== undefined ? y : x;
    }
    setAlpha(alpha: number) {
        this.alpha = alpha;
    }
    setScale(x: number, y?: number) {
        this.scaleX = x;
        this.scaleY = y !== undefined ? y : x;
    }
    destroy() {}
    setSize(w, h) {}
}

export class Text {
    x: number;
    y: number;
    text: string;
    style: any;
    originX: number = 0.5;
    originY: number = 0.5;
    visible: boolean = true;
    alpha: number = 1;
    depth: number = 0;
    active: boolean = true;

    constructor(x: number, y: number, content: string, style?: any) {
        this.x = x;
        this.y = y;
        this.text = content;
        this.style = style || {};
    }

    setOrigin(x: number, y?: number) {
        this.originX = x;
        this.originY = y !== undefined ? y : x;
        return this;
    }
    setText(value: string) {
        this.text = value;
        return this;
    }
    setColor(color: string) { return this; }
    setAlpha(alpha: number) { this.alpha = alpha; return this; }
    setStroke(color: string, thickness: number) { return this; }
    setShadow(offsetX: number, offsetY: number, color: string, blur: number, stroke: boolean, fill: boolean) { return this; }
    setFontSize(size: number) { return this; }
    setPosition(x: number, y: number) { this.x = x; this.y = y; return this; }
    setVisible(visible: boolean) { this.visible = visible; return this; }
    setDepth(depth: number) { this.depth = depth; return this; }
    destroy() { this.active = false; }
}

export class TimeManager {
    addEvent(config: any): TimerEvent {
        return new TimerEvent(config);
    }
    delayedCall(delay: number, callback: Function, args?: any[], scope?: any) {
        if (typeof setTimeout === 'function') {
             setTimeout(() => {
                 callback.apply(scope, args || []);
             }, delay);
        } else {
             callback.apply(scope, args || []);
        }
        return new TimerEvent({delay, callback, args, callbackScope: scope});
    }
}

export class TimerEvent {
    delay: number;
    callback: Function;
    args: any[];
    callbackScope: any;
    loop: boolean;

    constructor(config: any) {
        this.delay = config.delay;
        this.callback = config.callback;
        this.args = config.args;
        this.callbackScope = config.callbackScope;
        this.loop = config.loop;
    }

    destroy() {}
    remove() {}
}

export class TweenManager {
    add(config: any): Tween {
        const tween = new Tween(config);
        if (config.onComplete) {
            // Execute async to allow assignment and proper flow
            setTimeout(() => {
                config.onComplete();
            }, config.duration || 1);
        }
        return tween;
    }
}

export class Tween {
    constructor(config: any) {}
    pause() {}
    stop() {}
}

export const Math = {
    Between: (min: number, max: number) => {
        return javaScriptMath.floor(javaScriptMath.random() * (max - min + 1)) + min;
    }
};

const javaScriptMath = global.Math;

// Namespace Exports
export const Events = {
    EventEmitter
};

export const Time = {
    TimerEvent
};

export const Tweens = {
    Tween
};

export default {
    Scene,
    GameObjects,
    Math,
    Events,
    Time,
    Tweens
};
