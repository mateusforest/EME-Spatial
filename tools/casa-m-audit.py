"""Read the supplied Casa M master without modifying it."""
import bpy, json, sys
from pathlib import Path
from mathutils import Vector

out = Path(sys.argv[sys.argv.index('--') + 1])
scene = bpy.context.scene
def bounds(o):
    pts = [o.matrix_world @ Vector(v) for v in o.bound_box]
    return [[round(min(v[i] for v in pts), 4) for i in range(3)], [round(max(v[i] for v in pts), 4) for i in range(3)]]
data = {'objects': [], 'materials': [], 'cameras': []}
for o in scene.objects:
    if o.type in ('MESH', 'CURVE'):
        data['objects'].append({'name': o.name, 'mesh': o.data.name, 'type':o.type, 'bounds':bounds(o), 'hidden':o.hide_render, 'collections':[c.name for c in o.users_collection], 'materials':[m.name if m else '' for m in o.data.materials], 'props':dict(o.items()), 'vertices':len(o.data.vertices) if o.type=='MESH' else 0, 'modifiers':[(m.name,m.type) for m in o.modifiers]})
    if o.type=='CAMERA':
        pos=o.matrix_world.translation; target=pos+o.matrix_world.to_quaternion()@Vector((0,0,-5))
        data['cameras'].append({'name':o.name,'position':list(pos),'target':list(target),'fov':o.data.angle})
for m in bpy.data.materials:
    if not m.users:continue
    p=next((n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None) if m.use_nodes else None
    data['materials'].append({'name':m.name,'color':list(m.diffuse_color),'inputs':{k:('linked' if p.inputs[k].is_linked else list(p.inputs[k].default_value) if k in ('Base Color','Emission Color') else p.inputs[k].default_value) for k in ('Base Color','Roughness','Metallic','Transmission Weight','Emission Color','Emission Strength')} if p else {},'images':[(n.name,n.image.name) for n in m.node_tree.nodes if n.type=='TEX_IMAGE' and n.image] if m.use_nodes else []})
out.parent.mkdir(parents=True,exist_ok=True)
out.write_text(json.dumps(data,ensure_ascii=False,indent=2,default=str),encoding='utf8')
print('AUDIT_READY',len(data['objects']),len(data['materials']),len(data['cameras']),flush=True)
