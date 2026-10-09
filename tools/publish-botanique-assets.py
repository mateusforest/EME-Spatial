"""Assemble the public demo manifest from the two actual Blender model contracts."""
import json,struct,math,hashlib
from pathlib import Path
repo=Path(__file__).resolve().parents[1]
project=Path(r'C:\Users\EME\Documents\Codex\RenderNetwork\Projetos\Botanique-Home-Resort')
web=repo/'public/assets/botanique'
material_manifest=web/'materials/manifest.json'
if material_manifest.exists():
    material_data=json.loads(material_manifest.read_text('utf-8'))
    def public_paths(value):
        if isinstance(value,dict):return {k:public_paths(v) for k,v in value.items()}
        if isinstance(value,list):return [public_paths(v) for v in value]
        if isinstance(value,str) and (len(value)>2 and value[1]==':' or value.startswith('\\\\')):return value.replace('\\','/').rsplit('/',1)[-1]
        return value
    cleaned=public_paths(material_data)
    if cleaned!=material_data:
        private=project/'00-referencias/materiais-cc0/materials-manifest-private.json'
        private.parent.mkdir(parents=True,exist_ok=True);private.write_text(json.dumps(material_data,ensure_ascii=False,indent=2),'utf-8')
        material_manifest.write_text(json.dumps(cleaned,ensure_ascii=False,indent=2),'utf-8')
def sanitize_glb(file):
    raw=file.read_bytes();length,typ=struct.unpack_from('<II',raw,12)
    assert raw[:4]==b'glTF' and typ==0x4e4f534a
    doc=json.loads(raw[20:20+length]);changed=False
    for scene in doc.get('scenes',[]):
        extras=scene.get('extras',{})
        if 'botanique_finishes_report' in extras:
            report=json.loads(extras['botanique_finishes_report'])
            if 'asset_dir' in report:
                report.pop('asset_dir');extras['botanique_finishes_report']=json.dumps(report,ensure_ascii=False);changed=True
    if changed:
        data=json.dumps(doc,separators=(',',':'),ensure_ascii=False).encode('utf-8');data+=b' '*((-len(data))%4)
        chunks=struct.pack('<II',len(data),typ)+data+raw[20+length:]
        file.write_bytes(struct.pack('<III',0x46546c67,2,12+len(chunks))+chunks)
for glb in web.glob('*.glb'):sanitize_glb(glb)
def xyz(p):return [round(p[0],4),round(p[2],4),round(-p[1],4)]
def view(id,label,p,t):return {'id':id,'label':label,'position':xyz(p),'target':xyz(t)}
def asset_url(name):
    file=web/name
    return '/assets/botanique/'+name+'?v='+hashlib.sha256(file.read_bytes()).hexdigest()[:12]

def navigation(data):
    nav=data.get('navigation',{});areas=[];obstacles=[];entries=[]
    for surface in nav.get('surfaces',[]):
        areas.append({'id':surface.get('id','floor'),'y':surface.get('height',0),'polygon':[{'x':p[0],'z':-p[1]} for p in surface['polygon']]})
    for path in nav.get('paths',[]):
        points=path['points'];width=path['width']
        for i,(a,b) in enumerate(zip(points,points[1:])):
            dx=b[0]-a[0];dy=b[1]-a[1];length=math.hypot(dx,dy)
            if length<.0001:continue
            nx=-dy/length*width/2;ny=dx/length*width/2
            poly=[[a[0]+nx,a[1]+ny],[b[0]+nx,b[1]+ny],[b[0]-nx,b[1]-ny],[a[0]-nx,a[1]-ny]]
            areas.append({'id':path.get('id','path')+str(i),'y':a[2],'polygon':[{'x':p[0],'z':-p[1]} for p in poly]})
    for collider in nav.get('obstacles',data.get('colliders',[])):
        if 'min' in collider:lo=collider['min'];hi=collider['max']
        else:
            c=collider['center'];d=collider['size'];angle=collider.get('rotation_z',0);dx=abs(math.cos(angle))*d[0]/2+abs(math.sin(angle))*d[1]/2;dy=abs(math.sin(angle))*d[0]/2+abs(math.cos(angle))*d[1]/2
            lo=[c[0]-dx,c[1]-dy,c[2]-d[2]/2];hi=[c[0]+dx,c[1]+dy,c[2]+d[2]/2]
        if hi[2]-lo[2]<.001:continue
        obstacles.append({'id':collider.get('id',collider.get('object','obstacle')),'minX':lo[0],'maxX':hi[0],'minZ':-hi[1],'maxZ':-lo[1],'minY':lo[2],'maxY':hi[2]})
    for entry in nav.get('entries',[]):
        p=list(entry['position']);p[2]+=1.6;entries.append(view(entry['id'],entry['label'],p,entry['target']))
    return ({'areas':areas,'obstacles':obstacles} if areas else None),entries

scenes={}
if (project/'06-web/exterior-metadata.json').exists():
    data=json.loads((project/'06-web/exterior-metadata.json').read_text('utf-8'))
    views=[view(v['id'],v['label'],v['position'],v['target']) for v in data['views']]
    scenes['exterior']={'url':asset_url('exterior.glb'),'camera':{k:views[0][k] for k in ['position','target']},'views':views,'bounds':{'min':[-75,-5,-114],'max':[75,data.get('bounds',{}).get('max',[0,0,62])[2],35]}}
if (project/'06-web/apartamento-metadata.json').exists():
    data=json.loads((project/'06-web/apartamento-metadata.json').read_text('utf-8'))
    views=[view(v['id'],v['label'],v['position'],v['look_at']) for v in data['cameras'] if v.get('projection')!='ORTHO']
    rooms=[view(v['id'],v['label'],v['position'],v.get('look_at',v.get('target'))) for v in data.get('room_cameras',[])] or list(views)
    more=[('bedroom','Segundo dormitório',[2.86,5.10,1.55],[1.35,6.45,1.05]),('hall','Circulação íntima',[3.98,2.38,1.55],[4.75,5.30,1.45]),('bathroom','Banheiro social',[3.09,3.71,1.55],[1.29,4.35,1.1]),('ensuite','Banheiro da suíte',[3.66,1.92,1.58],[4.16,.69,1.04]),('balcony','Sacada com churrasqueira',[6.16,.19,1.56],[6.65,.85,1.26])]
    if not data.get('room_cameras'):rooms.extend([view(*r) for r in more])
    scenes['apartamento']={'url':asset_url('apartamento.glb'),'camera':{k:views[0][k] for k in ['position','target']},'views':views,'rooms':rooms,'bounds':{'min':[0,-.12,-7.8],'max':[7.2,2.85,0]}}
for kind in scenes:
    data=json.loads((project/('06-web/'+kind+'-metadata.json')).read_text('utf-8'))
    nav,entries=navigation(data)
    if nav:scenes[kind]['navigation']=nav
    if entries:scenes[kind]['walkEntries']=entries
    if data.get('furniture_variants'):scenes[kind]['furnitureVariants']=data['furniture_variants']
    if data.get('modeled_lights'):
        scenes[kind]['modeledLights']=[{**f,'position':xyz(f['position']),'target':xyz(f['target'])} for f in data['modeled_lights']]
    if kind=='apartamento' and data.get('estimated_envelope'):
        e=data['estimated_envelope'];scenes[kind]['bounds']={'min':[0,-.12,-e['depth']],'max':[e['width'],e['ceiling']+.13,0]}
# Web viewpoints use tested standing positions, independently of render cameras.
if 'apartamento' in scenes:
    apartment=scenes['apartamento']
    apartment['floorContext']={'id':'terceiro-andar-ilustrativo','label':'3º andar · Final 1','levelsBelow':2,'note':'Exemplo ilustrativo; numeração do andar não confirmada. Planta-tipo recebida, dimensões e entorno estimados.'}
    walk_entries={entry['id']:entry for entry in apartment.get('walkEntries',[])}
    room_targets={
        'living':[5.85,1.27,-5.6],
        'suite':[1.70,1.14,-1.32],
        'ensuite':[4.03,1.14,-.67],
        'balcony':[6.76,1.35,-.70],
    }
    for room in apartment.get('rooms',[]):
        entry=walk_entries.get(room['id'])
        if entry:
            room['position']=list(entry['position'])
            if room['id'] in room_targets:
                room['target']=list(room_targets[room['id']])
                entry['target']=list(room['target'])
    apartment['camera']={'position':[6.45,1.635,-1.35],'target':[5.55,1.30,-6.3]}
    if 'balcony' in walk_entries:
        apartment['views'].append({'id':'balcony-view','label':'Vista da sacada','position':list(walk_entries['balcony']['position']),'target':[1.8,.9,30]})
    for viewpoint in apartment['views']:
        if viewpoint['id']=='living':viewpoint.update(apartment['camera'])
        elif viewpoint['id']=='suite' and 'suite' in walk_entries:
            viewpoint.update({key:list(walk_entries['suite'][key]) for key in ['position','target']})
ref=lambda f,title:{'url':'/assets/botanique/references/'+f+'.webp','title':title,'credit':'BBDR · Material público do empreendimento','kind':'reference'}
images=[
    ref('o01-banner-fachada','Botanique · fachada e acesso'),
    ref('o04-piscina-deck-molhado','Piscina junto à natureza'),
    ref('o07-quiosque-pergolado','Convivência no jardim'),
    ref('o03-planta-pavimento-tipo','Plantas do pavimento · referência de reconstrução'),
    ref('o13-estar-na-mata','Um lugar para viver a mata'),
    ref('o09-salao-festas-estar','Espaços de encontro'),
]
renders=[]
for slug,title in [('botanique-apartamento-01','Estudo EME · estar e jantar'),('botanique-apartamento-02','Estudo EME · estar e sacada'),('botanique-apartamento-03','Estudo EME · suíte'),('botanique-apartamento-05','Estudo EME · churrasqueira da Final 1'),('botanique-exterior-01','Estudo volumétrico EME · torre e implantação'),('botanique-exterior-02','Estudo EME · implantação e natureza'),('botanique-exterior-04','Estudo EME · piscina e convivência'),('botanique-exterior-05','Estudo EME · quadra e quiosque'),('botanique-exterior-07','Estudo EME · salão junto à piscina')]:
    if (web/'renders'/(slug+'.webp')).exists():renders.append({'url':asset_url('renders/'+slug+'.webp'),'title':title,'credit':'EME Spatial · Reconstrução demonstrativa em 3D','kind':'render'})
images=renders+images
manifest={'project':'Botanique Home Resort','version':'demo-06','disclaimer':'Estudo demonstrativo EME Spatial baseado em referências públicas. Dimensões e ambientação estimadas.','scenes':scenes,'images':images}
if (web/'botanique-experiencia.mp4').exists():manifest['video']={'url':asset_url('botanique-experiencia.mp4'),'poster':asset_url('renders/botanique-apartamento-01.webp')}
if (web/'apresentacao-botanique.pdf').exists():manifest['presentation']={'url':'/assets/botanique/apresentacao-botanique.pdf','label':'Baixar apresentação'}
(web/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8',newline='\n')
print(json.dumps({'scenes':list(scenes),'images':len(images),'presentation':'presentation' in manifest}))
