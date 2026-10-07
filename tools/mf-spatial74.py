"""Local MF adapter. Installed as app/spatial74.py. No public CORS or arbitrary executable inputs."""
import base64, hashlib, json, shutil, time, uuid
from pathlib import Path
from typing import Literal
from fastapi import HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field, ConfigDict

class RenderRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    schema_version: Literal['eme-spatial-job/1']
    id: str = Field(pattern=r'^[a-zA-Z0-9-]{8,64}$')
    projectId: str = Field(pattern=r'^[a-zA-Z0-9-]{1,80}$')
    projectName: str = Field(min_length=1,max_length=120)
    unit: Literal['m-14']
    sourceSha256: str = Field(pattern=r'^[a-f0-9]{64}$')
    design: dict
    mode: Literal['validation','preview','final']
    validationId: str | None = None

class Review(BaseModel):
    approved: bool

class Link(BaseModel):
    projectId: str = Field(pattern=r'^[a-zA-Z0-9-]{1,80}$')
    projectName: str = Field(min_length=1,max_length=120)

def attach(app, ctx):
    root, data = ctx['ROOT'], ctx['DATA']
    def config():
        p=data/'spatial-config.json'
        if not p.exists(): raise HTTPException(503,'Conexão Blender não configurada neste computador.')
        c=json.loads(p.read_text('utf-8-sig'))
        for k in ('blender','source','renderer'):
            if not Path(c[k]).is_file(): raise HTTPException(503,'Arquivo de produção indisponível: '+k)
        return c
    def fingerprint(path): return hashlib.sha256(path.read_bytes()).hexdigest()
    def pipeline(c):
        renderer=Path(c['renderer'])
        return hashlib.sha256(renderer.read_bytes()+renderer.with_name('refine-production74.py').read_bytes()).hexdigest()
    def spatial(row): return row.get('metadata',{}).get('spatial',{})
    def envelope(rows):
        items=[]; total=0
        for row in rows:
            path=ctx['MEDIA']/row['file']; total+=path.stat().st_size
            if total>80*1024*1024: raise HTTPException(413,'Exporte os arquivos individualmente; pacote acima de 80 MB.')
            mime='image/png' if path.suffix=='.png' else 'image/jpeg' if path.suffix in ('.jpg','.jpeg') else 'image/webp' if path.suffix=='.webp' else 'video/mp4' if path.suffix=='.mp4' else None
            if not mime: raise HTTPException(400,'Converta esta mídia para PNG, JPEG, WebP ou MP4 antes de exportar.')
            items.append({'id':row['id'],'name':row['name'],'kind':row['kind'],'mime':mime,'sha256':fingerprint(path),'data':base64.b64encode(path.read_bytes()).decode(),'createdAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime(row['created'])),'origin':spatial(row)})
        return {'schema':'eme-spatial-library/1','exportedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'items':items}
    @app.get('/spatial')
    def page(): return FileResponse(root/'app/static/spatial74.html')
    @app.get('/api/spatial/status')
    def status():
        c=config(); m=json.loads((Path(c['source']).parent/'manifest.json').read_text('utf-8-sig'))
        return {'ready':True,'unit':'m-14','sourceSha256':m['sourceSha256'],'design':m['approval']['design'],'engines':['Eevee','Cycles'],'connection':'local-file-exchange','imageToVideoAI':False}
    @app.get('/api/spatial/library')
    def library(): return [r for r in ctx['records']() if spatial(r)]
    @app.post('/api/spatial/render')
    def render(req: RenderRequest):
        c=config(); source=Path(c['source']); m=json.loads((source.parent/'manifest.json').read_text('utf-8-sig'))
        if req.sourceSha256!=m['sourceSha256'] or req.design!=m['approval']['design']:
            raise HTTPException(409,'A versão ou os acabamentos diferem do Blender sincronizado. Sincronize a versão salva antes de renderizar.')
        pinned_blend=fingerprint(source);pinned_pipeline=pipeline(c)
        for p in ctx['JOBS'].glob('*.json'):
            j=json.loads(p.read_text('utf-8'))
            if j.get('settings',{}).get('schema_version')=='eme-spatial-job/1' and j['settings'].get('id')==req.id:
                return {'id':j['id'],'existing':True}
        if req.mode=='final':
            approved=next((r for r in ctx['records']() if r['id']==req.validationId),None)
            info=spatial(approved or {})
            if not approved or info.get('mode')!='validation' or not info.get('approvedAt') or info.get('sourceSha256')!=req.sourceSha256 or info.get('design')!=req.design or info.get('projectId')!=req.projectId or info.get('blendSha256')!=fingerprint(source) or info.get('pipelineSha256')!=pipeline(c):
                raise HTTPException(409,'Aprove primeiro a imagem de validação desta versão, na biblioteca local.')
        def work(jid):
            current=json.loads((source.parent/'manifest.json').read_text('utf-8-sig'))
            if fingerprint(source)!=pinned_blend or pipeline(c)!=pinned_pipeline or current['sourceSha256']!=req.sourceSha256 or current['approval']['design']!=req.design:
                raise RuntimeError('A base mudou enquanto o pedido aguardava na fila. Prepare um novo pedido.')
            folder=root/'outputs/spatial'/jid; folder.mkdir(parents=True,exist_ok=False)
            local={'source':str(source),'output':str(folder),'sourceSha256':req.sourceSha256,'mode':req.mode}
            ctx['write_json'](folder/'request.json',local)
            ctx['update_job'](jid,stage='Renderizando no Blender · '+req.mode)
            ctx['run_command']([c['blender'],'--background','--disable-autoexec','--threads','4','--python-exit-code','1','--python',c['renderer'],'--',str(folder/'request.json')],jid)
            report=json.loads((folder/'render-report.json').read_text('utf-8'))
            if report['blendSha256']!=pinned_blend or pipeline(c)!=pinned_pipeline: raise RuntimeError('A versão de produção mudou durante o processamento. Revise e gere um novo pedido.')
            if any(r['kind']=='video' for r in report['results']):
                ctx['update_job'](jid,stage='Montando percurso em MP4')
                ctx['run_command']([ctx['FFMPEG'],'-y','-framerate','24','-i',str(folder/'frames/frame-%04d.png'),'-c:v','libx264','-crf','18','-preset','medium','-pix_fmt','yuv420p','-movflags','+faststart',str(folder/'percurso.mp4')],jid)
            rows=[]
            for r in report['results']:
                src=folder/r['file']; dst=ctx['MEDIA']/(uuid.uuid4().hex+src.suffix); shutil.copy2(src,dst)
                origin={**req.model_dump(),'jobId':jid,'engine':r['engine'],'blendSha256':report['blendSha256'],'pipelineSha256':pinned_pipeline,'approvedAt':None,'status':'review','originType':'blender','view':r.get('view','Percurso lateral contínuo'),'device':report['device']}
                rows.append(ctx['add_media'](dst,req.projectName+' · '+origin['view'],r['kind'],{'spatial':origin}))
            return rows
        return ctx['submit']('spatial-render',req.model_dump(),work)
    @app.post('/api/spatial/media/{mid}/review')
    def review(mid: str, req: Review):
        with ctx['LOCK']:
            rows=ctx['records'](); row=next((r for r in rows if r['id']==mid),None)
            if not row or not spatial(row): raise HTTPException(404,'Mídia Spatial não encontrada.')
            row['metadata']['spatial'].update(approvedAt=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()) if req.approved else None,status='approved' if req.approved else 'review')
            ctx['write_json'](data/'library.json',rows)
        return row
    @app.post('/api/spatial/media/{mid}/link')
    def link(mid: str, req: Link):
        with ctx['LOCK']:
            rows=ctx['records'](); row=next((r for r in rows if r['id']==mid),None)
            if not row or row['kind'] not in ('image','video'): raise HTTPException(404,'Imagem ou vídeo não encontrado.')
            if spatial(row): raise HTTPException(409,'O arquivo já pertence a um projeto. Crie uma nova versão para mudar sua origem.')
            row.setdefault('metadata',{})['spatial']={**req.model_dump(),'originType':'mf-media','status':'review','approvedAt':None,'parents':[],'engine':'MF Video IA','sourceSha256':fingerprint(ctx['MEDIA']/row['file'])}
            ctx['write_json'](data/'library.json',rows)
        return row
    @app.get('/api/spatial/export/{mid}')
    def export(mid: str):
        row,_=ctx['get_media'](mid)
        if not spatial(row): raise HTTPException(400,'Vincule o arquivo a um projeto primeiro.')
        return envelope([row])
    @app.get('/api/spatial/export-job/{jid}')
    def export_job(jid: str):
        rows=[r for r in ctx['records']() if spatial(r).get('jobId')==jid]
        if not rows: raise HTTPException(404,'Ainda não há resultados para esta tarefa.')
        return envelope(rows)

def derived_metadata(parent_ids, settings, records, kind='cinematic-edit'):
    rows={r['id']:r for r in records}; parents=[rows[id] for id in parent_ids if id in rows]
    origins=[r.get('metadata',{}).get('spatial') for r in parents]
    if not origins or any(not o for o in origins) or len({o['projectId'] for o in origins})!=1: return {}
    if len(parents)!=len(parent_ids):return {}
    return {'spatial':{'projectId':origins[0]['projectId'],'projectName':origins[0]['projectName'],'originType':kind,'engine':'FFmpeg' if kind=='cinematic-edit' else 'MF Video IA','parents':[r['id'] for r in parents],'status':'review','approvedAt':None,'id':uuid.uuid4().hex,'sourceSha256':hashlib.sha256(json.dumps(settings,sort_keys=True).encode()).hexdigest()}}

def edit_metadata(req, records):
    return derived_metadata([c.id for c in req.clips],req.model_dump(),records)

def photo_motion_filter(clip, duration, req):
    # Absolute frame time avoids restarting the zoom for each still-image input frame.
    frames=max(1,round(duration*req.fps)-1);p=f'(1-cos(PI*min(on/{frames},1)))/2'
    movement=getattr(clip,'movement','push')
    zoom=f'1+0.08*({p})' if movement=='push' else f'1.08-0.08*({p})' if movement=='pull' else '1.12'
    x=f'(iw-iw/zoom)*(1-({p}))' if movement=='left' else f'(iw-iw/zoom)*({p})' if movement=='right' else 'iw/2-iw/zoom/2'
    scale=2 if req.width<=1920 else 1
    return f",scale={req.width*scale}:{req.height*scale},zoompan=z='{zoom}':x='{x}':y='ih/2-ih/zoom/2':d=1:s={req.width}x{req.height}:fps={req.fps}"
