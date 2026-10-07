"""Real FFmpeg photo movements with inherited Spatial provenance, isolated from user data."""
from pathlib import Path
import os,sys,time,json,av
root=Path(__file__).resolve().parents[1];fixture=root/'conteudos/test-mf74'
os.environ['MF_STUDIO_ROOT']=str(fixture);sys.path.insert(0,r'C:\Users\EME\Downloads\MF VIDEO AI')
from fastapi.testclient import TestClient
from app.server import app
client=TestClient(app);row=next(r for r in client.get('/api/spatial/library').json() if r['kind']=='image')
req={'clips':[{'id':row['id'],'duration':1,'motion':True,'movement':d} for d in ('push','pull','left','right')],'width':640,'height':360,'fps':24,'look':'original','title':'','mute':True}
response=client.post('/api/edit',json=req);assert response.status_code==200,response.text;jid=response.json()['id']
while True:
    job=next(j for j in client.get('/api/jobs').json() if j['id']==jid)
    if job['status'] not in ('queued','running'):break
    time.sleep(.5)
assert job['status']=='done',job
r=job['result'];assert r['metadata']['spatial']['projectId']=='m-14' and r['metadata']['spatial']['approvedAt'] is None
frames=list(av.open(str(fixture/'data/media'/r['file'])).decode(video=0));assert len(frames)==96
for offset in (0,24,48,72):assert frames[offset].to_ndarray().tobytes()!=frames[offset+23].to_ndarray().tobytes()
print('MOTION74_PASS 4 movements, 96 frames, new review state, project and parent provenance',flush=True)
