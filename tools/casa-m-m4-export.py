"""CC BY 4.0 M4 presentation derivative: white paint and bounded web geometry."""
import bpy, bmesh, math, json
from pathlib import Path
from mathutils import Vector, Matrix
root=Path(__file__).resolve().parents[1]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(root/'conteudos/casa-m/web-components/bmw-m4-source.glb'))
bpy.context.view_layer.update()
objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
transforms=[(o,o.matrix_world.copy()) for o in objects]
for o,m in transforms:o.parent=None;o.matrix_world=m
for o in list(bpy.context.scene.objects):
    if o.type!='MESH':bpy.data.objects.remove(o,do_unlink=True)
pts=[o.matrix_world@Vector(p) for o in objects for p in o.bound_box]
print('M4_BOUNDS',[(min(p[i] for p in pts),max(p[i] for p in pts)) for i in range(3)],flush=True)
print('M4_MESHES',[(o.name,len(o.data.vertices),[m.name for m in o.data.materials]) for o in objects],flush=True)
for m in bpy.data.materials:
    if not m.use_nodes:continue
    p=next((n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
    if not p:continue
    name=m.name.lower()
    p.inputs['Emission Strength'].default_value=0
    p.inputs['Roughness'].default_value=max(.28,p.inputs['Roughness'].default_value)
    if 'body15' in name or 'livery' in name:
        for link in list(p.inputs['Base Color'].links):m.node_tree.links.remove(link)
        p.inputs['Base Color'].default_value=(.72,.74,.72,1)
        p.inputs['Metallic'].default_value=.3;p.inputs['Roughness'].default_value=.24
        p.inputs['Coat Weight'].default_value=.8;p.inputs['Coat Roughness'].default_value=.16
        m.name='M4 pearl white paint'
    elif 'windows' in name:
        p.inputs['Base Color'].default_value=(.035,.052,.06,1)
        p.inputs['Roughness'].default_value=.12;p.inputs['Metallic'].default_value=.1
        p.inputs['Alpha'].default_value=.72
    elif 'chrome' in name:
        p.inputs['Base Color'].default_value=(.38,.4,.42,1);p.inputs['Metallic'].default_value=.95;p.inputs['Roughness'].default_value=.24
    elif 'black' in name or 'pillar' in name:
        p.inputs['Roughness'].default_value=.65
    elif 'rim' in name:p.inputs['Metallic'].default_value=.8;p.inputs['Roughness'].default_value=.28
    m.name='M4 '+m.name
for o in objects:
    # The source splits vertices per triangle. Weld coincident positions before
    # simplifying; decimating disconnected triangles makes holes in the paint.
    bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001);bm.to_mesh(o.data);bm.free();o.data.update()
    # Body shells sit close together; preserve their shared curves exactly.
    for p in o.data.polygons:p.use_smooth=True
for image in bpy.data.images:
    if image.size[0]>1024 or image.size[1]>1024:
        scale=1024/max(image.size);image.scale(round(image.size[0]*scale),round(image.size[1]*scale))
# Preserve the imported longitudinal axis; normalize to a centred 4.79 metre car.
extent=[max(p[i] for p in pts)-min(p[i] for p in pts) for i in range(3)]
axis=0 if extent[0]>extent[1] else 1
center=Vector(((min(p.x for p in pts)+max(p.x for p in pts))/2,(min(p.y for p in pts)+max(p.y for p in pts))/2,min(p.z for p in pts)))
transform=Matrix.Scale(4.79/extent[axis],4)@Matrix.Rotation(math.pi/2 if axis==0 else 0,4,'Z')@Matrix.Translation(-center)
for o in objects:o.matrix_world=transform@o.matrix_world
bpy.context.scene['license']='BMW M4 Competition M Package by SRT Performance, CC BY 4.0. White paint, texture resize and mesh simplification for Casa M.'
out=root/'public/assets/casa-m/vehicles';out.mkdir(exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(out/'bmw-m4-v5.glb'),export_format='GLB',export_animations=False,export_cameras=False,export_lights=False,export_extras=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
print('M4_EXPORTED',flush=True)
