import { describe, expect, it, vi } from 'vitest';
import { CropCapture, type CaptureEnvironment, type CaptureSnapshot } from './capture';

function fixture(surface = 'browser') {
  const ended: { fn?: () => void } = {};
  const track = {
    readyState: 'live',
    enabled: true,
    getSettings: () => ({ displaySurface: surface }),
    cropTo: vi.fn(async () => {}),
    stop: vi.fn(),
    addEventListener: (_event: string, fn: () => void) => {
      ended.fn = fn;
    },
  };
  const stream = {
    getVideoTracks: () => [track],
    getTracks: () => [track],
  } as unknown as MediaStream;
  const environment: CaptureEnvironment = {
    getDisplayMedia: vi.fn(async () => stream),
    createTarget: vi.fn(async () => ({})),
  };
  const snapshots: CaptureSnapshot[] = [];
  const capture = new CropCapture((state) => snapshots.push(state), environment);
  return { capture, track, stream, environment, snapshots, ended, element: {} as HTMLElement };
}
describe('production crop controller', () => {
  it('publishes only after cropping has completed', async () => {
    const f = fixture();
    let resolve!: () => void;
    f.track.cropTo.mockImplementation(
      () =>
        new Promise<void>((done) => {
          resolve = done;
        }),
    );
    const ready = f.capture.start(f.element);
    await vi.waitFor(() => expect(f.track.cropTo).toHaveBeenCalled());
    expect(f.capture.snapshot.stream).toBeNull();
    resolve();
    await ready;
    expect(f.capture.snapshot.stream).toBe(f.stream);
  });
  it('stops and rejects an uncropped wrong surface', async () => {
    const f = fixture('monitor');
    await f.capture.start(f.element);
    expect(f.capture.snapshot.status).toBe('error');
    expect(f.track.stop).toHaveBeenCalled();
    expect(f.snapshots.every((s) => s.stream === null)).toBe(true);
  });
  it('cancels a pending picker without publishing the returned track', async () => {
    const f = fixture();
    let resolve!: (stream: MediaStream) => void;
    f.environment.getDisplayMedia = () =>
      new Promise((done) => {
        resolve = done;
      });
    const pending = f.capture.start(f.element);
    f.capture.stop();
    resolve(f.stream);
    await pending;
    expect(f.track.stop).toHaveBeenCalled();
    expect(f.capture.snapshot.stream).toBeNull();
  });
  it('unpublishes before recropping and stops on crop failure', async () => {
    const f = fixture();
    await f.capture.start(f.element);
    f.track.cropTo.mockRejectedValue(new Error('Crop lost'));
    const retry = f.capture.refresh(f.element);
    expect(f.capture.snapshot.stream).toBeNull();
    await retry;
    expect(f.track.stop).toHaveBeenCalled();
    expect(f.capture.snapshot.status).toBe('error');
  });
  it('reuses the capture session and target, and handles browser-ended sharing', async () => {
    const f = fixture();
    await f.capture.start(f.element);
    f.capture.pause();
    await f.capture.refresh(f.element);
    expect(f.environment.getDisplayMedia).toHaveBeenCalledTimes(1);
    expect(f.environment.createTarget).toHaveBeenCalledTimes(1);
    f.ended.fn!();
    expect(f.capture.snapshot.stream).toBeNull();
    expect(f.capture.active).toBe(false);
  });
  it('pauses frames and resumes an unchanged persistent crop without recropping', async () => {
    const f = fixture();
    await f.capture.start(f.element);
    f.capture.pause();
    expect(f.track.enabled).toBe(false);
    expect(f.capture.snapshot.stream).toBeNull();
    await f.capture.resume(f.element);
    expect(f.track.enabled).toBe(true);
    expect(f.track.cropTo).toHaveBeenCalledTimes(1);
    expect(f.capture.snapshot.stream).toBe(f.stream);
  });
});
