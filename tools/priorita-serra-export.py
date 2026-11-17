"""Exporta o entorno do Priorità v8 para a web: relevo, vegetação (geometria base + instâncias) e extras."""
import bpy, bmesh, json, math, os
from mathutils import Vector, noise

bpy.ops.wm.open_mainfile(filepath='/home/claude/priorita/Priorita-v8.blend')
D = bpy.data
OUT = '/home/claude/priorita/web'
os.makedirs(OUT, exist_ok=True)

def only(objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.hide_set(False); o.hide_viewport = False; o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]

def export(path, objs):
    only(objs)
    bpy.ops.export_scene.gltf(filepath=path, use_selection=True, export_format='GLB', export_apply=True,
        export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7,
        export_draco_position_quantization=14, export_draco_normal_quantization=8, export_draco_color_quantization=8,
        export_yup=True, export_materials='EXPORT', export_extras=False, export_lights=False, export_cameras=False)
    print('GLB', os.path.basename(path), round(os.path.getsize(path) / 1e6, 2), 'MB')

def hex2(h):
    h = h.lstrip('#'); return tuple((int(h[i:i+2], 16) / 255) ** 2.2 for i in (0, 2, 4))
C0, C1, C2 = hex2('#5f6e35'), hex2('#77773f'), hex2('#968a55')
def campo_color(x, y):
    t = 0.5 + 0.5 * noise.noise(Vector((x / 250, y / 250, 0.7)))
    f = 0.9 + 0.2 * (0.5 + 0.5 * noise.noise(Vector((x / 40, y / 40, 2.1))))
    a, b, k = (C0, C1, t / 0.5) if t < 0.5 else (C1, C2, (t - 0.5) / 0.5)
    k = max(0, min(1, k))
    return tuple(min(1, (a[i] * (1 - k) + b[i] * k) * f) for i in range(3))

# ---------------- relevo com cor por vértice
mat = D.materials.new('Campo nativo web'); mat.use_nodes = True
b = mat.node_tree.nodes['Principled BSDF']; b.inputs['Roughness'].default_value = 1.0
ca = mat.node_tree.nodes.new('ShaderNodeVertexColor'); ca.layer_name = 'Col'
mat.node_tree.links.new(ca.outputs['Color'], b.inputs['Base Color'])
terr = []
for name in ('V8 · Relevo Campos de Cima da Serra', 'V8 · Costura do terreno'):
    o = D.objects[name]; me = o.data
    attr = me.color_attributes.new('Col', 'BYTE_COLOR', 'POINT')
    for v in me.vertices:
        c = campo_color(v.co.x, v.co.y); attr.data[v.index].color = (*c, 1)
    me.materials.clear(); me.materials.append(mat); terr.append(o)
export(f'{OUT}/serra-terrain.glb', terr)

# ---------------- geometria base da vegetação (araucária 23 m e mata 9 m), reduzida
def prep(colname, ratio):
    col = D.collections[colname]; parts = []
    for o in col.objects:
        c = o.copy(); c.data = o.data.copy(); bpy.context.scene.collection.objects.link(c)
        if 'copa' in o.name or colname.startswith('V8 · Mata'):
            m = c.modifiers.new('dec', 'DECIMATE'); m.ratio = ratio
        parts.append(c)
    return parts
ar = prep('V8 · Araucária 23 m', 0.45)
for p in ar: p.name = 'araucaria-' + ('copa' if 'copa' in p.name else 'tronco')
mt = prep('V8 · Mata 9 m', 1.0)
for p in mt: p.name = 'mata-copa'
export(f'{OUT}/serra-vegetation.glb', ar + mt)
for p in ar + mt:
    dg = bpy.context.evaluated_depsgraph_get(); ev = p.evaluated_get(dg)
    print(p.name, 'tris', sum(len(f.vertices) - 2 for f in ev.to_mesh().polygons))

# ---------------- instâncias (coordenadas three.js: x, y=z, z=-y)
inst = []
for o in D.collections['V8 · 02 Capões de araucária'].objects:
    c = o.instance_collection
    if not c: continue
    if c.name.startswith('V8 · Araucária'):
        k = 0; h = float(c.name.split()[3]) / 23
    else:
        k = 1; h = float(c.name.split()[3]) / 9
    s = o.scale.x * h
    inst.append([k, round(o.location.x, 1), round(o.location.z, 1), round(-o.location.y, 1), round(o.rotation_euler.z, 2), round(s, 2)])
json.dump(inst, open(f'{OUT}/serra-instances.json', 'w'), separators=(',', ':'))
print('instâncias', len(inst), round(os.path.getsize(f'{OUT}/serra-instances.json') / 1e3), 'KB')

# ---------------- extras: estrada, portaria, muro, casas
road_mat = D.materials.new('Asfalto rural'); road_mat.use_nodes = True
rb = road_mat.node_tree.nodes['Principled BSDF']; rb.inputs['Base Color'].default_value = (*hex2('#4a4a4a'), 1); rb.inputs['Roughness'].default_value = 0.9
r = D.objects['V8 · Estrada de acesso']; r.data.materials.clear(); r.data.materials.append(road_mat)
extras = list(D.collections['V8 · 03 Acesso e portaria'].objects) + list(D.collections['V8 · 04 Casas ilustrativas (lotes vendidos)'].objects)
export(f'{OUT}/serra-extras.glb', extras)
