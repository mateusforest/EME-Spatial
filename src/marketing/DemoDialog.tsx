import {useEffect, useRef, useState} from 'react';
import {ArrowUpRight, X} from 'lucide-react';

const demoUrl = '/apresentar/m?apartamento=14&demo=1&ambiente=Planta';
const fullExperienceUrl = '/apresentar/m?apartamento=14&ambiente=Planta';

type DemoDialogProps = {
  onClose: () => void;
  returnFocusTo: HTMLElement | null;
};

/** Mount only after an explicit request: unmounting also releases the 3D document. */
export default function DemoDialog({onClose, returnFocusTo}: DemoDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const removeFrameListenerRef = useRef<(() => void) | null>(null);
  const onCloseRef = useRef(onClose);
  const [documentLoaded, setDocumentLoaded] = useState(false);
  onCloseRef.current = onClose;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = returnFocusTo ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    const previousOverflow = document.body.style.getPropertyValue('overflow');
    const previousPriority = document.body.style.getPropertyPriority('overflow');
    dialog.showModal();
    document.body.style.setProperty('overflow', 'hidden');

    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return;
      if (!event.data || typeof event.data !== 'object') return;
      if (event.data.type === 'm-spatial:demo-close') onCloseRef.current();
      if (event.data.type === 'm-spatial:demo-ready') setDocumentLoaded(true);
    }
    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
      removeFrameListenerRef.current?.();
      if (dialog.open) dialog.close();
      if (previousOverflow) document.body.style.setProperty('overflow', previousOverflow, previousPriority);
      else document.body.style.removeProperty('overflow');
      if (previousFocus?.isConnected) previousFocus.focus({preventScroll: true});
    };
  }, [returnFocusTo]);

  function onFrameLoad() {
    setDocumentLoaded(true);
    removeFrameListenerRef.current?.();
    removeFrameListenerRef.current = null;
    // Keyboard events do not bubble out of an iframe. Keep Escape consistent
    // while the user is interacting with this same-origin 3D experience.
    try {
      const frameDocument = frameRef.current?.contentDocument;
      if (!frameDocument) return;
      const handleEscape = (event: globalThis.KeyboardEvent) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopImmediatePropagation();
        onCloseRef.current();
      };
      frameDocument.addEventListener('keydown', handleEscape, true);
      removeFrameListenerRef.current = () => frameDocument.removeEventListener('keydown', handleEscape, true);
    } catch {
      // A document outside our origin cannot be inspected. The native close
      // button and validated message listener remain available in that case.
    }
  }

  return <dialog
    className="ms-demo-dialog"
    ref={dialogRef}
    aria-labelledby="ms-demo-title"
    aria-describedby="ms-demo-description"
    onCancel={event => {event.preventDefault(); onClose();}}
    onClose={onClose}
    onClick={event => {if (event.target === event.currentTarget) onClose();}}
  >
    <div className="ms-demo-shell">
      <header className="ms-demo-header">
        <div className="ms-demo-heading"><p className="ms-eyebrow">EXPERIÊNCIA INTERATIVA</p><h2 id="ms-demo-title">Torre M <span>· Apartamento 14</span></h2></div>
        <div className="ms-demo-header-actions"><a href={fullExperienceUrl} target="_blank" rel="noopener noreferrer">Abrir experiência completa <ArrowUpRight size={16}/></a><button type="button" className="ms-demo-close" onClick={onClose} aria-label="Fechar experiência 3D" autoFocus><X size={22}/></button></div>
      </header>
      <div className="ms-demo-stage" aria-busy={!documentLoaded}>
        {!documentLoaded && <div className="ms-demo-loading" role="status"><span aria-hidden="true"/><p>Preparando seu primeiro olhar.</p></div>}
        <iframe ref={frameRef} src={demoUrl} title="Torre M, Apartamento 14 — planta 3D, navegação, materiais e iluminação" allow="fullscreen" onLoad={onFrameLoad}/>
      </div>
      <footer className="ms-demo-footer"><p id="ms-demo-description">Explore a planta, percorra os ambientes e experimente materiais e luz.</p><span>ESC para sair</span></footer>
    </div>
  </dialog>;
}
