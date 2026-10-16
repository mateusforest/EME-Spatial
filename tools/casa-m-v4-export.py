"""Repair the web derivative; never modify the owner's V15 source."""
import bpy,bmesh,hashlib
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[1]
source=root/'conteudos/casa-m/Casa-M-V16-Web.blend'
assert hashlib.sha256(source.read_bytes()).hexdigest()=='b7269e3adc5e255bcc596da2fc9d937730468e57d3c7b0de5daac3890c6680f7','This repair targets the audited V16 web derivative.'
bpy.ops.wm.open_mainfile(filepath=str(source))
scene=bpy.context.scene
trees=[o for o in scene.objects if o.type=='MESH' and any(m and 'tree_small' in m.name for m in o.data.materials)]
before=set(scene.objects)
bpy.ops.import_scene.gltf(filepath=str(root/'conteudos/casa-m/web-components/tree-v4.glb'))
added=set(scene.objects)-before
parts=[o for o in added if o.type=='MESH']
bpy.ops.object.select_all(action='DESELECT')
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();template=parts[0]
# Meshes exported from the native tree are in the same local coordinates.
template.data.transform(template.matrix_world)
near_data=template.data
for o in trees:o.data=near_data
for o in set(scene.objects)-before:bpy.data.objects.remove(o,do_unlink=True)
before=set(scene.objects)
bpy.ops.import_scene.gltf(filepath=str(root/'conteudos/casa-m/web-components/tree-v4-far.glb'))
far=next(o for o in set(scene.objects)-before if o.type=='MESH');far.data.transform(far.matrix_world)
for o in trees:
    if o.location.y>22 or o.location.x<-3 or o.location.x>31:o.data=far.data
for o in set(scene.objects)-before:bpy.data.objects.remove(o,do_unlink=True)
print('REPLACED_TREES',len(trees),flush=True)

# The source web export used the same concept sports car for both parking bays.
# Remove those complete buckets, including their interior and lamps.
cars=[]
for o in list(scene.objects):
    if o.type!='MESH' or not o.name.startswith('CM_'):continue
    index=int(o.name.split('_')[1])
    if 334<=index<=377:
        points=[o.matrix_world@Vector(v) for v in o.bound_box]
        if all(20.5<p.x<27.2 and 1.5<p.y<6.2 and -.15<p.z<1.2 for p in points):cars.append(o)
for o in cars:bpy.data.objects.remove(o,do_unlink=True)
print('REMOVED_CONCEPT_CAR_PARTS',len(cars),flush=True)

# A closed chamfered shell meets the main house. The rear courtyard stays open.
stone=next(m for m in bpy.data.materials if m.get('finish')=='stone')
removed=0
for o in list(scene.objects):
    if o.type!='MESH' or not any(m and m.get('finish')=='stone' for m in o.data.materials):continue
    bm=bmesh.new();bm.from_mesh(o.data)
    faces=[]
    for f in bm.faces:
        points=[o.matrix_world@v.co for v in f.verts]
        if all(19.18<p.x<28.05 and .08<p.y<8.22 and 2.92<p.z<4.95 for p in points):faces.append(f)
    if faces:
        removed+=len(faces);bmesh.ops.delete(bm,geom=faces,context='FACES');bm.to_mesh(o.data);o.data.update()
    bm.free()
profile=[(.14,3.53),(2.45,4.35),(8.15,4.35),(8.15,4.14),(2.45,4.14),(.14,3.02)]
verts=[(x,y,z) for x in (19.03,27.76) for y,z in profile]
faces=[tuple(reversed(range(6))),tuple(range(6,12))]+[(i,(i+1)%6,(i+1)%6+6,i+6) for i in range(6)]
mesh=bpy.data.meshes.new('Garage closed roof');mesh.from_pydata(verts,[],faces);mesh.materials.append(stone);mesh.update()
bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
roof=bpy.data.objects.new('V4 cobertura contínua garagem',mesh);scene.collection.objects.link(roof);roof['level']=0;roof['roof']=True
uv=mesh.uv_layers.new(name='CM metres')
for p in mesh.polygons:
    axis=max(range(3),key=lambda i:abs(p.normal[i]));axes=((1,2),(0,2),(0,1))[axis]
    for li in p.loop_indices:
        co=mesh.vertices[mesh.loops[li].vertex_index].co;uv.data[li].uv=(co[axes[0]]/2,co[axes[1]]/2)
bevel=roof.modifiers.new('Arestas da pedra','BEVEL');bevel.width=.012;bevel.segments=2
print('REPLACED_ROOF_FACES',removed,flush=True)

before=set(scene.objects)
bpy.ops.import_scene.gltf(filepath=str(root/'conteudos/casa-m/web-components/bmw-x5.glb'))
scene.view_layers[0].update()
added=set(scene.objects)-before
for o in added:
    if o.parent not in added:o.location+=Vector((21.9,3.9,-.23))
    if o.type=='MESH':
        o['vehicle']='BMW X5 (G05)';o['level']=0
        for m in o.data.materials:
            if m:m['vehicle']='BMW X5 (G05)'
bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:
    if o.type=='MESH':o.select_set(True)
out=root/'public/assets/casa-m/casa-m-v4.glb'
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_animations=False,export_cameras=False,export_lights=False,export_extras=True,export_apply=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,export_draco_position_quantization=16,export_draco_normal_quantization=10)
scene.name='Casa M | V17 Web';bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(root/'conteudos/casa-m/Casa-M-V17-Web.blend'),compress=True)
print('COMPLETE_V4',out.stat().st_size,flush=True)
