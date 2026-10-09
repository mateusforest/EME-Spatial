"""Collect an explicit, completed project batch; verify provenance before replacing finals."""
import argparse,datetime,hashlib,json,shutil
from pathlib import Path
from PIL import Image

parser=argparse.ArgumentParser()
parser.add_argument('--batch',required=True)
args=parser.parse_args()
project=Path(r'C:\Users\EME\Documents\Codex\RenderNetwork\Projetos\Botanique-Home-Resort')
batch=project/'04-renders'/args.batch
if batch.parent.resolve()!=(project/'04-renders').resolve():raise ValueError('Expected a project batch name')
provenance=json.loads((batch/'provenance.json').read_text('utf-8-sig'))
job=json.loads((batch/'job.json').read_text('utf-8-sig'))
kind='apartamento' if args.batch.startswith('botanique-apartamento-') else 'exterior' if args.batch.startswith('botanique-exterior-') else None
if not kind:raise ValueError('Unknown scene')
expected=provenance['frames']
assert expected and len(expected)==len(set(expected))
assert all(isinstance(frame,int) and 1<=frame<=(5 if kind=='apartamento' else 6) for frame in expected)
sha=lambda path:hashlib.sha256(path.read_bytes()).hexdigest()
assert sha(batch/f'botanique-{kind}.blend').lower()==provenance['sha256'].lower()
pending=[];verified=[]
for frame in expected:
    success=[]
    for report in (batch/'resultados').glob(f'{args.batch}-f{frame:06d}/*/*/result.json'):
        result=json.loads(report.read_text('utf-8-sig'))
        if result.get('status')=='success' and result.get('frame')==frame:success.append((report,result))
    if not success:pending.append(frame);continue
    report,result=max(success,key=lambda pair:pair[0].stat().st_mtime)
    assert result['computer'] in ('DESKTOP-OK7426J','DESKTOP-90MN4DO')
    assert result['engine']=='CYCLES' and result['backend']=='OPTIX'
    assert not result.get('dependencies_missing')
    assert any(d.get('use') and 'RTX 3060' in d.get('name','') and d.get('type')=='OPTIX' for d in result['devices'])
    original=report.parent/f'frame-{frame:06d}.png'
    assert sha(original)==result['sha256']
    with Image.open(original) as im:im.load();assert im.size==(2560,1440)
    verified.append((frame,original,result))
if pending:raise SystemExit('Waiting for verified frames: '+','.join(map(str,pending)))
final=project/'04-renders/finais';final.mkdir(exist_ok=True)
web=Path(__file__).resolve().parents[1]/'public/assets/botanique/renders';web.mkdir(exist_ok=True,parents=True)
records=[]
for frame,original,result in verified:
    target=final/f'botanique-{kind}-{frame:02d}.png';shutil.copy2(original,target);assert sha(target)==result['sha256']
    dest=web/(target.stem+'.webp')
    with Image.open(target) as im:im.convert('RGB').save(dest,'WEBP',quality=92,method=6)
    records.append({'frame':frame,'status':'success','original':str(original),'arquivo':str(target),'sha256':sha(target),'bytes':target.stat().st_size,'dimensoes':[2560,1440],'web':str(dest),'web_url':'/assets/botanique/renders/'+dest.name,'web_bytes':dest.stat().st_size,'web_sha256':sha(dest),'computer':result['computer'],'engine':result['engine'],'backend':result['backend'],'segundos':result['seconds'],'creditos':'EME Spatial - reconstrução demonstrativa; medidas e decoração estimadas.'})
record={'coleta_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'batch':args.batch,'job':job['id'],'blend_sha256':provenance['sha256'],'imagens':records,'completo':True}
(final/(kind+'-manifest.json')).write_text(json.dumps(record,indent=2,ensure_ascii=False),'utf-8')
print(json.dumps({'scene':kind,'frames':len(records),'job':job['id'],'web_bytes':sum(r['web_bytes'] for r in records)}))
