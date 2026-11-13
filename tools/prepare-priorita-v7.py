"""Package the supplied Blender v7 library for instanced browser rendering.

Run with Blender in background; source GLBs are extracted from the user's ZIP.
No render-only meshes are imported. Identical textures/materials are shared.
"""
import bpy, hashlib, json, re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SOURCE=Path(r'C:\Users\EME\Downloads\eme-spatial\tmp\priorita-v7-source')
OUT=ROOT/'public/assets/priorita/production-v7'
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
materials={};images={};report=[]
kinds={'arvore_rua':'tree','arvore_sombra':'shade','arbusto_baixo':'shrub0','forracao':'shrub1','banco_encosto':'bench','poste_rua':'lamp'}
for stem,kind in kinds.items():
 for suffix,level in [('interativa','near'),('distante','far')]:
  before=set(bpy.data.objects)
  bpy.ops.import_scene.gltf(filepath=str(SOURCE/f'{stem}_{suffix}.glb'))
  objects=[o for o in bpy.data.objects if o not in before and o.type=='MESH']
  for obj in objects:
   world=obj.matrix_world.copy();obj.parent=None;obj.matrix_world=world
   bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
   bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
  height=max(v.co.z for o in objects for v in o.data.vertices)
  for obj in objects:
   if kind in ['tree','shade','shrub0','shrub1']:
    for v in obj.data.vertices:v.co/=height
   obj['plant_kind']=kind;obj['detail_level']=level
   obj.name=f'{kind}_{level}_{obj.name}'
   for slot in obj.material_slots:
    mat=slot.material
    for node in mat.node_tree.nodes:
     if node.type=='TEX_IMAGE' and node.image:
      image=node.image
      key=hashlib.sha256(bytes(image.packed_file.data)).hexdigest() if image.packed_file else image.name
      if key in images:node.image=images[key]
      else:images[key]=image
    key=re.sub(r'\.\d{3}$','',mat.name)
    if key in materials:slot.material=materials[key]
    else:materials[key]=mat
   obj.data.calc_loop_triangles()
   report.append({'kind':kind,'level':level,'triangles':len(obj.data.loop_triangles)})
for image in set(images.values()):
 if max(image.size)>1024:image.scale(min(1024,image.size[0]),min(1024,image.size[1]));image.pack()
# Remove empty import roots; mesh transforms have already been applied.
for obj in list(bpy.data.objects):
 if obj.type!='MESH':bpy.data.objects.remove(obj,do_unlink=True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'landscape.glb'),export_format='GLB',export_extras=True,export_image_format='JPEG',export_jpeg_quality=82,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
(OUT/'budget.json').write_text(json.dumps({'source':'Priorita_Blender_v7.zip','blender':bpy.app.version_string,'bytes':(OUT/'landscape.glb').stat().st_size,'textures':len(images),'meshes':report},indent=2))
editable=Path(r'C:\Users\EME\Downloads\eme-spatial\conteudos\priorita\Priorita-biblioteca-web-v7.blend')
bpy.ops.wm.save_as_mainfile(filepath=str(editable))
print('PRIORITA_V7_READY', (OUT/'landscape.glb').stat().st_size, flush=True)
