import {useEffect, useRef, useState} from 'react';
import {observeLandingVideo} from './landing-video';

const compactMedia = '(max-width: 900px), (max-height: 600px) and (pointer: coarse)';

export default function LandingVideo({kind, label}: {kind: 'hero' | 'product'; label: string}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Pick once: rotating the phone must not restart or download a second film.
  const [compact] = useState(() => window.matchMedia(compactMedia).matches);
  const asset = `/assets/marketing/spatial-${kind}-${compact ? 'mobile-v3' : 'v2'}`;
  useEffect(() => {
    const video = videoRef.current;
    if (video) return observeLandingVideo(video, `${asset}.mp4`);
  }, [asset]);

  return <video ref={videoRef} autoPlay muted loop playsInline
    preload={kind === 'hero' ? 'auto' : 'metadata'}
    poster={`${asset}-poster.webp`} aria-label={label}
    width="1280" height="720" disablePictureInPicture disableRemotePlayback/>;
}
