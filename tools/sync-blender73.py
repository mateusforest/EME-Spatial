"""Import the exact current web floor; never opens or replaces the retired apartment study.
blender --background --threads 4 --python tools/sync-blender73.py -- [production directory]
"""
import bpy,json,sys,math,hashlib
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[1]
out=Path(sys.argv[sys.argv.index('--')+1]) if '--' in sys.argv else root/'conteudos/apartamento14-sincronizado73'
manifest=json.loads((out/'manifest.json').read_text(encoding='utf-8-sig'))
assert hashlib.sha256((out/'M14-pavimento-aprovado.glb').read_bytes()).hexdigest()==manifest['glbSha256']
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(out/'M14-pavimento-aprovado.glb'),import_pack_images=True)
s=bpy.context.scene;s.name='M14 | Pavimento completo sincronizado 73';s.unit_settings.system='METRIC';s.unit_settings.scale_length=1
# glTF Y-up -> Blender Z-up. Keep source coordinates and stable sync73 identifiers.
def xyz(p):return Vector((p[0],-p[2],p[1]))
s['spatial_unit']='m-14';s['source_revision']=72;s['source_sha256']=manifest['sourceSha256'];s['approved_design']=json.dumps(manifest['approval']);s['sync_mode']='Explicit saved version import; not live two-way sync'
collection=bpy.data.collections.new('M14 | Luz de produção');s.collection.children.link(collection)
for i,item in enumerate(manifest['lights']):
 data=bpy.data.lights.new('M14 | '+item['kind']+' '+str(i),'AREA' if item['kind']=='area' else 'SUN');obj=bpy.data.objects.new(data.name,data);collection.objects.link(obj);obj.location=xyz(item['position']);data.color=item['color'];obj['web_intensity']=item['intensity']
 if item['kind']=='area':
  data.shape='RECTANGLE';data.size=item['width'];data.size_y=item['height'];data.energy=120;obj.rotation_euler=(0,0,0)
 else:
  obj.rotation_euler=(xyz(item['target'])-obj.location).to_track_quat('-Z','Y').to_euler();data.energy=item['intensity'];data.angle=math.radians(3)
world=bpy.data.worlds.new('M14 | Céu de produção');world.use_nodes=True;s.world=world;nodes=world.node_tree.nodes;sky=nodes.new('ShaderNodeTexSky');sky.sky_type='NISHITA';sky.sun_elevation=math.radians(55);sky.sun_rotation=math.radians(42);nodes.get('Background').inputs['Strength'].default_value=.18;world.node_tree.links.new(sky.outputs['Color'],nodes.get('Background').inputs['Color'])
# Materials/textures are imported from the actual approved web scene. Glass gets physical transmission.
for m in bpy.data.materials:
 if m.name.startswith('Reference glazing') and m.use_nodes:
  for n in m.node_tree.nodes:
   if n.type=='BSDF_PRINCIPLED':
    n.inputs['Transmission Weight'].default_value=1;n.inputs['IOR'].default_value=1.45;n.inputs['Roughness'].default_value=.09;n.inputs['Alpha'].default_value=1
  m['web_glass_conversion']='Physical transmission for Cycles; web alpha/Fresnel approximation retained in source GLB'
# The same nine complete-floor walkthrough viewpoints, with unchanged transforms.
cameras=[o for o in s.objects if o.type=='CAMERA'];assert len(cameras)==len(manifest['views']),(len(cameras),len(manifest['views']))
s.camera=next(o for o in cameras if o.name=='M14 Camera | Living')
s.render.engine='CYCLES';s.cycles.samples=128;s.cycles.use_denoising=True;s.cycles.device='CPU';s.render.threads_mode='FIXED';s.render.threads=4
s.render.resolution_x=1920;s.render.resolution_y=1080;s.render.resolution_percentage=100;s.view_settings.view_transform='AgX'
# Validate evaluated geometry, including every instanced chair/plant against the exported manifest.
expected={m['id']:m for m in manifest['meshes']};actual={};unmapped=[]
for instance in bpy.context.evaluated_depsgraph_get().object_instances:
 obj=instance.object
 if obj.type!='MESH':continue
 original=obj.original;node=original;sync=None
 while node:
  if node.get('sync73'):sync=node.get('sync73');break
  node=node.parent
 if not sync and instance.parent:
  node=instance.parent.original
  while node:
   if node.get('sync73'):sync=node.get('sync73');break
   node=node.parent
 if sync not in expected:unmapped.append(original.name);continue
 mesh=obj.to_mesh();mesh.calc_loop_triangles();entry=actual.setdefault(sync,{'triangles':0,'surfaceArea':0,'min':[float('inf')]*3,'max':[-float('inf')]*3,'objects':[]});entry['triangles']+=len(mesh.loop_triangles);entry['objects'].append(original.name)
 for tri in mesh.loop_triangles:
  a,b,c=[instance.matrix_world@mesh.vertices[i].co for i in tri.vertices];entry['surfaceArea']+=(b-a).cross(c-a).length/2
 for v in mesh.vertices:
  p=instance.matrix_world@v.co
  for k in range(3):entry['min'][k]=min(entry['min'][k],p[k]);entry['max'][k]=max(entry['max'][k],p[k])
 obj.to_mesh_clear()
checks=[]
for uid,m in expected.items():
 a=actual.get(uid);assert a,('Missing source object',m['name'])
 lo=[m['min'][0],-m['max'][2],m['min'][1]];hi=[m['max'][0],-m['min'][2],m['max'][1]]
 error=max(abs(a[k][i]-v[i]) for k,v in [('min',lo),('max',hi)] for i in range(3))
 checks.append({'name':m['name'],'triangles':a['triangles'],'expectedTriangles':m['triangles'],'boundsErrorMetres':error,'surfaceAreaError':abs(a['surfaceArea']-m['surfaceArea']),'zeroAreaTrianglesRemoved':m['triangles']-a['triangles']})
 assert m['triangles']-m['degenerateTriangles']<=a['triangles']<=m['triangles'],('Triangle mismatch',m['name'],a['triangles'],m['triangles'],m['degenerateTriangles'])
 assert abs(a['surfaceArea']-m['surfaceArea'])<max(.001,m['surfaceArea']*.0001),('Surface area mismatch',m['name'],a['surfaceArea'],m['surfaceArea'])
 assert error<.001,('Bounds mismatch',m['name'],error)
assert not unmapped,('Unmapped geometry',unmapped)
missing=[im.name for im in bpy.data.images if im.source=='FILE' and not im.packed_file and not Path(bpy.path.abspath(im.filepath)).exists()];assert not missing,missing
for view in manifest['views']:
 c=bpy.data.objects['M14 Camera | '+view['name']];assert (c.matrix_world.translation-xyz(view['eye'])).length<.001
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(out/'EME-M14-pavimento-completo.blend'))
report={'unit':'m-14','sourceSha256':manifest['sourceSha256'],'glbSha256':manifest['glbSha256'],'blender':bpy.app.version_string,'meshes':checks,'cameras':len(cameras),'missingTextures':missing,'approval':manifest['approval'],'limitations':['Material response and lighting are renderer-specific; this is geometric/material synchronization, not pixel-identical rendering.','Panorama outside the apartment is a web background, not additional 3D property geometry.','Physical glass and a production sky are prepared; final light/render validation belongs to step 9.']}
(out/'blender-verification.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print('SYNC73_PASS',json.dumps({'meshes':len(checks),'triangles':sum(x['triangles'] for x in checks),'maxBoundsErrorMetres':max(x['boundsErrorMetres'] for x in checks),'cameras':len(cameras),'missingTextures':missing}),flush=True)
