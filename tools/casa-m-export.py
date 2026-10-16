"""Casa M V15 -> reversible, material-baked web copy. Run inside Blender.

Usage: blender -b SOURCE.blend --python tools/casa-m-export.py -- REPO
The source is read-only. Authoring derivatives are written under conteudos/casa-m.
"""
import bpy, bmesh, json, math, time, re, hashlib, sys
from pathlib import Path
from mathutils import Vector

ROOT=Path(sys.argv[sys.argv.index('--')+1]).resolve()
OUT=ROOT/'public/assets/casa-m'; WORK=ROOT/'conteudos/casa-m'
OUT.mkdir(parents=True,exist_ok=True); WORK.mkdir(parents=True,exist_ok=True)
TEX=OUT/'materials'; TEX.mkdir(exist_ok=True)
scene=bpy.context.scene; source=bpy.data.filepath; started=time.time()
def log(*v):print('CASA_M',*v,flush=True)
def bounds(o):
    pts=[o.matrix_world@Vector(v) for v in o.bound_box]
    return [min(p[i] for p in pts) for i in range(3)],[max(p[i] for p in pts) for i in range(3)]
def xyz(v):return [round(v[0],5),round(v[2],5),round(-v[1],5)]
def princ(m):return next((n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None) if m.use_nodes else None

# Bake the original procedural finishes in a small isolated scene. The main scene
# and source textures never participate in these temporary shader bakes.
bake=bpy.data.scenes.new('CM material sampler');bpy.context.window.scene=bake
bake.render.engine='CYCLES';bake.cycles.samples=1;bake.cycles.use_denoising=False
bake.render.threads_mode='FIXED';bake.render.threads=4
plane_mesh=bpy.data.meshes.new('CM texture plane');plane_mesh.from_pydata([(0,0,0),(2,0,0),(2,2,0),(0,2,0)],[],[(0,1,2,3)])
plane=bpy.data.objects.new('CM texture plane',plane_mesh);bake.collection.objects.link(plane)
uv=plane_mesh.uv_layers.new(name='UVMap')
for loop,val in zip(uv.data,[(0,0),(1,0),(1,1),(0,1)]):loop.uv=val
bpy.context.view_layer.objects.active=plane;plane.select_set(True)
families={
 'stone':'Pedra clara V07', 'travertine':'V14 travertino acetinado',
 'walnut':'V14 nogueira marcenaria', 'marble':'V09 pedra verde natural',
 'velvet':'V14 veludo verde profundo', 'linen':'Linho V07',
 'leather':'V09 couro caramelo', 'plaster':'Paredes internas V07',
 'rug':'V09 tapete trama natural','pool-tile':'Piscina | pastilha verde azulado',
 'grass':'Paisagismo esquematico','road':'Via ilustrativa',
}
def family(name):
    n=name.lower()
    if 'nogueira' in n or 'piso madeira' in n:return 'walnut'
    if 'pedra verde' in n:return 'marble'
    if 'pedra clara' in n:return 'stone'
    if 'travertino' in n or 'piso bege' in n:return 'travertine'
    if 'veludo' in n or 'verde oliva' in n:return 'velvet'
    if 'couro caramelo' in n:return 'leather'
    if 'linho' in n:return 'linen'
    if 'pintura areia' in n or 'paredes internas' in n:return 'plaster'
    if 'tapete' in n:return 'rug'
    if 'pastilha' in n:return 'pool-tile'
    if 'paisagismo' in n:return 'grass'
    if 'via ilustrativa' in n:return 'road'
    return None
for key,name in families.items():
    original=bpy.data.materials.get(name)
    if not original:continue
    for mode in ('color','normal'):
        file=TEX/(key+'-'+mode+'.png')
        if file.exists():continue
        mat=original.copy();plane.data.materials.clear();plane.data.materials.append(mat)
        nodes=mat.node_tree.nodes;links=mat.node_tree.links;p=princ(mat)
        if not p:continue
        # Texture coordinates are sampled at the physical 2 m swatch size.
        for node in nodes:
            if node.type=='TEX_COORD':
                for link in list(node.outputs['Generated'].links):
                    links.new(node.outputs['Object'],link.to_socket)
        if mode=='color':
            output=next(n for n in nodes if n.type=='OUTPUT_MATERIAL')
            emit=nodes.new('ShaderNodeEmission');emit.inputs[0].default_value=p.inputs['Base Color'].default_value
            if p.inputs['Base Color'].is_linked:links.new(p.inputs['Base Color'].links[0].from_socket,emit.inputs[0])
            links.new(emit.outputs[0],output.inputs['Surface'])
        size=1024 if key in ('stone','walnut','marble','travertine') else 512
        im=bpy.data.images.new('CM bake '+key,width=size,height=size,alpha=False)
        if mode=='normal':im.colorspace_settings.name='Non-Color'
        node=nodes.new('ShaderNodeTexImage');node.image=im;nodes.active=node
        bpy.ops.object.bake(type='EMIT' if mode=='color' else 'NORMAL',margin=0,use_clear=True)
        im.filepath_raw=str(file);im.file_format='PNG';im.save()
        plane.data.materials.clear();bpy.data.materials.remove(mat);bpy.data.images.remove(im)
    log('baked',key)
bpy.context.window.scene=scene;bpy.data.scenes.remove(bake);bpy.data.objects.remove(plane,do_unlink=True)

# Replace only export-copy procedural shader graphs with glTF-supported PBR.
for m in list(bpy.data.materials):
    key=family(m.name);p=princ(m)
    if key and p:
        rough=float(p.inputs['Roughness'].default_value);metal=float(p.inputs['Metallic'].default_value)
        m.node_tree.nodes.clear();nodes=m.node_tree.nodes;links=m.node_tree.links
        p=nodes.new('ShaderNodeBsdfPrincipled');p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
        out=nodes.new('ShaderNodeOutputMaterial');links.new(p.outputs[0],out.inputs['Surface'])
        for mode in ('color','normal'):
            file=TEX/(key+'-'+mode+'.png')
            if not file.exists():continue
            tex=nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(file),check_existing=True)
            if mode=='color':links.new(tex.outputs['Color'],p.inputs['Base Color'])
            else:
                tex.image.colorspace_settings.name='Non-Color';normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.7
                links.new(tex.outputs['Color'],normal.inputs['Color']);links.new(normal.outputs['Normal'],p.inputs['Normal'])
        m['finish']=key
    elif 'tree_small_02_leaves' in m.name:
        # The native two-sided leaf shader uses a Mix Shader which glTF cannot export.
        images=[n.image for n in m.node_tree.nodes if n.type=='TEX_IMAGE' and n.image]
        diff=next((im for im in images if 'diff' in im.name),None);alpha=next((im for im in images if 'alpha' in im.name),None)
        m.node_tree.nodes.clear();n=m.node_tree.nodes;l=m.node_tree.links;p=n.new('ShaderNodeBsdfPrincipled');p.inputs['Roughness'].default_value=.88
        out=n.new('ShaderNodeOutputMaterial');l.new(p.outputs[0],out.inputs[0])
        for im,slot in [(diff,'Base Color'),(alpha,'Alpha')]:
            if im:
                t=n.new('ShaderNodeTexImage');t.image=im;l.new(t.outputs['Color'],p.inputs[slot])
        m.surface_render_method='DITHERED';m.use_backface_culling=False
    if p and ('vidro' in m.name.lower() or m.name=='Glass'):
        p.inputs['Transmission Weight'].default_value=0;p.inputs['Alpha'].default_value=.12
        p.inputs['Roughness'].default_value=.1;m.surface_render_method='DITHERED';m.use_backface_culling=False
    if p and 'Agua' in m.name:
        p.inputs['Transmission Weight'].default_value=0;p.inputs['Base Color'].default_value=(.04,.24,.21,1)
        p.inputs['Metallic'].default_value=.35;p.inputs['Roughness'].default_value=.14;p.inputs['Alpha'].default_value=.74;m.surface_render_method='DITHERED'

# Bound the decoded texture budget, preserving leaf alpha maps and original UVs.
for image_index,im in enumerate(bpy.data.images):
    if max(im.size)>1024 and im.size[1]>0 and im.type!='RENDER_RESULT':
        scale=min(1,1024/max(im.size));im.scale(max(1,int(im.size[0]*scale)),max(1,int(im.size[1]*scale)))
        im.filepath_raw=str(WORK/('texture-'+str(image_index)+'.png'));im.file_format='PNG';im.save();im.pack()

metadata={'source':'Casa-M-V15-Segundo-Andar.blend','sourceSha256':hashlib.sha256(Path(source).read_bytes()).hexdigest(),'coordinates':'[Blender X, Z, -Y]','cameras':[], 'colliders':[], 'floorFaces':[], 'furniture':{},'lights':[]}
floor_names=('Piso casa','Piso continuo piscina','Deck piscina descoberta','Laje superior com abertura','Varanda posterior piso','Piso apoios patio','Rooftop piso nivel','V13 piso varanda','V13 garagem piso')
structural=('01 Terreo','04 Superior','08A Gourmet alto','09 Piscina inverno','V13 | Fechamento frontal e portoes')
cache={};buckets={};export_objects=[]

def group_for(o):
    item=o.get('item','');room=o.get('ambiente','');nm=o.name
    if room=='03 Sala de estar' and item=='Sofa':return 'sofa'
    if nm.startswith(('V14 mesa oval','V14 mesa pedestal')):return 'dining'
    if room=='04 Jantar' and item=='Cadeira':return 'chairs'
    return ''

originals=list(scene.objects)
for object_index,o in enumerate(originals):
    if object_index%100==0:log('geometry',object_index,'/',len(originals))
    if o.type=='CAMERA':
        pos=o.matrix_world.translation;target=pos+o.matrix_world.to_quaternion()@Vector((0,0,-5))
        metadata['cameras'].append({'name':o.name,'position':xyz(pos),'target':xyz(target)})
    if o.type=='LIGHT' and o.data.type=='AREA':
        metadata['lights'].append({'name':o.name,'position':xyz(o.matrix_world.translation),'power':o.data.energy})
    if o.type not in ('MESH','CURVE') or o.hide_render:continue
    cols=[c.name for c in o.users_collection];lo,hi=bounds(o);name=o.name
    # Collider footprints are kept separately from the optimized visual geometry.
    if o.type=='MESH' and (any(c in structural for c in cols) or ('V13 | Arquitetura reconstruida' in cols and ('vidro' in name.lower() or 'parede' in name.lower()))):
        if hi[2]-lo[2]>.25 and not any(k in name.lower() for k in ('verga','trilho','caixilho','montante','perfil','folha aberta','recolhida','agua')):
            metadata['colliders'].append({'id':name,'lo':lo,'hi':hi,'points':[[round((o.matrix_world@v.co).x,4),round((o.matrix_world@v.co).y,4)] for v in o.data.vertices] if len(o.data.vertices)<60 else [[lo[0],lo[1]],[hi[0],lo[1]],[hi[0],hi[1]],[lo[0],hi[1]]]})
    if o.type=='MESH' and name.startswith(floor_names):
        for p in o.data.polygons:
            normal=o.matrix_world.to_3x3()@p.normal
            if normal.z>.9:
                coords=[o.matrix_world@o.data.vertices[i].co for i in p.vertices]
                metadata['floorFaces'].append({'id':name,'y':round(sum(v.z for v in coords)/len(coords),4),'polygon':[{'x':round(v.x,4),'z':round(-v.y,4)} for v in coords]})
    group=group_for(o)
    if group:metadata['furniture'].setdefault(group,[]).append({'name':name,'lo':lo,'hi':hi})
    vegetation='Vegetacao' in name or any('Vegetacao' in c for c in cols) or any(m and any(plant in m.name for plant in ('tree_small','fern_02','anthurium')) for m in o.data.materials)
    if name.startswith('V13 gramado'):continue # many close blades shimmer at browser scale
    roof=any(k in name.lower() for k in ('cobertura','forro','teto')) and not ('rooftop piso' in name.lower())
    level=2 if roof and lo[2]>6.5 else 1 if lo[2]>=3.70 else 0
    if 'Laje superior com abertura' in name:level=1
    # The source entrance leaf is closed; retain its own mesh for the pivot action.
    door='entry' if name.startswith(('V13 porta pivotante','V13 puxador')) else ''
    if vegetation:level=0
    key=(len(o.data.vertices),tuple(m.name for m in o.data.materials)) if vegetation and o.type=='MESH' else (o.data.as_pointer(),)
    if vegetation and key in cache:
        copy=bpy.data.objects.new(name,cache[key]);scene.collection.objects.link(copy);copy.matrix_world=o.matrix_world.copy();copy['vegetation']=True;export_objects.append(copy);continue
    # Bake bevels once into export geometry; never change the source .blend file.
    for mod in o.modifiers:
        if mod.type=='BEVEL':mod.segments=min(mod.segments,2)
        if mod.type=='SUBSURF':mod.levels=min(mod.levels,1)
    if o.type=='MESH' and not o.modifiers:mesh=o.data.copy()
    else:
        deps=bpy.context.evaluated_depsgraph_get();mesh=bpy.data.meshes.new_from_object(o.evaluated_get(deps),depsgraph=deps)
    copy=bpy.data.objects.new(name,mesh);scene.collection.objects.link(copy);copy.matrix_world=o.matrix_world.copy()
    if vegetation and len(mesh.vertices)>10000:
        # Thin whole disconnected leaf clusters. Edge collapse alone cannot
        # reduce thousands of isolated alpha cards and repeats expensive work.
        if len(mesh.vertices)>100000:
            bm=bmesh.new();bm.from_mesh(mesh);seen=set();remove=[];cluster=0
            for vertex in bm.verts:
                if vertex in seen:continue
                stack=[vertex];seen.add(vertex);component=[]
                while stack:
                    v=stack.pop();component.append(v)
                    for edge in v.link_edges:
                        other=edge.other_vert(v)
                        if other not in seen:seen.add(other);stack.append(other)
                cluster+=1
                if len(component)<500 and (cluster*2654435761)%100>=22:remove.extend(component)
            bmesh.ops.delete(bm,geom=remove,context='VERTS');bm.to_mesh(mesh);bm.free();mesh.update()
            log('leaf clusters thinned',name,len(mesh.vertices))
        bpy.context.view_layer.objects.active=copy
        dec=copy.modifiers.new('Web vegetation LOD','DECIMATE');dec.ratio=min(1,18000/max(1,len(mesh.vertices)));dec.use_collapse_triangulate=True
        bpy.ops.object.modifier_apply(modifier=dec.name);mesh=copy.data;cache[key]=mesh
        copy['vegetation']=True;export_objects.append(copy);log('vegetation',name,len(mesh.vertices));continue
    if vegetation:
        cache[key]=mesh;copy['vegetation']=True;export_objects.append(copy);continue
    # Real metre UVs for baked construction finishes; photographed foliage/car UVs untouched.
    if any(m and family(m.name) for m in mesh.materials):
        mesh.transform(copy.matrix_world);copy.matrix_world.identity()
        uv=mesh.uv_layers.get('CM metres') or mesh.uv_layers.new(name='CM metres');mesh.uv_layers.active=uv;uv.active_render=True
        for p in mesh.polygons:
            axis=max(range(3),key=lambda i:abs(p.normal[i]));axes=((1,2),(0,2),(0,1))[axis]
            for li in p.loop_indices:
                co=mesh.vertices[mesh.loops[li].vertex_index].co;uv.data[li].uv=(co[axes[0]]/2,co[axes[1]]/2)
        for old_uv in list(mesh.uv_layers):
            if old_uv!=uv:mesh.uv_layers.remove(old_uv)
    else:
        mesh.transform(copy.matrix_world);copy.matrix_world.identity()
    copy['level']=level
    if group:copy['furnitureGroup']=group
    if door:copy['door']=door
    # Spatial buckets preserve culling; separate storeys, furniture and entry door.
    key=(level,roof,group,door,int((lo[0]+hi[0])/12),int((lo[1]+hi[1])/12),tuple(m.name if m else '' for m in mesh.materials))
    buckets.setdefault(key,[]).append(copy)

(WORK/'export-metadata.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2),encoding='utf8')
# The source has many dense duplicate plants. Remove the in-memory originals
# before operator joins so Blender does not repeatedly evaluate those copies.
for original in originals:
    if original.type!='CAMERA':bpy.data.objects.remove(original,do_unlink=True)
for index,(key,obs) in enumerate(buckets.items()):
    if index%30==0:log('joining',index,'/',len(buckets))
    bpy.ops.object.select_all(action='DESELECT')
    for o in obs:o.select_set(True)
    bpy.context.view_layer.objects.active=obs[0];bpy.ops.object.join();o=obs[0]
    o.name='CM_'+str(index)+'_'+key[-1][0];o['level']=key[0];o['roof']=key[1]
    if key[2]:o['furnitureGroup']=key[2]
    if key[3]:o['door']=key[3]
    export_objects.append(o)
log('export objects',len(export_objects))
bpy.ops.object.select_all(action='DESELECT')
for o in export_objects:o.select_set(True)
glb=OUT/'casa-m-v1.glb'
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True,export_apply=False,export_animations=False,export_cameras=False,export_lights=False,export_extras=True,export_yup=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,export_draco_position_quantization=14,export_draco_normal_quantization=10)
(WORK/'export-metadata.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2),encoding='utf8')
# Separate editable delivery; source file is not saved over.
keep=set(export_objects)
for o in list(scene.objects):
    if o not in keep and o.type!='CAMERA':bpy.data.objects.remove(o,do_unlink=True)
scene.name='Casa M | V16 Web';bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(WORK/'Casa-M-V16-Web.blend'),compress=True)
(WORK/'export-report.json').write_text(json.dumps({'glbBytes':glb.stat().st_size,'objects':len(export_objects),'source':source,'sha256':metadata['sourceSha256'],'seconds':time.time()-started},indent=2),encoding='utf8')
log('COMPLETE',glb.stat().st_size,round(time.time()-started))
