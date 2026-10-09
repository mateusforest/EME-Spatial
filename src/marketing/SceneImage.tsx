import {useEffect, useReducer, useRef, useState} from 'react';
import './scene-image.css';

export type SceneImageProps = {
  scene: 'exterior' | 'interior' | 'aerea';
  src: string;
  alt: string;
  className?: string;
  eager?: boolean;
};

type Frame = Pick<SceneImageProps, 'scene' | 'src' | 'alt'> & {id: number};
type State = {current: Frame; incoming: Frame | null; pending: Frame | null; request: number; error: string};
type Action =
  | {type: 'request'; id: number}
  | {type: 'loaded'; frame: Frame}
  | {type: 'load-error'; id: number}
  | {type: 'frame-error'; id: number}
  | {type: 'complete'; id: number};

const failureMessage = 'Não foi possível carregar esta vista. Escolha outra para continuar.';

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'request':
      // A new choice invalidates queued views, but lets an active passage finish.
      return {...state, request: action.id, pending: null, error: ''};
    case 'loaded': {
      if (action.frame.id !== state.request) return state;
      if (state.incoming) return {...state, pending: action.frame};
      if (action.frame.src === state.current.src) {
        return {...state, current: {...state.current, scene: action.frame.scene, alt: action.frame.alt}, pending: null};
      }
      return {...state, incoming: action.frame};
    }
    case 'load-error':
      return action.id === state.request ? {...state, pending: null, error: failureMessage} : state;
    case 'frame-error':
      if (state.incoming?.id === action.id) {
        return {...state, incoming: state.pending, pending: null, error: failureMessage};
      }
      return state.current.id === action.id ? {...state, error: failureMessage} : state;
    case 'complete': {
      if (state.incoming?.id !== action.id) return state;
      const next = state.pending;
      const sameSource = next?.src === state.incoming.src;
      return {
        ...state,
        current: sameSource ? {...state.incoming, scene: next.scene, alt: next.alt} : state.incoming,
        incoming: next && !sameSource ? next : null,
        pending: null,
        error: state.incoming.id === state.request || next?.id === state.request ? '' : state.error,
      };
    }
  }
}

function movement(from: Frame['scene'], to: Frame['scene']) {
  if (from === 'exterior' && to === 'interior') {
    return {origin: '75% 60%', departing: 'scale(1.16)', arriving: 'scale(1.12)'};
  }
  if (to === 'aerea') {
    return {origin: '65% 55%', departing: 'translateY(-1%) scale(1.035)', arriving: 'translateY(1.5%) scale(1.06)'};
  }
  if (from === 'aerea') {
    return {origin: '65% 55%', departing: 'translateY(1%) scale(1.035)', arriving: 'translateY(-1.5%) scale(1.06)'};
  }
  // On the way back, the exterior settles from a closer view to its full frame.
  return {origin: '75% 60%', departing: 'scale(.985)', arriving: 'scale(1.12)'};
}

/** A guided visual passage between prepared images, triggered only by prop changes. */
export default function SceneImage({scene, src, alt, className = '', eager = false}: SceneImageProps) {
  const [state, dispatch] = useReducer(reducer, {
    current: {scene, src, alt, id: 0}, incoming: null, pending: null, request: 0, error: '',
  });
  const requestRef = useRef(0);
  const imagesRef = useRef(new Map<number, HTMLImageElement>());
  const currentRef = useRef(state.current);
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  currentRef.current = state.current;

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(preference.matches);
    update();
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const id = ++requestRef.current;
    const frame: Frame = {id, scene, src, alt};
    let disposed = false;
    dispatch({type: 'request', id});

    if (src === currentRef.current.src) {
      dispatch({type: 'loaded', frame});
      return;
    }

    const preload = new Image();
    preload.decoding = 'async';
    const fail = () => { if (!disposed) dispatch({type: 'load-error', id}); };
    preload.onerror = fail;
    preload.onload = async () => {
      try {
        if (preload.decode) await preload.decode();
        if (!disposed) dispatch({type: 'loaded', frame});
      } catch {
        fail();
      }
    };
    preload.src = src;

    return () => {
      disposed = true;
      preload.onload = null;
      preload.onerror = null;
    };
  }, [scene, src, alt]);

  useEffect(() => {
    const incoming = state.incoming;
    if (!incoming) return;
    const arriving = imagesRef.current.get(incoming.id);
    const departing = imagesRef.current.get(state.current.id);
    if (!arriving || !departing) return;
    let disposed = false;
    let animations: Animation[] = [];

    async function transition() {
      try {
        // Decode the actual visible element too, so a cold cache cannot flash.
        await arriving!.decode();
        if (disposed) return;
        if (reducedMotion || !arriving!.animate || !departing!.naturalWidth) {
          dispatch({type: 'complete', id: incoming!.id});
          return;
        }
        const {origin, departing: destination, arriving: start} = movement(state.current.scene, incoming!.scene);
        const options: KeyframeAnimationOptions = {duration: 1450, easing: 'cubic-bezier(.25,.65,.25,1)', fill: 'both'};
        animations = [
          departing!.animate([
            {opacity: 1, transform: 'none', transformOrigin: origin, offset: 0},
            {opacity: .98, offset: .16},
            {opacity: 0, transform: destination, transformOrigin: origin, offset: 1},
          ], options),
          arriving!.animate([
            {opacity: 1, transform: start, transformOrigin: origin},
            {opacity: 1, transform: 'none', transformOrigin: origin},
          ], options),
        ];
        await Promise.all(animations.map(animation => animation.finished));
        if (!disposed) dispatch({type: 'complete', id: incoming!.id});
      } catch {
        if (!disposed) dispatch({type: 'frame-error', id: incoming!.id});
      }
    }
    void transition();
    return () => {
      disposed = true;
      animations.forEach(animation => animation.cancel());
    };
  }, [state.current, state.incoming, reducedMotion]);

  return <div className={`ms-transition ${className}`}>
    {[state.current, state.incoming].map(frame => frame && <img
      key={frame.id}
      ref={element => { if (element) imagesRef.current.set(frame.id, element); else imagesRef.current.delete(frame.id); }}
      className={`ms-transition-layer${frame === state.incoming ? ' ms-transition-incoming' : ' ms-transition-current'}`}
      src={frame.src}
      alt={frame === state.incoming ? '' : frame.alt}
      aria-hidden={frame === state.incoming ? true : undefined}
      decoding="async"
      loading={eager || frame === state.incoming ? 'eager' : 'lazy'}
      fetchPriority={eager && frame.id === 0 ? 'high' : 'auto'}
      draggable={false}
      onError={() => dispatch({type: 'frame-error', id: frame.id})}
    />)}
    <span className="ms-transition-status" role="status" aria-live="polite" aria-atomic="true">{state.error}</span>
  </div>;
}
