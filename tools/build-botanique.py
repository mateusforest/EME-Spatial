"""Build isolated Botanique Blender/Web copies. No render-farm configuration changes."""
import bpy,sys,json,math,time,traceback,importlib.util
from pathlib import Path
from mathutils import Vector

request=json.loads(Path(sys.argv[sys.argv.index('--')+1]).read_text('utf-8-sig'))
root=Path(request['project']);repo=Path(request['repo']);kind=request['scene'];start=time.time()
status=root/'03-previas'/('build-'+kind+'.json')
def save_status(**data):status.write_text(json.dumps(data,indent=2,ensure_ascii=False),encoding='utf-8')
save_status(status='starting',scene=kind)
try:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    script=repo/'tools'/('botanique_exterior.py' if kind=='exterior' else 'botanique_unit.py')
    spec=importlib.util.spec_from_file_location('botanique_model',script);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    result=module.build_exterior() if kind=='exterior' else module.build_unit(detail='render')
    if not isinstance(result,dict):result={}
    s=bpy.context.scene
    if kind=='apartamento':
        context_spec=importlib.util.spec_from_file_location('botanique_balcony_context',repo/'tools'/'botanique_balcony_context.py')
        context_module=importlib.util.module_from_spec(context_spec);context_spec.loader.exec_module(context_module)
        result['balcony_context']=context_module.apply_balcony_context()
        finish_spec=importlib.util.spec_from_file_location('botanique_finishes',repo/'tools'/'botanique_finishes.py')
        finishes=importlib.util.module_from_spec(finish_spec);finish_spec.loader.exec_module(finishes);result['finishes']=finishes.apply_web_finishes()
        for i,c in enumerate(result.get('cameras',[])):
            marker=s.timeline_markers.new(c['id'],frame=i+1);marker.camera=bpy.data.objects.get(c['name'])
        for o in s.objects:
            if o.name.startswith('B_UNIT_CEILING'):o.name=o.name.replace('B_UNIT_CEILING','B_UNIT_ROOF',1)
    s['project']='Botanique Home Resort';s['author']='EME Spatial';s['status']='Demonstrative reconstruction, dimensions estimated from public references.'
    # Export native meshes and PBR base finishes before production-only shading detail.
    web=repo/'public'/'assets'/'botanique';web.mkdir(parents=True,exist_ok=True)
    bpy.ops.object.select_all(action='DESELECT')
    temporary=[]
    if kind=='apartamento':
        # Bake modifiers into temporary export copies, then join per finish. This avoids
        # a draw call per drawer/leaf without damaging the editable Blender scene.
        buckets={};deps=bpy.context.evaluated_depsgraph_get()
        for original in list(s.objects):
            if original.type!='MESH' or original.get('render_only'):continue
            roof=original.name.startswith('B_UNIT_ROOF') or original.get('role') in ('ceiling-light','hanging-light','context','curtain-high')
            context_only=bool(original.get('context_only') or original.get('role')=='context')
            no_shadow=bool(original.get('noShadow',False))
            key=(roof,context_only,no_shadow,tuple(m.name for m in original.data.materials),original.get('variantGroup',''),original.get('variantId',''))
            mesh=bpy.data.meshes.new_from_object(original.evaluated_get(deps),depsgraph=deps);mesh.transform(original.matrix_world)
            copy=bpy.data.objects.new('BOTANIQUE_EXPORT',mesh);s.collection.objects.link(copy);buckets.setdefault(key,[]).append(copy)
        for (roof,context_only,no_shadow,materials,variant_group,variant_id),objects in buckets.items():
            bpy.ops.object.select_all(action='DESELECT')
            for o in objects:o.select_set(True)
            bpy.context.view_layer.objects.active=objects[0]
            bpy.ops.object.join();joined=objects[0];joined.name=('B_UNIT_ROOF_' if roof else 'B_UNIT_STATIC_')+'_'.join(materials)
            if context_only:joined['role']='context';joined['context_only']=True;joined['exclude_from_bounds']=True
            if no_shadow:joined['noShadow']=True
            if variant_group:
                joined.name+='_'+variant_group+'_'+variant_id
                joined['variantGroup']=variant_group;joined['variantId']=variant_id;joined['variantDefault']='contemporaneo'
            temporary.append(joined)
        bpy.ops.object.select_all(action='DESELECT')
        for o in temporary:o.select_set(True)
    else:
        for o in s.objects:
            if o.type=='MESH':o.select_set(True)
    kwargs=dict(filepath=str(web/(kind+'.glb')),export_format='GLB',use_selection=True,export_apply=True,export_animations=False,export_cameras=False,export_lights=False,export_materials='EXPORT',export_yup=True,export_extras=True)
    available=bpy.ops.export_scene.gltf.get_rna_type().properties.keys()
    if 'export_draco_mesh_compression_enable' in available:
        kwargs.update(export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,export_draco_position_quantization=14,export_draco_normal_quantization=10)
    bpy.ops.export_scene.gltf(**kwargs)
    for o in temporary:bpy.data.objects.remove(o,do_unlink=True)
    (root/'06-web'/(kind+'-metadata.json')).write_text(json.dumps(result,indent=2,ensure_ascii=False),encoding='utf-8')
    if kind=='exterior' and hasattr(module,'apply_render_foliage'):
        result['render_foliage']=module.apply_render_foliage(result)
    # Soft, metre-scaled variations add tactile surface detail to the image production copy.
    for m in bpy.data.materials:
        if not m.use_nodes:continue
        nodes=m.node_tree.nodes;links=m.node_tree.links;b=nodes.get('Principled BSDF')
        if not b or b.inputs['Base Color'].is_linked:continue
        name=m.name.upper()
        if 'WATER' in name:
            n=nodes.new('ShaderNodeTexNoise');n.inputs['Scale'].default_value=7;n.inputs['Detail'].default_value=2
            g=nodes.new('ShaderNodeTexCoord');links.new(g.outputs['Object'],n.inputs['Vector'])
            bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.3;bump.inputs['Distance'].default_value=.06
            links.new(n.outputs['Fac'],bump.inputs['Height']);links.new(bump.outputs['Normal'],b.inputs['Normal'])
            b.inputs['IOR'].default_value=1.333;b.inputs['Transmission Weight'].default_value=.3
        textured=any(word in name for word in ['WOOD','FLOOR','WALL','GROUND','PATH','FABRIC','ROAD'])
        if not textured:continue
        g=nodes.new('ShaderNodeTexCoord');n=nodes.new('ShaderNodeTexNoise');n.inputs['Scale'].default_value=120 if 'FABRIC' in name else 5 if 'GROUND' in name else 24
        n.inputs['Detail'].default_value=3
        mapping=nodes.new('ShaderNodeVectorMath');mapping.operation='MULTIPLY';mapping.inputs[1].default_value=(.25,18,18) if 'WOOD' in name else (1,1,1)
        links.new(g.outputs['Object'],mapping.inputs[0]);links.new(mapping.outputs[0],n.inputs['Vector'])
        ramp=nodes.new('ShaderNodeValToRGB');base=b.inputs['Base Color'].default_value[:3];variation=.3 if 'GROUND' in name else .15 if 'WOOD' in name else .055
        for el,mult in zip(ramp.color_ramp.elements,(1-variation,1+variation)):el.color=(*(min(1,c*mult) for c in base),1)
        links.new(n.outputs['Fac'],ramp.inputs[0]);links.new(ramp.outputs['Color'],b.inputs['Base Color'])
        bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.25;bump.inputs['Distance'].default_value=.008 if 'GROUND' in name else .0015
        links.new(n.outputs['Fac'],bump.inputs['Height']);links.new(bump.outputs['Normal'],b.inputs['Normal'])
        if 'FABRIC' in name:b.inputs['Sheen Weight'].default_value=.3
    # Physical sky is the sole source of direct sun in Cycles, avoiding double illumination.
    for o in s.objects:
        if o.type=='LIGHT' and o.data.type=='SUN':o.data.energy=0
    world=bpy.data.worlds.new('Botanique | Luz natural');s.world=world;world.use_nodes=True
    nodes=world.node_tree.nodes;links=world.node_tree.links;sky=nodes.new('ShaderNodeTexSky')
    sky_types=sky.bl_rna.properties['sky_type'].enum_items.keys()
    sky.sky_type='MULTIPLE_SCATTERING' if 'MULTIPLE_SCATTERING' in sky_types else 'NISHITA'
    sky.sun_elevation=math.radians(29);sky.sun_rotation=math.radians(-145 if kind=='exterior' else -55)
    for key,value in [('air_density',1),('dust_density',.8),('aerosol_density',.8),('ozone_density',1)]:
        if hasattr(sky,key):setattr(sky,key,value)
    links.new(sky.outputs['Color'],nodes.get('Background').inputs['Color']);nodes.get('Background').inputs['Strength'].default_value=.055 if kind=='exterior' else .20
    if kind=='exterior':
        backdrop=nodes.new('ShaderNodeBackground');backdrop.inputs['Strength'].default_value=.8
        sky_coords=nodes.new('ShaderNodeTexCoord');sky_axis=nodes.new('ShaderNodeSeparateXYZ');sky_height=nodes.new('ShaderNodeMath');sky_height.operation='ABSOLUTE'
        sky_gradient=nodes.new('ShaderNodeValToRGB');sky_gradient.color_ramp.elements[0].position=0;sky_gradient.color_ramp.elements[0].color=(.42,.59,.72,1);sky_gradient.color_ramp.elements[1].position=.65;sky_gradient.color_ramp.elements[1].color=(.10,.28,.55,1)
        links.new(sky_coords.outputs['Normal'],sky_axis.inputs[0]);links.new(sky_axis.outputs['Z'],sky_height.inputs[0]);links.new(sky_height.outputs[0],sky_gradient.inputs[0]);links.new(sky_gradient.outputs['Color'],backdrop.inputs['Color'])
        lightpath=nodes.new('ShaderNodeLightPath');mix=nodes.new('ShaderNodeMixShader')
        links.new(lightpath.outputs['Is Camera Ray'],mix.inputs[0]);links.new(nodes.get('Background').outputs[0],mix.inputs[1]);links.new(backdrop.outputs[0],mix.inputs[2]);links.new(mix.outputs[0],nodes.get('World Output').inputs['Surface'])
    s.render.engine='CYCLES';s.cycles.samples=192;s.cycles.use_denoising=True;s.cycles.adaptive_threshold=.018;s.cycles.max_bounces=8;s.cycles.transmission_bounces=6;s.cycles.transparent_max_bounces=24;s.cycles.sample_clamp_indirect=5
    s.render.resolution_x=2560;s.render.resolution_y=1440;s.render.resolution_percentage=100;s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGB'
    s.render.threads_mode='FIXED';s.render.threads=4;s.view_settings.view_transform='AgX';s.view_settings.look='AgX - Medium High Contrast';s.view_settings.exposure=.4
    s.render.fps=24;s.frame_start=1;s.frame_end=max(1,len(s.timeline_markers))
    s.frame_set(1)
    if s.timeline_markers and s.timeline_markers[0].camera:s.camera=s.timeline_markers[0].camera
    if not s.camera:
        cams=[o for o in s.objects if o.type=='CAMERA']
        if not cams:raise RuntimeError('No camera in model')
        s.camera=cams[0]
    bpy.ops.file.pack_all()
    production=root/'02-modelos'/('botanique-'+kind+'.blend');bpy.ops.wm.save_as_mainfile(filepath=str(production))
    save_status(status='model-ready',scene=kind,blend=str(production),glb=str(web/(kind+'.glb')),seconds=round(time.time()-start,2),metadata=result)
    if request.get('preview',True):
        pref=bpy.context.preferences.addons['cycles'].preferences;pref.compute_device_type='OPTIX';pref.get_devices()
        for d in pref.devices:d.use=d.type=='OPTIX'
        s.cycles.device='GPU';s.cycles.samples=40;s.render.resolution_percentage=55
        preview_views=request.get('views',[1])
        files=[]
        for frame in preview_views:
            s.frame_set(frame)
            eligible=[m for m in s.timeline_markers if m.camera and m.frame<=frame]
            if eligible:s.camera=sorted(eligible,key=lambda m:m.frame)[-1].camera
            for o in s.objects:
                if o.name.startswith('B_UNIT_ROOF') or o.get('role') in result.get('visibility',{}).get('plan_hide_roles',[]):o.hide_render=s.camera.data.type=='ORTHO' or bool(o.get('variantId') and o.get('variantId')!='contemporaneo')
            path=root/'03-previas'/('%s-%02d.png'%(kind,frame));s.render.filepath=str(path);bpy.ops.render.render(write_still=True);files.append(str(path))
        save_status(status='complete',scene=kind,blend=str(production),glb=str(web/(kind+'.glb')),previews=files,seconds=round(time.time()-start,2),metadata=result)
except Exception:
    save_status(status='error',scene=kind,error=traceback.format_exc(),seconds=round(time.time()-start,2))
    raise
