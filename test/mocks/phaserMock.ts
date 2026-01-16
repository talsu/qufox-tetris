export class Scene {
  add = {
    container: (x: number, y: number) => new GameObjects.Container(this, x, y),
    graphics: () => new GameObjects.Graphics(this),
    image: (x: number, y: number, key: string, frame: any) => new GameObjects.Image(this, x, y, key, frame),
    tween: (config: any) => new Tweens.Tween(config),
  };
  make = {
    graphics: (config: any) => new GameObjects.Graphics(this),
  };
  time = {
      delayedCall: (delay: number, callback: Function, args: any[], scope: any) => {
          callback.apply(scope, args || []);
      },
      addEvent: (config: any) => new Time.TimerEvent(config)
  }
}

export namespace Events {
    export class EventEmitter {
        private listenersMap: {[key: string]: Function[]} = {};
        on(event: string, fn: Function, context?: any) {
            if (!this.listenersMap[event]) this.listenersMap[event] = [];
            this.listenersMap[event].push(fn.bind(context || this));
            return this;
        }
        emit(event: string, ...args: any[]) {
            if (this.listenersMap[event]) {
                this.listenersMap[event].forEach(fn => fn(...args));
                return true;
            }
            return false;
        }
        off(event: string, fn?: Function, context?: any) {
             // simplified off
             if (fn) {
                 // logic to remove specific listener
             } else {
                 this.listenersMap[event] = [];
             }
             return this;
        }
        once(event: string, fn: Function, context?: any) {
            const onceWrapper = (...args: any[]) => {
                fn.apply(context || this, args);
                this.off(event, onceWrapper);
            };
            this.on(event, onceWrapper);
            return this;
        }
        addListener(event: string, fn: Function, context?: any) { return this.on(event, fn, context); }
        removeListener(event: string, fn?: Function, context?: any) { return this.off(event, fn, context); }
        removeAllListeners(event?: string) {
            if (event) this.listenersMap[event] = [];
            else this.listenersMap = {};
            return this;
        }
        listenerCount(event: string) { return this.listenersMap[event] ? this.listenersMap[event].length : 0; }
        listeners(event: string) { return this.listenersMap[event] || []; }
    }
}

export namespace GameObjects {
  export class Container {
    x: number;
    y: number;
    width: number;
    height: number;
    list: any[] = [];
    scale: number = 1;
    visible: boolean = true;
    alpha: number = 1;
    scene: any;
    constructor(scene: any, x: number, y: number, width?: number, height?: number) {
      this.scene = scene;
      this.x = x;
      this.y = y;
      this.width = width || 0;
      this.height = height || 0;
    }
    add(child: any) { this.list.push(child); }
    remove(child: any) { this.list = this.list.filter(c => c !== child); }
    destroy() { this.list = []; }
    setScale(scale: number) { this.scale = scale; }
    setMask(mask: any) {}
    each(callback: any) { this.list.forEach(callback); }
    removeAll(destroy?: boolean) { this.list = []; }
  }

  export class Graphics {
    constructor(scene: any) {}
    fillStyle() {}
    fillRect() {}
    lineStyle() {}
    strokeRect() {}
    clear() {}
    destroy() {}
    setAlpha() {}
    beginPath() {}
    createGeometryMask() { return {}; }
  }

  export class Image {
    x: number;
    y: number;
    visible: boolean = true;
    scale: number = 1;
    originX: number = 0;
    originY: number = 0;
    constructor(scene: any, x: number, y: number, key: string, frame: any) {
      this.x = x;
      this.y = y;
    }
    setOrigin(x: number, y?: number) { this.originX = x; this.originY = y ?? x; }
    setScale(scale: number) { this.scale = scale; }
    setSize() {}
    setAlpha() {}
    destroy() {}
  }
}

export namespace Tweens {
    export class Tween {
        constructor(config: any) {
            if (config.onComplete) {
                config.onComplete();
            }
        }
        pause() {}
        stop() {}
    }
}

export namespace Time {
    export class TimerEvent {
        constructor(config: any) {}
        destroy() {}
    }
}

export namespace Math {
    export function Between(min: number, max: number) {
        return javaScriptMath.floor(javaScriptMath.random() * (max - min + 1)) + min;
    }
}

const javaScriptMath = global.Math;

const PhaserMock = {
    Scene,
    Events,
    GameObjects,
    Tweens,
    Time,
    Math
};

export default PhaserMock;
