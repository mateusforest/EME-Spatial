import {lazy,Suspense} from 'react';
import './vacaria-tour.css';
const Original=lazy(()=>import('./VacariaViewer'));
const Compact=lazy(()=>import('./VacariaCompactViewer'));

/** Standalone viewer, reached only after entering the project's presentation. */
export default function VacariaTour(){
 const Viewer=new URLSearchParams(location.search).get('alternativa')==='compacta'?Compact:Original;
 return <main className="vac-tour"><Suspense fallback={<p role="status">Preparando o Residencial Vacaria…</p>}><Viewer/></Suspense></main>;
}
