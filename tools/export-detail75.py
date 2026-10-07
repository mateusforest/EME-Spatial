"""Reuse the reviewed Cycles foliage/seams as four small, batched web meshes.
Architecture and configurable furniture stay owned by the synchronized floor.
"""
import bpy, sys, json
from pathlib import Path
args=sys.argv[sys.argv.index('--')+1:]; source=Path(args[0]); output=Path(args[1])
bpy.ops.wm.open_mainfile(filepath=str(source))
collection=bpy.data.collections['M14 | Detalhes de produção 74']
objects=list(collection.objects)
bpy.ops.object.select_all(action='DESELECT')
groups={}
for obj in objects:
    if obj.type=='CURVE': obj.data.bevel_resolution=0;obj.data.resolution_u=1
    obj.select_set(True)
bpy.context.view_layer.objects.active=objects[0]
bpy.ops.object.convert(target='MESH')
for obj in bpy.context.selected_objects:
    name=obj.data.materials[0].name
    groups.setdefault(name,[]).append(obj)
batches=[]
for name,items in groups.items():
    bpy.ops.object.select_all(action='DESELECT')
    for obj in items:obj.select_set(True)
    bpy.context.view_layer.objects.active=items[0]
    bpy.ops.object.join();batch=bpy.context.object;batch.name=name;batch.location.z-=62.5;batches.append(batch)
    # Nodes unsupported by glTF are explicitly represented by a simple PBR base.
    mat=batch.data.materials[0];bs=mat.node_tree.nodes.get('Principled BSDF')
    if 'Folha' in name:
        bs.inputs['Subsurface Weight'].default_value=0
        bs.inputs['Coat Weight'].default_value=0
bpy.ops.object.select_all(action='DESELECT')
for obj in batches:obj.select_set(True)
output.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(output),export_format='GLB',use_selection=True,export_animations=False,export_cameras=False,export_lights=False)
triangles=0
for obj in batches:obj.data.calc_loop_triangles();triangles+=len(obj.data.loop_triangles)
print(json.dumps({'batches':len(batches),'triangles':triangles,'bytes':output.stat().st_size}))
