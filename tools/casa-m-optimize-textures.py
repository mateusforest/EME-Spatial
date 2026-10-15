"""Bound embedded GLB textures without changing materials, UVs or geometry."""
import io,json,struct,sys
from pathlib import Path
from PIL import Image

path=Path(sys.argv[1]);data=path.read_bytes();length=struct.unpack_from('<I',data,12)[0]
doc=json.loads(data[20:20+length]);binary=data[28+length:]
images={im['bufferView']:im for im in doc.get('images',[])};output=bytearray();changes=[]
for index,view in enumerate(doc['bufferViews']):
    start=view.get('byteOffset',0);chunk=binary[start:start+view['byteLength']]
    if index in images:
        im=Image.open(io.BytesIO(chunk));size=im.size
        im.thumbnail((1024,1024),Image.Resampling.LANCZOS)
        im=im.convert('RGBA' if 'A' in im.getbands() else 'RGB')
        stream=io.BytesIO();im.save(stream,format='PNG',optimize=True);compressed=stream.getvalue()
        if len(compressed)<len(chunk) or max(size)>1024:
            chunk=compressed;images[index]['mimeType']='image/png';changes.append({'name':images[index].get('name'),'from':size,'to':im.size})
    output.extend(b'\0'*((-len(output))%4));view['byteOffset']=len(output);view['byteLength']=len(chunk);output.extend(chunk)
output.extend(b'\0'*((-len(output))%4));doc['buffers'][0]['byteLength']=len(output)
encoded=json.dumps(doc,separators=(',',':'),ensure_ascii=False).encode();encoded+=b' '*((-len(encoded))%4)
result=struct.pack('<4sII',b'glTF',2,28+len(encoded)+len(output))+struct.pack('<I4s',len(encoded),b'JSON')+encoded+struct.pack('<I4s',len(output),b'BIN\0')+output
path.write_bytes(result)
print(json.dumps({'before':len(data),'after':len(result),'resized':changes}))
