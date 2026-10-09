"""Lightweight layered, illustrative third-floor surroundings for Botanique.

Call apply_balcony_context() after build_unit(), before finishes/mesh batching.
All generated objects have role=context and context_only/exclude_from_bounds.
No unit geometry, camera, light, render settings or navigation record is changed.
"""
from __future__ import annotations

import json
import math
import random
from pathlib import Path


def apply_balcony_context(asset_root=None):
    import bpy
    import bmesh
    from mathutils import Matrix, Vector

    root = Path(asset_root) if asset_root else Path.home() / 'Documents/Codex/RenderNetwork/Projetos/Botanique-Home-Resort/02-modelos/assets'
    # Remove exactly the generated old unit context. Never delete arbitrary
    # role=context meshes belonging to another project or architecture layer.
    removed = []
    for obj in list(bpy.data.objects):
        if obj.name.startswith('B_UNIT_CONTEXT') and (obj.get('context_only') or obj.get('role') == 'context'):
            removed.append(obj.name)
            bpy.data.objects.remove(obj, do_unlink=True)
    collection = bpy.data.collections.get('B_UNIT_CONTEXT6') or bpy.data.collections.new('B_UNIT_CONTEXT6')
    if collection.name not in bpy.context.scene.collection.children:
        bpy.context.scene.collection.children.link(collection)
    rng = random.Random(6102026)
    objects, materials, batches = [], {}, {}

    def tag(obj):
        obj['project'] = 'botanique'
        obj['role'] = 'context'
        obj['context_only'] = True
        obj['exclude_from_bounds'] = True
        obj['estimated_geometry'] = True
        obj['context_revision'] = 6
        objects.append(obj)
        return obj

    def material(key, color, roughness=.9):
        mat = bpy.data.materials.get(key) or bpy.data.materials.new(key)
        mat.use_nodes = True
        p = mat.node_tree.nodes.get('Principled BSDF')
        p.inputs['Base Color'].default_value = (*color, 1)
        p.inputs['Roughness'].default_value = roughness
        mat.diffuse_color = (*color, 1)
        materials[key] = mat
        return mat

    grass = material('B_CONTEXT6_GRASS', (.11, .17, .065))
    grass_shade = material('B_CONTEXT6_GRASS_SHADE', (.085, .135, .055))
    paving = material('B_CONTEXT6_PATH', (.49, .48, .42), .87)
    curb = material('B_CONTEXT6_CURB', (.57, .55, .48), .83)
    road = material('B_CONTEXT6_ROAD', (.12, .135, .135), .95)
    bark = material('B_CONTEXT6_BARK', (.145, .115, .075), .94)
    facade = material('B_CONTEXT6_LOWER_FACADE', (.55, .54, .48), .87)
    soil = material('B_CONTEXT6_GARDEN', (.073, .083, .039), 1)
    material_root=Path(__file__).resolve().parents[1]/'public/assets/botanique/materials/v6'
    for mat,family in [(grass,'grass'),(grass_shade,'grass'),(paving,'paving'),(road,'asphalt')]:
        nodes=mat.node_tree.nodes;links=mat.node_tree.links;p=nodes.get('Principled BSDF')
        for role in ('color','normal'):
            path=material_root/('context-'+family+'-'+role+'.png')
            if not path.is_file():raise FileNotFoundError('Generate v6 context maps before building: '+str(path))
            im=bpy.data.images.load(str(path),check_existing=True)
            im.colorspace_settings.name='sRGB' if role=='color' else 'Non-Color';im.pack()
            tex=nodes.new('ShaderNodeTexImage');tex.image=im
            if role=='color':links.new(tex.outputs['Color'],p.inputs['Base Color'])
            else:
                normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.35
                links.new(tex.outputs['Color'],normal.inputs['Color']);links.new(normal.outputs['Normal'],p.inputs['Normal'])

    def face(key, vertices, polygons, uv=None):
        batch = batches.setdefault(key, {'vertices':[], 'polygons':[], 'uv':[]})
        offset = len(batch['vertices'])
        batch['vertices'].extend(tuple(v) for v in vertices)
        for poly in polygons:
            batch['polygons'].append(tuple(offset+i for i in poly))
            batch['uv'].append([uv[i] if uv else (vertices[i][0]/3, vertices[i][1]/3) for i in poly])

    def box(key, center, size):
        x,y,z = center; a,b,c = (d/2 for d in size)
        verts=[(x+sx*a,y+sy*b,z+sz*c) for sz in (-1,1) for sy in (-1,1) for sx in (-1,1)]
        face(key,verts,[(0,2,3,1),(4,5,7,6),(0,1,5,4),(2,6,7,3),(0,4,6,2),(1,3,7,5)])

    def tube(key, start, end, radius, top=None, sides=6):
        a,b=Vector(start),Vector(end);direction=(b-a).normalized()
        seed=Vector((0,0,1)) if abs(direction.z)<.9 else Vector((1,0,0))
        right=direction.cross(seed).normalized();up=direction.cross(right).normalized()
        verts=[]
        for origin,r in ((a,radius),(b,top if top is not None else radius)):
            verts += [origin+(right*math.cos(i*math.tau/sides)+up*math.sin(i*math.tau/sides))*r for i in range(sides)]
        face(key,verts,[(i,(i+1)%sides,(i+1)%sides+sides,i+sides) for i in range(sides)])

    def ground_height(x,y):
        # Apartment datum remains 0. Only the external landscape is lowered.
        rise=max(0,min(1,(-y-30)/95))
        return -8.70+.005*x+rise*(1.8+.8*math.sin(x*.07))

    # The near garden, two pavements and road make elevation immediately legible.
    # This is scenery, not a surveyed street or a proposed site plan.
    for x in range(-110,111,11):
        for y in range(-132,34,11):
            verts=[(xx,yy,ground_height(xx,yy)) for xx,yy in ((x,y),(x+11,y),(x+11,y+11),(x,y+11))]
            face(grass.name if rng.random()>.32 else grass_shade.name,verts,[(0,1,2,3)])
    for x in range(-110,111,5):
        z=ground_height(x,-15)
        box(road.name,(x+2.5,-14.7,z+.015),(5.02,7.0,.09))
        for y in (-10.5,-18.9):
            box(paving.name,(x+2.5,y,z+.085),(4.98,1.25,.16))
        for y in (-11.18,-18.20): box(curb.name,(x+2.5,y,z+.11),(5,.15,.24))
        # Narrow joints, no oversized grid visible from the apartment.
        for xx in (x,x+2.5):
            for y in (-10.5,-18.9): box(soil.name,(xx,y,z+.169),(.018,1.22,.004))
    for x,y,sx,sy in [(-7,-4,8,5),(16,-4,9,5),(-24,-6,13,3),(29,-6,13,3)]:
        z=ground_height(x,y)
        box(soil.name,(x,y,z+.045),(sx,sy,.075))
        for edge in (-1,1): box(curb.name,(x,y+edge*sy/2,z+.09),(sx,.12,.17))
    # Building volume below the selected unit. It is hidden with the context
    # in plan mode and never affects the Final 1 layout/collision model.
    box(facade.name,(3.58,4.0,-4.42),(7.40,8.2,8.50))
    for z in (-2.81,-5.59,-8.37):
        box(paving.name,(5.86,.60,z),(2.65,1.38,.13))

    packed = {}
    def pack_material_images(mat):
        if not mat or not mat.use_nodes: return
        for node in mat.node_tree.nodes:
            if node.type != 'TEX_IMAGE' or not node.image: continue
            source=node.image
            if source.name not in packed:
                im=source.copy()
                im.name='B_CONTEXT6_'+source.name
                if max(im.size)>512:
                    ratio=512/max(im.size);im.scale(max(1,round(im.size[0]*ratio)),max(1,round(im.size[1]*ratio)))
                im.pack();packed[source.name]=im
            node.image=packed[source.name]
        p=mat.node_tree.nodes.get('Principled BSDF')
        if p:
            p.inputs['Roughness'].default_value=.88
            if p.inputs['Alpha'].is_linked:
                old=p.inputs['Alpha'].links[0];socket=old.from_socket;mat.node_tree.links.remove(old)
                mask=mat.node_tree.nodes.new('ShaderNodeMath');mask.operation='ROUND'
                mat.node_tree.links.new(socket,mask.inputs[0]);mat.node_tree.links.new(mask.outputs[0],p.inputs['Alpha'])
                mat.surface_render_method='DITHERED';mat.use_backface_culling=False
                mat['alpha_mode']='MASK';mat['alpha_cutoff']=.5

    # Close forest layer: real photographic broadleaf colour on leaf-shaped
    # geometry, rather than atlas-wide cards. The source atlas contains white
    # packing strips outside its leaf islands; those strips must never appear.
    leaf=material('B_CONTEXT6_BROADLEAF',(.075,.16,.045),.94)
    nodes=leaf.node_tree.nodes;links=leaf.node_tree.links;p=nodes.get('Principled BSDF')
    source=root/'tree_small_02/textures/tree_small_02_leaves_diff_1k.png'
    im=bpy.data.images.load(str(source),check_existing=False)
    im.name='B_CONTEXT6_BROADLEAF_DIFF';im.colorspace_settings.name='sRGB'
    if max(im.size)>512:im.scale(512,512)
    im.pack();tex=nodes.new('ShaderNodeTexImage');tex.image=im
    links.new(tex.outputs['Color'],p.inputs['Base Color'])
    # Coordinates stay strictly inside one green photographed leaf. Each mesh
    # has the leaf silhouette already, so no transparency/white atlas bleed.
    leaf_pixels=[(744,254),(751,219),(785,193),(826,181),
                 (843,199),(836,236),(809,264),(774,278)]
    leaf_uv=[(x/1024,1-y/1024) for x,y in leaf_pixels]
    outline=[(-.42,-.22),(-.47,.10),(-.26,.40),(.12,.50),
             (.42,.26),(.43,-.13),(.16,-.45),(-.22,-.48)]
    trees=[(-8,-6,11.5,4200),(18,-5,12.7,4600),
           (-5,-30,15.0,2100),(17,-32,16.0,2100),
           (-26,-26,15.6,2100),(34,-22,14.6,2100),
           (-32,13,14.3,1800),(35,14,15.2,1800)]
    leaf_count=0
    for tree_index,(x,y,h,count) in enumerate(trees):
        z=ground_height(x,y);r=h*.255
        tube(bark.name,(x,y,z),(x+.15,y,z+h*.69),h*.017,h*.008,8)
        lobes=[]
        for branch in range(6):
            a=branch*2.399+tree_index*.7
            spread=r*(.50 if branch<5 else .10)
            center=Vector((x+math.cos(a)*spread,y+math.sin(a)*spread,z+h*(.67+.04*(branch%3))))
            lobes.append(center)
            tube(bark.name,(x,y,z+h*.43),center,.075,.018,6)
        for i in range(count):
            # Overlapping ellipsoids produce a full asymmetric crown. Higher
            # density is used on the first two trees at balcony eye level.
            center=lobes[i%len(lobes)]
            a=rng.random()*math.tau;v=rng.uniform(-1,1);q=(1-v*v)**.5
            radial=rng.random()**(1/3)
            point=center+Vector((math.cos(a)*q*r*.68*radial,
                                  math.sin(a)*q*r*.68*radial,v*h*.20*radial))
            az=rng.random()*math.tau
            direction=Vector((math.cos(az),math.sin(az),rng.uniform(-.5,.9))).normalized()
            side=Vector((-math.sin(az),math.cos(az),rng.uniform(-.65,.65))).normalized()
            length=rng.uniform(.30,.44) if tree_index<2 else rng.uniform(.43,.61)
            width=length*.68
            verts=[point+side*(u*width)+direction*(v*length)+Vector((0,0,.022*abs(u))) for u,v in outline]
            face(leaf.name,verts,[(0,1,2),(0,2,3),(0,3,4),(0,4,5),(0,5,6),(0,6,7)],leaf_uv)
            leaf_count+=1

    # Three large distant bands share one RGBA image and one material. They
    # are diffuse surfaces (no emission), so the viewer's daylight/night
    # settings naturally change their brightness. The image is illustrative.
    backdrop_path=material_root/'woodland-backdrop.png'
    if not backdrop_path.is_file():raise FileNotFoundError(str(backdrop_path))
    forest=material('B_CONTEXT6_FOREST_BACKDROP',(.12,.18,.07),1)
    nodes=forest.node_tree.nodes;links=forest.node_tree.links;p=nodes.get('Principled BSDF')
    p.inputs['Specular IOR Level'].default_value=0
    backdrop=bpy.data.images.load(str(backdrop_path),check_existing=True)
    backdrop.colorspace_settings.name='sRGB';backdrop.pack()
    tex=nodes.new('ShaderNodeTexImage');tex.image=backdrop;tex.extension='CLIP'
    links.new(tex.outputs['Color'],p.inputs['Base Color'])
    mask=nodes.new('ShaderNodeMath');mask.operation='ROUND'
    links.new(tex.outputs['Alpha'],mask.inputs[0]);links.new(mask.outputs[0],p.inputs['Alpha'])
    forest.surface_render_method='DITHERED';forest.use_backface_culling=False
    forest['alpha_mode']='MASK';forest['alpha_cutoff']=.5
    z=-8.7
    for corners in [
        [(-95,-82,z),(95,-82,z),(95,-82,z+43),(-95,-82,z+43)],
        [(-82,85,z),(-82,-95,z),(-82,-95,z+42),(-82,85,z+42)],
        [(82,-95,z),(82,85,z),(82,85,z+42),(82,-95,z+42)],
    ]:
        face(forest.name,corners,[(0,1,2,3)],[(0,0),(1,0),(1,1),(0,1)])

    for key,batch in batches.items():
        mesh=bpy.data.meshes.new(key);mesh.from_pydata(batch['vertices'],[],batch['polygons']);mesh.materials.append(materials[key]);mesh.update()
        uv=mesh.uv_layers.new(name='B_CONTEXT6_UV')
        for polygon,coords in zip(mesh.polygons,batch['uv']):
            for index,value in zip(polygon.loop_indices,coords):uv.data[index].uv=value
        obj=bpy.data.objects.new('B_UNIT_CONTEXT6_'+key,mesh);collection.objects.link(obj);tag(obj)
        if key==forest.name:
            obj['noShadow']=True;obj.visible_shadow=False
            obj['source']='woodland-backdrop-provenance.json';obj['measured_view']=False
    triangles=0
    for obj in objects:
        obj.data.calc_loop_triangles();triangles+=len(obj.data.loop_triangles)
    report={'schema':'eme.botanique.balcony-context/6','role':'context','measured_view':False,
            'floor':'3rd floor, illustrative and unconfirmed','groundDatum':-8.70,'coordinateSystem':'BLENDER_Z_UP',
            'layers':['near garden','street and two pavements below unit','dense 3D broadleaf crowns','three distant photographic forest bands'],
            'foliage_revision':'Leaf-shaped geometry samples only verified green UV islands, excluding white atlas packing strips. No sampled/discarded source leaves or enlarged brown shrubs.',
            'sourceTreeTriangles':495533,'sourceLeafTriangles':386574,'sourceLeafIslands':63152,
            'realTrees':0,'proceduralTrees':len(trees),'individualLeaves':leaf_count,'farTwigTrees':0,'shrubs':0,
            'backdropPlanes':3,'backdropRangeMetres':[82,95],'backdropNoShadow':True,
            'backdropSource':'public/assets/botanique/materials/v6/woodland-backdrop-provenance.json',
            'objects':len(objects),'triangles':triangles,'previousContextRemoved':removed,
            'navigation_changed':False,'interior_geometry_changed':False,
            'plan_visibility':'role=context is exported in B_UNIT_ROOF bucket; context_only and exclude_from_bounds on originals',
            'source':'https://polyhaven.com/a/tree_small_02','leafTextureLicense':'CC0',
            'note':'Illustrative atmosphere and third-floor depth only. No measured terrain, street alignment, vegetation species or geographic view is claimed.'}
    bpy.context.scene['botanique_balcony_context']=json.dumps(report,ensure_ascii=False)
    return report
