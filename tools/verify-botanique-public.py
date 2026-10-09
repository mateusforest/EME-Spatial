"""Read-only deployment check: domain artifacts must match the reviewed local files."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.parse import urlsplit
import datetime,hashlib,json

repo=Path(__file__).resolve().parents[1]
public=repo/'public'
base='https://www.emespatial.com'
manifest=json.loads((public/'assets/botanique/manifest.json').read_text('utf-8'))
urls=['/assets/botanique/manifest.json','/assets/botanique/apresentacao-botanique.pdf','/assets/botanique/Botanique-pre-apresentacao.zip']
urls += ['/assets/botanique/brand/'+p.name for p in (public/'assets/botanique/brand').glob('*') if p.is_file()]
if manifest.get('video'):urls.append(manifest['video']['url'])
urls += [scene['url'] for scene in manifest['scenes'].values()]
urls += [image['url'] for image in manifest['images']]
def fetch(url):
    with urlopen(Request(base+url,headers={'Cache-Control':'no-cache','User-Agent':'EME-Spatial-Release-Check/1.0'}),timeout=45) as response:
        return response.status,response.read(),response.headers.get('Content-Type','')
def check_asset(url):
    status,body,mime=fetch(url)
    local=public/urlsplit(url).path.lstrip('/')
    digest=hashlib.sha256(body).hexdigest()
    assert status==200 and digest==hashlib.sha256(local.read_bytes()).hexdigest(),url+' differs from reviewed local artifact'
    return {'url':url,'status':status,'bytes':len(body),'sha256':digest,'content_type':mime}
with ThreadPoolExecutor(max_workers=4) as pool:assets=list(pool.map(check_asset,urls))
pages=[]
for route in ['/apresentar/botanique','/apresentar/botanique?cena=apartamento','/apresentar/m']:
    status,body,mime=fetch(route)
    assert status==200 and b'root' in body and 'text/html' in mime,route
    pages.append({'url':route,'status':status,'bytes':len(body)})
report={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'project':manifest['project'],'version':manifest['version'],'asset_count':len(assets),'assets_identical':True,'assets':assets,'pages':pages}
revision=manifest['version'].removeprefix('demo-').lstrip('0')
out=Path(r'C:\Users\EME\Documents\Codex\RenderNetwork\Projetos\Botanique-Home-Resort\06-web')/('verificacao-publica-v'+revision+'.json')
out.write_text(json.dumps(report,indent=2,ensure_ascii=False),'utf-8')
print(json.dumps({'identical_assets':len(assets),'pages_http_200':len(pages),'version':manifest['version']}))
