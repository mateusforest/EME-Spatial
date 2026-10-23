import test from 'node:test';
import assert from 'node:assert/strict';
import {observeLandingVideo} from '../src/marketing/landing-video.ts';

function setup() {
  const observers = [];
  class Observer {
    constructor(callback, options) { this.callback = callback; this.options = options; observers.push(this); }
    observe() {}
    disconnect() { this.disconnected = true; }
    enter(ratio) { this.callback([{isIntersecting: ratio > 0, intersectionRatio: ratio}]); }
  }
  globalThis.IntersectionObserver = Observer;
  globalThis.window = new EventTarget();
  window.IntersectionObserver = Observer;
  globalThis.document = new EventTarget();
  document.hidden = false;
  const video = new EventTarget();
  Object.assign(video, {
    src: '', paused: true, muted: true, currentTime: 12.5, plays: 0,
    play() { this.plays++; this.paused = false; this.dispatchEvent(new Event('play')); return Promise.resolve(); },
    pause() { this.paused = true; },
  });
  const cleanup = observeLandingVideo(video, '/film.mp4');
  return {video, cleanup, near: observers[0], visible: observers[1]};
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('defer distant downloads and preload without playing outside the viewport', async () => {
  const {video, near, cleanup} = setup();
  assert.equal(video.src, '');
  near.enter(1);
  assert.equal(video.src, '/film.mp4');
  assert.equal(video.plays, 0);
  video.paused = false;
  video.dispatchEvent(new Event('play'));
  assert.equal(video.paused, true);
  cleanup();
});

test('scrolling away stops decoding; returning resumes the same frame and source', async () => {
  const {video, visible, cleanup} = setup();
  visible.enter(0.6);
  await settle();
  assert.equal(video.paused, false);
  visible.enter(0.05);
  assert.equal(video.paused, true);
  visible.enter(0.4);
  await settle();
  assert.equal(video.paused, false);
  assert.equal(video.currentTime, 12.5);
  assert.equal(video.src, '/film.mp4');
  assert.equal(video.plays, 2);
  cleanup();
});

test('background tabs pause and visible pages resume, including restored pages', async () => {
  const {video, visible, cleanup} = setup();
  visible.enter(1);
  await settle();
  document.hidden = true;
  document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(video.paused, true);
  document.hidden = false;
  window.dispatchEvent(new Event('pageshow'));
  await settle();
  assert.equal(video.paused, false);
  cleanup();
});

test('blocked autoplay retries after an interaction without a retry loop', async () => {
  const {video, visible, cleanup} = setup();
  const play = video.play;
  video.play = function () { this.plays++; return Promise.reject(new Error('autoplay blocked')); };
  visible.enter(1);
  await settle();
  assert.equal(video.plays, 1);
  assert.equal(video.paused, true);
  video.play = play;
  document.dispatchEvent(new Event('pointerdown'));
  await settle();
  assert.equal(video.paused, false);
  assert.equal(video.plays, 2);
  cleanup();
});

test('a delayed play promise cannot restart an offscreen or unmounted video', async () => {
  const {video, visible, near, cleanup} = setup();
  let resolvePlay;
  video.play = function () { this.plays++; return new Promise(resolve => { resolvePlay = resolve; }); };
  visible.enter(1);
  visible.enter(0);
  cleanup();
  video.paused = false;
  resolvePlay();
  await settle();
  assert.equal(video.paused, true);
  assert.equal(near.disconnected, true);
  assert.equal(visible.disconnected, true);
  document.dispatchEvent(new Event('pointerdown'));
  window.dispatchEvent(new Event('pageshow'));
  assert.equal(video.plays, 1);
});

test('a fast scroll back into view retries an interrupted pending start', async () => {
  const {video, visible, cleanup} = setup();
  const play = video.play;
  let rejectPlay;
  video.play = function () { this.plays++; return new Promise((resolve, reject) => { rejectPlay = reject; }); };
  visible.enter(1);
  visible.enter(0);
  visible.enter(1);
  video.play = play;
  rejectPlay(new Error('play interrupted by pause'));
  await settle();
  assert.equal(video.plays, 2);
  assert.equal(video.paused, false);
  cleanup();
});
