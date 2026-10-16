"""Preserve complete native leaf cards instead of collapsing their alpha UVs."""
import bpy,bmesh,sys
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[1]
(root/'conteudos/casa-m/web-components').mkdir(exist_ok=True)
source=Path(r'C:\Users\EME\Documents\Codex\2026-10-09\files-mentioned-by-the-user-casa\outputs\Casa-M-V15-Segundo-Andar.blend')
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
with bpy.data.libraries.load(str(source),link=False) as (available,loaded):
    loaded.objects=['Vegetacao V08 | tree_small_02']
tree=loaded.objects[0];bpy.context.scene.collection.objects.link(tree);tree.matrix_world.identity()
far='--far' in sys.argv;density=16 if far else 50
mesh=tree.data;bm=bmesh.new();bm.from_mesh(mesh);seen=set();remove=[];i=0
for vertex in bm.verts:
    if vertex in seen:continue
    stack=[vertex];seen.add(vertex);component=[]
    while stack:
        v=stack.pop();component.append(v)
        for edge in v.link_edges:
            other=edge.other_vert(v)
            if other not in seen:seen.add(other);stack.append(other)
    i+=1
    # Keep complete islands, never decimate leaves. Branches remain intact.
    if len(component)<500:
        if (i*2654435761)%100>=density:remove.extend(component)
        else:
            # Compensate for thinned foliage by enlarging complete native islands
            # before export (never disconnected index triangles in the browser).
            center=sum((v.co for v in component),Vector())/len(component)
            for v in component:v.co=center+(v.co-center)*(2.3 if far else 1.5)
bmesh.ops.delete(bm,geom=remove,context='VERTS');bm.to_mesh(mesh);bm.free();mesh.update()
print('TREE_VERTICES',len(mesh.vertices),flush=True)
for m in mesh.materials:
    if 'leaves' not in m.name:continue
    images=[n.image for n in m.node_tree.nodes if n.type=='TEX_IMAGE' and n.image]
    diff=next(im for im in images if 'diff' in im.name);alpha=next(im for im in images if 'alpha' in im.name)
    m.node_tree.nodes.clear();n=m.node_tree.nodes;l=m.node_tree.links;p=n.new('ShaderNodeBsdfPrincipled');p.inputs['Roughness'].default_value=1
    out=n.new('ShaderNodeOutputMaterial');l.new(p.outputs[0],out.inputs[0])
    for im,slot in [(diff,'Base Color'),(alpha,'Alpha')]:
        t=n.new('ShaderNodeTexImage');t.image=im;l.new(t.outputs['Color'],p.inputs[slot])
    m.surface_render_method='DITHERED';m.use_backface_culling=False
for im in bpy.data.images:
    if max(im.size)>1024 and im.size[1]:
        ratio=1024/max(im.size);im.scale(int(im.size[0]*ratio),int(im.size[1]*ratio))
bpy.context.view_layer.objects.active=tree;tree.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(root/('conteudos/casa-m/web-components/tree-v4-far.glb' if far else 'conteudos/casa-m/web-components/tree-v4.glb')),export_format='GLB',use_selection=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,export_extras=True)
