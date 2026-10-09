"""Packed exterior finishes and licensed CC0 vegetation for Botanique.

Generated maps and existing local Poly Haven assets are packed into the model.
The render-only forest is applied after the lightweight web scene is exported.
"""
import math
from pathlib import Path


def alpha_cutout(material):
    """Make glTF export MASK and let Cycles use the same photographic silhouette."""
    if not material or not material.use_nodes:return False
    nodes=material.node_tree.nodes;links=material.node_tree.links
    principled=nodes.get('Principled BSDF')
    if not principled or not principled.inputs['Alpha'].is_linked:return False
    incoming=principled.inputs['Alpha'].links[0]
    if incoming.from_node.type=='MATH' and incoming.from_node.operation=='ROUND':return True
    source=incoming.from_socket;links.remove(incoming)
    mask=nodes.new('ShaderNodeMath');mask.name='Botanique foliage alpha cutout';mask.operation='ROUND'
    links.new(source,mask.inputs[0]);links.new(mask.outputs[0],principled.inputs['Alpha'])
    material.surface_render_method='DITHERED';material.use_backface_culling=False
    material['alpha_mode']='MASK';material['alpha_cutoff']=.5
    return True


def apply_exterior_finishes(objects, materials):
    import bpy
    size=128
    definitions={
        'WALL_limestone':('plaster',1.2,.025),
        'WALL_ivory':('plaster',1.2,.020),
        'WALL_greige':('plaster',1.2,.027),
        'WALL_graphite':('plaster',1.2,.032),
        'WALL_pool_greige':('plaster',1.2,.023),
        'STONE_entry':('stone',.75,.085),
        'FLOOR_stone':('stone',.85,.055),
        'FLOOR_concrete':('concrete',3.0,.065),
        'FLOOR_sidewalk':('flagstone',2.6,.22),
        'ROAD_asphalt':('asphalt',1.8,.14),
        'PALM_bark':('bark',.52,.18),
        'WOOD_deck':('wood',1.4,.115),
        'WOOD_bark':('bark',1.3,.18),
        'PATH_gravel':('gravel',1.4,.16),
        'GROUND_grass':('grass',5.0,.16),
        'FABRIC_outdoor':('fabric',.26,.035),
        'POOL_coping':('stone',1.2,.045),
        'POOL_deck_wood':('wood',1.4,.10),
        'POOL_fabric':('fabric',.40,.03),
        'POOL_fabric_sage':('fabric',.38,.035),
        'POOL_wicker':('fabric',.13,.10),
        'POOL_deck_wood_interior':('wood',1.4,.075),
        'POOL_stone_counter':('stone',1.4,.025),
        'POOL_tiles':('pooltile',.8,.07),
        'WATER_pool':('water',16.0,.010),
    }
    def srgb(value):
        value=max(0,min(1,value))
        return 12.92*value if value<=.0031308 else 1.055*value**(1/2.4)-.055
    def field(kind,u,v):
        fine=math.sin(math.tau*(u*43+v*37))*math.cos(math.tau*(u*19-v*41))
        broad=math.sin(math.tau*(u*3+v*2))*.5+math.cos(math.tau*(u*7-v*5))*.25
        grain=math.sin(math.tau*(u*23+.17*math.sin(v*math.tau*3)))
        if kind=='wood':return grain*.55+broad*.24+fine*.12
        if kind=='bark':return grain*.65+fine*.20
        if kind=='stone':
            edge=min(u,1-u,v,1-v)
            return -.85 if edge<.012 else broad*.36+fine*.14
        if kind=='fabric':return .40*math.sin(math.tau*u*32)+.40*math.sin(math.tau*v*32)+fine*.12
        if kind=='grass':return broad*.48+fine*.42+math.sin(math.tau*(u*11+v*13))*.18
        if kind=='gravel':return fine*.67+broad*.22
        if kind=='asphalt':return fine*.82+broad*.08
        if kind=='flagstone':
            # Periodic irregular flagstones with recessed joints; no square-tile
            # grid or painted fake lighting on the sloped public sidewalk.
            px,py=u*4,v*4;ix,iy=math.floor(px),math.floor(py);distances=[]
            for cy in range(iy-1,iy+2):
                for cx in range(ix-1,ix+2):
                    seed=(cx%4)*127.1+(cy%4)*311.7
                    sx=(math.sin(seed+1.7)*43758.5453)%1;sy=(math.sin(seed+29.1)*22578.1459)%1
                    distances.append(((px-cx-.18-.64*sx)**2+(py-cy-.18-.64*sy)**2,sx))
            distances.sort()
            edge=math.sqrt(distances[1][0])-math.sqrt(distances[0][0])
            return -.96 if edge<.030 else (distances[0][1]-.5)*1.10+fine*.08
        if kind=='pooltile':
            tile_u=(u*8)%1;tile_v=(v*8)%1
            return -.7 if min(tile_u,1-tile_u,tile_v,1-tile_v)<.045 else broad*.23+fine*.09
        if kind=='water':return math.sin(math.tau*(u*7+v*9))*.35+fine*.10
        return fine*.48+broad*.34
    normal_maps={};reused=[]
    material_root=Path(__file__).resolve().parents[1]/'public/assets/m/materials'
    for name,(kind,span,variation) in definitions.items():
        material=materials.get(name)
        if not material:continue
        principled=material.node_tree.nodes.get('Principled BSDF')
        base=principled.inputs['Base Color'].default_value[:3]
        pixels=[]
        heights=[]
        for y in range(size):
            for x in range(size):
                value=field(kind,x/size,y/size)
                heights.append(value)
                # Blender's generated-image pixel buffer is linear. PNG packing
                # performs the sRGB transfer; encoding here a second time washes
                # out the material colours in both Cycles and the GLB.
                pixels.extend([max(0,min(1,c*(1+variation*value))) for c in base]+[1])
        image=bpy.data.images.new('Botanique exterior '+name,width=size,height=size,alpha=False)
        image.colorspace_settings.name='sRGB';image.pixels.foreach_set(pixels)
        image.file_format='PNG';image.pack()
        node=material.node_tree.nodes.new('ShaderNodeTexImage');node.name='Original exterior finish';node.image=image
        node.interpolation='Linear';node.extension='REPEAT'
        uv=material.node_tree.nodes.new('ShaderNodeUVMap');uv.uv_map='B_EXT_METRES'
        material.node_tree.links.new(uv.outputs['UV'],node.inputs['Vector'])
        material.node_tree.links.new(node.outputs['Color'],principled.inputs['Base Color'])
        if kind not in normal_maps:
            data=[]
            amplitude=.035 if kind in ('plaster','fabric') else .10 if kind in ('stone','concrete') else .22
            for y in range(size):
                for x in range(size):
                    dx=(heights[y*size+(x+1)%size]-heights[y*size+(x-1)%size])*amplitude
                    dy=(heights[((y+1)%size)*size+x]-heights[((y-1)%size)*size+x])*amplitude
                    length=math.sqrt(dx*dx+dy*dy+1)
                    data.extend([.5-dx/length*.5,.5-dy/length*.5,.5+.5/length,1])
            normal=bpy.data.images.new('Botanique exterior '+kind+' normal',width=size,height=size,alpha=False)
            normal.colorspace_settings.name='Non-Color';normal.pixels.foreach_set(data);normal.file_format='PNG';normal.pack()
            normal_maps[kind]=normal
        normal_node=material.node_tree.nodes.new('ShaderNodeTexImage');normal_node.image=normal_maps[kind]
        normal_node.interpolation='Linear';normal_node.extension='REPEAT'
        material.node_tree.links.new(uv.outputs['UV'],normal_node.inputs['Vector'])
        normal=material.node_tree.nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.40
        material.node_tree.links.new(normal_node.outputs['Color'],normal.inputs['Color'])
        material.node_tree.links.new(normal.outputs['Normal'],principled.inputs['Normal'])
        # Reuse the project's licensed photographic oak maps for foreground wood.
        # Explicit packing makes the render portable without absolute path reliance.
        if name in ('WOOD_deck','POOL_deck_wood','POOL_deck_wood_interior'):
            files={'color':material_root/'realism50/oak-color.webp',
                   'normal':material_root/'realism50/oak-normal.webp',
                   'rough':material_root/'realism50/oak-rough.webp'}
            if all(file.is_file() for file in files.values()):
                for role,file in files.items():
                    real=bpy.data.images.get('Botanique CC0 oak '+role) or bpy.data.images.load(str(file),check_existing=False)
                    real.name='Botanique CC0 oak '+role
                    real.colorspace_settings.name='sRGB' if role=='color' else 'Non-Color'
                    limit=1024 if role=='color' else 512
                    if max(real.size)>limit:
                        factor=limit/max(real.size);real.scale(max(1,round(real.size[0]*factor)),max(1,round(real.size[1]*factor)))
                    real.pack()
                    if role=='color':node.image=real
                    elif role=='normal':normal_node.image=real
                    else:
                        rough=material.node_tree.nodes.new('ShaderNodeTexImage');rough.image=real
                        material.node_tree.links.new(uv.outputs['UV'],rough.inputs['Vector'])
                        material.node_tree.links.new(rough.outputs['Color'],principled.inputs['Roughness'])
                reused.append({'asset':'oak_veneer_01','credit':'Poly Haven','license':'CC0',
                               'source':'https://polyhaven.com/a/oak_veneer_01'})
        local_map={'POOL_coping':('limestone',.20),'POOL_fabric':('linen',.28)}.get(name)
        if local_map:
            prefix,normal_strength=local_map
            for role in ('color','normal','rough'):
                file=material_root/'refinement49'/f'{prefix}-{role}.png'
                if not file.is_file():raise FileNotFoundError('Existing pool finish is missing: '+str(file))
                real=bpy.data.images.load(str(file),check_existing=False);real.name='Botanique pool '+prefix+' '+role
                real.colorspace_settings.name='sRGB' if role=='color' else 'Non-Color'
                if max(real.size)>512:
                    factor=512/max(real.size);real.scale(max(1,round(real.size[0]*factor)),max(1,round(real.size[1]*factor)))
                real.pack()
                if role=='color':node.image=real
                elif role=='normal':normal_node.image=real;normal.inputs['Strength'].default_value=normal_strength
                else:
                    rough=material.node_tree.nodes.new('ShaderNodeTexImage');rough.image=real
                    material.node_tree.links.new(uv.outputs['UV'],rough.inputs['Vector'])
                    material.node_tree.links.new(rough.outputs['Color'],principled.inputs['Roughness'])
            reused.append({'asset':prefix+' PBR maps','source':'Existing EME Spatial refinement49 material library','scope':'pool only'})
        if name=='WATER_pool':
            # A whole-pool normal field avoids repeating diagonal stripes. The
            # small crossing waves are slope data, with no painted highlights;
            # reflections remain responsive to the actual sky in both engines.
            water_size=512;water_pixels=[]
            waves=[(1.0,42,.003,1.1),(2.1,67,.0018,4.0),(.2,91,.001,2.4),
                   (2.7,137,.00065,5.2),(1.6,179,.0004,.4)]
            for y in range(water_size):
                for x in range(water_size):
                    u,v=x/water_size,y/water_size;dx=dy=0
                    for angle,frequency,amplitude,phase in waves:
                        k=math.tau*frequency
                        q=k*(math.cos(angle)*u+math.sin(angle)*v)+phase+.7*math.sin(math.tau*(u*3-v*2)+phase)
                        slope=amplitude*k/16*math.cos(q)
                        dx+=slope*math.cos(angle);dy+=slope*math.sin(angle)
                    length=math.sqrt(dx*dx+dy*dy+1)
                    water_pixels.extend([.5-dx/length*.5,.5-dy/length*.5,.5+.5/length,1])
            water_normal=bpy.data.images.new('Botanique pool crossing ripples',width=water_size,height=water_size,alpha=False)
            water_normal.colorspace_settings.name='Non-Color';water_normal.pixels.foreach_set(water_pixels)
            water_normal.file_format='PNG';water_normal.pack();normal_node.image=water_normal
            normal.inputs['Strength'].default_value=.42
            principled.inputs['Roughness'].default_value=.13
            principled.inputs['Metallic'].default_value=0
            principled.inputs['IOR'].default_value=1.333
            principled.inputs['Transmission Weight'].default_value=.86
            principled.inputs['Alpha'].default_value=1
            material.use_backface_culling=True;material['surface']='pool-water'
            reused.append({'asset':'Crossing pool ripple normal field','source':'Original EME Spatial procedural surface','scope':'pool only; packed PBR normal'})
        if name in ('POOL_fabric','POOL_fabric_sage'):principled.inputs['Sheen Weight'].default_value=.18
    for obj in objects:
        if obj.type!='MESH' or not obj.data.materials:continue
        name=obj.data.materials[0].name.removeprefix('B_')
        if name not in definitions:continue
        kind,span,_=definitions[name]
        mesh=obj.data;uv=mesh.uv_layers.new(name='B_EXT_METRES')
        for polygon in mesh.polygons:
            normal=polygon.normal
            axes=(0,1) if abs(normal.z)>=max(abs(normal.x),abs(normal.y)) else (0,2) if abs(normal.y)>=abs(normal.x) else (1,2)
            if name=='POOL_deck_wood' and abs(normal.z)>=max(abs(normal.x),abs(normal.y)):
                axes=(1,0) # oak grain follows the long horizontal pool planks
            for loop_index in polygon.loop_indices:
                point=mesh.vertices[mesh.loops[loop_index].vertex_index].co
                uv.data[loop_index].uv=(point[axes[0]]/span,point[axes[1]]/span)
    leaf_root=Path.home()/'Documents/Codex/RenderNetwork/Projetos/Botanique-Home-Resort/02-modelos/assets/tree_small_02/textures'
    foliage=materials.get('FOLIAGE_CC0')
    if foliage:
        nodes=foliage.node_tree.nodes;links=foliage.node_tree.links
        principled=nodes.get('Principled BSDF');principled.inputs['Roughness'].default_value=.83
        principled.inputs['Subsurface Weight'].default_value=.035
        uv=nodes.new('ShaderNodeUVMap');uv.uv_map='B_EXT_CANOPY'
        for role,filename in [('color','tree_small_02_leaves_diff_1k.png'),('alpha','tree_small_02_leaves_alpha_1k.png'),('normal','tree_small_02_leaves_nor_gl_1k.png')]:
            image=bpy.data.images.load(str(leaf_root/filename),check_existing=False)
            image.colorspace_settings.name='sRGB' if role=='color' else 'Non-Color'
            if role=='normal':image.scale(512,512)
            image.pack();node=nodes.new('ShaderNodeTexImage');node.image=image
            links.new(uv.outputs['UV'],node.inputs['Vector'])
            if role=='color':links.new(node.outputs['Color'],principled.inputs['Base Color'])
            elif role=='alpha':links.new(node.outputs['Color'],principled.inputs['Alpha'])
            else:
                normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.38
                links.new(node.outputs['Color'],normal.inputs['Color']);links.new(normal.outputs['Normal'],principled.inputs['Normal'])
        alpha_cutout(foliage)
        reused.append({'asset':'tree_small_02 photographic twig maps','credit':'Rico Cilliers / Poly Haven','license':'CC0','source':'https://polyhaven.com/a/tree_small_02'})
    return {'source':'Original procedural maps by EME Spatial','resolution':size,
            'texturedMaterials':len(definitions),'normalMaps':len(normal_maps),
            'packed':True,'uv':'B_EXT_METRES','reused':reused}


def add_cc0_shrubs(placements):
    """Reuse the two existing Poly Haven LOD2 shrubs, joining all copies once."""
    import bpy
    from mathutils import Vector,Matrix
    source=Path(__file__).resolve().parents[1]/'public/assets/m/model/m-shrubs-v21.glb'
    if not source.is_file():return {'instances':0,'status':'not available'}
    before=set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(source))
    imported=[o for o in bpy.data.objects if o not in before]
    variants=[o for o in imported if o.type=='MESH']
    copies=[];obstacles=[]
    for i,placement in enumerate(placements):
        x,y,height,rotation=placement[:4];ground=placement[4] if len(placement)>4 else -.04
        original=variants[i%len(variants)]
        bounds=[original.matrix_world@Vector(p) for p in original.bound_box]
        lo=Vector(tuple(min(p[j] for p in bounds) for j in range(3)))
        hi=Vector(tuple(max(p[j] for p in bounds) for j in range(3)))
        scale=height/max(hi.z-lo.z,.001)
        center=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z))
        mesh=original.data.copy();mesh.transform(original.matrix_world)
        mesh.transform(Matrix.Translation(-center))
        obj=bpy.data.objects.new('B_EXT_CC0_SHRUB',mesh);bpy.context.collection.objects.link(obj)
        obj.matrix_world=Matrix.Translation((x,y,ground))@Matrix.Rotation(rotation,4,'Z')@Matrix.Scale(scale,4)
        copies.append(obj)
        world=[obj.matrix_world@Vector(p) for p in obj.bound_box]
        obstacles.append({'id':'cc0-arbusto-'+str(i),'min':[round(min(p[j] for p in world),4) for j in range(3)],'max':[round(max(p[j] for p in world),4) for j in range(3)]})
    for obj in imported:bpy.data.objects.remove(obj,do_unlink=True)
    if copies:
        bpy.ops.object.select_all(action='DESELECT')
        for obj in copies:obj.select_set(True)
        bpy.context.view_layer.objects.active=copies[0];bpy.ops.object.join()
        copies[0].name='B_EXT_CC0_SHRUBS'
        for material in copies[0].data.materials:alpha_cutout(material)
        for image in bpy.data.images:
            if image.users and not image.packed_file:
                image.pack()
    return {'instances':len(copies),'materialBatches':1 if copies else 0,
            'source':'https://polyhaven.com/a/shrub_02','credit':'Poly Haven','license':'CC0',
            'variants':'LOD2 a/c','status':'packed','obstacles':obstacles}


def add_pool_planting(placements,material):
    """Compact photographed leaf sprigs, batched beside the existing pool routes."""
    import bpy,random
    from mathutils import Vector,Matrix
    source=Path.home()/'Documents/Codex/RenderNetwork/Projetos/Botanique-Home-Resort/02-modelos/assets/tree_small_02/tree_small_02_1k.blend'
    if not placements:return {'plants':0,'materialBatches':0}
    existing_ids=set(bpy.data.all_ids)
    with bpy.data.libraries.load(str(source),link=False) as (available,loaded):
        loaded.objects=['tree_small_02_leaves_a_LOD1']
    appended_ids=[item for item in bpy.data.all_ids if item not in existing_ids]
    prototype=loaded.objects[0]
    if prototype is None:raise RuntimeError('Existing pool foliage component was not loaded')
    original=prototype.data;coords=[prototype.matrix_world@v.co for v in original.vertices]
    origin=Vector(((min(v.x for v in coords)+max(v.x for v in coords))/2,
                   (min(v.y for v in coords)+max(v.y for v in coords))/2,min(v.z for v in coords)))
    coords=[v-origin for v in coords]
    source_uv=original.uv_layers.active
    if not source_uv:raise RuntimeError('Pool foliage source has no authored UV map')
    vertices=[];faces=[];uvs=[];rng=random.Random(40918)
    for x,y,ground in placements:
        for layer in range(3):
            for branch in range(4):
                angle=branch*math.pi/2+layer*1.2+rng.uniform(-.23,.23)
                radius=.15+.06*layer
                position=Vector((x+math.cos(angle)*radius,y+math.sin(angle)*radius,ground+.11+layer*.17))
                transform=Matrix.Translation(position)@Matrix.Rotation(angle,4,'Z')@Matrix.Rotation(rng.uniform(-.35,.40),4,'Y')@Matrix.Scale(rng.uniform(1.1,1.4),4)
                offset=len(vertices);vertices.extend([transform@v for v in coords])
                for polygon in original.polygons:
                    faces.append(tuple(offset+i for i in polygon.vertices))
                    uvs.append([source_uv.data[i].uv.copy() for i in polygon.loop_indices])
    mesh=bpy.data.meshes.new('B_EXT_POOL_PLANTING');mesh.from_pydata(vertices,[],faces);mesh.update()
    layer=mesh.uv_layers.new(name='B_EXT_CANOPY')
    for polygon,coordinates in zip(mesh.polygons,uvs):
        for loop,uv in zip(polygon.loop_indices,coordinates):layer.data[loop].uv=uv
    obj=bpy.data.objects.new('B_EXT_POOL_PLANTING',mesh);bpy.context.collection.objects.link(obj);mesh.materials.append(material)
    obj['role']='pool-planting';obj['source']='Poly Haven tree_small_02 CC0'
    # Only copied coordinates/UVs are retained; use the already packed shared
    # foliage material and discard temporary source IDs, including reuse hints.
    bpy.data.batch_remove(appended_ids)
    return {'plants':len(placements),'materialBatches':1,'leafSprigs':len(placements)*12,
            'source':'https://polyhaven.com/a/tree_small_02','license':'CC0','credit':'Rico Cilliers / Poly Haven',
            'scope':'Small pool-side planting outside walking routes; authored leaf UV and shared cutout material.'}


def apply_render_foliage(records):
    """Use a shared real tree mesh in Cycles, preserving the already exported GLB."""
    import bpy,bmesh,random
    from mathutils import Vector,Matrix
    source=Path.home()/'Documents/Codex/RenderNetwork/Projetos/Botanique-Home-Resort/02-modelos/assets/tree_small_02/tree_small_02_1k.blend'
    if not source.is_file():raise FileNotFoundError('Production tree source is missing: '+str(source))
    with bpy.data.libraries.load(str(source),link=False) as (available,loaded):
        loaded.objects=['tree_small_02_LOD1']
    prototype=loaded.objects[0]
    if prototype is None:raise RuntimeError('Tree Small02 LOD1 was not loaded')
    mesh=prototype.data
    # Normalize the existing shared mesh once at its trunk base, not per instance.
    ground=min(v.co.z for v in mesh.vertices)
    root=[v.co for v in mesh.vertices if v.co.z<ground+.055]
    origin=Vector((sum(v.x for v in root)/len(root),sum(v.y for v in root)/len(root),ground))
    mesh.transform(Matrix.Translation(-origin));mesh.update()
    original_height=max(v.co.z for v in mesh.vertices)
    # First/middle ground: choose proxies that already sit safely beside routes.
    candidates=[r for r in records if r['position'][0]<-20 and r['position'][1]<75]
    selected=sorted(candidates,key=lambda r:(r['position'][0]+30)**2+(r['position'][1]-12)**2)[:48]
    remove={}
    for record in selected:
        for material,(start,end) in record['ranges'].items():remove.setdefault(material,set()).update(range(start,end))
    for material,indices in remove.items():
        obj=bpy.data.objects.get('B_EXT_'+material)
        if not obj:continue
        bm=bmesh.new();bm.from_mesh(obj.data);bm.faces.ensure_lookup_table()
        faces=[bm.faces[i] for i in indices]
        bmesh.ops.delete(bm,geom=faces,context='FACES')
        bm.to_mesh(obj.data);bm.free();obj.data.update()
    collection=bpy.data.collections.new('B_EXT_RENDER_ONLY_FOREST');bpy.context.scene.collection.children.link(collection)
    rng=random.Random(20261009);count=0
    def instance(position,height,label,width=1):
        nonlocal count
        obj=bpy.data.objects.new(label,mesh);collection.objects.link(obj)
        ratio=height/original_height
        obj.location=position;obj.rotation_euler=(rng.uniform(-.035,.035),rng.uniform(-.035,.035),rng.random()*math.tau)
        obj.scale=(ratio*rng.uniform(.9,1.2)*width,ratio*rng.uniform(.9,1.2)*width,ratio)
        obj['renderOnly']=True;count+=1
    for record in selected:instance(record['position'],record['height'],'B_EXT_RENDER_TREE_'+str(record['id']))
    # A lower layer closes the open view under the crowns around the pool. These
    # reuse the very same tree mesh, scaled as dense young growth, not mesh copies.
    understory=[(-40,-3),(-40,5),(-40,13),(-39,22),(-35,24),(-29,24),(-25,27),(-21,31),(-44,27),(-46,39),(-33,35),(-29,42)]
    for i,(x,y) in enumerate(understory):instance((x,y,-.1),rng.uniform(2.3,3.5),'B_EXT_RENDER_UNDERSTORY_'+str(i))
    # Mid-distance stands fill visible holes behind the immediate common area.
    for i,(x,y) in enumerate([(-61,25),(-59,39),(-59,56),(-53,61),(-47,68),(-36,66),(-29,70),(-21,68),(-12,82),(2,91),(15,95),(29,96)]):
        instance((x,y,-.1),rng.uniform(10,15),'B_EXT_RENDER_BACKDROP_'+str(i))
    # Dense, layered woodland behind the close tree line hides the empty plane
    # at both eye level and the elevated tower shot. Every tree uses one mesh.
    def ground_z(x,y):
        if y<112:return -.1
        t=max(0,min(1,(y-112)/120));t=t*t*(3-2*t)
        return -.1+t*(9+6*math.sin(x*.013+y*.009)+3*math.cos(x*.027-y*.011))
    forest=[]
    for x in range(-137,-66,12):
        for y in range(-8,118,12):forest.append((x,y,12,18))
    for y in range(112,293,18):
        for x in range(-165,174,18):forest.append((x,y,17,25))
    for y in (324,350):
        for x in range(-360,361,23):forest.append((x,y,24,32))
    for x in (65,80,97,115):
        for y in range(-7,112,14):forest.append((x,y,13,19))
    for x in range(135,496,25):
        for y in range(0,401,25):forest.append((x,y,20,29))
    for i,(x,y,lo,hi) in enumerate(forest):
        x+=rng.uniform(-3,3);y+=rng.uniform(-3,3)
        instance((x,y,ground_z(x,y)),rng.uniform(lo,hi),'B_EXT_RENDER_FOREST_'+str(i),1.1)
    # Lower vegetation breaks up bare soil beneath the actual tree trunks.
    for i in range(38):
        x=rng.uniform(-67,-40);y=rng.uniform(-10,27)
        if -55<x<-44:continue # leave the known main walking trail open
        instance((x,y,-.13),rng.uniform(1.5,2.8),'B_EXT_RENDER_SHRUB_'+str(i),1.5)
    for material in mesh.materials:
        if not material or not material.use_nodes:continue
        for node in material.node_tree.nodes:
            if node.type=='TEX_IMAGE' and node.image:
                image=node.image
                filename=Path(bpy.path.abspath(image.filepath)).name
                file=source.parent/'textures'/filename
                if file.is_file():image.filepath=str(file);image.reload()
                if max(image.size)>1024:
                    scale=1024/max(image.size);image.scale(round(image.size[0]*scale),round(image.size[1]*scale))
                image.pack()
        alpha_cutout(material)
    bpy.data.objects.remove(prototype,do_unlink=True)
    # Appended IDs are local, but Blender keeps source-file reuse hints. These
    # weak references are enumerated by blend_paths even when all image data is
    # packed. Clear only this asset's hints so the production file travels alone.
    weak_references_cleared=0
    for datablock in bpy.data.all_ids:
        reference=datablock.library_weak_reference
        if reference and not datablock.library and Path(reference.filepath).name==source.name:
            reference.filepath='';reference.id_name='';weak_references_cleared+=1
    # pack_all can normalize an empty reuse hint into a drive root. Clear these
    # unused hints again immediately before saving, after the builder packs data.
    # This only touches local reuse metadata, never a linked asset or image path.
    def clear_empty_reuse_before_save(*args):
        for datablock in bpy.data.all_ids:
            reference=datablock.library_weak_reference
            if reference and not datablock.library and not reference.id_name:
                reference.filepath=''
    bpy.app.handlers.save_pre.append(clear_empty_reuse_before_save)
    report={'source':'https://polyhaven.com/a/tree_small_02','credit':'Rico Cilliers / Poly Haven','license':'CC0',
            'lod':'LOD1','sharedMeshes':1,'instances':count,'replacedWebTrees':len(selected),
            'verticesStoredOnce':len(mesh.vertices),'polygonsStoredOnce':len(mesh.polygons),'packed':True,
            'sourceReuseReferencesCleared':weak_references_cleared,
            'scope':'Cycles production only; lightweight GLB and walking geometry unchanged.'}
    return report
