"""Reopen the saved production file and make a lightweight layout verification image, not a final render."""
import bpy,json,math,sys
from pathlib import Path
from mathutils import Vector
out=Path(sys.argv[sys.argv.index('--')+1]) if '--' in sys.argv else Path(__file__).resolve().parents[1]/'conteudos/apartamento14-sincronizado73'
bpy.ops.wm.open_mainfile(filepath=str(out/'EME-M14-pavimento-completo.blend'))
s=bpy.context.scene;m=json.loads((out/'manifest.json').read_text());verified=[]
def factor(socket):
 if not socket.is_linked:return tuple(socket.default_value[:3])
 n=socket.links[0].from_node
 if n.type=='TEX_IMAGE':return (1,1,1)
 if n.type=='MIX' and n.blend_type=='MULTIPLY':
  a,b=factor(n.inputs[6]),factor(n.inputs[7]);return tuple(a[i]*b[i] for i in range(3))
 raise AssertionError(('Unrecognized base-color path',n.type))
def color(material):
 return factor(next(n for n in material.node_tree.nodes if n.type=='BSDF_PRINCIPLED').inputs['Base Color'])
for item in m['meshes']:
 for material in item['materials']:
  if not material.get('color'):continue
  candidates=[x for x in bpy.data.materials if x.name==material['name'] or x.name.startswith(material['name']+'.')]
  assert candidates,material['name']
  assert any(max(abs(color(x)[i]-material['color'][i]) for i in range(3))<.00001 for x in candidates),('Material color',material['name'])
  verified.append(material['name'])
  for x in candidates:x.diffuse_color=(*material['color'],1)
for view in m['views']:
 cam=bpy.data.objects['M14 Camera | '+view['name']];eye=Vector((view['eye'][0],-view['eye'][2],view['eye'][1]));look=Vector((view['look'][0],-view['look'][2],view['look'][1]));forward=cam.matrix_world.to_quaternion()@Vector((0,0,-1));assert forward.dot((look-eye).normalized())>.99999
missing=[i.name for i in bpy.data.images if i.source=='FILE' and not i.packed_file];assert not missing,missing
# Temporary cutaway only for checking the plan; do not save this visibility state.
for obj in s.objects:
 if obj.type=='MESH' and ('M14 preserved ceiling' in obj.name or obj.name.startswith('Reference glazing')):obj.hide_render=True
s.render.engine='BLENDER_WORKBENCH';s.display.shading.light='STUDIO';s.display.shading.color_type='MATERIAL';s.display.shading.show_shadows=True;s.display.shading.show_cavity=True;s.display.shading.cavity_type='BOTH';s.display.shading.background_type='WORLD';s.world.color=(.8,.8,.8)
data=bpy.data.cameras.new('Verification only');cam=bpy.data.objects.new('Verification only',data);s.collection.objects.link(cam);cam.location=(30,-35,96);target=Vector((0,2,63));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();data.type='ORTHO';data.ortho_scale=38;s.camera=cam;s.render.resolution_x=1200;s.render.resolution_y=1000;s.render.resolution_percentage=100;s.render.image_settings.file_format='PNG';s.render.filepath=str(out/'conferencia-pavimento.png');bpy.ops.render.render(write_still=True)
(out/'reopen-verification.json').write_text(json.dumps({'materialsChecked':len(set(verified)),'camerasChecked':len(m['views']),'missingTextures':missing,'savedScenePreserved':True},indent=2));print('REOPEN73_PASS',len(set(verified)),flush=True)
