"""Download the BMW-authored CC BY 4.0 X5 parts, without executing remote code."""
import json, urllib.request, concurrent.futures
from pathlib import Path

root=Path(__file__).resolve().parents[1]/'conteudos/casa-m/bmw-x5-source'
tree=json.load(urllib.request.urlopen('https://api.github.com/repos/bmwcarit/digital-car-3d/git/trees/master?recursive=1'))
paths=[p['path'] for p in tree['tree'] if p['path'].startswith('G05/meshes/') and p['path'].endswith('.gltf')]
paths+=['LICENSE.txt','README.md']
def download(path):
    dest=root/path; dest.parent.mkdir(parents=True,exist_ok=True)
    url=('https://media.githubusercontent.com/media/' if path.endswith('.gltf') else 'https://raw.githubusercontent.com/')+'bmwcarit/digital-car-3d/master/'+path
    dest.write_bytes(urllib.request.urlopen(url).read())
    return [path,dest.stat().st_size]
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    for result in pool.map(download,paths):print(result,flush=True)
