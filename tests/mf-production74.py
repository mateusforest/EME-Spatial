"""Exercise the real adapter and Blender against isolated MF storage, not the user's library."""
import os, sys, json, time, shutil, importlib, hashlib
from pathlib import Path
from fastapi.testclient import TestClient
root=Path(__file__).resolve().parents[1];mf=Path(r'C:\Users\EME\Downloads\MF VIDEO AI');fixture=root/'conteudos/test-mf74'
fixture.mkdir(exist_ok=True);(fixture/'app/static').mkdir(parents=True,exist_ok=True);(fixture/'data').mkdir(exist_ok=True)
shutil.copy2(mf/'data/spatial-config.json',fixture/'data/spatial-config.json');shutil.copy2(root/'tools/mf-spatial74.html',fixture/'app/static/spatial74.html')
os.environ['MF_STUDIO_ROOT']=str(fixture);sys.path.insert(0,str(mf));server=importlib.import_module('app.server');client=TestClient(server.app)
source=json.loads((root/'public/assets/production74-source.json').read_text('utf-8-sig'))
def request(mode,id):return {'schema_version':'eme-spatial-job/1','id':id,'projectId':'m-14','projectName':'Torre M · Apartamento 14','unit':'m-14','sourceSha256':source['sourceSha256'],'design':source['design'],'mode':mode,'validationId':None}
assert client.get('/api/spatial/status').status_code==200
assert client.post('/api/spatial/render',json={**request('validation','test-invalid-path'),'source':'C:/secret.blend'}).status_code==422
assert client.post('/api/spatial/render',json={**request('validation','test-wrong-source'),'sourceSha256':'0'*64}).status_code==409
assert client.post('/api/spatial/render',json={**request('validation','test-wrong-design'),'design':{**source['design'],'wood':2}}).status_code==409
assert client.post('/api/spatial/render',json=request('final','test-unapproved-final')).status_code==409
assert client.post('/api/spatial/render',json=request('validation','test-origin-denied'),headers={'Origin':'https://evil.invalid'}).status_code==403
def render(mode):
    req=request(mode,'integration74-'+mode+'-'+str(int(time.time())))
    response=client.post('/api/spatial/render',json=req);assert response.status_code==200,response.text;jid=response.json()['id']
    assert client.post('/api/spatial/render',json=req).json()['id']==jid
    while True:
        job=next(j for j in client.get('/api/jobs').json() if j['id']==jid)
        if job['status'] not in ('queued','running'):break
        time.sleep(2)
    assert job['status']=='done',job
    package=client.get('/api/spatial/export-job/'+jid);assert package.status_code==200
    (fixture/(mode+'-package.json')).write_text(package.text,encoding='utf-8')
    return jid,job,package.json()
jid,job,package=render('validation');mid=job['result'][0]['id']
assert package['items'][0]['origin']['status']=='review'
# Exercise approval/revocation without ever starting a final production task.
assert client.post('/api/spatial/media/'+mid+'/review',json={'approved':True}).status_code==200
assert client.post('/api/spatial/media/'+mid+'/review',json={'approved':False}).status_code==200
assert client.post('/api/spatial/render',json={**request('final','test-revoked-final'),'validationId':mid}).status_code==409
jid2,job2,pack2=render('preview');assert len(pack2['items'])==4
from types import SimpleNamespace
from app.spatial74 import edit_metadata
metadata=edit_metadata(SimpleNamespace(clips=[SimpleNamespace(id=mid)],model_dump=lambda:{'clips':[mid]}),server.records())
assert metadata['spatial']['parents']==[mid] and metadata['spatial']['approvedAt'] is None
report={'validationJob':jid,'previewJob':jid2,'validationImages':len(package['items']),'previewItems':len(pack2['items']),'checks':['source mismatch blocked','finish mismatch blocked','arbitrary source rejected','unapproved final blocked','cross-origin rejected','idempotent requests','revoked approval blocked','real Cycles validation','real Eevee 3 images and continuous route','provenance after edit'],'isolatedStorage':True}
(root/'reports/production74.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print('MF74_PASS',json.dumps(report),flush=True)
