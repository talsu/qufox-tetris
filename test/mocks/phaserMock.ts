// Mock Phaser Classes

export class Scene {
    add: GameObjectFactory;
    make: GameObjectCreator;
    time: TimeManager;
    tweens: TweenManager;
    events: EventEmitter;

    constructor() {
        this.add = new GameObjectFactory();
        this.make = new GameObjectCreator();
        this.time = new TimeManager();
        this.tweens = new TweenManager();
        this.events = new EventEmitter();
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

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    add(child: any) {
        this.list.push(child);
    }
    remove(child: any) {
        const index = this.list.indexOf(child);
        if (index > -1) this.list.splice(index, 1);
    }
    destroy() {
        this.list = [];
    }
    setScale(x: number, y?: number) {}
    setMask(mask: any) {}
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

    fillStyle(color: number, alpha?: number) {}
    fillRect(x: number, y: number, width: number, height: number) {}
    lineStyle(width: number, color: number, alpha?: number) {}
    strokeRect(x: number, y: number, width: number, height: number) {}
    clear() {}
    destroy() {}
    beginPath() {}
    createGeometryMask() { return {}; }
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
