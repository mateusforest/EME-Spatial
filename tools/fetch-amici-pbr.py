"""Download the recorded CC0 texture sources for reproducible Amici exports.
Usage: python tools/fetch-amici-pbr.py /path/to/model-bundle/recursos/pbr
"""
import json,sys,urllib.request
from pathlib import Path
root=Path(__file__).resolve().parents[1]
destination=Path(sys.argv[1]);destination.mkdir(parents=True,exist_ok=True)
for item in json.loads((root/'public/assets/amici/pbr-sources.json').read_text(encoding='utf-8-sig')):
    path=destination/item['file']
    if not path.exists():urllib.request.urlretrieve(item['url'],path)
    print(item['file'])
