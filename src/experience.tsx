import React,{lazy,Suspense} from 'react';
import {createRoot} from 'react-dom/client';

const Patio=lazy(()=>import('./developments/PatioM'));
const M=lazy(()=>import('./developments/MSceneRouter71'));
const Presentation=lazy(()=>import('./presentation/Presentation'));
const Moradas=lazy(()=>import('./developments/DevelopmentPage'));
const Vacaria=lazy(()=>import('./developments/VacariaPage'));
const Compact=lazy(()=>import('./developments/VacariaCompactPage'));
const Botanique=lazy(()=>import('./BotaniquePage'));
const route=location.pathname.replace(/\/$/,'').split('/').pop();
const patioLegacy=route==='m'&&['condominio','casas','clube','entrada-patio','casa-detalhe'].includes(new URLSearchParams(location.search).get('vista')||'');
const kitchenLegacy=route==='cozinha';
if(kitchenLegacy)location.replace('/apresentar/m?apartamento=14&personalizar=1');
if(patioLegacy)location.replace('/apresentar/patio-m'+location.search);
const App=patioLegacy||kitchenLegacy?null:route==='botanique'?Botanique:route==='patio-m'?Patio:route==='m'?M:route==='moradas-da-serra'?Moradas:route==='residencial-vacaria'?(new URLSearchParams(location.search).get('alternativa')==='compacta'?Compact:Vacaria):route==='g400'||route==='cenario'?Presentation:null;
createRoot(document.getElementById('root')!).render(<React.StrictMode><Suspense fallback={<p role="status">Preparando a experiência EME Spatial…</p>}>{App?<App/>:<main><h1>Experiência não encontrada</h1><a href="/">Voltar ao EME Spatial</a></main>}</Suspense></React.StrictMode>);
