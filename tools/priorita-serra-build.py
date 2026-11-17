"""Priorità v8 — entorno Campos de Cima da Serra (fictício, coerente com Vacaria/RS).
Roda em bpy headless: abre base.blend (cópia), adiciona entorno e salva Priorita-v8.blend.
"""
import bpy, bmesh, math, random
from mathutils import Vector, noise

SRC = '/home/claude/priorita/base.blend'
OUT = '/home/claude/priorita/Priorita-v8.blend'
bpy.ops.wm.open_mainfile(filepath=SRC)
D = bpy.data
scene = bpy.context.scene
rng = random.Random(8)

def smooth(a, b, v):
    t = max(0.0, min(1.0, (v - a) / (b - a)))
    return t * t * (3 - 2 * t)

root = D.collections.new('V8 · Entorno Serra Gaúcha')
scene.collection.children.link(root)
def sub(name):
    c = D.collections.new(name); root.children.link(c); return c

ground = D.objects['Grama · PBR Poly Haven']
def ground_z(x, y):
    hit, loc, *_ = ground.ray_cast(Vector((x, y, 200)), Vector((0, 0, -1)))
    return loc.z if hit else None

# ---------------------------------------------------------------- materiais
def principled(name, color, rough=0.8, **kw):
    m = D.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = rough
    for k, v in kw.items(): b.inputs[k].default_value = v
    return m

def hex2(h):
    h = h.lstrip('#'); c = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x ** 2.2 for x in c)

def campo_material():
    """Campo nativo: palha, oliva e verde em manchas + perspectiva aérea pela distância."""
    m = D.materials.new('V8 · Campo nativo'); m.use_nodes = True
    nt = m.node_tree; N = nt.nodes; L = nt.links
    bsdf = N['Principled BSDF']; bsdf.inputs['Roughness'].default_value = 0.95
    tc = N.new('ShaderNodeTexCoord')
    big = N.new('ShaderNodeTexNoise'); big.inputs['Scale'].default_value = 0.004; big.inputs['Detail'].default_value = 6
    fine = N.new('ShaderNodeTexNoise'); fine.inputs['Scale'].default_value = 0.08; fine.inputs['Detail'].default_value = 8
    L.new(tc.outputs['Object'], big.inputs['Vector']); L.new(tc.outputs['Object'], fine.inputs['Vector'])
    ramp = N.new('ShaderNodeValToRGB'); cr = ramp.color_ramp
    cr.elements[0].position = 0.35; cr.elements[0].color = (*hex2('#7c8a45'), 1)
    cr.elements[1].position = 0.65; cr.elements[1].color = (*hex2('#b3a46a'), 1)
    e = cr.elements.new(0.5); e.color = (*hex2('#8f9650'), 1)
    L.new(big.outputs['Fac'], ramp.inputs['Fac'])
    mixf = N.new('ShaderNodeMix'); mixf.data_type = 'RGBA'; mixf.blend_type = 'MULTIPLY'
    mixf.inputs['Factor'].default_value = 0.35
    fr = N.new('ShaderNodeValToRGB'); fr.color_ramp.elements[0].color = (0.75, 0.75, 0.7, 1); fr.color_ramp.elements[1].color = (1.1, 1.1, 1.05, 1)
    L.new(fine.outputs['Fac'], fr.inputs['Fac'])
    L.new(ramp.outputs['Color'], mixf.inputs['A']); L.new(fr.outputs['Color'], mixf.inputs['B'])
    # perspectiva aérea
    cam = N.new('ShaderNodeCameraData')
    mr = N.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = 600; mr.inputs['From Max'].default_value = 7000
    mr.interpolation_type = 'SMOOTHSTEP'
    L.new(cam.outputs['View Z Depth'], mr.inputs['Value'])
    haze = N.new('ShaderNodeMix'); haze.data_type = 'RGBA'
    haze.inputs['B'].default_value = (*hex2('#a9b9c9'), 1)
    L.new(mr.outputs['Result'], haze.inputs['Factor']); L.new(mixf.outputs['Result'], haze.inputs['A'])
    L.new(haze.outputs['Result'], bsdf.inputs['Base Color'])
    bump = N.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.25
    L.new(fine.outputs['Fac'], bump.inputs['Height']); L.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    return m

CAMPO = campo_material()
BARK = principled('V8 · Casca araucária', hex2('#5a4a3c'), 0.9)
NEEDLE = principled('V8 · Folhagem araucária', hex2('#2c4326'), 0.75)
NEEDLE.node_tree.nodes['Principled BSDF'].inputs['Subsurface Weight'].default_value = 0.0
MATA = principled('V8 · Mata nativa', hex2('#34502c'), 0.8)
BASALTO = principled('V8 · Basalto', hex2('#5d5a55'), 0.85)
REBOCO = principled('V8 · Reboco claro', hex2('#e6e1d6'), 0.7)
MADEIRA = principled('V8 · Madeira', hex2('#7a5236'), 0.6)
VIDRO = principled('V8 · Vidro escuro', hex2('#1f272c'), 0.08, Metallic=0.2)
TELHA = principled('V8 · Cobertura grafite', hex2('#3a3c3e'), 0.6)
ASFALTO = D.materials['Asfalto · agregado fino · Cycles bake'] if 'Asfalto · agregado fino · Cycles bake' in D.materials else D.objects['Asfalto · agregado fino · Cycles bake'].data.materials[0]

# ---------------------------------------------------------------- 1. tirar árvores soltas fora do loteamento
def outside_site(p):
    return p.x < -135 or p.x > 120 or p.y < -150 or p.y > 190
hidden = 0
for o in D.collections['06 | Paisagismo v7 para render'].all_objects:
    if outside_site(o.location):
        o.hide_render = o.hide_viewport = True; hidden += 1
print('árvores soltas ocultadas', hidden)

# ---------------------------------------------------------------- 2. gramado só no loteamento, campo nativo fora
gm = ground.data.materials[0]; nt = gm.node_tree; bsdf = nt.nodes['Principled BSDF']
src = bsdf.inputs['Base Color'].links[0].from_socket
tc = nt.nodes.new('ShaderNodeTexCoord')
sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Object'], sep.inputs['Vector'])
# distância "retangular" ao loteamento (|x| e |y| relativos ao centro do terreno)
ax = nt.nodes.new('ShaderNodeMath'); ax.operation = 'ABSOLUTE'; nt.links.new(sep.outputs['X'], ax.inputs[0])
offy = nt.nodes.new('ShaderNodeMath'); offy.operation = 'SUBTRACT'; offy.inputs[1].default_value = 20
nt.links.new(sep.outputs['Y'], offy.inputs[0])
ay = nt.nodes.new('ShaderNodeMath'); ay.operation = 'ABSOLUTE'; nt.links.new(offy.outputs[0], ay.inputs[0])
sx = nt.nodes.new('ShaderNodeMath'); sx.operation = 'MULTIPLY'; sx.inputs[1].default_value = 1.3; nt.links.new(ax.outputs[0], sx.inputs[0])
mx = nt.nodes.new('ShaderNodeMath'); mx.operation = 'MAXIMUM'; nt.links.new(sx.outputs[0], mx.inputs[0]); nt.links.new(ay.outputs[0], mx.inputs[1])
wob = nt.nodes.new('ShaderNodeTexNoise'); wob.inputs['Scale'].default_value = 0.03
nt.links.new(tc.outputs['Object'], wob.inputs['Vector'])
wob2 = nt.nodes.new('ShaderNodeMath'); wob2.operation = 'MULTIPLY_ADD'; wob2.inputs[1].default_value = 30; wob2.inputs[2].default_value = -15
nt.links.new(wob.outputs['Fac'], wob2.inputs[0])
addw = nt.nodes.new('ShaderNodeMath'); addw.operation = 'ADD'; nt.links.new(mx.outputs[0], addw.inputs[0]); nt.links.new(wob2.outputs[0], addw.inputs[1])
mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = 168; mr.inputs['From Max'].default_value = 205
mr.interpolation_type = 'SMOOTHSTEP'; nt.links.new(addw.outputs[0], mr.inputs['Value'])
# cor de campo (reaproveita o ramp do material de campo como grupo simples)
cn = nt.nodes.new('ShaderNodeTexNoise'); cn.inputs['Scale'].default_value = 0.012; cn.inputs['Detail'].default_value = 6
nt.links.new(tc.outputs['Object'], cn.inputs['Vector'])
cramp = nt.nodes.new('ShaderNodeValToRGB'); c = cramp.color_ramp
c.elements[0].position = 0.35; c.elements[0].color = (*hex2('#7c8a45'), 1)
c.elements[1].position = 0.65; c.elements[1].color = (*hex2('#b3a46a'), 1)
c.elements.new(0.5).color = (*hex2('#8f9650'), 1)
nt.links.new(cn.outputs['Fac'], cramp.inputs['Fac'])
detail = nt.nodes.new('ShaderNodeMix'); detail.data_type = 'RGBA'; detail.blend_type = 'MULTIPLY'; detail.inputs['Factor'].default_value = 0.55
nt.links.new(cramp.outputs['Color'], detail.inputs['A']); nt.links.new(src, detail.inputs['B'])
bright = nt.nodes.new('ShaderNodeBrightContrast'); bright.inputs['Bright'].default_value = 0.12
nt.links.new(detail.outputs['Result'], bright.inputs['Color'])
fin = nt.nodes.new('ShaderNodeMix'); fin.data_type = 'RGBA'
nt.links.new(mr.outputs['Result'], fin.inputs['Factor']); nt.links.new(src, fin.inputs['A']); nt.links.new(bright.outputs['Color'], fin.inputs['B'])
nt.links.new(fin.outputs['Result'], bsdf.inputs['Base Color'])
# a grama em tufos (Geometry Nodes) só dentro do loteamento: esconder fora seria custoso; reduz-se ao limitar a área visível
print('material do gramado ajustado')

# ---------------------------------------------------------------- 3. relevo dos Campos de Cima da Serra
R_OUT, STEP = 6000, 60
def road_x(y):
    return 0.0 if y < 450 else 70 * math.sin((y - 450) / 650) * smooth(450, 900, y)

def hills(x, y):
    v = Vector((x / 1400, y / 1400, 0.3))
    h = 34 * noise.fractal(v, 0.55, 2.1, 5) + 70 * noise.noise(Vector((x / 4200, y / 4200, 1.7)))
    # vales encaixados (sangas)
    r = noise.ridged_multi_fractal(Vector((x / 1800, y / 1800, 4.1)), 0.9, 2.0, 3, 1.0, 2.0)
    h -= 18 * max(0.0, r - 0.6)
    return h

def terrain_z(x, y):
    r = max(abs(x), abs(y) * 0.95)
    blend = smooth(470, 1300, r)
    base = -1.0
    h = base + blend * (hills(x, y) - hills(0, 0) * 0)
    # corredor da estrada
    if y > 160:
        dx = abs(x - road_x(y))
        h = h * smooth(10, 55, dx) + (base + blend * hills(road_x(y), y) * 0.6) * (1 - smooth(10, 55, dx))
    if r < 495:
        h = -40  # escondido sob o terreno existente
    return h

bm = bmesh.new()
n = int(2 * R_OUT / STEP) + 1
grid = []
for j in range(n):
    row = []
    for i in range(n):
        x = -R_OUT + i * STEP; y = -R_OUT + j * STEP
        row.append(bm.verts.new((x, y, terrain_z(x, y))))
    grid.append(row)
for j in range(n - 1):
    for i in range(n - 1):
        a, b, c2, d = grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]
        if all(v.co.z == -40 for v in (a, b, c2, d)): continue
        bm.faces.new((a, b, c2, d))
me = D.meshes.new('V8 · Relevo'); bm.to_mesh(me); bm.free()
for p in me.polygons: p.use_smooth = True
terrain = D.objects.new('V8 · Relevo Campos de Cima da Serra', me); terrain.data.materials.append(CAMPO)
sub('V8 · 01 Relevo').objects.link(terrain)

# costura: anel entre o terreno existente (±500) e o relevo
bm = bmesh.new(); ring = []
for k in range(0, 4 * 50):
    side, t = divmod(k, 50); p = -500 + 20 * t
    xy = [(p, -500), (500, p), (-p, 500), (-500, -p)][side]
    ring.append(xy)
inner = []; outer = []
for x, y in ring:
    z = ground_z(x * 0.999, y * 0.999); z = -1.0 if z is None else z
    inner.append(bm.verts.new((x, y, z - 0.05)))
    xo, yo = x * 1.14, y * 1.14
    outer.append(bm.verts.new((xo, yo, -1.0 + smooth(470, 1300, max(abs(xo), abs(yo))) * hills(xo, yo))))
for k in range(len(ring)):
    bm.faces.new((inner[k], inner[(k + 1) % len(ring)], outer[(k + 1) % len(ring)], outer[k]))
me = D.meshes.new('V8 · Costura'); bm.to_mesh(me); bm.free()
seam = D.objects.new('V8 · Costura do terreno', me); seam.data.materials.append(CAMPO)
D.collections['V8 · 01 Relevo'].objects.link(seam)

def z_at(x, y):
    g = ground_z(x, y) if max(abs(x), abs(y)) < 499 else None
    if g is not None: return g
    hit, loc, *_ = terrain.ray_cast(Vector((x, y, 2000)), Vector((0, 0, -1)))
    return loc.z if hit else terrain_z(x, y)

# ---------------------------------------------------------------- 4. araucárias
def add_cyl(bm, p0, p1, r0, r1, seg=6):
    d = (p1 - p0); L = d.length; q = d.to_track_quat('Z', 'Y')
    res = bmesh.ops.create_cone(bm, cap_ends=False, segments=seg, radius1=r0, radius2=r1, depth=L)
    for v in res['verts']:
        v.co = q @ (v.co + Vector((0, 0, L / 2))) + p0

def add_clump(bm, c, r, flat=0.45):
    res = bmesh.ops.create_icosphere(bm, subdivisions=1, radius=r)
    for v in res['verts']:
        v.co = Vector((v.co.x, v.co.y, v.co.z * flat)) + c

def araucaria(name, H, seed):
    rr = random.Random(seed)
    bmT = bmesh.new(); bmF = bmesh.new()
    add_cyl(bmT, Vector((0, 0, -0.5)), Vector((0, 0, H)), 0.38, 0.12, 8)
    crown_w = H * rr.uniform(0.32, 0.42)
    whorls = 4
    for w in range(whorls):
        z = H * (0.72 + 0.075 * w); nb = 6
        for b in range(nb):
            ang = 2 * math.pi * b / nb + w * 0.5 + rr.uniform(-0.2, 0.2)
            L = crown_w * (1.0 - 0.18 * w) * rr.uniform(0.85, 1.1)
            up = math.radians(rr.uniform(18, 34) + w * 6)
            p0 = Vector((0, 0, z))
            mid = p0 + Vector((math.cos(ang) * L * 0.6, math.sin(ang) * L * 0.6, L * 0.6 * math.sin(up) * 0.5))
            tip = p0 + Vector((math.cos(ang) * L, math.sin(ang) * L, L * math.sin(up)))
            add_cyl(bmT, p0, mid, 0.12, 0.08, 5); add_cyl(bmT, mid, tip, 0.08, 0.04, 5)
            add_clump(bmF, tip + Vector((0, 0, 0.5)), rr.uniform(1.5, 2.1))
            add_clump(bmF, mid + Vector((0, 0, 0.7)), rr.uniform(0.9, 1.3))
    add_clump(bmF, Vector((0, 0, H + 0.3)), 1.6)
    meT = D.meshes.new(name + ' tronco'); bmT.to_mesh(meT); bmT.free()
    meF = D.meshes.new(name + ' copa'); bmF.to_mesh(meF); bmF.free()
    for p in meF.polygons: p.use_smooth = True
    meT.materials.append(BARK); meF.materials.append(NEEDLE)
    col = D.collections.new(name)
    for me in (meT, meF):
        o = D.objects.new(me.name, me); col.objects.link(o)
    return col

lib = sub('V8 · Biblioteca (não renderizar)')
lib.hide_render = True
lib_layer = bpy.context.view_layer.layer_collection.children[root.name].children[lib.name]
lib_layer.exclude = True
araucarias = []
for k, H in enumerate((15, 19, 23, 27)):
    c = araucaria(f'V8 · Araucária {H} m', H, 100 + k); lib.children.link(c); araucarias.append(c)

# mata de sub-bosque: copa arredondada simples
def mata_tree(name, H, seed):
    rr = random.Random(seed); bmF = bmesh.new()
    for _ in range(5):
        add_clump(bmF, Vector((rr.uniform(-2, 2), rr.uniform(-2, 2), H * rr.uniform(0.55, 0.85))), rr.uniform(2.2, 3.4), 0.75)
    me = D.meshes.new(name); bmF.to_mesh(me); bmF.free(); me.materials.append(MATA)
    for p in me.polygons: p.use_smooth = True
    col = D.collections.new(name); col.objects.link(D.objects.new(name, me)); return col
matas = [mata_tree(f'V8 · Mata {h} m', h, 300 + h) for h in (7, 9, 11)]
for c in matas: lib.children.link(c)

forest = sub('V8 · 02 Capões de araucária')
def inst(col, x, y, s=1.0, rot=None):
    e = D.objects.new(col.name + ' ·', None); e.instance_type = 'COLLECTION'; e.instance_collection = col
    e.location = (x, y, z_at(x, y) - 0.3); e.scale = (s, s, s); e.rotation_euler.z = rot if rot is not None else rng.uniform(0, 6.28)
    forest.objects.link(e); return e

def blocked(x, y):
    if not outside_site(Vector((x, y, 0))) or (abs(x) < 170 and -190 < y < 230): return True
    if y > 150 and abs(x - road_x(y)) < 30: return True
    return False

count = 0
centers = []
while len(centers) < 70:
    a = rng.uniform(0, 6.283); r = rng.uniform(260, 4200) if len(centers) > 8 else rng.uniform(230, 650)
    x, y = r * math.cos(a), r * math.sin(a)
    if blocked(x, y): continue
    centers.append((x, y))
for cx, cy in centers:
    size = rng.uniform(35, 140); ntrees = int(size * rng.uniform(0.35, 0.6))
    for _ in range(ntrees):
        a = rng.uniform(0, 6.283); r = size * math.sqrt(rng.random())
        x, y = cx + r * math.cos(a), cy + r * math.sin(a) * 0.7
        if blocked(x, y): continue
        inst(rng.choice(araucarias), x, y, rng.uniform(0.85, 1.15)); count += 1
        if rng.random() < 0.9:
            inst(rng.choice(matas), x + rng.uniform(-6, 6), y + rng.uniform(-6, 6), rng.uniform(0.8, 1.3)); count += 1
# araucárias solitárias no campo
for _ in range(160):
    a = rng.uniform(0, 6.283); r = rng.uniform(220, 2500)
    x, y = r * math.cos(a), r * math.sin(a)
    if blocked(x, y): continue
    inst(rng.choice(araucarias), x, y, rng.uniform(0.9, 1.2)); count += 1
print('instâncias de vegetação', count)

# ---------------------------------------------------------------- 5. estrada de acesso
def ribbon(name, pts, width, mat, lift=0.12):
    bm = bmesh.new(); left = []; right = []
    for k, p in enumerate(pts):
        q = pts[min(k + 1, len(pts) - 1)] - pts[max(k - 1, 0)]
        nrm = Vector((-q.y, q.x, 0)).normalized()
        for side, arr in ((1, left), (-1, right)):
            x, y = p.x + nrm.x * width / 2 * side, p.y + nrm.y * width / 2 * side
            arr.append(bm.verts.new((x, y, z_at(x, y) + lift)))
    for k in range(len(pts) - 1):
        bm.faces.new((left[k], right[k], right[k + 1], left[k + 1]))
    me = D.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(mat)
    return D.objects.new(name, me)
rpts = [Vector((road_x(y), y, 0)) for y in range(166, 6000, 12)]
road = ribbon('V8 · Estrada de acesso', rpts, 7.2, ASFALTO)
sub('V8 · 03 Acesso e portaria').objects.link(road)
shoulder = ribbon('V8 · Acostamento de saibro', rpts, 10.5, principled('V8 · Saibro', hex2('#9a7b5f'), 0.95), 0.06)
D.collections['V8 · 03 Acesso e portaria'].objects.link(shoulder)

# ---------------------------------------------------------------- 6. pórtico e portaria em basalto
acc = D.collections['V8 · 03 Acesso e portaria']
def box(name, c, size, mat, col=acc, rz=0.0):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
    for v in bm.verts: v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2]))
    me = D.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(mat)
    o = D.objects.new(name, me); o.location = c; o.rotation_euler.z = rz; col.objects.link(o); return o
gy = 176; gz = z_at(0, gy)
for sx in (-6.2, 6.2):
    box('V8 · Pilar do pórtico', (sx, gy, gz + 3.0), (1.4, 1.4, 6.0), BASALTO)
box('V8 · Viga do pórtico', (0, gy, gz + 6.3), (14.2, 1.0, 0.7), MADEIRA)
box('V8 · Letreiro', (0, gy - 0.55, gz + 6.3), (6.0, 0.08, 0.45), REBOCO)
box('V8 · Guarita', (11.5, gy + 2, gz + 1.6), (4.5, 3.6, 3.2), REBOCO)
box('V8 · Guarita vidro', (9.2, gy + 2, gz + 1.8), (0.06, 3.0, 1.6), VIDRO)
box('V8 · Guarita cobertura', (11.5, gy + 2, gz + 3.35), (5.6, 4.6, 0.3), TELHA)
for sx in (-1, 1):
    for k in range(18):
        box('V8 · Muro de basalto', (sx * (12 + 5 + k * 6.4), gy, z_at(sx * (12 + 5 + k * 6.4), gy) + 0.9), (6.2, 0.5, 1.8), BASALTO)

# ---------------------------------------------------------------- 7. casas ilustrativas em parte dos lotes
houses = sub('V8 · 04 Casas ilustrativas (lotes vendidos)')
lots = list(D.collections['03 · Lotes · áreas da prancha'].objects)
rng2 = random.Random(21); chosen = rng2.sample(lots, 22)
def obb(o):
    pts = [o.matrix_world @ v.co for v in o.data.vertices]
    best = None
    hull = pts
    for k in range(len(hull)):
        e = hull[(k + 1) % len(hull)] - hull[k]
        if e.length < 0.5: continue
        a = math.atan2(e.y, e.x); ca, sa = math.cos(-a), math.sin(-a)
        xs = [p.x * ca - p.y * sa for p in pts]; ys = [p.x * sa + p.y * ca for p in pts]
        area = (max(xs) - min(xs)) * (max(ys) - min(ys))
        if best is None or area < best[0]:
            cx, cy = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2
            best = (area, a, max(xs) - min(xs), max(ys) - min(ys), cx * math.cos(a) - cy * math.sin(a), cx * math.sin(a) + cy * math.cos(a))
    return best
for lot in chosen:
    _, a, w, d, cx, cy = obb(lot)
    if w < d: a += math.pi / 2; w, d = d, w
    z = z_at(cx, cy)
    hw, hd = min(w * 0.55, 15), min(d * 0.6, 9)
    two = rng2.random() < 0.4
    box('V8 · Casa', (cx, cy, z + 1.6), (hw, hd, 3.2), REBOCO, houses, a)
    if two:
        off = Vector((hw * 0.2, 0, 0)); off.rotate(__import__('mathutils').Euler((0, 0, a)))
        box('V8 · Casa pav. superior', (cx + off.x, cy + off.y, z + 4.7), (hw * 0.55, hd * 0.95, 3.0), MADEIRA, houses, a)
    box('V8 · Casa cobertura', (cx, cy, z + 3.3), (hw + 0.8, hd + 0.8, 0.25), TELHA, houses, a)
    off = Vector((0, -hd / 2 - 0.02, 0)); off.rotate(__import__('mathutils').Euler((0, 0, a)))
    box('V8 · Casa esquadria', (cx + off.x, cy + off.y, z + 1.5), (hw * 0.7, 0.05, 2.2), VIDRO, houses, a)
print('casas', len(chosen))

# ---------------------------------------------------------------- 8. céu, sol de fim de tarde e nuvens
w = scene.world; sky = w.node_tree.nodes['Sky Texture']
sky.sky_type = 'MULTIPLE_SCATTERING'
for k, v in dict(sun_elevation=math.radians(13), air_density=1.2, aerosol_density=2.2, ozone_density=1.0, altitude=950).items():
    if hasattr(sky, k): setattr(sky, k, v)
w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.22
sun = D.objects['Sol · estudo ilustrativo']
sun.rotation_euler = (math.radians(90 - 13), 0, sky.sun_rotation + math.pi / 2 if hasattr(sky, 'sun_rotation') else sun.rotation_euler.z)
sun.data.energy = 3.2; sun.data.color = (1.0, 0.86, 0.68); sun.data.angle = math.radians(1.2)

cm = D.materials.new('V8 · Nuvens'); cm.use_nodes = True; cm.blend_method = 'BLEND' if hasattr(cm, 'blend_method') else None
N = cm.node_tree.nodes; Lk = cm.node_tree.links
for nd in list(N):
    if nd.type != 'OUTPUT_MATERIAL': N.remove(nd)
out = [nd for nd in N if nd.type == 'OUTPUT_MATERIAL'][0]
tcn = N.new('ShaderNodeTexCoord'); mp = N.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (1, 2.2, 1)
Lk.new(tcn.outputs['Object'], mp.inputs['Vector'])
nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 0.00045; nz.inputs['Detail'].default_value = 10; nz.inputs['Roughness'].default_value = 0.62
Lk.new(mp.outputs['Vector'], nz.inputs['Vector'])
rp = N.new('ShaderNodeValToRGB'); rp.color_ramp.elements[0].position = 0.56; rp.color_ramp.elements[1].position = 0.74
Lk.new(nz.outputs['Fac'], rp.inputs['Fac'])
tr = N.new('ShaderNodeBsdfTranslucent'); tr.inputs['Color'].default_value = (1, 0.93, 0.86, 1)
df = N.new('ShaderNodeBsdfDiffuse'); df.inputs['Color'].default_value = (1, 0.95, 0.9, 1)
mxs = N.new('ShaderNodeMixShader'); mxs.inputs['Fac'].default_value = 0.4
Lk.new(df.outputs[0], mxs.inputs[1]); Lk.new(tr.outputs[0], mxs.inputs[2])
trn = N.new('ShaderNodeBsdfTransparent')
fm = N.new('ShaderNodeMixShader'); Lk.new(rp.outputs['Color'], fm.inputs['Fac']); Lk.new(trn.outputs[0], fm.inputs[1]); Lk.new(mxs.outputs[0], fm.inputs[2])
Lk.new(fm.outputs[0], out.inputs['Surface'])
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=30000)
me = D.meshes.new('V8 · Nuvens'); bm.to_mesh(me); bm.free(); me.materials.append(cm)
clouds = D.objects.new('V8 · Camada de nuvens', me); clouds.location = (0, 0, 2400)
clouds.visible_shadow = False
sub('V8 · 05 Céu').objects.link(clouds)

# ---------------------------------------------------------------- 9. câmeras e render
for o in D.objects:
    if o.type == 'CAMERA': o.data.clip_end = 30000
scene.view_settings.view_transform = 'AgX' if 'AgX' in [i.identifier for i in scene.view_settings.bl_rna.properties['view_transform'].enum_items] else scene.view_settings.view_transform
scene.render.film_transparent = False
bpy.ops.wm.save_as_mainfile(filepath=OUT, compress=True)
print('salvo', OUT)
