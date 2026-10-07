export function sceneKey71(search:string){return new URLSearchParams(search).get('apartamento')==='14'?'apartment14':'exterior';}
export function switchMScene71(url:string,state:unknown=null){history.pushState(state,'',url);window.dispatchEvent(new Event('m-scene71'));}
