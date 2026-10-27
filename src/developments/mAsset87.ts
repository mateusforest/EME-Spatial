/** Lossless transport for the presentation; the original GLBs remain the fallback. */
export async function fetchMAsset87(url:string,init?:RequestInit):Promise<Response>{
 const presentation=typeof location!=='undefined'&&new URLSearchParams(location.search).get('apresentacao')==='1';
 if(!presentation||typeof DecompressionStream==='undefined')return fetch(url,init);
 try{
  const response=await fetch(url+'.gz',init);
  if(response.ok){
   const bytes=await response.arrayBuffer(),header=new Uint8Array(bytes,0,Math.min(bytes.byteLength,2));
   // Some hosts decode Content-Encoding themselves. Never decompress those bytes twice.
   const body=header[0]===31&&header[1]===139?new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')):bytes;
   const decoded=await new Response(body).arrayBuffer();
   if(decoded.byteLength<4||new DataView(decoded).getUint32(0,true)!==0x46546c67)throw new Error('Invalid compressed GLB');
   return new Response(decoded,{headers:{'Content-Type':'model/gltf-binary'}});
  }
 }catch(error){if(init?.signal?.aborted)throw error;}
 return fetch(url,init);
}
