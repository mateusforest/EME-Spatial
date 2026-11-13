"""Produce a compressed web derivative without changing the source Amici .blend.
Usage: blender -b --python tools/export-amici-web.py -- /path/to/amici_realista_v2.blend
"""
import bpy, bmesh, sys, json, math, hashlib, runpy
import numpy as np
from pathlib import Path
from mathutils import Vector

root=Path(__file__).resolve().parents[1]
source=Path(sys.argv[sys.argv.index('--')+1])
source_hash=hashlib.sha256(source.read_bytes()).hexdigest()
out=root/'public/assets/amici';out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(source))
scene=next(s for s in bpy.data.scenes if s.name.startswith('Amici | Fachada refinada'))
bpy.context.window.scene=scene
runpy.run_path(str(root/'tools/amici-walkable-hall.py'))['add_walkable_hall'](scene)
deps=bpy.context.evaluated_depsgraph_get()
objects=[o for o in scene.objects if o.type in ('MESH','FONT') and not o.hide_render
         and not any(c.hide_render for c in o.users_collection)]
print('AMICI_SOURCE',len(objects),flush=True)

# Replace procedural shader graphs with portable PBR textures; procedural graphs
# themselves do not survive glTF export. Tile dimensions below are in metres.
rng=np.random.default_rng(271113)
def texture(name,color,brick=False):
    n=512
    noise=rng.normal(0,.018,(n,n,1))
    pixels=np.tile(np.array(color[:3])[None,None,:],(n,n,1))
    if brick:
        yy,xx=np.indices((n,n));row=yy//32;shift=(row%2)*64
        col=((xx+shift)%n)//128
        palette=rng.uniform(.78,1.22,(16,4,1))
        pixels*=palette[row,col]
        mortar=(yy%32<2)|((xx+shift)%128<3)
        pixels[mortar]=(.24,.23,.21)
    pixels=np.clip(pixels+noise,0,1)
    # Image pixel assignment is stored as sRGB; material factors are scene-linear.
    # Encode once here so exported facade colours do not become too dark.
    pixels=np.where(pixels<=.0031308,pixels*12.92,1.055*np.power(pixels,1/2.4)-.055)
    rgba=np.concatenate([pixels,np.ones((n,n,1))],axis=2).astype(np.float32)
    img=bpy.data.images.new(name,width=n,height=n,alpha=False)
    img.pixels.foreach_set(rgba.ravel());img.filepath_raw=str(out/(name+'.png'))
    img.file_format='PNG';img.save();return img

materials={m for o in objects for m in o.data.materials if m}
for mat in sorted(materials,key=lambda m:m.name):
    if mat.name.startswith('tree_small'):continue
    nodes,links=mat.node_tree.nodes,mat.node_tree.links
    old=next((n for n in nodes if n.type=='BSDF_PRINCIPLED'),None)
    if old is None:continue
    color=tuple(old.inputs['Base Color'].default_value)
    rough=old.inputs['Roughness'].default_value;metal=old.inputs['Metallic'].default_value
    emit=tuple(old.inputs['Emission Color'].default_value)
    emission=old.inputs['Emission Strength'].default_value
    nodes.clear();bs=nodes.new('ShaderNodeBsdfPrincipled');output=nodes.new('ShaderNodeOutputMaterial')
    links.new(bs.outputs[0],output.inputs[0]);bs.inputs['Base Color'].default_value=color
    bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal
    bs.inputs['Emission Color'].default_value=emit;bs.inputs['Emission Strength'].default_value=min(emission,1.5)
    if 'Vidro' in mat.name or 'vidro' in mat.name:
        # Transparent approximation avoids full-resolution transmission buffers on phones.
        bs.inputs['Base Color'].default_value=(.23,.34,.41,.40)
        bs.inputs['Alpha'].default_value=.40;bs.inputs['Roughness'].default_value=.13
        bs.inputs['Metallic'].default_value=.22;mat.surface_render_method='DITHERED'
    if any(k in mat.name.lower() for k in ('tijolo','reboco','asfalto','pedra','madeira')):
        tx=nodes.new('ShaderNodeTexImage');tx.image=texture('web-'+str(len(bpy.data.images)),color,'tijolo' in mat.name.lower())
        links.new(tx.outputs['Color'],bs.inputs['Base Color'])

# Merge repeated details by material set, leaving the original data intact on disk.
web=bpy.data.scenes.new('Amici | Web');bpy.context.window.scene=web
buckets={};triangles=0;tree_cache={};tree_objects=[]
for index,obj in enumerate(objects):
    evaluated=obj.evaluated_get(deps)
    mesh=bpy.data.meshes.new_from_object(evaluated,preserve_all_data_layers=True,depsgraph=deps)
    if mesh is None or not len(mesh.polygons):continue
    tree=any(m and m.name.startswith('tree_small') for m in mesh.materials)
    if tree:
        if obj.data.name in tree_cache:
            bpy.data.meshes.remove(mesh);mesh=tree_cache[obj.data.name]
        else:tree_cache[obj.data.name]=mesh
    else:mesh.transform(obj.matrix_world)
    portable=bpy.data.objects.new('Web '+obj.name,mesh);web.collection.objects.link(portable)
    # Object material overrides (flower clusters) must become real mesh slots.
    for i,slot in enumerate(obj.material_slots):
        if i<len(mesh.materials) and slot.material:mesh.materials[i]=slot.material
    if tree:
        portable.matrix_world=obj.matrix_world;tree_objects.append(portable)
        continue
    if obj.name.startswith(('Vegetacao','Folhagem irregular','Ramo pendente','Arbusto','Floracao','Buxo','Cipreste | folhagem')):
        bm=bmesh.new();bm.from_mesh(mesh)
        # Preserve complete leaf clusters rather than collapsing individual silhouettes.
        bm.faces.ensure_lookup_table()
        keep_every=3 if obj.name.startswith('Cipreste') else 4
        group_size=1 if obj.name.startswith('Cipreste') else 4
        remove=[f for i,f in enumerate(bm.faces) if (i//group_size)%keep_every!=0]
        bmesh.ops.delete(bm,geom=remove,context='FACES');bm.to_mesh(mesh);bm.free()
    if not tree:
        uv=mesh.uv_layers.active or mesh.uv_layers.new(name='Web metric UV')
        for face in mesh.polygons:
            axis=max(range(3),key=lambda k:abs(face.normal[k]));axes=((1,2),(0,2),(0,1))[axis]
            for li in face.loop_indices:
                co=mesh.vertices[mesh.loops[li].vertex_index].co
                uv.data[li].uv=(co[axes[0]]/1.16,co[axes[1]]/1.36)
    key=(str(obj.get('walkDoor',0)),)+tuple(m.name if m else '' for m in mesh.materials)
    buckets.setdefault(key,[]).append(portable)
    if index%1000==0:print('CONVERT',index,flush=True)

for idx,(key,group) in enumerate(buckets.items()):
    bpy.ops.object.select_all(action='DESELECT')
    for o in group:o.select_set(True)
    bpy.context.view_layer.objects.active=group[0]
    if len(group)>1:bpy.ops.object.join()
    obj=group[0];obj.name='AMICI '+str(idx)+' '+(key[1] if len(key)>1 else 'geometry')
    if key[0]!='0':obj['walkDoor']=int(key[0])
    obj.data.calc_loop_triangles();triangles+=len(obj.data.loop_triangles)
    # Leaves are already individual lightweight geometry; keep their silhouettes.
    for mat in obj.data.materials:
        if mat and any(k in mat.name.lower() for k in ('folha','folhagem','tree_small')):mat.use_backface_culling=False

if tree_objects:
    first=tree_objects[0];first.data=first.data.copy()
    bpy.ops.object.select_all(action='DESELECT');first.select_set(True)
    bpy.context.view_layer.objects.active=first
    modifier=first.modifiers.new('Web foliage LOD','DECIMATE');modifier.ratio=.25
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    for obj in tree_objects[1:]:obj.data=first.data
for obj in tree_objects:
    obj.data.calc_loop_triangles();triangles+=len(obj.data.loop_triangles)
for img in bpy.data.images:
    if img.name.startswith('tree_small') and max(img.size)>512:
        img.scale(512,512)
bpy.ops.object.select_all(action='SELECT')
target=out/'amici-walk-v3.glb'
bpy.ops.export_scene.gltf(filepath=str(target),export_format='GLB',use_selection=True,
    export_animations=False,export_cameras=False,export_lights=False,export_extras=True,
    export_apply=False,export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=6,export_draco_position_quantization=14,
    export_draco_normal_quantization=9,export_draco_texcoord_quantization=12)
report={'source_sha256':source_hash,'objects_before':len(objects),'meshes':len(buckets),
        'triangles':triangles,'bytes':target.stat().st_size,'source_unchanged':source_hash==hashlib.sha256(source.read_bytes()).hexdigest(),
        'building_height_m_estimated':36.21,'source':'Amici reconstruction v2; ZM marketing references',
        'limitations':'Approximate dimensions and external context; not official BIM; no confirmed unit inventory'}
(out/'model-walk-v3.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
assert report['source_unchanged']
print('AMICI_WEB_OK',json.dumps(report),flush=True)
