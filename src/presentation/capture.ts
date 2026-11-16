export interface CaptureSnapshot {
  status: 'idle' | 'starting' | 'ready' | 'paused' | 'error';
  stream: MediaStream | null;
  message: string;
}
export interface CaptureEnvironment {
  getDisplayMedia: () => Promise<MediaStream>;
  createTarget: (element: HTMLElement) => Promise<unknown>;
}
type CropTrack = MediaStreamTrack & { cropTo?: (target: unknown) => Promise<void> };
export const initialCapture: CaptureSnapshot = {
  status: 'idle',
  stream: null,
  message: 'Share the demo to mirror it to the audience.',
};

function browserEnvironment(): CaptureEnvironment {
  return {
    getDisplayMedia: () => {
      if (!navigator.mediaDevices?.getDisplayMedia)
        throw new Error(
          'Tab capture is unavailable. Use desktop Chrome or Edge on localhost or HTTPS.',
        );
      return navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: false,
        preferCurrentTab: true,
        selfBrowserSurface: 'include',
        surfaceSwitching: 'exclude',
      } as DisplayMediaStreamOptions);
    },
    createTarget: (element) => {
      const constructor = (
        globalThis as unknown as {
          CropTarget?: { fromElement: (element: HTMLElement) => Promise<unknown> };
        }
      ).CropTarget;
      if (!constructor)
        throw new Error('Demo cropping is unavailable. Use desktop Chrome or Edge.');
      return constructor.fromElement(element);
    },
  };
}

export class CropCapture {
  private source: MediaStream | null = null;
  private generation = 0;
  private croppedElement: HTMLElement | null = null;
  private targets = new WeakMap<HTMLElement, Promise<unknown>>();
  private listener: (state: CaptureSnapshot) => void;
  snapshot: CaptureSnapshot = { ...initialCapture };
  constructor(
    listener: (state: CaptureSnapshot) => void,
    private environment = browserEnvironment(),
  ) {
    this.listener = listener;
  }
  listen(listener: (state: CaptureSnapshot) => void) {
    this.listener = listener;
  }
  get active() {
    return !!this.source?.getVideoTracks().some((track) => track.readyState === 'live');
  }
  private emit(status: CaptureSnapshot['status'], stream: MediaStream | null, message: string) {
    this.snapshot = { status, stream, message };
    this.listener(this.snapshot);
  }
  private target(element: HTMLElement) {
    let target = this.targets.get(element);
    if (!target) {
      target = this.environment.createTarget(element);
      this.targets.set(element, target);
      target.catch(() => this.targets.delete(element));
    }
    return target;
  }
  private endSource() {
    const old = this.source;
    this.source = null;
    this.croppedElement = null;
    old?.getTracks().forEach((track) => track.stop());
  }
  private error(error: unknown) {
    this.endSource();
    const message =
      error instanceof Error
        ? error.name === 'NotAllowedError'
          ? 'Sharing was cancelled or denied. Select this speaker tab to try again.'
          : error.message
        : 'Sharing could not start. Please try again.';
    this.emit('error', null, message);
  }
  pause(message = 'Demo sharing is paused.') {
    this.generation++;
    this.source?.getVideoTracks().forEach((track) => {
      track.enabled = false;
    });
    this.emit(this.active ? 'paused' : 'idle', null, message);
  }
  stop(message = 'Sharing stopped. The audience sees the poster.') {
    this.generation++;
    this.endSource();
    this.emit('idle', null, message);
  }
  async start(element: HTMLElement): Promise<boolean> {
    if (this.active) return this.resume(element);
    this.stop();
    const ticket = ++this.generation;
    this.emit('starting', null, 'Select this speaker tab in the browser picker.');
    let pending: MediaStream | undefined;
    try {
      // Call immediately in the user gesture, before any other asynchronous work.
      pending = await this.environment.getDisplayMedia();
      if (ticket !== this.generation) {
        pending.getTracks().forEach((track) => track.stop());
        return false;
      }
      const track = pending.getVideoTracks()[0] as CropTrack | undefined;
      if (!track || track.getSettings().displaySurface !== 'browser')
        throw new Error('Select the current browser tab, rather than a screen or window.');
      if (!track.cropTo)
        throw new Error('This browser cannot crop demo sharing. Use desktop Chrome or Edge.');
      await track.cropTo(await this.target(element));
      if (ticket !== this.generation) {
        pending.getTracks().forEach((track) => track.stop());
        return false;
      }
      this.source = pending;
      this.croppedElement = element;
      track.addEventListener(
        'ended',
        () => {
          if (this.source === pending)
            this.stop('Sharing ended. Start sharing again when you are ready.');
        },
        { once: true },
      );
      this.emit('ready', pending, 'Live demo mirrored. Your notes stay outside the shared area.');
      return true;
    } catch (error) {
      pending?.getTracks().forEach((track) => track.stop());
      if (ticket === this.generation) this.error(error);
      return false;
    }
  }
  async refresh(element: HTMLElement): Promise<boolean> {
    const source = this.source;
    if (!source || !this.active) return false;
    const ticket = ++this.generation;
    this.emit('starting', null, 'Updating the demo crop…');
    try {
      const track = source.getVideoTracks()[0] as CropTrack;
      if (!track.cropTo) throw new Error('Demo cropping is unavailable.');
      await track.cropTo(await this.target(element));
      if (ticket !== this.generation || this.source !== source) return false;
      this.croppedElement = element;
      track.enabled = true;
      this.emit('ready', source, 'Live demo mirrored. Your notes stay outside the shared area.');
      return true;
    } catch (error) {
      if (ticket === this.generation) this.error(error);
      return false;
    }
  }
  async resume(element: HTMLElement): Promise<boolean> {
    if (!this.source || !this.active) return false;
    if (element !== this.croppedElement) return this.refresh(element);
    this.generation++;
    this.source.getVideoTracks().forEach((track) => {
      track.enabled = true;
    });
    this.emit('ready', this.source, 'Live demo mirrored. Your notes stay outside the shared area.');
    return true;
  }
}
