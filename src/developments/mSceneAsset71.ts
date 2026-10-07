/** Fetch may already decode Content-Encoding: gzip; static hosts may return raw gzip. */
export async function decodeScene71(response:Response){
 if(!response.ok||!response.body)throw new Error('Não foi possível carregar o pavimento 14.');
 const bytes=new Uint8Array(await response.arrayBuffer());
 return bytes[0]===0x1f&&bytes[1]===0x8b
  ?await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).json()
  :JSON.parse(new TextDecoder().decode(bytes));
}
