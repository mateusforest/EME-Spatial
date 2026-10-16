"""Assemble the BMW-authored X5 glTF parts into one web-ready derivative."""
import bpy, math, json
from pathlib import Path
from mathutils import Vector, Matrix
root=Path(__file__).resolve().parents[1]
src=root/'conteudos/casa-m/bmw-x5-source/G05/meshes'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for file in src.rglob('*.gltf'):
    before=set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(file))
    imported=set(bpy.context.scene.objects)-before
    bpy.context.view_layer.update()
    # Flatten transforms before mirroring doors or placing the four wheel assemblies.
    meshes=[(o,o.matrix_world.copy()) for o in imported if o.type=='MESH']
    for o,matrix in meshes:
        o.parent=None;o.matrix_world=matrix
    for o in imported:
        if o.type!='MESH':bpy.data.objects.remove(o,do_unlink=True)
    if 'Wheels' in file.name:
        for x,z in [(-6.309,84.638),(-6.309,-84.638),(293.30399,84.702),(293.30399,-84.702)]:
            transform=Matrix.Translation((x,-z,.06922))@Matrix.Diagonal((1,1 if z>0 else -1,1,1))
            for o,matrix in meshes:
                copy=o.copy();bpy.context.scene.collection.objects.link(copy);copy.matrix_world=transform@matrix
        for o,_ in meshes:bpy.data.objects.remove(o,do_unlink=True)
    elif 'Doors_' in file.name or 'Seats' in file.name or 'Hood' in file.name:
        for o,matrix in meshes:
            if 'Seats' in file.name and not ('Seat_F' in o.name or 'Seats_F' in o.name):continue
            if 'Hood' in file.name and 'paint' not in o.name.lower():continue
            copy=o.copy();bpy.context.scene.collection.objects.link(copy);copy.matrix_world=Matrix.Diagonal((1,-1,1,1))@matrix
objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
print('X5_BOUNDS',[(o.name, [round(v,2) for v in o.location],len(o.data.vertices)) for o in objects],flush=True)
pts=[o.matrix_world@Vector(p) for o in objects for p in o.bound_box]
print('X5_EXTENT',[(min(p[i] for p in pts),max(p[i] for p in pts)) for i in range(3)],flush=True)
for m in bpy.data.materials:
    if not m.use_nodes:continue
    p=next((n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
    if not p:continue
    n=m.name.lower()
    # The source glTF uses the legacy specular/glossiness extension. Its imported
    # RGB node overrides the Principled default unless that link is disconnected.
    if any(k in n for k in ['paint','glass','lens_clear','tire','general']):
        for link in list(p.inputs['Base Color'].links):m.node_tree.links.remove(link)
    for link in list(p.inputs['Alpha'].links):m.node_tree.links.remove(link)
    p.inputs['Emission Strength'].default_value=0
    if 'paint' in n and 'rim' not in n:
        p.inputs['Base Color'].default_value=(.038,.052,.059,1);p.inputs['Metallic'].default_value=.65;p.inputs['Roughness'].default_value=.26
        p.inputs['Coat Weight'].default_value=.65;p.inputs['Coat Roughness'].default_value=.18
    if 'glass' in n or 'lens_clear' in n:
        p.inputs['Transmission Weight'].default_value=0
        p.inputs['Base Color'].default_value=(.028,.046,.052,1)
        p.inputs['Metallic'].default_value=.25;p.inputs['Roughness'].default_value=.16
        p.inputs['Alpha'].default_value=.72;m.surface_render_method='DITHERED'
    if 'tire' in n:p.inputs['Base Color'].default_value=(.014,.016,.017,1);p.inputs['Metallic'].default_value=0;p.inputs['Roughness'].default_value=.86
    if 'general' in n:p.inputs['Base Color'].default_value=(.032,.028,.023,1);p.inputs['Metallic'].default_value=0;p.inputs['Roughness'].default_value=.8
for o in objects:
    if len(o.data.vertices)>15000:
        if o.data.users>1:o.data=o.data.copy()
        bpy.context.view_layer.objects.active=o;dec=o.modifiers.new('Web LOD','DECIMATE');dec.ratio=.55
        bpy.ops.object.modifier_apply(modifier=dec.name)
    for p in o.data.polygons:p.use_smooth=True
# Metres, +Y up in glTF, facing +Z. Preserve the BMW proportions.
bpy.context.view_layer.update()
pts=[o.matrix_world@Vector(p) for o in objects for p in o.bound_box]
center=(min(p.x for p in pts)+max(p.x for p in pts))/2
bottom=min(p.z for p in pts)
transform=Matrix.Scale(.01,4)@Matrix.Rotation(math.pi/2,4,'Z')@Matrix.Translation((-center,0,-bottom))
for o in objects:o.matrix_world=transform@o.matrix_world
# Merge by material to keep the browser draw calls bounded.
buckets={}
for o in objects:buckets.setdefault(tuple(m.name for m in o.data.materials),[]).append(o)
for group in buckets.values():
    bpy.ops.object.select_all(action='DESELECT')
    for o in group:o.select_set(True)
    bpy.context.view_layer.objects.active=group[0];bpy.ops.object.join()
out=root/'conteudos/casa-m/web-components';out.mkdir(exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(out/'bmw-x5.glb'),export_format='GLB',export_animations=False,export_cameras=False,export_lights=False,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
print('X5_EXPORTED',flush=True)
