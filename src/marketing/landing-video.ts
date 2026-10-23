// Keep native buffering and looping; only spend decoding time on visible films.
export function observeLandingVideo(video: HTMLVideoElement, source: string) {
  let disposed = false;
  let visible = false;
  let loaded = false;
  let playPending = false;
  let retryAfterPending = false;
  const canPlay = () => !disposed && visible && !document.hidden;

  const syncPlayback = () => {
    if (!canPlay()) {
      video.pause();
      return;
    }
    if (!loaded || !video.paused) return;
    if (playPending) { retryAfterPending = true; return; }
    video.muted = true;
    playPending = true;
    void video.play().then(() => {
      // A scroll or tab change can happen while play() is still pending.
      if (!canPlay()) video.pause();
    }).catch(() => {
      // The poster stays visible if the browser restricts autoplay.
      // Retry on readiness, return to the page, or the next user interaction.
    }).finally(() => {
      playPending = false;
      if (retryAfterPending) { retryAfterPending = false; syncPlayback(); }
    });
  };
  const load = () => {
    if (loaded || disposed) return;
    loaded = true;
    video.src = source;
  };
  const onPlay = () => { if (!canPlay()) video.pause(); };
  video.addEventListener('play', onPlay);
  video.addEventListener('canplay', syncPlayback);
  document.addEventListener('visibilitychange', syncPlayback);
  document.addEventListener('pointerdown', syncPlayback, {passive: true});
  document.addEventListener('keydown', syncPlayback);
  window.addEventListener('pageshow', syncPlayback);

  let loadObserver: IntersectionObserver | undefined;
  let playbackObserver: IntersectionObserver | undefined;
  if ('IntersectionObserver' in window) {
    loadObserver = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        load();
        loadObserver?.disconnect();
      }
    }, {rootMargin: '-100px 0px 240px 0px'});
    // Ignore footage hidden behind the sticky header or just peeking at an edge.
    playbackObserver = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= 0.1);
      if (visible) load();
      syncPlayback();
    }, {rootMargin: '-80px 0px 0px', threshold: [0, 0.1]});
    loadObserver.observe(video);
    playbackObserver.observe(video);
  } else {
    visible = true;
    load();
    syncPlayback();
  }

  return () => {
    disposed = true;
    loadObserver?.disconnect();
    playbackObserver?.disconnect();
    video.removeEventListener('play', onPlay);
    video.removeEventListener('canplay', syncPlayback);
    document.removeEventListener('visibilitychange', syncPlayback);
    document.removeEventListener('pointerdown', syncPlayback);
    document.removeEventListener('keydown', syncPlayback);
    window.removeEventListener('pageshow', syncPlayback);
    video.pause();
  };
}
