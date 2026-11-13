"""Export bounded foliage LODs from the existing Poly Haven CC0 production tree."""
import bpy,bmesh,random,json,math
from pathlib import Path
from mathutils import Vector,Matrix
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/assets/priorita/production-v16';OUT.mkdir(parents=True,exist_ok=True)
master=ROOT/'output/priorita-v16';master.mkdir(parents=True,exist_ok=True)
source=Path.home()/'Documents/Codex/RenderNetwork/Projetos/Botanique-Home-Resort/02-modelos/assets/tree_small_02/tree_small_02_1k.blend'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
with bpy.data.libraries.load(str(source),link=False) as (a,b):b.objects=['tree_small_02_LOD1']
original=b.objects[0];original.matrix_world.identity()
ground=min(v.co.z for v in original.data.vertices)
base=[v.co for v in original.data.vertices if v.co.z<ground+.055]
origin=Vector((sum(v.x for v in base)/len(base),sum(v.y for v in base)/len(base),ground))
original.data.transform(Matrix.Translation(-origin))
height=max(v.co.z for v in original.data.vertices)
original.data.transform(Matrix.Scale(1/height,4))
# Use only the shared color/alpha maps; discard costly redundant image nodes.
for mat in original.data.materials:
 images=[n.image for n in mat.node_tree.nodes if n.type=='TEX_IMAGE' and n.image]
 diff=next((i for i in images if 'diff' in i.name),None)
 alpha=next((i for i in images if 'alpha' in i.name),None)
 for im in images:
  name=Path(bpy.path.abspath(im.filepath)).name
  candidate=source.parent/'textures'/name
  if candidate.exists():im.filepath=str(candidate);im.reload()
 if alpha and diff:
  rgba=np.empty(len(diff.pixels),dtype=np.float32);diff.pixels.foreach_get(rgba)
  aa=np.empty(len(alpha.pixels),dtype=np.float32);alpha.pixels.foreach_get(aa)
  rgba[3::4]=aa[0::4]
  merged=bpy.data.images.new('Priorita foliage RGBA',width=diff.size[0],height=diff.size[1],alpha=True)
  merged.pixels.foreach_set(rgba);merged.filepath_raw=str(master/'foliage.png');merged.file_format='PNG';merged.save();diff=merged
 mat.node_tree.nodes.clear();nodes=mat.node_tree.nodes;links=mat.node_tree.links
 p=nodes.new('ShaderNodeBsdfPrincipled');p.inputs['Roughness'].default_value=.84
 out=nodes.new('ShaderNodeOutputMaterial');links.new(p.outputs[0],out.inputs[0])
 if diff:
  t=nodes.new('ShaderNodeTexImage');t.image=diff;links.new(t.outputs['Color'],p.inputs['Base Color'])
  uvnode=nodes.new('ShaderNodeUVMap');uvnode.uv_map='UVMap';links.new(uvnode.outputs['UV'],t.inputs['Vector'])
  if alpha:links.new(t.outputs['Alpha'],p.inputs['Alpha'])
 mat.surface_render_method='DITHERED';mat.use_backface_culling=False
 mat.name='PR16 | Photographic leaves' if alpha else 'PR16 | '+mat.name
report=[]
for level,density,scale,wood_faces in [('near',.10,3.0,1700),('far',.04,5.0,500)]:
 for leaves in [False,True]:
  mesh=original.data.copy();bm=bmesh.new();bm.from_mesh(mesh)
  bmesh.ops.delete(bm,geom=[f for f in bm.faces if (f.material_index==1)!=leaves],context='FACES')
  if leaves:
   rng=random.Random(1601);seen=set();cards=[];uv_layer=bm.loops.layers.uv.active
   for vertex in list(bm.verts):
    if vertex in seen:continue
    stack=[vertex];seen.add(vertex);part=[]
    while stack:
     v=stack.pop();part.append(v)
     for e in v.link_edges:
      q=e.other_vert(v)
      if q not in seen:seen.add(q);stack.append(q)
    if rng.random()>density:continue
    loops=[loop for v in part for loop in v.link_loops]
    if len(loops)<3:continue
    uv=np.array([tuple(loop[uv_layer].uv) for loop in loops]);co=np.array([tuple(loop.vert.co) for loop in loops])
    u0,v0=uv.min(axis=0);u1,v1=uv.max(axis=0)
    if (u1-u0)*(v1-v0)<1e-9:continue
    transform=np.linalg.lstsq(np.column_stack((uv,np.ones(len(uv)))),co,rcond=None)[0]
    corners=[(u0,v0),(u1,v0),(u1,v1),(u0,v1)]
    coords=[Vector(tuple(np.array([u,v,1])@transform)) for u,v in corners]
    center=sum(coords,Vector())/4
    cards.append(([(p-center)*scale+center for p in coords],corners))
   bm.clear()
   for layer in list(bm.loops.layers.uv.values()):bm.loops.layers.uv.remove(layer)
   uv_layer=bm.loops.layers.uv.new('UVMap')
   for coords,uvs in cards:
    face=bm.faces.new([bm.verts.new(co) for co in coords]);face.material_index=1
    for loop,uv in zip(face.loops,uvs):loop[uv_layer].uv=uv
  bm.to_mesh(mesh);bm.free();mesh.update()
  for layer in list(mesh.uv_layers):
   if layer.name!='UVMap':mesh.uv_layers.remove(layer)
  mesh.uv_layers.active_index=0;mesh.uv_layers[0].active_render=True
  obj=bpy.data.objects.new('PR16 '+level+(' foliage' if leaves else ' wood'),mesh);bpy.context.collection.objects.link(obj)
  bpy.context.view_layer.objects.active=obj
  if not leaves:
   modifier=obj.modifiers.new('Web branch budget','DECIMATE');modifier.ratio=wood_faces/max(1,len(mesh.polygons));bpy.ops.object.modifier_apply(modifier=modifier.name)
  for f in obj.data.polygons:f.use_smooth=True
  obj['plant_kind']='tree';obj['detail_level']=level;obj['photographic']=True
  obj.data.calc_loop_triangles();report.append({'level':level,'leaves':leaves,'triangles':len(obj.data.loop_triangles)})
# Store an editable master plus a compact web asset. Original source remains untouched.
bpy.data.objects.remove(original,do_unlink=True)
master=ROOT/'output/priorita-v16';master.mkdir(parents=True,exist_ok=True)
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(master/'Priorita-trees.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'trees.glb'),export_format='GLB',export_image_format='JPEG',export_jpeg_quality=80,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,export_extras=True)
report={'source':'https://polyhaven.com/a/tree_small_02','license':'CC0','credit':'Rico Cilliers / Poly Haven','objects':report,'bytes':(OUT/'trees.glb').stat().st_size}
(OUT/'trees-budget.json').write_text(json.dumps(report,indent=2));print('BUDGET',report,flush=True)
