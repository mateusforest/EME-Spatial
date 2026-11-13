/** Presentation files stay on this device. They are never uploaded implicitly. */
export type LocalMaterial={id:string;name:string;type:string;file:Blob;category?:string};
const open=()=>new Promise<IDBDatabase>((resolve,reject)=>{
 const request=indexedDB.open('priorita-materials-v1',1);
 request.onupgradeneeded=()=>request.result.createObjectStore('files',{keyPath:'id'});
 request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
});
export async function loadMaterials():Promise<LocalMaterial[]>{const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('files');const req=tx.objectStore('files').getAll();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);tx.oncomplete=()=>db.close();tx.onabort=()=>db.close();});}
export async function saveMaterial(item:LocalMaterial){const db=await open();return new Promise<void>((resolve,reject)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').put(item);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};});}
export async function removeMaterial(id:string){const db=await open();return new Promise<void>((resolve,reject)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').delete(id);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};});}
