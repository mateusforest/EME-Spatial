/** Capability links are ephemeral. The second half authenticates the viewer handshake. */
export const LIVE_PROTOCOL='eme-botanique-live/1';
export const LIVE_MAX_VIEWERS=3;
export function createLiveId(random:Crypto=crypto){return Array.from(random.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');}
export function validLiveId(value:unknown):value is string{return typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);}
export function readLiveVisitId(search:string=window.location.search){const value=new URLSearchParams(search).get('visita');return validLiveId(value)?value:null;}
export function livePeerId(id:string){if(!validLiveId(id))throw Error('Link de visita inválido.');return 'eme-botanique-'+id.slice(0,32);}
export function liveToken(id:string){if(!validLiveId(id))throw Error('Link de visita inválido.');return id.slice(32);}
export function liveVisitUrl(id:string,base:string=window.location.href){if(!validLiveId(id))throw Error('Link de visita inválido.');const url=new URL(base);url.search='';url.hash='';url.searchParams.set('visita',id);return url.href;}
export function liveMetadata(id:string){return {protocol:LIVE_PROTOCOL,role:'viewer',token:liveToken(id)};}
export function validLiveMetadata(value:unknown,id:string){if(!value||typeof value!=='object')return false;const item=value as Record<string,unknown>;return item.protocol===LIVE_PROTOCOL&&item.role==='viewer'&&item.token===liveToken(id);}
export function validIceServers(value:unknown):value is RTCIceServer[]{return Array.isArray(value)&&value.length<=12&&value.every(server=>{if(!server||typeof server!=='object')return false;const urls=Array.isArray(server.urls)?server.urls:[server.urls];return urls.length>0&&urls.length<=8&&urls.every((url:unknown)=>typeof url==='string'&&/^(stun|stuns|turn|turns):[^\s]+$/.test(url))&&(server.username===undefined||typeof server.username==='string')&&(server.credential===undefined||typeof server.credential==='string');});}
