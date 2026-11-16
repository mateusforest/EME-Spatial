"""Export the approved conceptual Blender source without modifying its file."""
import bpy, sys, math, json
from pathlib import Path
from collections import defaultdict

args=sys.argv[sys.argv.index('--')+1:]
source, destination=map(Path,args[:2])
bpy.ops.wm.open_mainfile(filepath=str(source))
scene=bpy.data.scenes['EME_Circular_Conceito']
bpy.context.window.scene=scene
destination.mkdir(parents=True,exist_ok=True)

# glTF carries efficient PBR values. Procedural Cycles nodes are not portable.
for material in bpy.data.materials:
    if not material.use_nodes: continue
    bs=material.node_tree.nodes.get('Principled BSDF')
    if not bs: continue
    for link in list(material.node_tree.links):
        if link.to_node==bs: material.node_tree.links.remove(link)
    bs.inputs['Base Color'].default_value=material.diffuse_color
    if 'Vidro' in material.name:
        bs.inputs['Transmission Weight'].default_value=0
        bs.inputs['Base Color'].default_value=(.37,.53,.57,.24)
        bs.inputs['Alpha'].default_value=.24
        bs.inputs['Roughness'].default_value=.16
        material.surface_render_method='DITHERED'
    if 'Agua' in material.name:
        bs.inputs['Transmission Weight'].default_value=0
        bs.inputs['Metallic'].default_value=.4

def export_part(filename, group_names, exclude=()):
    collection=bpy.data.collections.new('WEB_'+filename)
    scene.collection.children.link(collection)
    clones=[]
    for group_name in group_names:
        for src in list(bpy.data.collections[group_name].objects):
            if src.type!='MESH' or any(src.name.startswith(x) for x in exclude): continue
            deps=bpy.context.evaluated_depsgraph_get()
            me=bpy.data.meshes.new_from_object(src.evaluated_get(deps),depsgraph=deps)
            if len(me.polygons)==580 and len(me.vertices)==725:
                simple=bpy.data.meshes.new(src.name+'_leaves_web')
                simple.from_pydata([v.co for v in me.vertices],[],[(i,i+1,i+2,i+3) for i in range(0,725,10)])
                for mat in me.materials: simple.materials.append(mat)
                for p in simple.polygons: p.material_index=me.polygons[p.index*8].material_index
                bpy.data.meshes.remove(me)
                me=simple
            ob=bpy.data.objects.new(src.name+'_web',me)
            collection.objects.link(ob)
            ob.matrix_world=src.matrix_world.copy()
            clones.append(ob)
    # Merge static geometry by material. Keeps download and draw calls bounded.
    bpy.ops.object.select_all(action='DESELECT')
    for ob in clones: ob.select_set(True)
    bpy.context.view_layer.objects.active=clones[0]
    bpy.ops.object.join()
    joined=bpy.context.object
    joined.name='EME_'+filename
    bpy.ops.export_scene.gltf(filepath=str(destination/(filename+'.glb')),
        export_format='GLB',use_selection=True,use_active_scene=True,export_yup=True,
        export_cameras=False,export_lights=False,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
        export_extras=False)
    triangles=sum(len(p.vertices)-2 for p in joined.data.polygons)
    bpy.data.objects.remove(joined,do_unlink=True)
    return {'triangles':triangles,'bytes':(destination/(filename+'.glb')).stat().st_size}

stats={}
stats['tower']=export_part('tower',['01_Estrutura','02_Fachada','03_Paisagismo','05_Rooftop'],('Terreno',))
stats['apartment']=export_part('apartment',['04_Apartamento'])
stats['source']=source.name
stats['note']='Conceptual model. AI references are visual direction, not renders of this mesh. Illustrative location and solar lighting.'
(destination/'model.json').write_text(json.dumps(stats,indent=2),encoding='utf-8')
print(json.dumps(stats))
