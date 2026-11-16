"""Build an illustrative low-rise neighborhood in a COPY of the Circular scene.
Blender --background --python tools/build-circular-context.py -- SOURCE OUTPUT WEB_ROOT
"""
import bpy, sys, math, random, json
from pathlib import Path
from mathutils import Vector

source,out,web=map(Path,sys.argv[sys.argv.index('--')+1:])
random.seed(216)
out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(source))
scene=bpy.data.scenes['EME_Circular_Conceito'];bpy.context.window.scene=scene
col=bpy.data.collections['06_Contexto']
for o in list(col.objects): bpy.data.objects.remove(o,do_unlink=True)
objects=[]
def mat(name,color,rough=.8,metal=0):
    m=bpy.data.materials.new('Cidade_'+name);m.diffuse_color=(*color,1);m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1)
    bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal
    return m
asphalt=mat('Asfalto',(.12,.13,.14),.92)
paving=mat('Calcada',(.52,.51,.46),.86)
curb=mat('Meio_fio',(.66,.64,.57))
grass=mat('Jardim',(.18,.26,.10),.98)
soil=mat('Terra',(.09,.065,.04))
white=mat('Sinalizacao',(.82,.80,.68))
bronze=mat('Metal',(.045,.055,.05),.4,.6)
glass=mat('Janelas',(.075,.14,.17),.22,.45)
wood=mat('Madeira',(.25,.14,.07),.6)
walls=[mat('Reboco_'+str(i),c) for i,c in enumerate([(.62,.59,.51),(.49,.52,.49),(.69,.64,.54),(.43,.42,.38)])]
def box(name,xyz,size,material):
    x,y,z=xyz;a,b,c=[v/2 for v in size]
    vs=[(x+i*a,y+j*b,z+k*c) for i,j,k in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
    faces=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
    me=bpy.data.meshes.new(name);me.from_pydata(vs,[],faces);me.materials.append(material)
    uv=me.uv_layers.new()
    for p in me.polygons:
        axis=max(range(3),key=lambda i:abs(p.normal[i])) if p.area else 2
        for li in p.loop_indices:
            v=me.vertices[me.loops[li].vertex_index].co
            uv.data[li].uv=(v.x/3,v.y/3) if p.index<2 else (v.x/3 if p.index in (2,4) else v.y/3,v.z/3)
    ob=bpy.data.objects.new(name,me);col.objects.link(ob);objects.append(ob);return ob
def strip(x,y,w,d):
    box('Via',(x,y,-.19),(w,d,.13),asphalt)
    if w>d:
        for yy in (y-d/2-1.8,y+d/2+1.8):
            for start,end in [(x-w/2,26.4),(41.6,x+w/2)]:
                box('Passeio',((start+end)/2,yy,-.1),(end-start,3.6,.22),paving)
                box('Guia',((start+end)/2,yy+(-1 if yy>y else 1)*1.7,-.015),(end-start,.20,.24),curb)
        for xx in range(round(x-w/2)+3,round(x+w/2)-2,7):
            if abs(xx-34)>7: box('Faixa',(xx,y,-.119),(2.8,.12,.012),white)
    else:
        for xx in (x-w/2-1.8,x+w/2+1.8):
            for start,end in [(y-d/2,-30.6),(-15.4,41.4),(56.6,y+d/2)]:
                box('Passeio',(xx,(start+end)/2,-.1),(3.6,end-start,.22),paving)
                box('Guia',(xx+(-1 if xx>x else 1)*1.7,(start+end)/2,-.015),(.20,end-start,.24),curb)
        for yy in range(round(y-d/2)+3,round(y+d/2)-2,7):
            if all(abs(yy-v)>7 for v in (-23,49)):box('Faixa',(x,yy,-.118),(.12,2.8,.012),white)
strip(0,-23,300,8)
strip(34,28,8,190)
strip(0,49,300,8)
for x in [22,45]:
    for y in [-26,-24.8,-23.6,-22.4,-21.2,-20]:box('Travessia',(x,y,-.106),(3.4,.5,.018),white)
for x in [31,32.2,33.4,34.6,35.8,37]:
    box('Travessia',(x,-11,-.105),(.5,3.4,.018),white)
# A planted forecourt makes the tower belong to an urban parcel.
box('Praca_acesso',(0,-13.1,-.06),(26,7.8,.18),paving)
box('Caminho_lateral',(-13,6,-.06),(3,30,.18),paving)
box('Caminho_lateral',(13,6,-.06),(3,30,.18),paving)
box('Caminho_fundos',(0,22,-.06),(29,3,.18),paving)
for x in [-9,9]:
    box('Canteiro_borda',(x,-13,.16),(5.6,2.6,.40),curb)
    box('Canteiro_terra',(x,-13,.38),(5.25,2.25,.05),soil)
for x in [-17,18]:
    box('Jardim_lateral',(x,5,.0),(4.8,25,.06),grass)
for x in [-10,10]:
    for y in [14,19]:
        box('Banco_assento',(x,y,.46),(2,.52,.12),wood)
        for dx in [-.7,.7]:box('Banco_pe',(x+dx,y,.21),(.1,.4,.42),bronze)
# Contemporary 2–4 floor neighbors, set back and well below the tower.
def building(x,y,w,d,floors,index):
    h=floors*3.0+.6;m=walls[index%len(walls)]
    box('Edificio',(x,y,h/2),(w,d,h),m)
    box('Embasamento',(x,y,.17),(w+.4,d+.4,.34),curb)
    box('Cobertura',(x,y,h+.1),(w+.45,d+.45,.22),curb)
    box('Telhado',(x,y,h+.23),(w-.7,d-.7,.08),bronze)
    for floor in range(floors):
        z=1.8+floor*3
        for sign in [-1,1]:
            yy=y+sign*(d/2+.025)
            for dx in [-.29*w,0,.29*w]:
                box('Janela',(x+dx,yy,z),(w*.18,.07,1.65),glass)
                box('Peitoril',(x+dx,yy+sign*.11,z-.87),(w*.20,.27,.09),curb)
                box('Montante',(x+dx,yy+sign*.05,z),(.055,.08,1.65),bronze)
            if index%3==0:
                box('Sacada',(x,yy+sign*.64,z-.97),(w*.68,1.25,.16),curb)
                box('Parapeito',(x,yy+sign*1.19,z-.38),(w*.68,.09,.95),glass)
        for sign in [-1,1]:
            for dy in [-.26*d,.26*d]:box('Janela_lateral',(x+sign*(w/2+.035),y+dy,z),(.08,d*.23,1.65),glass)
    box('Entrada',(x,y-d/2-.09,1.1),(1.6,.12,2.2),glass)
    box('Marquise',(x,y-d/2-.8,2.5),(3,1.7,.15),bronze)
    box('Lote_passeio',(x,y,-.13),(w+5,d+5,.18),paving)
placements=[(-40,0,12,14,3),(-59,20,14,12,2),(-33,30,11,10,3),(-18,70,16,14,3),(8,73,14,16,2),(57,6,12,16,3),(77,31,17,12,2),(58,70,14,14,3),(-38,-50,15,13,2),(-13,-52,13,11,2),(11,-52,12,13,2),(62,-49,15,13,3)]
for i,p in enumerate(placements):building(*p,i)
for i in range(32):
    a=i*math.tau/32;r=random.uniform(115,175)
    building(math.cos(a)*r,math.sin(a)*r,random.uniform(8,15),random.uniform(8,15),random.choice([1,2,3]),i)
# Lighting columns; emission is a small material accent, no per-pole shadow lights.
lamp=mat('LED',(.9,.77,.53),.4)
bs=lamp.node_tree.nodes.get('Principled BSDF');bs.inputs['Emission Color'].default_value=(1,.8,.48,1);bs.inputs['Emission Strength'].default_value=.4
trees=[]
for x in range(-75,100,13):
    if abs(x-34)<10:continue
    for y in [-16.8,-29.2,42.8,55.2]:
        if y==-16.8 and abs(x)<14:continue
        trees.append([x,y,random.uniform(5.8,7.8),random.random()*math.tau])
        if x%2:
            box('Poste',(x+3,y,3),(.10,.10,6),bronze)
            box('Braco_poste',(x+3,y+.55,5.95),(.10,1.1,.12),bronze)
            box('Luminaria',(x+3,y+1,5.88),(.35,.65,.10),lamp)
for x,y in [(-18,-5),(18,-5),(-18,6),(18,6),(-18,18),(18,18),(-8,27),(6,27),(-50,37),(70,48)]:trees.append([x,y,random.uniform(5.5,7.4),random.random()*math.tau])
for x in [-11,-9,-7,7,9,11]:trees.append([x,-13,1.7,random.random()*math.tau])
# Export architectural context separately so the apartment remains on demand.
bpy.ops.object.select_all(action='DESELECT')
for o in objects:o.select_set(True)
bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();joined=bpy.context.object;joined.name='EME_Contexto_Urbano'
bpy.ops.export_scene.gltf(filepath=str(out/'context-v2.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,export_cameras=False,export_lights=False)
(out/'landscape-v2.json').write_text(json.dumps({'trees':trees,'note':'Contexto urbano demonstrativo, sem localizacao real validada.'}),encoding='utf-8')
# The saved Blender scene also receives the same linked tree used on the web.
before=set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=str(web/'public/assets/priorita/production-v18/tree.glb'))
imported=[o for o in bpy.data.objects if o not in before and o.type=='MESH']
for src in imported:
    for x,y,h,a in trees:
        ob=src.copy();ob.data=src.data;col.objects.link(ob);ob.parent=None;ob.location=(x,y,0);ob.scale=(h,h,h);ob.rotation_euler=(0,0,a)
for o in set(bpy.data.objects)-before:
    if o not in col.objects.values():bpy.data.objects.remove(o,do_unlink=True)
scene['context_status']='Bairro demonstrativo de baixa altura. Nao representa cidade ou vista real.'
bpy.ops.wm.save_as_mainfile(filepath=str(out/'EME_Circular_Contexto_v2.blend'))
print('CONTEXT_REPORT',json.dumps({'bytes':(out/'context-v2.glb').stat().st_size,'trees':len(trees),'triangles':sum(len(p.vertices)-2 for p in joined.data.polygons)}))
