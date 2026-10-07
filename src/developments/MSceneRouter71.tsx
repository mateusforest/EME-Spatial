import {useEffect,useState} from 'react';
import MResidence from './MResidence';
import {sceneKey71} from './mSceneNavigation71';
export default function MSceneRouter71(){
 const key=()=>sceneKey71(location.search);
 const [scene,setScene]=useState(key);
 useEffect(()=>{const change=()=>setScene(key());window.addEventListener('popstate',change);window.addEventListener('m-scene71',change);return()=>{window.removeEventListener('popstate',change);window.removeEventListener('m-scene71',change);};},[]);
 return <MResidence key={scene}/>;
}
