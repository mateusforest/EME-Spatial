"""Reproducible delivery compression; preserves the original asset and image sources."""
import base64,gzip,hashlib,io,json
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1];j=json.loads((root/'conteudos/optimization72/geometry.json').read_text(encoding='utf-8'))
out=root/'public/assets/m/apartment72';out.mkdir(parents=True,exist_ok=True)
for m in j['materials']:
 if m.get('metalness',0)==0:m.pop('metalnessMap',None)
refs={v for m in j['materials'] for v in m.values() if isinstance(v,str)}
j['textures']=[t for t in j['textures'] if t['uuid'] in refs];image_refs={t['image'] for t in j['textures']};j['images']=[i for i in j['images'] if i['uuid'] in image_refs]
manifest={'source':'apartment71/floor14.json.gz','sourceSha256':hashlib.sha256((root/'public/assets/m/apartment71/floor14.json.gz').read_bytes()).hexdigest(),'images':[],'lodCount':len(j['lods72'])}
for im in j['images']:
 url=im['url'];raw=base64.b64decode(url.split(',')[1]) if url.startswith('data:') else (root/('public'+url)).read_bytes();pic=Image.open(io.BytesIO(raw));key=hashlib.sha256(raw).hexdigest()[:14];orig=url.removeprefix('/assets/m/materials/') if not url.startswith('data:') else None
 slots=[k for m in j['materials'] for k,v in m.items() if isinstance(v,str) and any(t['uuid']==v and t['image']==im['uuid'] for t in j['textures'])];data_map=any(k in ['normalMap','roughnessMap'] for k in slots)
 variants={};dims={}
 for tier in ['light','detail']:
  cap=(512 if data_map else 1024) if tier=='light' else (1024 if data_map else 2048)
  p=pic.copy();p.thumbnail((cap,cap),Image.Resampling.LANCZOS)
  if p.mode=='RGBA' and p.getextrema()[3]==(255,255):p=p.convert('RGB')
  filename=f'{key}-{tier}.webp';p.save(out/filename,'WEBP',lossless=data_map,quality=93,method=6);variants[tier]='/assets/m/apartment72/'+filename;dims[tier]=list(p.size)
 im['url']=variants['detail']
 for t in j['textures']:
  if t['image']==im['uuid']:t.setdefault('userData',{}).update({'file72':orig,'profiles72':variants,'source72':im['uuid']})
 manifest['images'].append({'source':orig or 'embedded-'+key,'uuid':im['uuid'],'originalSize':list(pic.size),'sizes':dims,'urls':variants,'bytes':{t:(out/Path(u).name).stat().st_size for t,u in variants.items()}})
blob=gzip.compress(json.dumps(j,separators=(',',':')).encode(),compresslevel=9,mtime=0);(out/'floor14.json.gz').write_bytes(blob);manifest['sceneBytes']=len(blob);manifest['sceneSha256']=hashlib.sha256(blob).hexdigest();(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print(json.dumps({'sceneBytes':len(blob),'textures':len(j['textures']),'images':len(j['images']),'imageBytes':{t:sum(i['bytes'][t] for i in manifest['images']) for t in ['light','detail']}}))
