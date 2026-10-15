"""Build Casa M web navigation from the V15 floors and export audit (ordinary Python)."""
import json,sys,math,shutil
from pathlib import Path
from shapely.geometry import Polygon,MultiPoint,LineString,box
from shapely.ops import unary_union,triangulate
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
SOURCE=Path(sys.argv[1])
WORK=ROOT/'conteudos/casa-m';OUT=ROOT/'public/assets/casa-m'
metadata=json.loads((WORK/'export-metadata.json').read_text('utf8'))
audit=json.loads((WORK/'audit.json').read_text('utf8'))
data=json.loads((SOURCE/'outputs/Entrega-Blender/Pacote/dados/Dados-do-Projeto.json').read_text('utf8'))
areas=[];exclusions=[]
for height in sorted(set(f['y'] for f in metadata['floorFaces'])):
    polys=[Polygon([(p['x'],p['z']) for p in f['polygon']]) for f in metadata['floorFaces'] if f['y']==height]
    shape=unary_union([p.buffer(0) for p in polys])
    if abs(height)<.1:shape=shape.difference(box(8.75,-9.2,11.55,-5))
    for poly in (list(shape.geoms) if hasattr(shape,'geoms') else [shape]):
        if poly.area<.001:continue
        pieces=[t.intersection(poly) for t in triangulate(poly)] if poly.interiors else [poly]
        for p in pieces:
            if p.geom_type!='Polygon' or p.area<.001:continue
            areas.append({'id':'floor-'+str(len(areas)),'y':height,'polygon':[{'x':round(x,4),'z':round(z,4)} for x,z in list(p.exterior.coords)[:-1]]})
def rectarea(id,x0,y0,x1,y1,z,slope=None):
    a={'id':id,'y':z,'rect':{'minX':x0,'maxX':x1,'minZ':-y1,'maxZ':-y0}}
    if slope:a['slope']=slope
    areas.append(a)
rectarea('stair-lower',8.90,5,10.06,8.08,0,{'x':0,'z':-2.01/3.08,'origin':{'x':8.9,'z':-5}})
rectarea('stair-landing',8.90,8.08,11.40,9.11,2.01)
rectarea('stair-upper',10.24,5,11.40,8.08,4.02,{'x':0,'z':2.01/3.08,'origin':{'x':10.24,'z':-5}})
# Site walk is limited to the actual arrival apron and the garage access.
rectarea('arrival',8.91,-4.4,12.31,-1.40,-.45)
rectarea('entry-ramp',8.91,-1.4,12.31,.16,-.45,{'x':0,'z':-.45/1.56,'origin':{'x':8.91,'z':1.4}})
rectarea('entry-landing',8.91,.16,12.31,2.08,0)
rectarea('garage-apron',19.25,-3.5,27.3,.15,-.23)
rectarea('garage-step',21.65,7.62,23.05,8.12,-.115)
rectarea('patio-between-volumes',19.05,8.0,28.95,11.0,0)
# Keep source wall footprints, with height-aware exclusion for the two storeys.
for c in metadata['colliders']:
    p=MultiPoint(c['points']).convex_hull
    if p.geom_type!='Polygon':p=p.buffer(.012,cap_style=2)
    if p.area<.00001:continue
    exclusions.append({'id':c['id'],'minY':round(c['lo'][2],4),'maxY':round(c['hi'][2],4),'polygon':[{'x':round(x,4),'z':round(-y,4)} for x,y in list(p.exterior.coords)[:-1]]})
obstacles=[]
for o in audit['objects']:
    if o['hidden']:continue
    lo,hi=o['bounds'];item=o['props'].get('item');n=o['name'].lower()
    if '08 Gourmet e passagem' in o['collections'] and hi[2]-lo[2]>.25 and any(s in n for s in ('vidro','parede','gourmet frente patio','lavabo patio acesso','tecnico patio acesso')) and not any(s in n for s in ('montante','verga','folha aberta','recolhida','trilho')):
        p=LineString([(lo[0],lo[1]+.008),(hi[0],hi[1]-.008)]).buffer(.009,cap_style=2) if 'diagonal' in n else box(lo[0],lo[1],hi[0],hi[1])
        exclusions.append({'id':o['name'],'minY':lo[2],'maxY':hi[2],'polygon':[{'x':x,'z':-y} for x,y in list(p.exterior.coords)[:-1]]})
    fixed=item in ('Sofa','Poltrona','Cama','Armario','Armario aberto','Bancada com cuba','Vaso sanitario','Estante','Mesa')
    fixed=fixed or any(s in n for s in ('ilha corpo','ilha cascata','mesa oval tampo','mesa centro travertino','marcenaria fundo','geladeira integrada','gaveta cozinha','churrasqueira unica lateral'))
    if fixed and hi[2]-lo[2]>.12 and (hi[0]-lo[0])*(hi[1]-lo[1])>.025:
        # Keep individual cabinet sections: a union of both closet sides would close its aisle.
        obstacles.append({'id':o['name'],'minX':lo[0],'maxX':hi[0],'minZ':-hi[1],'maxZ':-lo[1],'minY':lo[2],'maxY':hi[2]})
obstacles.append({'id':'pool-water','minX':6.5,'maxX':15.6,'minZ':-16.25,'maxZ':-13.35,'minY':-2,'maxY':.10})
obstacles.append({'id':'entry-open-leaf','minX':9.50,'maxX':9.60,'minZ':-3.75,'maxZ':-1.91,'minY':0,'maxY':3.55})
for id,x0,x1,y0,y1,height in [('gourmet-table',21.75,25.05,13.10,14.25,.8),('gourmet-sofa',26.25,28.55,14.60,15.65,1.1),('gourmet-cabinet',24.59,28.4,17.33,18.2,.95)]:
    obstacles.append({'id':id,'minX':x0,'maxX':x1,'minZ':-y1,'maxZ':-y0,'minY':0,'maxY':height})
for vehicle in ('V13 veiculo 1','V13 veiculo 2'):
    parts=[o for o in audit['objects'] if not o['hidden'] and o['name'].startswith(vehicle)]
    lo=[min(o['bounds'][0][i] for o in parts) for i in range(3)];hi=[max(o['bounds'][1][i] for o in parts) for i in range(3)]
    obstacles.append({'id':vehicle,'minX':lo[0],'maxX':hi[0],'minZ':-hi[1],'maxZ':-lo[1],'minY':lo[2],'maxY':hi[2]})
cams={c['name']:c for c in metadata['cameras']}
views=[]
def camera(id,label,level,name=None,pos=None,target=None,walk=True):
    c=cams.get(name,{})
    views.append({'id':id,'label':label,'level':level,'position':pos or c['position'],'target':target or c['target'],'walk':walk})
camera('facade','Fachada','Exterior',pos=[31,9,27],target=[13.5,3.8,-5],walk=False)
camera('aerial','Casa e terreno','Exterior',pos=[-18,30,24],target=[14,1,-8],walk=False)
camera('hall','Entrada e escada','Térreo','V14-01-Escada')
camera('living','Estar','Térreo','V14-02-Estar')
camera('dining','Jantar','Térreo','V14-03-Jantar')
camera('kitchen','Cozinha','Térreo','V14-04-Cozinha')
for id,label,name in [('office','Escritório','02-Escritorio'),('powder','Lavabo','06-Lavabo-social'),('ground-suite','Suíte térrea','07-Suite-terrea'),('ground-bath','Banho térreo','08-Banho-terreo'),('laundry','Lavanderia','09-Lavanderia')]:camera(id,label,'Térreo','V09-'+name)
camera('pool','Piscina de inverno','Lazer',pos=[17.4,1.65,-14.8],target=[7,1,-14.8])
camera('gourmet','Espaço gourmet','Lazer',pos=[21.8,1.65,-12.2],target=[25,1.6,-17.6])
camera('patio','Pátio','Lazer','V09-24-Patio')
camera('garage','Garagem','Exterior',pos=[23,1.42,-.8],target=[23,1,-5])
camera('landing','Hall superior','Superior','V15-21-Hall-superior')
for id,label,name in [('front-suite','Suíte frontal','10-Suite-frontal'),('front-bath','Banho frontal','11-Banho-frontal'),('back-suite','Suíte dos fundos','12-Suite-fundos'),('back-bath','Banho dos fundos','13-Banho-fundos'),('master','Suíte master','14-Suite-master'),('closet','Closet','15-Closet'),('master-bath','Banho master','16-Banho-master'),('family','Sala íntima','17-Sala-intima'),('front-balcony','Varanda frontal','18-Varanda-frontal')]:camera(id,label,'Superior','V09-'+name)
camera('rear-balcony','Varanda posterior','Superior','V15-20-Varanda-fundos')
camera('rooftop','Rooftop','Superior','V09-19-Rooftop')
# Walking starts use eye height, preserving the source camera's sight line.
for v in views:
    if v['walk']:v['position'][1]=5.67 if v['level']=='Superior' else 1.42 if v['id']=='garage' else 1.65
result={'version':1,'model':'/assets/casa-m/casa-m-v1.glb','views':views,'navigation':{'areas':areas,'obstacles':obstacles,'exclusions':exclusions},'source':'Base nativa V15 · dossiê de 15/10/2026','note':'Primeira versão navegável. Medidas do estudo digital; norte geográfico ainda não vinculado. Acabamentos em evolução.','credits':['Arquitetura e estudo Casa M · referências fornecidas pelo proprietário.','CarConcept: Eric Chadwick / Darmstadt Graphics Group GmbH, CC BY 4.0; pintura e posição modificadas. Veículos genéricos. https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept','Vegetação: Poly Haven, CC0. Materiais procedurais da base V15 convertidos para mapas PBR.']}
(OUT/'manifest.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
(OUT/'credits.txt').write_text('\n'.join(result['credits']),encoding='utf8')
Image.open(Path(r'C:\Users\EME\Downloads\casa M')/'Imagem do ChatGPT 12 de out. de 2026, 17_30_36.png').convert('RGB').resize((1440,810)).save(OUT/'reference-cover.webp',quality=88)
print(json.dumps({'views':len(views),'floorAreas':len(areas),'obstacles':len(obstacles),'wallExclusions':len(exclusions)}))
