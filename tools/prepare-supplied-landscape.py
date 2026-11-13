"""Prepare user-supplied vegetation in isolation; preserve published v16 layout."""
import bpy, json, random
from pathlib import Path
from mathutils import Vector, Matrix

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/assets/priorita/production-v18';OUT.mkdir(parents=True,exist_ok=True)
MASTER=ROOT/'output/priorita-v18';MASTER.mkdir(parents=True,exist_ok=True)
report={}

def export(name, objects):
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.ops.export_scene.gltf(filepath=str(OUT/name),export_format='GLB',use_selection=True,export_extras=True)
 report[name]={'bytes':(OUT/name).stat().st_size,'triangles':sum(len(o.data.loop_triangles) for o in objects),'objects':len(objects)}

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath='C:/Users/EME/Downloads/tree_low_poly_lowpoly.glb')
bpy.context.view_layer.update()
sources=[o for o in bpy.context.scene.objects if o.type=='MESH']
# The source contains two complete trees side by side; use one, not the pair.
source=max(sources,key=lambda o:len(o.data.polygons))
mesh=source.data.copy();mesh.transform(source.matrix_world)
low=min(v.co.z for v in mesh.vertices);high=max(v.co.z for v in mesh.vertices)
feet=[v.co for v in mesh.vertices if v.co.z<low+(high-low)*.025]
center=sum(feet,Vector())/len(feet)
mesh.transform(Matrix.Translation(Vector((-center.x,-center.y,-low))))
mesh.transform(Matrix.Scale(1/(high-low),4))
for mat in mesh.materials:
 mat.name='Supplied tree foliage';mat.use_backface_culling=False
 bs=mat.node_tree.nodes.get('Principled BSDF')
 if bs:bs.inputs['Roughness'].default_value=.85
for o in list(bpy.data.objects):bpy.data.objects.remove(o,do_unlink=True)
trees=[]
for level in ['near','far']:
 obj=bpy.data.objects.new('Supplied tree '+level,mesh);bpy.context.collection.objects.link(obj)
 obj['plant_kind']='shade';obj['detail_level']=level;mesh.calc_loop_triangles();trees.append(obj)
export('tree.glb',trees)
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(MASTER/'Arvore-otimizada.blend'))

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath='C:/Users/EME/Downloads/patch_of_grass.glb')
bpy.context.view_layer.update()
blades=[o for o in bpy.context.scene.objects if o.type=='MESH' and any(m and m.name.lower().startswith('grass') for m in o.data.materials)]
# Keep complete blades with their UVs. A small cluster replaces thousands of objects.
rng=random.Random(1804);chosen=rng.sample(blades,min(12,len(blades)));parts=[]
for i,src in enumerate(chosen):
 me=src.data.copy();me.transform(src.matrix_world)
 lo=Vector(tuple(min(v.co[j] for v in me.vertices) for j in range(3)))
 hi=Vector(tuple(max(v.co[j] for v in me.vertices) for j in range(3)))
 center=(lo+hi)/2;me.transform(Matrix.Translation(Vector((-center.x,-center.y,-lo.z))))
 me.transform(Matrix.Scale(.13/max(.001,hi.z-lo.z),4))
 me.transform(Matrix.Translation(Vector((rng.uniform(-.1,.1),rng.uniform(-.1,.1),0))))
 obj=bpy.data.objects.new('Grass blade '+str(i),me);bpy.context.collection.objects.link(obj);parts.append(obj)
for o in list(bpy.data.objects):
 if o not in parts:bpy.data.objects.remove(o,do_unlink=True)
bpy.ops.object.select_all(action='SELECT');bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join()
tuft=bpy.context.object;tuft.name='Supplied grass tuft';tuft.data.calc_loop_triangles()
for mat in tuft.data.materials:
 mat.use_backface_culling=False
 bs=mat.node_tree.nodes.get('Principled BSDF')
 if bs:bs.inputs['Roughness'].default_value=.93
for image in bpy.data.images:
 if image.size[0]>1024 or image.size[1]>1024:
  ratio=1024/max(image.size);image.scale(max(1,int(image.size[0]*ratio)),max(1,int(image.size[1]*ratio)))
export('grass-tuft.glb',[tuft])
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(MASTER/'Grama-otimizada.blend'))
(OUT/'budget.json').write_text(json.dumps(report,indent=2));print(report,flush=True)
