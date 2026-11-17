"""Priorità v8.1 — biblioteca de casas ilustrativas para lotes de ~10 x 30 m.
Abre Priorita-v8.blend, remove as casas-caixa, cria 4 tipologias (frente = -Y, largura 7,2 m)
e exporta serra-houses.glb. Casas genéricas: não representam projeto aprovado.
"""
import bpy, bmesh, os
from mathutils import Vector

BLEND = '/home/claude/priorita/Priorita-v8.blend'
OUT = '/home/claude/priorita/web/serra-houses.glb'
bpy.ops.wm.open_mainfile(filepath=BLEND)
D = bpy.data

def hex2(h):
    h = h.lstrip('#'); return tuple((int(h[i:i+2], 16) / 255) ** 2.2 for i in (0, 2, 4))
def mat(name, color, rough, metal=0.0):
    m = D.materials.get(name) or D.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*hex2(color), 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    return m
MATS = [mat('Casa · Parede', '#ece7dc', .82), mat('Casa · Madeira', '#8a5a3a', .62), mat('Casa · Pedra', '#5b5853', .9),
        mat('Casa · Telhado', '#34373a', .55, .1), mat('Casa · Vidro', '#18222a', .06, .7), mat('Casa · Esquadria', '#1c1d1f', .5, .3),
        mat('Casa · Deck', '#a47a55', .7), mat('Casa · Portão', '#8d9092', .45, .4)]
PAREDE, MADEIRA, PEDRA, TELHADO, VIDRO, ESQ, DECK, PORTAO = range(8)

class House:
    def __init__(self): self.bm = bmesh.new()
    def _faces(self, verts, faces, m):
        vs = [self.bm.verts.new(v) for v in verts]
        for f in faces:
            face = self.bm.faces.new([vs[i] for i in f]); face.material_index = m
    def box(self, x0, x1, y0, y1, z0, z1, m):
        v = [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0), (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)]
        self._faces(v, [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)], m)
    def prism(self, pts, axis, a0, a1, m):
        """Polígono 2D extrudado ao longo de X (pts = (y,z)) ou de Y (pts = (x,z))."""
        n = len(pts)
        p = (lambda a, q: (a, q[0], q[1])) if axis == 'X' else (lambda a, q: (q[0], a, q[1]))
        v = [p(a0, q) for q in pts] + [p(a1, q) for q in pts]
        faces = [tuple(range(n)), tuple(range(2 * n - 1, n - 1, -1))] + [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
        self._faces(v, faces, m)
    def slab(self, a, b, c, d, th, m):
        top = [a, b, c, d]; bot = [(p[0], p[1], p[2] - th) for p in top]
        self._faces(top + bot, [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)], m)
    def gable_y(self, x0, x1, y0, y1, eave, pitch=.7, ov=.5, m_attic=PAREDE):
        """Duas águas com cumeeira ao longo de Y; empena voltada para a rua."""
        cx, hw = (x0 + x1) / 2, (x1 - x0) / 2; ridge = eave + hw * pitch
        self.prism([(x0, eave), (x1, eave), (cx, ridge)], 'Y', y0 + .02, y1 - .02, m_attic)
        lo = eave - ov * pitch
        self.slab((x0 - ov, y0 - ov, lo), (cx, y0 - ov, ridge), (cx, y1 + ov, ridge), (x0 - ov, y1 + ov, lo), -.16, TELHADO)
        self.slab((cx, y0 - ov, ridge), (x1 + ov, y0 - ov, lo), (x1 + ov, y1 + ov, lo), (cx, y1 + ov, ridge), -.16, TELHADO)
        return ridge
    def gable_x(self, x0, x1, y0, y1, eave, pitch=.7, ov=.5):
        cy, hw = (y0 + y1) / 2, (y1 - y0) / 2; ridge = eave + hw * pitch
        self.prism([(y0, eave), (y1, eave), (cy, ridge)], 'X', x0 + .02, x1 - .02, PAREDE)
        lo = eave - ov * pitch
        self.slab((x0 - ov, y0 - ov, lo), (x1 + ov, y0 - ov, lo), (x1 + ov, cy, ridge), (x0 - ov, cy, ridge), -.16, TELHADO)
        self.slab((x0 - ov, cy, ridge), (x1 + ov, cy, ridge), (x1 + ov, y1 + ov, lo), (x0 - ov, y1 + ov, lo), -.16, TELHADO)
        return ridge
    def win_y(self, x0, x1, y, z0, z1):
        """Janela em parede perpendicular a Y."""
        self.box(x0 - .07, x1 + .07, y - .05, y + .05, z0 - .07, z1 + .07, ESQ); self.box(x0, x1, y - .075, y + .075, z0, z1, VIDRO)
    def win_x(self, x, y0, y1, z0, z1):
        self.box(x - .05, x + .05, y0 - .07, y1 + .07, z0 - .07, z1 + .07, ESQ); self.box(x - .075, x + .075, y0, y1, z0, z1, VIDRO)
    def finish(self, name, col):
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        me = D.meshes.new(name); self.bm.to_mesh(me); self.bm.free()
        for m in MATS: me.materials.append(m)
        o = D.objects.new(name, me); col.objects.link(o); return o

def casa_a():
    """Chalé contemporâneo: empena para a rua, varanda coberta, chaminé de pedra. Profundidade 14 m."""
    h = House()
    h.box(-3.7, 3.7, -7, 7.1, -3, 0, PEDRA)
    h.box(-3.6, 3.6, -5, 7, 0, 2.9, PAREDE)
    ridge = h.gable_y(-3.6, 3.6, -5, 7, 2.9)
    # varanda: cobertura prolongada, deck e pilares
    lo = 2.9 - .5 * .7
    h.slab((-4.1, -7.3, lo), (0, -7.3, ridge), (0, -5.4, ridge), (-4.1, -5.4, lo), -.16, TELHADO)
    h.slab((0, -7.3, ridge), (4.1, -7.3, lo), (4.1, -5.4, lo), (0, -5.4, ridge), -.16, TELHADO)
    h.box(-3.6, 3.6, -7, -5, 0, .06, DECK)
    for x in (-3.4, 3.24): h.box(x, x + .16, -6.9, -6.74, .06, 2.7, MADEIRA)
    h.box(-3.6, 3.6, -6.95, -6.8, 2.62, 2.8, MADEIRA)
    h.prism([(-3.6, 2.92), (3.6, 2.92), (0, ridge - .04)], 'Y', -5.05, -4.98, MADEIRA)   # empena revestida
    h.win_y(-.4, 3.1, -5, .12, 2.3); h.box(-2.7, -1.7, -5.06, -4.98, 0, 2.15, MADEIRA); h.win_y(-.7, .7, -5.05, 3.4, 4.3)
    for y in (-2.2, 1.6, 5.0):
        h.win_x(-3.6, y - .7, y + .7, 1.0, 2.2); h.win_x(3.6, y - .7, y + .7, 1.0, 2.2)
    h.win_y(-2.2, 2.2, 7, .12, 2.3)
    h.box(1.9, 2.8, 2.6, 3.3, 0, ridge + .5, PEDRA); h.box(1.84, 2.86, 2.54, 3.36, ridge + .5, ridge + .62, TELHADO)
    return h

def casa_b():
    """Sobrado moderno: volume superior em madeira em balanço, garagem e terraço. Profundidade 13 m."""
    h = House()
    h.box(-3.7, 3.7, -5.4, 6.6, -3, 0, PEDRA)
    h.box(-3.6, 3.6, -5.3, 6.5, 0, 2.9, PAREDE)
    h.box(.3, 3.62, -5.38, -5.28, 0, 2.9, PEDRA)
    h.box(-3.2, -.1, -5.36, -5.28, 0, 2.4, PORTAO)
    for z in (.6, 1.2, 1.8): h.box(-3.2, -.1, -5.37, -5.35, z, z + .03, ESQ)
    h.box(1.3, 2.3, -5.44, -5.36, 0, 2.2, MADEIRA); h.win_y(2.45, 2.85, -5.38, .1, 2.2)
    h.box(-3.6, 3.6, -6.5, 2.0, 2.9, 5.8, MADEIRA)
    h.box(-3.85, 3.85, -6.75, 2.25, 5.8, 6.0, TELHADO)
    h.box(-3.6, 3.6, 2.0, 6.5, 2.9, 3.0, DECK)
    h.box(-3.55, 3.55, 6.42, 6.46, 3.0, 4.0, VIDRO); h.box(-3.58, -3.54, 2.0, 6.46, 3.0, 4.0, VIDRO); h.box(3.54, 3.58, 2.0, 6.46, 3.0, 4.0, VIDRO)
    h.win_y(-2.6, 2.6, -6.5, 3.7, 5.2); h.win_y(-2.6, 2.6, 2.0, 3.05, 5.2)
    for y in (-.5, 3.8): h.win_x(-3.6, y - .8, y + .8, 1.0, 2.3); h.win_x(3.6, y - .8, y + .8, 1.0, 2.3)
    h.win_x(-3.6, -3.4, -1.6, 3.8, 5.1); h.win_x(3.6, -3.4, -1.6, 3.8, 5.1)
    h.win_y(-2.4, 2.4, 6.5, .1, 2.3)
    h.box(-3.6, 3.6, -6.5, -5.3, 0, .05, DECK)
    return h

def casa_c():
    """Térrea em L: bloco social de duas águas ao fundo, ala frontal com empena e abrigo de carro. Profundidade 14 m."""
    h = House()
    h.box(-3.7, 3.7, -5.6, 7.1, -3, 0, PEDRA)
    h.box(-3.6, 3.6, 0, 7, 0, 2.8, PAREDE); h.gable_x(-3.6, 3.6, 0, 7, 2.8)
    h.box(-3.6, .6, -5.5, 0, 0, 2.8, PAREDE); r = h.gable_y(-3.6, .6, -5.5, .4, 2.8, m_attic=MADEIRA)
    h.box(-3.62, .62, -5.56, -5.48, 0, 1.0, PEDRA)
    h.win_y(-2.6, -.4, -5.5, 1.05, 2.3)
    h.box(.58, .66, -3.4, -2.4, 0, 2.15, MADEIRA); h.win_x(.6, -1.9, -.7, 1.0, 2.2)
    h.box(.9, 3.6, -5.5, 0, 0, .05, DECK)
    for y in (-5.4, -2.8): h.box(3.38, 3.54, y, y + .16, .05, 2.5, MADEIRA)
    h.box(.5, 3.75, -5.7, .1, 2.5, 2.64, MADEIRA)
    for y in (-5.2, -4.4, -3.6, -2.8, -2.0, -1.2, -.4): h.box(.6, 3.7, y, y + .1, 2.64, 2.78, MADEIRA)
    h.win_y(1.0, 3.2, 0, 1.0, 2.2); h.win_y(-2.4, 2.4, 7, .1, 2.3)
    for y in (1.8, 5.2): h.win_x(-3.6, y - .7, y + .7, 1.0, 2.2); h.win_x(3.6, y - .7, y + .7, 1.0, 2.2)
    h.win_x(-3.6, -3.6, -2.0, 1.0, 2.2)
    h.box(-2.9, -2.0, 3.0, 3.7, 0, 5.9, PEDRA); h.box(-2.96, -1.94, 2.94, 3.76, 5.9, 6.02, TELHADO)
    h.box(-3.6, 3.6, 7, 9.2, -.3, .05, DECK)
    return h

def casa_d():
    """Casa de uma água: frente em pedra e vidro, janela alta ao fundo, deck frontal. Profundidade 12 m."""
    h = House(); s = (4.5 - 2.7) / 10.2; zf = lambda y: 2.7 + (y + 4.2) * s
    h.box(-3.7, 3.7, -6, 6.1, -3, 0, PEDRA)
    h.prism([(-4.2, 0), (6, 0), (6, zf(6)), (-4.2, zf(-4.2))], 'X', -3.6, 3.6, PAREDE)
    h.slab((-4.0, -6.4, zf(-6.4)), (4.0, -6.4, zf(-6.4)), (4.0, 6.5, zf(6.5)), (-4.0, 6.5, zf(6.5)), -.2, TELHADO)
    h.box(-3.62, -.4, -4.28, -4.18, 0, 2.7, PEDRA)
    h.win_y(.2, 3.2, -4.2, .1, 2.3); h.box(-1.5, -.5, -4.34, -4.26, 0, 2.15, MADEIRA)
    h.box(-3.6, 3.6, -6, -4.2, 0, .06, DECK)
    for x in (-3.4, 3.24): h.box(x, x + .16, -5.9, -5.74, .06, zf(-5.9) - .2, MADEIRA)
    h.win_y(-3.0, 3.0, 6, 3.1, 4.1); h.win_y(-2.2, 2.2, 6.02, .1, 2.3)
    h.box(-3.66, -3.58, -4.2, 6, 0, 1.1, MADEIRA); h.box(3.58, 3.66, -4.2, 6, 0, 1.1, MADEIRA)
    for y in (-1.6, 2.4): h.win_x(-3.6, y - .8, y + .8, 1.2, 2.3); h.win_x(3.6, y - .8, y + .8, 1.2, 2.3)
    h.box(-3.6, 3.6, 6, 8, -.3, .05, DECK)
    return h

# remover as casas-caixa da primeira versão
old = D.collections.get('V8 · 04 Casas ilustrativas (lotes vendidos)')
if old:
    for o in list(old.objects): D.objects.remove(o)

lib = D.collections.get('V8 · Casas · biblioteca') or D.collections.new('V8 · Casas · biblioteca')
if lib.name not in [c.name for c in D.collections['V8 · Entorno Serra Gaúcha'].children]:
    D.collections['V8 · Entorno Serra Gaúcha'].children.link(lib)
for o in list(lib.objects): D.objects.remove(o)
objs = [f().finish(n, lib) for n, f in (('casa-a', casa_a), ('casa-b', casa_b), ('casa-c', casa_c), ('casa-d', casa_d))]
for i, o in enumerate(objs):
    o.location = (-640 + i * 14, -640, 3)   # vitrine fora do cenário
    print(o.name, 'tris', sum(len(p.vertices) - 2 for p in o.data.polygons))
bpy.ops.wm.save_as_mainfile(filepath=BLEND, compress=True)

bpy.ops.object.select_all(action='DESELECT')
for o in objs: o.location = (0, 0, 0); o.select_set(True)
bpy.context.view_layer.objects.active = objs[0]
bpy.ops.export_scene.gltf(filepath=OUT, use_selection=True, export_format='GLB', export_apply=True, export_yup=True,
    export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7, export_draco_position_quantization=14,
    export_lights=False, export_cameras=False, export_extras=False)
print('GLB', round(os.path.getsize(OUT) / 1e3), 'KB')

# vitrine para conferência visual
for i, o in enumerate(objs): o.location = (-21 + i * 14, 0, 0)
for o in D.objects:
    if o not in objs and o.type in ('MESH', 'EMPTY'): o.hide_render = True
s = bpy.context.scene
import math
cam = D.objects.new('cam-casas', D.cameras.new('cam-casas')); s.collection.objects.link(cam)
cam.location = (-2, -42, 14); cam.rotation_euler = (math.radians(74), 0, math.radians(-3)); cam.data.lens = 38; s.camera = cam
g = D.meshes.new('chao'); bm = bmesh.new(); bmesh.ops.create_grid(bm, size=200); bm.to_mesh(g); go = D.objects.new('chao', g); s.collection.objects.link(go)
gm = mat('chao', '#6f7f45', .95); g.materials.append(gm)
s.cycles.device = 'CPU'; s.cycles.samples = 32; s.render.resolution_x = 1600; s.render.resolution_y = 700
s.render.filepath = '/tmp/casas.png'; bpy.ops.render.render(write_still=True)
