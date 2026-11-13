"""Export the delivered Apogeu Blender model, with plan-informed site revision.
No geometry from Priorita is copied. Browser coordinates: (Blender X,Z,-Y).
Run Blender --background --python this-file.py.
"""
import bpy, math, json, random, hashlib
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT.parents[1]/'output/apogeu-blender/apogeu_estudo.blend'
OUT=ROOT/'public/assets/apogeu/model-photo-v1'
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
scene=bpy.data.scenes['Apogeu | Estudo arquitetonico'];bpy.context.window.scene=scene
random.seed(131126)
materials={m.name.split(' | ',1)[-1]:m for m in bpy.data.materials if m.name.startswith('APOGEU | ')}
def mat(name):return materials[name]
site=bpy.data.collections['01 | Implantacao e rua | aproximadas']
plants=bpy.data.collections['06 | Paisagismo']
leisure=bpy.data.collections['05 | Garden e lazer | aproximados']
# Site and rear garden were generic in the first study. Replace only these collections.
for c in [site,plants,leisure]:
 for ob in list(c.objects):bpy.data.objects.remove(ob,do_unlink=True)

def box(name,p,size,material,collection):
 x,y,z=[v/2 for v in size]
 verts=[(-x,-y,-z),(x,-y,-z),(x,y,-z),(-x,y,-z),(-x,-y,z),(x,-y,z),(x,y,z),(-x,y,z)]
 faces=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.materials.append(material)
 ob=bpy.data.objects.new(name,mesh);collection.objects.link(ob);ob.location=p;return ob
def line(name,a,b,width,height,material,collection):
 d=Vector(b)-Vector(a);o=box(name,(Vector(a)+Vector(b))/2,(d.length,width,height),material,collection);o.rotation_euler.z=math.atan2(d.y,d.x);return o
# Digitized visual silhouette of p-002, calibrated against estimated building dimensions.
def xy(u,v):return ((v-220)*.049,(730-u)*.069)
outline=[xy(u,v) for u,v in [(60,45),(1040,45),(1040,405),(615,405),(585,790),(405,790),(425,405),(50,395)]]
mesh=bpy.data.meshes.new('Implantacao | silhueta interpretada p-002');mesh.from_pydata([(x,y,.02) for x,y in outline],[],[tuple(range(len(outline)))]);mesh.materials.append(mat('Forracao rasteira'))
ob=bpy.data.objects.new(mesh.name,mesh);site.objects.link(ob)
box('Passeio frontal',(0,-19.8,.04),(28,2.5,.18),mat('Piso mineral claro'),site)
box('Meio fio',(0,-21.05,.08),(28,.14,.22),mat('Concreto mineral'),site)
for x in range(-13,14,2):box('Junta passeio',(x,-19.8,.139),(.013,2.4,.005),mat('Revestimento grafite'),site)
# Main street access and pedestrian route follow the right-hand garden in the plan.
box('Entrada | continuidade passeio',(6.8,-16.0,.10),(2.4,5.2,.15),mat('Piso mineral claro'),site)
box('Percurso lateral para hall',(7.0,-1.0,.10),(1.7,24,.15),mat('Piso mineral claro'),site)
for a,b in zip(outline,outline[1:]+outline[:1]):
 if a[1]<-19 and b[1]<-19:continue
 line('Limite do lote | interpretado',(a[0],a[1],.65),(b[0],b[1],.65),.16,1.3,mat('Revestimento grafite'),site)
# Rear garden, paths, social terrace, fire-pit and benches follow p-002 relationships.
box('Terraco de convivencia',(0,16,.10),(12,12,.15),mat('Piso mineral claro'),leisure)
box('Bosque | gramado',(0,34,.12),(16,23,.18),mat('Forracao rasteira'),leisure)
for j in range(11):
 x=math.sin(j*.65)*1.4;y=22+j*2.1
 o=box('Caminho no bosque',(x,y,.26),(1.6,.9,.1),mat('Piso mineral claro'),leisure);o.rotation_euler.z=math.sin(j)*.2
for x,y in [(-4,30),(5,38),(-4,42)]:
 box('Deck de estar',(x,y,.24),(3.6,3,.18),mat('Piso de madeira'),leisure)
 box('Banco do bosque',(x,y+1,.55),(2.8,.6,.5),mat('Madeira natural | veio procedural'),leisure)
for x in [-3,3]:
 box('Mesa de convivencia',(x,16,.83),(2.4,1.1,.1),mat('Madeira natural | veio procedural'),leisure)
 for y in [14.9,17.1]:box('Banco social',(x,y,.45),(2.5,.45,.5),mat('Madeira natural | veio procedural'),leisure)
# Sports court in the lateral extension, not an invented adjacent green field.
center=xy(505,590);cx,cy=center
court=mat('Forracao rasteira').copy();court.name='APOGEU | Quadra verde';bs=court.node_tree.nodes.get('Principled BSDF')
for l in list(bs.inputs['Base Color'].links):court.node_tree.links.remove(l)
bs.inputs['Base Color'].default_value=(.08,.19,.13,1)
box('Quadra | prolongamento lateral',(cx,cy,.10),(12.0,8.6,.15),court,leisure)
for a,b in [((-5.8,-4), (5.8,-4)),((-5.8,4),(5.8,4)),((-5.8,-4),(-5.8,4)),((5.8,-4),(5.8,4)),((0,-4),(0,4))]:
 line('Quadra | linha',(cx+a[0],cy+a[1],.185),(cx+b[0],cy+b[1],.185),.04,.015,mat('Sinalizacao'),leisure)
box('Acesso secundario | indicativo',(27.6,cy,.1),(3.2,11,.18),mat('Piso mineral claro'),site)
# Keep botanical geometry from the delivered Blender source, with relocated planting.
leaf=bpy.data.meshes.get('Folhagem | folhas geometricas compartilhadas')
def foliage(x,y,z,scale):
 o=bpy.data.objects.new('Vegetacao | implantacao interpretada',leaf);plants.objects.link(o);o.location=(x,y,z);o.scale=scale;o.rotation_euler.z=random.random()*math.tau
for x,y in [(-6,26),(6,29),(-5,35),(6,43),(-6,45),(-6,17),(8,-11),(-5,-17)]:
 box('Arvore | tronco',(x,y,1.65),(.15,.15,3.3),mat('Casca de arvore'),plants)
 for j in range(9):foliage(x+math.cos(j*2.4),y+math.sin(j*2.4),3.2+j%3*.45,(1.05,1.05,1.1))
for j in range(36):foliage(8.3,-16+j*1.3,.45,(.4,.5,.45))
for j in range(23):foliage(-7.8,16+j*1.3,.5,(.5,.6,.5))

# Capture the wall/furniture footprints for bounded first-person navigation.
bpy.context.view_layer.update()
colliders=[]
interior=bpy.data.collections['07 | Interior tipo | interpretacao da planta']
for ob in interior.objects:
 if ob.type!='MESH' or ob.name.startswith(('Piso','Tapete')):continue
 points=[ob.matrix_world@Vector(p) for p in ob.bound_box]
 lo=[min(p[i] for p in points) for i in range(3)];hi=[max(p[i] for p in points) for i in range(3)]
 # Export world coordinates with Blender Y reversed into browser Z.
 colliders.append({'name':ob.name,'min':[lo[0],lo[2],-hi[1]],'max':[hi[0],hi[2],-lo[1]]})
zone_obstacles={'apartment':colliders,'hall':[],'garden':[],'terrace':[]}
for ob in scene.objects:
 if ob.type!='MESH':continue
 zone='garden' if ob.name.startswith(('Arvore | tronco','Banco do bosque','Mesa de convivencia','Banco social')) else 'hall' if ob.name.startswith(('Banco do hall','Painel do hall')) else None
 if not zone:continue
 ps=[ob.matrix_world@Vector(v) for v in ob.bound_box]
 lo=[min(v[i] for v in ps) for i in range(3)];hi=[max(v[i] for v in ps) for i in range(3)]
 zone_obstacles[zone].append({'name':ob.name,'min':[lo[0],lo[2],-hi[1]],'max':[hi[0],hi[2],-lo[1]]})
manifest={'source':'apogeu_estudo.blend','sourceSha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
 'coordinates':'x=Blender X; y=Blender Z; z=-Blender Y','base':3.65,'floorHeight':3.2,'levels':6,'width':11.8,'depth':19.8,
 'siteOutline':[[x,-y] for x,y in outline],'colliders':colliders,'zoneObstacles':zone_obstacles,
 'reference':'https://aporteconstrutora.com.br/ed-apogeu/',
 'siteReference':'planta-002.jpg','siteAccuracy':'Silhueta e distribuicao interpretadas da planta humanizada sem cotas. Entorno externo neutro, nao reconstruido.'}

# Revision remains editable in Blender. Save separately from the original source.
scene['implantacao_revisada']='Interpretacao da planta p-002: extensao lateral, quadra e bosque posterior. Dimensoes ainda estimadas.'
editable=SOURCE.parent/'apogeu_fotoinsercao.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(editable))

# Evaluate modifiers, group by section and material, then merge for lower draw count.
deps=bpy.context.evaluated_depsgraph_get();groups={}
def group_for(ob):
 for c in ob.users_collection:
  if 'Nivel visual' in c.name:return 'floor_'+c.name[:2]
  if c.name.startswith('07 |'):return 'interior'
  if c.name.startswith('04 |'):return 'roof'
  if c.name.startswith('03 |'):return 'structure'
  if c.name.startswith('02 |'):return 'base'
  if c.name.startswith('05 |'):return 'leisure'
  if c.name.startswith('06 |'):return 'landscape'
 return 'site'
export_scene=bpy.data.scenes.new('Apogeu | Web export')
for ob in list(scene.objects):
 if ob.type not in ('MESH','FONT') or ob.hide_render:continue
 evaluated=ob.evaluated_get(deps);mesh=bpy.data.meshes.new_from_object(evaluated,depsgraph=deps)
 if not mesh:continue
 mesh.transform(ob.matrix_world)
 section=group_for(ob)
 # Split material slots when necessary; most architectural meshes have one material.
 for mi,m in enumerate(mesh.materials):
  if not m:continue
  key=(section,m.name);buf=groups.setdefault(key,{'v':[],'f':[],'mat':m})
  polys=[p for p in mesh.polygons if p.material_index==mi]
  if not polys:continue
  used=sorted({i for p in polys for i in p.vertices});lookup={old:len(buf['v'])+j for j,old in enumerate(used)}
  buf['v'].extend(tuple(mesh.vertices[i].co) for i in used);buf['f'].extend(tuple(lookup[i] for i in p.vertices) for p in polys)
 bpy.data.meshes.remove(mesh)

# glTF standard materials. Procedural Blender shaders use matching base palettes
# plus shared metre-scaled texture maps where available; glass stays transparent.
web_materials={}
colors={'Concreto mineral':'A8ABA5','Revestimento grafite':'384541','Madeira natural | veio procedural':'9D774A','Piso de madeira':'AF8B63','Pedra natural':'918773','Piso mineral claro':'BFB9A9','Linho claro':'D4CEBA','Substrato':'3B392A','Forracao rasteira':'64734B','Asfalto':'4A504D','Casca de arvore':'74634C'}
for key,buf in groups.items():
 source_mat=buf['mat'];name=source_mat.name.split(' | ',1)[-1]
 if source_mat.name not in web_materials:
  wm=source_mat.copy();wm.name='WEB | '+name
  bs=wm.node_tree.nodes.get('Principled BSDF')
  for socket in ['Base Color','Normal']:
   for l in list(bs.inputs[socket].links):wm.node_tree.links.remove(l)
  if name in colors:
   h=colors[name];cs=[int(h[i:i+2],16)/255 for i in (0,2,4)];bs.inputs['Base Color'].default_value=tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in cs)+(1,)
  if name=='Vidro incolor':
   bs.inputs['Transmission Weight'].default_value=0;bs.inputs['Alpha'].default_value=.23;bs.inputs['Metallic'].default_value=.12;wm.surface_render_method='DITHERED'
  if name=='Agua da piscina':bs.inputs['Transmission Weight'].default_value=0;bs.inputs['Base Color'].default_value=(.1,.35,.36,1)
  web_materials[source_mat.name]=wm
 mesh=bpy.data.meshes.new(key[0]+'__'+name);mesh.from_pydata(buf['v'],[],buf['f']);mesh.materials.append(web_materials[source_mat.name]);mesh.update()
 obj=bpy.data.objects.new(mesh.name,mesh);obj['section']=key[0];export_scene.collection.objects.link(obj)
 if key[0].startswith('floor_'):obj['floor']=int(key[0].split('_')[1])
 for p in mesh.polygons:p.use_smooth='Folha' in name
bpy.context.window.scene=export_scene
bpy.ops.export_scene.gltf(filepath=str(OUT/'apogeu.glb'),export_format='GLB',use_active_scene=True,export_extras=True,export_cameras=False,export_lights=False,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
manifest.update({'bytes':(OUT/'apogeu.glb').stat().st_size,'meshes':len(export_scene.objects),'blender':bpy.app.version_string,'materials':len(web_materials)})
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print('APOGEU_WEB_READY',manifest['bytes'],manifest['meshes'],flush=True)
