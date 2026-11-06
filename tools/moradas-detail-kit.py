"""Blender-authored lightweight materials/geometry for the conceptual Moradas model.
Run with Blender --background --python tools/moradas-detail-kit.py.
No survey accuracy is implied. Deterministic seed, no external assets.
"""
import bpy, math, random, json
from pathlib import Path
from mathutils import Vector
random.seed(406)
root=Path(__file__).resolve().parents[1]
out=root/'public/assets/developments/moradas-da-serra/detail-kit'
out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def material(name,color,roughness=.7):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=roughness
 return m
bark=material('Bark',(0.16,.105,.065)); greens=[material('Leaf'+str(i),c,.83) for i,c in enumerate([(.12,.21,.07),(.19,.29,.10),(.25,.34,.13),(.32,.39,.18)])]
stone=material('IvoryStone',(.72,.70,.64),.82)
def box(name,loc,scale,mat,bevel=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
 if bevel:
  mod=o.modifiers.new('Soft manufactured edges','BEVEL');mod.width=bevel;mod.segments=3
  bpy.ops.object.modifier_apply(modifier=mod.name)
  for poly in o.data.polygons:poly.use_smooth=True
  mod=o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL');mod.keep_sharp=True;bpy.ops.object.modifier_apply(modifier=mod.name)
 return o
block=box('ArchitecturalBlock',(0,0,-5),(1,1,1),stone,.012)
tree=bpy.data.objects.new('LandscapeTree',None);bpy.context.collection.objects.link(tree)
def branch(a,b,r1,r2):
 v=Vector(b)-Vector(a);bpy.ops.mesh.primitive_cone_add(vertices=7,radius1=r1,radius2=r2,depth=v.length,location=(Vector(a)+Vector(b))/2);o=bpy.context.object;o.rotation_euler=v.to_track_quat('Z','Y').to_euler();o.data.materials.append(bark);o.parent=tree
 for poly in o.data.polygons:poly.use_smooth=True
branch((0,0,0),(.08,0,3.8),.18,.065)
centers=[]
for i in range(19):
 angle=i*2.399; z=2.2+i*.095;radius=1.1+random.random()*.7;end=(math.cos(angle)*radius,math.sin(angle)*radius,z+.8+random.random()*.7)
 branch((.03,0,z),end,.055,.012);centers.append(end)
verts=[];faces=[];indices=[]
for c in centers:
 for j in range(75):
  pos=Vector(c)+Vector((random.uniform(-.7,.7),random.uniform(-.7,.7),random.uniform(-.5,.6)))
  angle=random.random()*math.tau;length=random.uniform(.12,.24);width=length*.48
  u=Vector((math.cos(angle)*length,math.sin(angle)*length,random.uniform(-.12,.12)));v=Vector((-math.sin(angle)*width,math.cos(angle)*width,.03))
  n=len(verts);verts.extend([pos-u,pos-v,pos+u,pos+v,pos+Vector((0,0,.04))]);faces.extend([(n,n+1,n+4),(n+1,n+2,n+4),(n+2,n+3,n+4),(n+3,n,n+4)]);indices.extend([random.randrange(4)]*4)
mesh=bpy.data.meshes.new('LeafMesh');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('Leaves',mesh);bpy.context.collection.objects.link(o);o.parent=tree
for m in greens:mesh.materials.append(m)
for poly,idx in zip(mesh.polygons,indices):poly.material_index=idx;poly.use_smooth=True
# Join bark pieces, keeping foliage separate: two meshes per tree at runtime.
bpy.ops.object.select_all(action='DESELECT')
for child in tree.children:
 if child!=o:child.select_set(True);bpy.context.view_layer.objects.active=child
bpy.ops.object.join();bpy.context.object.name='Branches'
bpy.ops.object.select_all(action='SELECT')
source=root/'assets-source/moradas';source.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(source/'moradas-detail-kit.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'moradas-detail-kit.glb'),export_format='GLB',export_apply=True,export_yup=True)
report={'blender':bpy.app.version_string,'seed':406,'meshes':len(bpy.data.meshes),'triangles':sum(len(p.vertices)-2 for m in bpy.data.meshes for p in m.polygons),'purpose':'Conceptual architectural edges and original vegetation; not a surveyed project.'}
(out/'build-report.json').write_text(json.dumps(report,indent=2))
print('MORADAS_DETAIL_KIT_READY',report)
