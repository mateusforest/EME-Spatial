"""Render a pinned, synchronized apartment; never change its geometry or approved finishes.
Run through MF Video AI or: blender -b -t 4 --python-exit-code 1 --python this.py -- request.json
"""
import bpy, json, sys, math, hashlib, time, importlib.util
from pathlib import Path
from mathutils import Vector

request = json.loads(Path(sys.argv[sys.argv.index('--') + 1]).read_text(encoding='utf-8-sig'))
source, out = Path(request['source']), Path(request['output'])
out.mkdir(parents=True, exist_ok=True)
manifest = json.loads((source.parent/'manifest.json').read_text(encoding='utf-8-sig'))
assert request['sourceSha256'] == manifest['sourceSha256'], 'A versão do pavimento mudou. Exporte um novo pedido.'
bpy.ops.wm.open_mainfile(filepath=str(source))
s = bpy.context.scene
assert s['source_sha256'] == request['sourceSha256']
start = time.time()
s.render.threads_mode='FIXED'; s.render.threads=4
s.render.resolution_x=1600 if request['mode']=='final' else 1280
s.render.resolution_y=s.render.resolution_x*9//16; s.render.resolution_percentage=100
s.render.image_settings.file_format='PNG'; s.render.image_settings.color_mode='RGB'
s.view_settings.view_transform='AgX'; s.view_settings.look='AgX - Medium High Contrast'
s.view_settings.exposure=.3
s.cycles.samples=128 if request['mode']=='final' else 48
s.cycles.use_denoising=True; s.cycles.adaptive_threshold=.025
s.cycles.max_bounces=10; s.cycles.transmission_bounces=8; s.cycles.transparent_max_bounces=8
s.cycles.sample_clamp_indirect=4
device='CPU'
try:
    prefs=bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type='OPTIX'; prefs.get_devices()
    for d in prefs.devices: d.use=d.type=='OPTIX'
    if any(d.use for d in prefs.devices): s.cycles.device='GPU'; device='OPTIX'
except Exception: s.cycles.device='CPU'
# A single physical sky sun avoids double sunlight from the imported web key light.
for obj in s.objects:
    if obj.type=='LIGHT' and obj.data.type=='SUN': obj.data.energy=0
    elif obj.type=='LIGHT' and obj.data.type=='AREA': obj.data.energy=220
sky=next(n for n in s.world.node_tree.nodes if n.type=='TEX_SKY')
sky.sun_elevation=math.radians(38); sky.sun_rotation=math.radians(125)
s.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.3
# Submillimetre relief, preserving source color maps and dimensions.
for m in bpy.data.materials:
    if not m.use_nodes: continue
    nodes=m.node_tree.nodes; bsdf=next((n for n in nodes if n.type=='BSDF_PRINCIPLED'),None)
    if not bsdf: continue
    name=m.name.lower()
    if any(x in name for x in ('linen','fabric','linho')):
        bsdf.inputs['Sheen Weight'].default_value=.25
    if any(x in name for x in ('mineral','limestone','linen','fabric','timber')) and not bsdf.inputs['Normal'].is_linked:
        tex=nodes.new('ShaderNodeTexNoise'); tex.inputs['Scale'].default_value=170
        bump=nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value=.14; bump.inputs['Distance'].default_value=.001
        m.node_tree.links.new(tex.outputs['Fac'],bump.inputs['Height']); m.node_tree.links.new(bump.outputs['Normal'],bsdf.inputs['Normal'])
s['production74']='Review required; same full floor and approved source materials'
spec=importlib.util.spec_from_file_location('refine74',Path(__file__).with_name('refine-production74.py'));module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
refinements=module.refine(manifest)
s.camera=bpy.data.objects['M14 Camera | Living']
bpy.ops.wm.save_as_mainfile(filepath=str(out/'M14-producao.blend'))
results=[]
def set_engine(engine):
    s.render.engine=engine
    if engine=='BLENDER_EEVEE_NEXT':
        s.eevee.use_raytracing=True
        s.eevee.ray_tracing_options.resolution_scale='2'
    for o in s.objects:
        if o.type=='LIGHT' and o.data.type=='SUN':o.data.energy=1.3 if engine=='BLENDER_EEVEE_NEXT' else 0
def still(view, slug, engine):
    s.camera=bpy.data.objects['M14 Camera | '+view]; set_engine(engine)
    s.render.filepath=str(out/(slug+'.png'))
    print('SPATIAL_STAGE '+view,flush=True); bpy.ops.render.render(write_still=True)
    results.append({'file':slug+'.png','kind':'image','view':view,'engine':engine,'width':s.render.resolution_x,'height':s.render.resolution_y})
if request['mode']=='validation': still('Living','validacao-living','CYCLES')
else:
    engine='CYCLES' if request['mode']=='final' else 'BLENDER_EEVEE_NEXT'
    for view,slug in [('Living','living'),('Cozinha e jantar','cozinha-jantar'),('Sacada','sacada')]: still(view,slug,engine)
    # A restrained, continuous lateral move in the current living area. No invented rooms or door crossings.
    camera=s.camera=bpy.data.objects['M14 Camera | Living']; camera.animation_data_clear()
    start_pos=camera.location.copy(); target=Vector((7,0,63.9))
    set_engine(engine); s.render.resolution_x=1280; s.render.resolution_y=720
    s.render.fps=24; s.frame_start=1; s.frame_end=144
    if engine=='CYCLES': s.cycles.samples=48
    for frame,dx in [(1,0),(144,1.1)]:
        camera.location=start_pos+Vector((dx,0,0)); camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
        camera.keyframe_insert('location',frame=frame); camera.keyframe_insert('rotation_euler',frame=frame)
    for fc in camera.animation_data.action.fcurves:
        for kp in fc.keyframe_points: kp.interpolation='LINEAR'
    frames=out/'frames'; frames.mkdir(exist_ok=True); s.render.filepath=str(frames/'frame-')
    print('SPATIAL_STAGE Percurso contínuo de 6 segundos',flush=True)
    bpy.ops.render.render(animation=True)
    results.append({'file':'percurso.mp4','kind':'video','engine':engine,'frames':144,'fps':24,'duration':6,'width':1280,'height':720})
(out/'render-report.json').write_text(json.dumps({'schema':'eme-spatial-render/1','sourceSha256':request['sourceSha256'],'blendSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'refinements':refinements,'device':device,'blender':bpy.app.version_string,'mode':request['mode'],'status':'review','results':results,'elapsed':time.time()-start,'limitations':['Lighting preview requires approval.','Exterior context is a procedural sky; no modeled surrounding city.','Production details overlay the web furniture and planting at their original positions.']},ensure_ascii=False,indent=2),encoding='utf-8')
print('SPATIAL_RENDER_DONE',flush=True)
