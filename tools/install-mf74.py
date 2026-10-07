"""Install the local adapter, preserving existing MF files. Does not start or stop processes."""
from pathlib import Path
import argparse, json, shutil, datetime
p=argparse.ArgumentParser();p.add_argument('mf');p.add_argument('--blender',required=True);p.add_argument('--source',required=True);a=p.parse_args()
mf=Path(a.mf).resolve();root=Path(__file__).resolve().parents[1]
assert (mf/'app/server.py').is_file() and Path(a.blender).is_file() and Path(a.source).is_file()
backup=mf/'work'/('spatial74-backup-'+datetime.datetime.now().strftime('%Y%m%d-%H%M%S'));backup.mkdir(parents=True,exist_ok=False)
for file in ('server.py','static/index.html','static/app.js'):
    shutil.copy2(mf/'app'/file,backup/Path(file).name)
shutil.copy2(root/'tools/mf-spatial74.py',mf/'app/spatial74.py');shutil.copy2(root/'tools/mf-spatial74.html',mf/'app/static/spatial74.html')
server=mf/'app/server.py';s=server.read_text(encoding='utf-8')
if 'attach_spatial74(app' not in s:
    s=s.replace("{'edit':req.model_dump()})","{'edit':req.model_dump(),**spatial_edit_metadata(req,records())})",1)
    s+='\nfrom app.spatial74 import attach as attach_spatial74, edit_metadata as spatial_edit_metadata\nattach_spatial74(app,globals())\n'
# Test fixtures can use their own storage; the normal launcher retains all existing paths.
s=s.replace("ROOT = Path(__file__).resolve().parents[1]","ROOT = Path(os.environ.get('MF_STUDIO_ROOT',str(Path(__file__).resolve().parents[1])))")
s=s.replace("def records():\n return json.loads", "def records():\n with LOCK: return json.loads")
s=s.replace("def jobs():\n return sorted", "def jobs():\n with LOCK: return sorted")
s=s.replace('edit_metadata as spatial_edit_metadata','edit_metadata as spatial_edit_metadata, derived_metadata as spatial_derived_metadata') if 'derived_metadata as spatial_derived_metadata' not in s else s
if 'photo_motion_filter as spatial_photo_motion' not in s:
    s=s.replace('derived_metadata as spatial_derived_metadata','derived_metadata as spatial_derived_metadata, photo_motion_filter as spatial_photo_motion')
s=s.replace(" motion: bool=False\n", " motion: bool=False\n movement: Literal['push','pull','left','right']='push'\n") if " movement: Literal[" not in s else s
old='    vf+=f",zoompan=z=\'min(zoom+0.0005,1.10)\':x=\'iw/2-iw/zoom/2\':y=\'ih/2-ih/zoom/2\':d=1:s={req.width}x{req.height}:fps={req.fps}"'
s=s.replace(old,'    vf+=spatial_photo_motion(clip,duration,req)')
s=s.replace("'image',{'edit':req.model_dump()})", "'image',{'edit':req.model_dump(),**spatial_derived_metadata([req.id],req.model_dump(),records(),'image-edit')})")
generation=" return add_media(out,('Interiores · '+(req.interior_style or req.control_mode))"
if 'spatial_derived_metadata([req.reference]' not in s:
    s=s.replace(generation," metadata.update(spatial_derived_metadata([req.reference],req.model_dump(exclude={'mask'}),records(),'ai-variation') if req.reference else {})\n"+generation)
server.write_text(s,encoding='utf-8')
page=mf/'app/static/index.html';s=page.read_text(encoding='utf-8')
if 'href="/spatial"' not in s:s=s.replace('<p class="nav-label">ESTÚDIO</p>','<a class="advanced" href="/spatial">Spatial · Produção Blender ↗</a><p class="nav-label">ESTÚDIO</p>')
page.write_text(s,encoding='utf-8')
js=mf/'app/static/app.js';s=js.read_text(encoding='utf-8')
if 'data-key="movement"' not in s:
    s=s.replace('> Zoom suave</label>', '> Movimento suave</label><select aria-label="Movimento da imagem" data-scene="${i}" data-key="movement">${[["push","Aproximar"],["pull","Afastar"],["left","Deslizar à esquerda"],["right","Deslizar à direita"]].map(([v,n])=>`<option value="${v}" ${(c.movement||"push")===v?"selected":""}>${n}</option>`).join("")}</select>')
    s=s.replace("el.type==='checkbox'?el.checked:+el.value", "el.type==='checkbox'?el.checked:el.dataset.key==='movement'?el.value:+el.value")
js.write_text(s,encoding='utf-8')
(mf/'data/spatial-config.json').write_text(json.dumps({'blender':str(Path(a.blender).resolve()),'source':str(Path(a.source).resolve()),'renderer':str(root/'tools/render-production74.py')},indent=2),encoding='utf-8')
print('Installed. Existing MF library preserved. Restart MF when its queue is idle. Backup:',backup)
