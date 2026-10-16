"""Replace the assembled X5 without changing the owner's architectural source."""
import bpy
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(root/'conteudos/casa-m/Casa-M-V17-Web.blend'))
scene=bpy.context.scene
for o in list(scene.objects):
    if o.get('vehicle')=='BMW X5 (G05)' or o.name.startswith('CM_333_'):bpy.data.objects.remove(o,do_unlink=True)
before=set(scene.objects)
bpy.ops.import_scene.gltf(filepath=str(root/'conteudos/casa-m/web-components/bmw-x5.glb'))
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
out=root/'public/assets/casa-m/casa-m-v5.glb'
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_animations=False,export_cameras=False,export_lights=False,export_extras=True,export_apply=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,export_draco_position_quantization=16,export_draco_normal_quantization=10)
scene.name='Casa M | V18 Web';bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(root/'conteudos/casa-m/Casa-M-V18-Web.blend'),compress=True)
print('COMPLETE_V5',out.stat().st_size,flush=True)
