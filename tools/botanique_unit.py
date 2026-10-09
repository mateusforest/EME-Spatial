"""Botanique, Final 1: complete demonstration apartment for Blender.

REFERENCE, NOT A MEASURED SURVEY
The supplied humanized floor plan labels Final 1 as 55.55 m² but contains no
dimension chains. Every linear dimension below is an explicit visual estimate.
Do not label the resulting mesh as an as-built or approved architectural plan.
Origin is the lower-left corner of Final 1 in the supplied image: X right,
Y towards the top of that image, Z up. All dimensions are metres.

Public API: build_unit(detail='web') -> serializable layout contract.
The caller owns saving, rendering, exporting, world lighting and infrastructure.
No network, render queue, render or file export is performed by this module.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import bpy
from mathutils import Vector, Matrix


PREFIX = 'B_UNIT'
WIDTH, DEPTH, HEIGHT = 7.20, 7.80, 2.72
WALL = 0.14
SOURCE_IMAGE = 'codex-clipboard-2e772469-96e9-48a2-b30e-22ad300b3559.png'

# Decorative alternatives share the same fixed architecture/navigation contract.
# Every option is exported; only the default participates in a Cycles render.
FURNITURE_VARIANTS = {
    'sofa': ('Sofá', [('contemporaneo', 'Contemporâneo · linho'),
                     ('organico', 'Orgânico · curvo'), ('modular', 'Modular · costura marcada')]),
    'chairs': ('Cadeiras', [('contemporaneo', 'Madeira e linho'),
                           ('organico', 'Envolvente · latão'), ('concha', 'Concha · base contínua')]),
    'table': ('Mesa de jantar', [('contemporaneo', 'Carvalho · bordas suaves'),
                                ('organico', 'Pedra clara · pedestal duplo')]),
    'pendant': ('Pendente', [('contemporaneo', 'Duplo · vidro opalino'),
                            ('organico', 'Pétalas · cerâmica')]),
    'cabinetry': ('Marcenaria', [('contemporaneo', 'Sálvia e carvalho'),
                                ('organico', 'Carvalho canelado')]),
    'appliance': ('Eletrodomésticos', [('contemporaneo', 'Inox · comandos mecânicos'),
                                     ('organico', 'Grafite · vidro e toque')]),
    'bed': ('Cama da suíte', [('contemporaneo', 'Linho e carvalho'),
                            ('organico', 'Cabeceira arqueada · estofada')]),
    'bathroom': ('Banheiro social', [('contemporaneo', 'Sálvia · espelho retangular'),
                                   ('organico', 'Carvalho · espelho arqueado')]),
}

ROOMS = [
    {'id':'living','label':'Estar e jantar','bounds':[4.53,1.15,7.20,4.86],'target':[5.43,2.91,1.55],'floor_z':.035},
    {'id':'kitchen','label':'Cozinha em L e serviço','bounds':[3.40,4.86,7.20,7.80],'target':[5.02,6.39,1.55],'floor_z':.035},
    {'id':'hall','label':'Circulação íntima','bounds':[2.65,3.60,4.53,4.86],'target':[3.42,4.10,1.55],'floor_z':.035},
    {'id':'suite','label':'Suíte e vestíbulo','bounds':[0,0,4.53,3.60],
     'floor_regions':[[0,0,3.17,3.60],[3.17,2.66,4.53,3.60]],
     'polygon':[[0,0],[3.17,0],[3.17,2.66],[4.53,2.66],[4.53,3.60],[0,3.60]],
     'target':[2.44,2.96,1.55],'floor_z':.035},
    {'id':'bedroom','label':'Dormitório com duas camas','bounds':[0,4.86,3.40,7.80],'target':[2.86,5.45,1.55],'floor_z':.035},
    {'id':'bathroom','label':'Banheiro social','bounds':[0,3.60,2.65,4.86],'target':[2.28,4.35,1.55],'floor_z':.035},
    {'id':'ensuite','label':'Banheiro da suíte','bounds':[3.17,0,4.53,2.66],'target':[3.66,1.64,1.55],'floor_z':.035},
    {'id':'balcony','label':'Sacada com churrasqueira','bounds':[4.53,0,7.20,1.15],'target':[5.84,.60,1.55],'floor_z':.015},
]


CAMERAS = [
    {'id': 'living', 'name': 'B_UNIT_CAMERA_LIVING', 'label': 'Estar, jantar e cozinha',
     'position': [6.78, 1.57, 1.56], 'look_at': [4.65, 5.65, 1.32], 'lens_mm': 25},
    {'id': 'kitchen', 'name': 'B_UNIT_CAMERA_KITCHEN', 'label': 'Da cozinha para a sacada',
     'position': [6.80, 7.25, 1.57], 'look_at': [5.38, 2.18, 1.23], 'lens_mm': 26},
    {'id': 'suite', 'name': 'B_UNIT_CAMERA_SUITE', 'label': 'Suíte',
     'position': [.83, .28, 1.55], 'look_at': [2.66, 1.73, 1.06], 'lens_mm': 24},
    {'id': 'plan', 'name': 'B_UNIT_CAMERA_PLAN', 'label': 'Planta demonstrativa',
     'position': [3.60, 3.90, 14.0], 'look_at': [3.60, 3.90, 0.0],
     'projection': 'ORTHO', 'ortho_scale': 16.0},
    {'id': 'balcony', 'name': 'B_UNIT_CAMERA_BALCONY', 'label': 'Sacada e churrasqueira',
     'position': [4.84, .83, 1.52], 'look_at': [6.74, .65, 1.31], 'lens_mm': 22},
]


def base_contract():
    """Can also be inspected without instantiating geometry."""
    return {
        'schema': 'eme.botanique.unit/1', 'layout_revision': 3, 'unit_id': 'final-1-demonstracao',
        'title': 'Botanique · Final 1 · Estudo de ambientação',
        'source': {'image': SOURCE_IMAGE, 'type': 'humanized-floorplan-without-dimensions',
                   'source_marketed_private_area_m2': 55.55,
                   'tracing_region_pixels': [62,375,294,618],
                   'fidelity_status': 'topology-and-visible-furnishing-retraced; dimensions-unconfirmed',
                   'measured_geometry': False, 'scale_status': 'estimated',
                   'note': 'Geometria em escala visual estimada. A área de 55,55 m² é a informação da planta comercial, não uma aferição desta malha. Pé-direito, paredes, vãos e mobiliário devem ser conferidos com projeto cotado.',
                   'interiors': 'Proposta EME inspirada nas referências recebidas; correspondência dos renders comerciais com Final 1 não comprovada.',
                   'balcony': {
                       'interpretation': 'recessed-niche-between-solid-side-returns',
                       'evidence': 'Final 1 na planta: piso da sacada alinhado à frente da suíte/banho, parede à esquerda e volume da churrasqueira à direita; não há projeção de canto além da frente da unidade.',
                       'matching_facade_reference': 'codex-clipboard-675aee01-72f3-45ca-8619-eba02260946f.png',
                       'other_reference': 'codex-clipboard-2f249f95-4f46-46ef-8d67-6c7df6797c89.png',
                       'confidence': 'visual-inference-not-a-numbered-elevation',
                       'note': 'Adotado nicho com vidro frontal e retornos laterais sólidos. Associação à prumada da fachada, dimensões e detalhamento da churrasqueira precisam do projeto técnico. Boca da churrasqueira orientada para o espaço livre da sacada.'}},
        'coordinates': {'system': 'Blender right-handed Z-up', 'unit': 'metre',
                        'origin': 'lower-left of Final 1 in source image',
                        'x': 'right in image', 'y': 'towards top of image', 'z': 'up',
                        'standard_gltf_export_transform': '[x, z, -y]'},
        'estimated_envelope': {'width': WIDTH, 'depth': DEPTH, 'ceiling': HEIGHT,
                               'outer_wall_thickness': WALL},
        'rooms': [dict(r) for r in ROOMS], 'cameras': [dict(c) for c in CAMERAS],
        'room_cameras': [
            {'id':'living','label':'Estar e jantar','position':[5.44,2.94,1.585],'look_at':[6.68,2.62,1.04]},
            {'id':'kitchen','label':'Cozinha e serviço','position':[5.02,6.31,1.585],'look_at':[3.81,6.40,1.24]},
            {'id':'hall','label':'Circulação','position':[3.43,4.30,1.585],'look_at':[3.56,3.12,1.33]},
            {'id':'suite','label':'Suíte','position':[2.44,2.96,1.585],'look_at':[2.60,1.51,1.02]},
            {'id':'bedroom','label':'Dormitório','position':[2.88,5.45,1.585],'look_at':[1.21,6.40,1.01]},
            {'id':'bathroom','label':'Banheiro social','position':[2.28,4.35,1.585],'look_at':[1.28,3.98,1.08]},
            {'id':'ensuite','label':'Banheiro da suíte','position':[3.68,1.60,1.585],'look_at':[4.22,1.97,1.20]},
            {'id':'balcony','label':'Sacada','position':[5.84,.60,1.565],'look_at':[6.76,.70,1.35]},
        ],
        'navigation': {
            'eye_height': 1.55, 'agent_radius': .22,
            'start': [5.02,6.31,1.585],
            'surfaces': [
                {'id':'continuous-interior','height':.035,
                 'polygon':[[.07,.07],[4.53,.07],[4.53,1.15],[7.13,1.15],[7.13,7.73],[.07,7.73]]},
                {'id':'balcony','height':.015,
                 'polygon':[[4.53,.07],[7.13,.07],[7.13,1.20],[4.53,1.20]]},
            ],
            'entries': [
                {'id':'living','label':'Estar e jantar','position':[5.44,2.94,.035],'target':[6.68,2.62,1.04]},
                {'id':'kitchen','label':'Cozinha e serviço','position':[5.02,6.31,.035],'target':[3.81,6.40,1.24]},
                {'id':'hall','label':'Circulação','position':[3.43,4.30,.035],'target':[3.56,3.12,1.33]},
                {'id':'suite','label':'Suíte','position':[2.44,2.96,.035],'target':[2.60,1.51,1.02]},
                {'id':'bedroom','label':'Dormitório','position':[2.88,5.45,.035],'target':[1.21,6.40,1.01]},
                {'id':'bathroom','label':'Banheiro social','position':[2.28,4.35,.035],'target':[1.28,3.98,1.08]},
                {'id':'ensuite','label':'Banheiro da suíte','position':[3.68,1.60,.035],'target':[4.22,1.97,1.20]},
                {'id':'balcony','label':'Sacada','position':[5.84,.60,.015],'target':[6.76,.70,1.35]},
            ],
            'points': [
                {'id':'entrada','room':'kitchen','position':[6.56,7.11,.035]},
                {'id':'cozinha','room':'kitchen','position':[5.02,6.31,.035]},
                {'id':'jantar','room':'kitchen','position':[4.96,5.14,.035]},
                {'id':'passagem-estar','room':'living','position':[5.44,4.38,.035]},
                {'id':'estar','room':'living','position':[5.44,2.94,.035]},
                {'id':'passagem-sacada','room':'living','position':[5.76,1.55,.035]},
                {'id':'porta-sacada','room':'living','position':[6.10,1.43,.035]},
                {'id':'sacada','room':'balcony','position':[5.84,.60,.015]},
                {'id':'circulacao','room':'hall','position':[3.43,4.30,.035]},
                {'id':'entrada-suite','room':'suite','position':[3.58,3.14,.035]},
                {'id':'suite','room':'suite','position':[2.44,2.96,.035]},
                {'id':'entrada-banho-suite','room':'ensuite','position':[3.67,2.56,.035]},
                {'id':'banho-suite','room':'ensuite','position':[3.68,1.60,.035]},
                {'id':'entrada-quarto','room':'hall','position':[2.98,4.66,.035]},
                {'id':'quarto','room':'bedroom','position':[2.88,5.45,.035]},
                {'id':'banho-social','room':'bathroom','position':[2.28,4.35,.035]},
            ],
            'edges': [['entrada','cozinha'],['cozinha','jantar'],['jantar','passagem-estar'],
                      ['passagem-estar','estar'],['estar','passagem-sacada'],
                      ['passagem-sacada','porta-sacada'],['porta-sacada','sacada'],
                      ['jantar','circulacao'],['circulacao','entrada-suite'],['entrada-suite','suite'],
                      ['entrada-suite','entrada-banho-suite'],['entrada-banho-suite','banho-suite'],
                      ['circulacao','entrada-quarto'],['entrada-quarto','quarto'],
                      ['circulacao','banho-social']],
            'note':'Continuous interior floor, with actual wall, furniture, glass and open-door colliders. Pathfinding must check clearance; route edges are hints, never permission to cross an obstacle.'},
        'configurable_materials': {
            'B_WOOD': {'label': 'Madeira do mobiliário', 'scope': 'decorative'},
            'B_FABRIC': {'label': 'Tecidos do mobiliário', 'scope': 'decorative'},
            'B_ACCENT_green': {'label': 'Cor da marcenaria', 'scope': 'decorative'},
            'B_ACCENT_wall': {'label': 'Cor do painel decorativo', 'scope': 'decorative'},
        },
        'protected_materials': ['B_WALL', 'B_FLOOR', 'B_METAL', 'B_GLASS'],
        'visibility': {'roof': 'B_UNIT_ROOF', 'roof_collection': 'B_UNIT_CEILING',
                       'plan_hide_roles': ['roof', 'ceiling-light', 'hanging-light', 'curtain-high', 'context'],
                       'architecture_is_configurable': False},
        'doors': [], 'windows': [], 'colliders': [], 'modeled_lights': [],
        'furniture_variants': {
            **{group: {'label': label, 'default': 'contemporaneo',
                       'options': [{'id': key, 'label': title} for key, title in options]}
               for group, (label, options) in FURNITURE_VARIANTS.items()},
            'navigation': 'All options share the unchanged original furniture and fixture envelopes; no alternative creates a new collider.',
            'revision': 7,
        },
    }


class UnitBuilder:
    def __init__(self, detail):
        self.detail = detail
        self.fine = detail in {'render', 'high', 'final'}
        self.contract = base_contract()
        self.counts = {}
        self.collection = self.new_collection(PREFIX)
        self.arch = self.new_collection('B_UNIT_ARCHITECTURE', self.collection)
        self.furniture = self.new_collection('B_UNIT_FURNITURE', self.collection)
        self.decor = self.new_collection('B_UNIT_DETAILS', self.collection)
        self.ceiling = self.new_collection('B_UNIT_CEILING', self.collection)
        self.lights = self.new_collection('B_UNIT_LIGHTS', self.collection)
        self.cameras = self.new_collection('B_UNIT_CAMERAS', self.collection)
        self.materials = {}
        self.make_materials()

    @staticmethod
    def new_collection(name, parent=None):
        collection = bpy.data.collections.new(name)
        (parent or bpy.context.scene.collection).children.link(collection)
        return collection

    def name(self, key):
        key = PREFIX + '_' + key
        n = self.counts.get(key, 0)
        self.counts[key] = n + 1
        return key if not n else key + '_' + str(n + 1).zfill(3)

    def tag(self, obj, key, room='shared', role='decoration', collection=None, configurable=False):
        obj.name = self.name(key)
        obj['project'] = 'botanique'
        obj['unit'] = 'final-1-demonstracao'
        obj['room'] = room
        obj['role'] = role
        obj['estimated_geometry'] = True
        obj['configurable'] = bool(configurable)
        for existing in list(obj.users_collection):
            existing.objects.unlink(obj)
        (collection or self.decor).objects.link(obj)
        return obj

    def material(self, name, color, rough=0.5, metallic=0.0, noise=None,
                 transmission=0.0, emission=None, alpha=1.0):
        mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
        mat.use_nodes = True
        mat.diffuse_color = (*color, alpha)
        nodes = mat.node_tree.nodes
        nodes.clear()
        out = nodes.new('ShaderNodeOutputMaterial')
        p = nodes.new('ShaderNodeBsdfPrincipled')
        p.inputs['Base Color'].default_value = (*color, alpha)
        p.inputs['Roughness'].default_value = rough
        p.inputs['Metallic'].default_value = metallic
        p.inputs['Alpha'].default_value = alpha
        if 'Transmission Weight' in p.inputs:
            p.inputs['Transmission Weight'].default_value = transmission
        p.inputs['IOR'].default_value = 1.46
        if emission:
            p.inputs['Emission Color'].default_value = (*color, 1)
            p.inputs['Emission Strength'].default_value = emission
        if name in {'B_FABRIC', 'B_FABRIC_cream', 'B_FABRIC_olive'}:
            p.inputs['Sheen Weight'].default_value = 0.2
        mat.node_tree.links.new(p.outputs['BSDF'], out.inputs['Surface'])
        if self.fine and noise:
            tex = nodes.new('ShaderNodeTexNoise')
            tex.inputs['Scale'].default_value = noise[0]
            tex.inputs['Detail'].default_value = 2.0
            bump = nodes.new('ShaderNodeBump')
            bump.inputs['Strength'].default_value = noise[1]
            bump.inputs['Distance'].default_value = noise[2]
            mat.node_tree.links.new(tex.outputs['Fac'], bump.inputs['Height'])
            mat.node_tree.links.new(bump.outputs['Normal'], p.inputs['Normal'])
            if name.startswith('B_FABRIC') or name.startswith('B_WOOD'):
                ramp = nodes.new('ShaderNodeValToRGB')
                spread = .11 if name.startswith('B_WOOD') else .055
                for element, factor in zip(ramp.color_ramp.elements, (1 - spread, 1 + spread)):
                    element.color = (*(min(1.0, c * factor) for c in color), 1.0)
                mat.node_tree.links.new(tex.outputs['Fac'], ramp.inputs['Fac'])
                mat.node_tree.links.new(ramp.outputs['Color'], p.inputs['Base Color'])
                if name.startswith('B_WOOD'):
                    coords = nodes.new('ShaderNodeTexCoord')
                    stretch = nodes.new('ShaderNodeVectorMath')
                    stretch.operation = 'MULTIPLY'
                    stretch.inputs[1].default_value = (2.0, 38.0, 3.0)
                    mat.node_tree.links.new(coords.outputs['Generated'], stretch.inputs[0])
                    mat.node_tree.links.new(stretch.outputs['Vector'], tex.inputs['Vector'])
        self.materials[name] = mat
        return mat

    def make_materials(self):
        self.material('B_WALL', (0.79, 0.77, 0.71), 0.83, noise=(90, .13, .012))
        self.material('B_WOOD', (.40, .24, .12), .45, noise=(6, .10, .012))
        self.material('B_WOOD_dark', (.15, .085, .042), .48)
        self.material('B_FABRIC', (.66, .62, .51), .90, noise=(150, .25, .008))
        self.material('B_FABRIC_cream', (.79, .76, .67), .94, noise=(190, .20, .006))
        self.material('B_FABRIC_olive', (.20, .28, .17), .87, noise=(140, .2, .006))
        self.material('B_FABRIC_sheer', (.79, .76, .67), .94, alpha=.68)
        self.material('B_FLOOR', (.66, .64, .56), .49, noise=(100, .13, .010))
        self.material('B_FLOOR_grout', (.38, .37, .33), .84)
        self.material('B_ACCENT_green', (.20, .29, .23), .47)
        self.material('B_ACCENT_wall', (.48, .51, .42), .82)
        self.material('B_METAL', (.045, .052, .05), .30, metallic=.85)
        self.material('B_STEEL_brushed', (.46, .48, .47), .29, metallic=.94)
        self.material('B_METAL_brass', (.47, .32, .12), .28, metallic=.82)
        self.material('B_GLASS', (.85, .94, .92), .10, transmission=.97, alpha=.30)
        self.material('B_GLASS_smoked', (.065, .09, .085), .12, transmission=.35, alpha=.55)
        self.material('B_MIRROR', (.78, .81, .80), .06, metallic=1)
        self.material('B_STONE', (.72, .71, .63), .30, noise=(30, .16, .010))
        self.material('B_STONE_dark', (.09, .095, .088), .34, noise=(80, .12, .004))
        self.material('B_CERAMIC', (.91, .91, .86), .22)
        self.material('B_PORCELAIN_warm', (.64, .59, .47), .58, noise=(100, .1, .010))
        self.material('B_LEAF', (.09, .22, .10), .60)
        self.material('B_LEAF_light', (.20, .32, .13), .63)
        self.material('B_SOIL', (.055, .035, .020), 1.0)
        self.material('B_WATER', (.62, .77, .74), .09, transmission=.5)
        self.material('B_LED', (1.0, .79, .47), .26, emission=3)
        self.material('B_LED_daylight', (.90, .95, 1.0), .26, emission=2)
        self.material('B_BLACK', (.013, .017, .015), .27)
        self.material('B_BRICK', (.28, .12, .055), .87, noise=(80, .23, .015))
        self.material('B_BRICK_mortar', (.36, .30, .23), .92)
        self.material('B_PAPER', (.86, .83, .71), .9)
        self.material('B_FABRIC_seam', (.53, .50, .43), .94)
        self.material('B_LAMP_OPAL', (.89, .86, .76), .34, emission=.65)
        self.material('B_APPLIANCE_GRAPHITE', (.055, .065, .065), .27, metallic=.64)
        self.material('B_CHARCOAL', (.018, .015, .012), .96, noise=(32, .38, .014))

    def assign(self, obj, mat):
        obj.data.materials.append(self.materials[mat] if isinstance(mat, str) else mat)

    def box(self, key, center, dims, mat='B_WALL', room='shared', role='decoration',
            bevel=0.0, collection=None, configurable=False, collision=False, rotation=None):
        bpy.ops.mesh.primitive_cube_add(size=1, location=center)
        obj = self.tag(bpy.context.object, key, room, role, collection, configurable)
        obj.dimensions = dims
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        self.assign(obj, mat)
        if bevel:
            mod = obj.modifiers.new('Soft manufactured edges', 'BEVEL')
            mod.width = min(bevel, min(dims) * .45)
            mod.segments = 3 if self.fine else 2
            mod.affect = 'EDGES'
            obj.modifiers.new('Weighted corner normals', 'WEIGHTED_NORMAL')
        if rotation:
            obj.rotation_euler = rotation
        if collision:
            self.collider(obj, center, dims)
        return obj

    def collider(self, obj, center, dims, kind='box'):
        obj['collision'] = True
        self.contract['colliders'].append({'object': obj.name, 'room': obj.get('room', 'shared'),
                                          'type': kind, 'center': list(center), 'size': list(dims),
                                          'rotation_z': float(obj.rotation_euler.z)})

    def cylinder(self, key, center, radius, depth, mat='B_METAL', room='shared',
                 role='decoration', vertices=None, rotation=None, collection=None, radius_top=None):
        v = vertices or (40 if self.fine else 24)
        if radius_top is None:
            bpy.ops.mesh.primitive_cylinder_add(vertices=v, radius=radius, depth=depth, location=center)
        else:
            bpy.ops.mesh.primitive_cone_add(vertices=v, radius1=radius, radius2=radius_top,
                                            depth=depth, location=center)
        obj = self.tag(bpy.context.object, key, room, role, collection)
        self.assign(obj, mat)
        for poly in obj.data.polygons:
            poly.use_smooth = len(poly.vertices) == 4
        if rotation:
            obj.rotation_euler = rotation
        return obj

    def sphere(self, key, center, dims, mat='B_FABRIC', room='shared', role='decoration'):
        light_globe=key=='DINING_PENDANT_GLOBE'
        bpy.ops.mesh.primitive_uv_sphere_add(segments=48 if light_globe else 24 if self.fine else 16,
                                           ring_count=24 if light_globe else 12 if self.fine else 8, radius=1, location=center)
        obj = self.tag(bpy.context.object, key, room, role)
        obj.scale = [d / 2 for d in dims]
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        self.assign(obj, mat)
        for p in obj.data.polygons:
            p.use_smooth = True
        return obj

    def rod(self, key, a, b, radius=.012, mat='B_METAL', room='shared', role='decoration'):
        direction = Vector(b) - Vector(a)
        obj = self.cylinder(key, (Vector(a) + Vector(b)) / 2, radius, direction.length, mat, room, role)
        obj.rotation_euler = direction.to_track_quat('Z', 'Y').to_euler()
        return obj

    def mesh(self, key, vertices, faces, mat, room, role='decoration'):
        mesh = bpy.data.meshes.new(self.name(key + '_mesh'))
        mesh.from_pydata(vertices, [], faces)
        mesh.update()
        obj = bpy.data.objects.new(self.name(key), mesh)
        self.decor.objects.link(obj)
        obj['project'], obj['unit'], obj['room'], obj['role'] = 'botanique', 'final-1-demonstracao', room, role
        self.assign(obj, mat)
        return obj

    def wall_run(self, key, axis, constant, start, end, room='shared', openings=()):
        """A wall with genuine voids, not an opaque wall behind a door mesh."""
        cuts = sorted(openings, key=lambda o: o[0])
        cursor = start
        for low, high, sill, top in cuts + [(end, end, 0, HEIGHT)]:
            if low > cursor + .001:
                self.wall_piece(key, axis, constant, cursor, low, 0, HEIGHT, room)
            if high > low:
                if sill > 0:
                    self.wall_piece(key + '_SILL', axis, constant, low, high, 0, sill, room)
                if top < HEIGHT:
                    self.wall_piece(key + '_LINTEL', axis, constant, low, high, top, HEIGHT, room)
            cursor = max(cursor, high)

    def wall_piece(self, key, axis, constant, low, high, bottom, top, room):
        if axis == 'x':
            center = ((low + high) / 2, constant, (bottom + top) / 2)
            dims = (high - low, WALL, top - bottom)
        else:
            center = (constant, (low + high) / 2, (bottom + top) / 2)
            dims = (WALL, high - low, top - bottom)
        self.box(key, center, dims, 'B_WALL', room, 'wall', .009,
                 self.arch, collision=True)

    def door(self, key, axis, fixed, start, end, rooms, open_sign=1, height=2.10, closed=False, hinge_end=False):
        """Open door leaf is parked parallel to a side wall; the opening is navigable."""
        width = end - start
        room = rooms[0]
        mat = 'B_WOOD'
        if axis == 'y':
            for y in (start, end):
                self.box(key + '_JAMB', (fixed, y, height / 2), (.18, .045, height), mat, room, 'doorframe', .008, self.arch)
            self.box(key + '_HEAD', (fixed, (start + end) / 2, height), (.18, width + .07, .045), mat, room, 'doorframe', .008, self.arch)
            c = (fixed, (start + end) / 2, height / 2) if closed else (fixed + open_sign * width / 2, end - .045 if hinge_end else start + .045, height / 2)
            dims = (.038, width, height - .04) if closed else (width, .038, height - .04)
            leaf = self.box(key + ('_CLOSED' if closed else '_OPEN'), c, dims, mat, room, 'door', .012, self.arch, collision=True)
            if closed:
                handle = (fixed - .05, end - .12, 1.0)
                self.rod(key + '_HANDLE', handle, (handle[0], handle[1] - .10, handle[2]), .012, 'B_METAL', room)
            else:
                handle = (fixed + open_sign * width * .84, c[1] - .029, 1.0)
                self.rod(key + '_HANDLE', handle, (handle[0] - .10 * open_sign, handle[1], handle[2]), .012, 'B_METAL', room)
            threshold = [fixed, (start + end) / 2, .04]
        else:
            for x in (start, end):
                self.box(key + '_JAMB', (x, fixed, height / 2), (.045, .18, height), mat, room, 'doorframe', .008, self.arch)
            self.box(key + '_HEAD', ((start + end) / 2, fixed, height), (width + .07, .18, .045), mat, room, 'doorframe', .008, self.arch)
            c = ((start + end) / 2, fixed, height / 2) if closed else (end - .045 if hinge_end else start + .045, fixed + open_sign * width / 2, height / 2)
            dims = (width, .038, height - .04) if closed else (.038, width, height - .04)
            leaf = self.box(key + ('_CLOSED' if closed else '_OPEN'), c, dims, mat, room, 'door', .012, self.arch, collision=True)
            if closed:
                self.rod(key + '_HANDLE', (end - .12, fixed - .048, .95),
                         (end - .12, fixed - .048, 1.15), .014, 'B_METAL', room)
                self.cylinder(key + '_PEEPHOLE', ((start + end) / 2, fixed - .023, 1.57),
                              .011, .014, 'B_METAL', room, rotation=(math.pi / 2, 0, 0))
            else:
                self.rod(key + '_HANDLE', (c[0] - .029, fixed + open_sign * width * .84, 1.0),
                         (c[0] - .029, fixed + open_sign * width * .71, 1.0), .012, 'B_METAL', room)
            threshold = [(start + end) / 2, fixed, .04]
        leaf['opening_default'] = 'closed' if closed else 'open'
        self.contract['doors'].append({'id': key, 'rooms': rooms, 'axis': axis,
                                       'fixed': fixed, 'range': [start, end], 'height': height,
                                       'threshold': threshold, 'default': 'closed' if closed else 'open',
                                       'navigable': not closed})

    def window(self, key, axis, fixed, start, end, sill=.95, top=2.35, room='shared', curtain=False):
        def piece(label, v, z, length, high, mat, thick=.05):
            if axis == 'x':
                return self.box(key + label, (v, fixed, z), (length, thick, high), mat, room, 'window', .003, self.arch)
            return self.box(key + label, (fixed, v, z), (thick, length, high), mat, room, 'window', .003, self.arch)
        for pos in (start, (start + end) / 2, end):
            piece('_VERTICAL', pos, (sill + top) / 2, .045, top - sill, 'B_METAL')
        for z in (sill, top):
            piece('_HORIZONTAL', (start + end) / 2, z, end - start, .045, 'B_METAL')
        glass = piece('_GLASS', (start + end) / 2, (sill + top) / 2,
                      end - start - .045, top - sill - .045, 'B_GLASS', .010)
        self.collider(glass, glass.location, glass.dimensions)
        self.contract['windows'].append({'id': key, 'room': room, 'axis': axis,
                                         'fixed': fixed, 'range': [start, end], 'sill': sill, 'top': top})
        if curtain and axis == 'x':
            self.curtain(key + '_CURTAIN', start - .10, end + .10,
                         fixed + (.14 if fixed < DEPTH / 2 else -.14), top + .16, room)

    def curtain(self, key, left, right, y, top, room):
        # Two gathered panels keep the window and exit visually open.
        for side in (0, 1):
            width = min(.36, (right - left) * .18)
            x0 = left if not side else right - width
            n = 20 if self.fine else 12
            verts = []
            for row, z in enumerate((.10, top)):
                for i in range(n + 1):
                    x = x0 + width * i / n
                    yy = y + .055 * math.sin(i / n * math.pi * 8)
                    verts.append((x, yy, z))
            faces = [(i, i + 1, n + 2 + i, n + 1 + i) for i in range(n)]
            self.mesh(key, verts, faces, 'B_FABRIC_cream', room, 'curtain-high')
        self.rod(key + '_RAIL', (left - .06, y, top + .025), (right + .06, y, top + .025), .018, 'B_METAL', room)

    def floor(self, room, rect, material='B_FLOOR', level=.02, tile=True):
        x0, y0, x1, y1 = rect
        self.box('FLOOR_' + room.upper(), ((x0 + x1) / 2, (y0 + y1) / 2, level - .025),
                 (x1 - x0, y1 - y0, .05), material, room, 'floor', collection=self.arch)
        if tile:
            # Shallow grout seams remain inexpensive and legible in glTF.
            pitch = .80
            for axis, lo, hi in (('x', x0, x1), ('y', y0, y1)):
                v = math.ceil((lo + .01) / pitch) * pitch
                while v < hi - .01:
                    if axis == 'x':
                        self.box('GROUT', (v, (y0 + y1) / 2, level + .001), (.004, y1 - y0, .0015), 'B_FLOOR_grout', room)
                    else:
                        self.box('GROUT', ((x0 + x1) / 2, v, level + .001), (x1 - x0, .004, .0015), 'B_FLOOR_grout', room)
                    v += pitch

    def architecture(self):
        self.box('FOUNDATION', (WIDTH / 2, DEPTH / 2, -.10), (WIDTH, DEPTH, .20),
                 'B_WALL', role='foundation', collection=self.arch)
        for r in ROOMS:
            for rect in r.get('floor_regions', [r['bounds']]):
                self.floor(r['id'], rect, 'B_PORCELAIN_warm' if r['id'] == 'balcony' else 'B_FLOOR',
                           .015 if r['id'] == 'balcony' else .035)
        self.wall_run('WALL_WEST','y',0,0,DEPTH,openings=[(3.87,4.57,1.65,2.30),(5.84,7.06,.94,2.35)])
        self.wall_run('WALL_NORTH','x',DEPTH,0,WIDTH,openings=[(6.18,7.08,0,2.12)])
        self.wall_run('WALL_EAST','y',WIDTH,1.15,DEPTH,openings=[(6.43,7.25,.94,2.35)])
        # Final 1 is read as the recessed balcony type: the right return is
        # masonry, rather than the glazed side of a projecting corner balcony.
        # The existing left return is the ensuite/living partition below.
        self.wall_run('BALCONY_RIGHT_RETURN','y',WIDTH,0,1.15,room='balcony')
        self.wall_run('WALL_FRONT','x',0,0,4.53,openings=[(.76,2.56,.94,2.35),(3.47,4.18,1.68,2.30)])
        self.wall_run('BEDROOM_KITCHEN_PARTITION','y',3.40,4.86,DEPTH,room='bedroom')
        self.wall_run('BEDROOM_SOUTH','x',4.86,0,3.40,room='bedroom',openings=[(2.56,3.40,0,2.10)])
        self.wall_run('SOCIAL_BATH_EAST','y',2.65,3.60,4.86,room='bathroom',openings=[(3.90,4.68,0,2.10)])
        self.wall_run('SUITE_NORTH','x',3.60,0,4.53,room='suite',openings=[(3.17,4.00,0,2.10)])
        self.wall_run('ENSUITE_WEST','y',3.17,0,2.66,room='ensuite')
        self.wall_run('ENSUITE_NORTH','x',2.66,3.17,4.53,room='ensuite',openings=[(3.24,4.00,0,2.10)])
        self.wall_run('SUITE_LIVING_PARTITION','y',4.53,0,3.60,room='living')
        self.wall_run('BALCONY_HEADER','x',1.15,4.53,WIDTH,room='balcony',openings=[(4.63,7.08,0,2.40)])
        self.door('ENTRY','x',DEPTH,6.18,7.08,['kitchen','outside'],-1,2.12,closed=True)
        self.door('BEDROOM_DOOR','x',4.86,2.56,3.40,['bedroom','hall'],1,hinge_end=True)
        self.door('SOCIAL_BATH_DOOR','y',2.65,3.90,4.68,['bathroom','hall'],-1,hinge_end=True)
        self.door('SUITE_DOOR','x',3.60,3.17,4.00,['suite','hall'],-1,hinge_end=True)
        self.door('ENSUITE_DOOR','x',2.66,3.24,4.00,['ensuite','suite'],-1)
        self.window('BEDROOM_WINDOW','y',0,5.84,7.06,room='bedroom')
        self.window('SUITE_WINDOW','x',0,.76,2.56,room='suite',curtain=True)
        self.window('KITCHEN_WINDOW','y',WIDTH,6.43,7.25,.94,room='kitchen')
        self.window('SOCIAL_BATH_WINDOW','y',0,3.87,4.57,1.65,2.30,'bathroom')
        self.window('ENSUITE_WINDOW','x',0,3.47,4.18,1.68,2.30,'ensuite')
        # Two stacked sliding leaves on the left: right half is open for walking.
        for offset in (0, .042):
            x0, x1 = 4.63 + offset, 5.78 + offset
            self.window('BALCONY_SLIDER', 'x', 1.15 + offset, x0, x1, .04, 2.40, 'living')
        self.contract['doors'].append({'id': 'BALCONY_OPENING', 'rooms': ['living', 'balcony'],
                                       'axis': 'x', 'fixed': 1.15, 'range': [5.86, 7.07],
                                       'height': 2.40, 'threshold': [6.10, 1.15, .03], 'default': 'open', 'navigable': True})
        self.box('BALCONY_TRACK', (5.855, 1.15, .032), (2.45, .045, .02),
                 'B_METAL', 'balcony', 'threshold', collection=self.arch)
        self.box('ROOF', (WIDTH / 2, DEPTH / 2, HEIGHT + .06), (WIDTH + .05, DEPTH + .05, .12),
                 'B_WALL', role='roof', collection=self.ceiling)
        # The front guardrail terminates into the two solid side returns.
        # No lateral glass or wrap-around rail: that belongs to another type.
        self.rod('BALCONY_HANDRAIL', (4.60, .028, 1.10), (7.13, .028, 1.10),
                 .018, 'B_METAL', 'balcony', 'railing')
        self.box('BALCONY_EDGE_CAP', (5.865, .035, .055), (2.53, .10, .08),
                 'B_STONE', 'balcony', 'railing', .006, self.arch)
        self.box('BALCONY_GLASS_FRONT', (5.865, .035, .59), (2.49, .018, 1.00),
                 'B_GLASS', 'balcony', 'railing', collection=self.arch, collision=True)
        for x in (4.62, 5.865, 7.11):
            self.box('BALCONY_POST', (x, .028, .58), (.025, .038, 1.10), 'B_METAL', 'balcony', 'railing')

    def tag_variant(self, objects, group, variant):
        """Independent mesh alternatives share one fixed navigation envelope.

        Export all meshes using extras and preserve group/id during batching.
        hide_render only chooses the Cycles default; it must not filter GLB.
        """
        if group not in FURNITURE_VARIANTS or variant not in {key for key, _ in FURNITURE_VARIANTS[group][1]}:
            raise ValueError('Unknown furniture variant: '+group+'/'+variant)
        for obj in objects:
            if obj.type!='MESH':continue
            if obj.get('variantGroup') and (obj['variantGroup'], obj['variantId']) != (group, variant):
                raise ValueError('Mesh already belongs to another alternative: '+obj.name)
            obj['variantGroup']=group;obj['variantId']=variant
            obj['variantDefault']='contemporaneo';obj['configurable']=True
            obj.hide_render=variant!='contemporaneo'
            obj.hide_viewport=False

    def tube_path(self, key, points, radius, mat, room='living', closed=False, role='furniture'):
        """Single inexpensive swept mesh, used for seams and bent metalwork."""
        points=[Vector(p) for p in points]
        sides=6 if self.fine else 5
        vertices=[];faces=[]
        for i,p in enumerate(points):
            previous=points[(i-1)%len(points)] if closed or i else points[0]
            following=points[(i+1)%len(points)] if closed or i<len(points)-1 else points[-1]
            tangent=(following-previous).normalized()
            reference=Vector((0,0,1)) if abs(tangent.z)<.92 else Vector((0,1,0))
            normal=tangent.cross(reference).normalized();binormal=tangent.cross(normal).normalized()
            for j in range(sides):
                a=math.tau*j/sides
                vertices.append(tuple(p+radius*(normal*math.cos(a)+binormal*math.sin(a))))
        for i in range(len(points) if closed else len(points)-1):
            for j in range(sides):
                faces.append((i*sides+j,i*sides+(j+1)%sides,
                              ((i+1)%len(points))*sides+(j+1)%sides,((i+1)%len(points))*sides+j))
        if not closed:
            faces.extend([tuple(reversed(range(sides))),tuple(range((len(points)-1)*sides,len(points)*sides))])
        obj=self.mesh(key,vertices,faces,mat,room,role)
        for face in obj.data.polygons:face.use_smooth=True
        return obj

    def ring(self,key,center,radius,tube,mat,room='kitchen',axis='z',role='decoration'):
        points=[]
        for i in range(40 if self.fine else 28):
            a=math.tau*i/(40 if self.fine else 28)
            u,v=radius*math.cos(a),radius*math.sin(a)
            points.append((center[0]+(0 if axis=='x' else u),
                           center[1]+(u if axis=='x' else 0 if axis=='y' else v),
                           center[2]+(v if axis in {'x','y'} else 0)))
        return self.tube_path(key,points,tube,mat,room,True,role)

    def seam_on_cushion(self,key,center,width,height,mat='B_FABRIC_seam',rotation=None):
        """A subtle seam around a vertical back/pillow, not thick piping."""
        points=[]
        for i in range(40):
            a=math.tau*i/40
            points.append((0,math.copysign(abs(math.cos(a))**.60,math.cos(a))*width/2,
                             math.copysign(abs(math.sin(a))**.70,math.sin(a))*height/2))
        obj=self.tube_path(key,points,.0013,mat)
        obj.location=center
        if rotation:obj.rotation_euler=rotation
        return obj

    def organic_sofa(self):
        before=set(bpy.data.objects);room='living'
        self.soft_cushion('SOFA_ORGANIC_BASE',(6.60,2.80,.30),(.92,2.02,.35),'B_FABRIC_cream',room)
        seat=self.soft_cushion('SOFA_ORGANIC_SEAT',(6.48,2.80,.52),(.73,1.73,.23),'B_FABRIC_cream',room)
        for v in seat.data.vertices:v.co.x+=.025*(v.co.y/.865)**2
        vertices=[];faces=[];sections=44;ring=16
        for i in range(sections+1):
            t=math.pi*i/sections
            cx=6.55+.40*math.sin(t);cy=2.8+.88*math.cos(t)
            n=Vector((.88*math.sin(t),.40*math.cos(t),0)).normalized()
            z=.67+.105*math.sin(t)
            for k in range(ring):
                a=math.tau*k/ring
                vertices.append((cx+n.x*.13*math.cos(a),cy+n.y*.13*math.cos(a),z+.235*math.sin(a)))
        for i in range(sections):
            for k in range(ring):
                a=i*ring+k;b=i*ring+(k+1)%ring
                faces.append((a,b,b+ring,a+ring))
        faces.extend([tuple(reversed(range(ring))),tuple(range(sections*ring,(sections+1)*ring))])
        back=self.mesh('SOFA_ORGANIC_CONTINUOUS_BACK',vertices,faces,'B_FABRIC_cream',room,'furniture')
        for p in back.data.polygons:p.use_smooth=True
        self.rounded_slab('SOFA_ORGANIC_PLINTH',(6.61,2.8,.13),(.76,1.80,.10),.23,'B_WOOD_dark',room)
        self.soft_cushion('SOFA_ORGANIC_OLIVE_CUSHION',(6.66,3.37,.84),(.18,.40,.37),'B_FABRIC_olive',room,rotation=(.08,-.28,.19))
        self.soft_cushion('SOFA_ORGANIC_LUMBAR_CUSHION',(6.66,2.14,.77),(.18,.41,.26),'B_FABRIC',room,rotation=(-.12,-.19,-.14))
        self.seam_on_cushion('SOFA_ORGANIC_PILLOW_SEAM',(6.574,3.37,.84),.365,.334,rotation=(.08,-.28,.19))
        self.tube_path('SOFA_ORGANIC_TOP_SEAM',[(6.55+.397*math.sin(math.pi*i/48),
                       2.8+.877*math.cos(math.pi*i/48),.907+.105*math.sin(math.pi*i/48)) for i in range(49)],
                       .0015,'B_FABRIC_seam')
        self.sofa_throw('SOFA_ORGANIC_THROW')
        self.tag_variant(set(bpy.data.objects)-before,'sofa','organico')

    def modular_sofa(self):
        """Two compact upholstered modules, entirely inside the original sofa."""
        before=set(bpy.data.objects);room='living'
        for i,y in enumerate((2.275,3.315)):
            self.soft_cushion('SOFA_MODULAR_BASE',(6.59,y,.30),(.96,1.025,.38),'B_FABRIC_olive',room)
            self.soft_cushion('SOFA_MODULAR_SEAT',(6.47,y,.514),(.70,.905,.22),'B_FABRIC_cream',room)
            self.soft_cushion('SOFA_MODULAR_BACK',(6.91,y,.77),(.25,.99,.63),'B_FABRIC_olive',room,
                              rotation=(0,-.06,0))
            self.seam_on_cushion('SOFA_MODULAR_BACK_SEAM',(6.782,y,.77),.913,.57,
                                 mat='B_FABRIC_cream',rotation=(0,-.06,0))
            self.upholstery_piping('SOFA_MODULAR_SEAT_SEAM',(6.47,y,.531),.344,.442,room)
            self.rounded_slab('SOFA_MODULAR_SHADOW_BASE',(6.59,y,.095),(.79,.88,.11),.15,'B_WOOD_dark',room)
            # One restrained pulled seam per module gives the upholstery tension.
            self.tube_path('SOFA_MODULAR_TOPSTITCH',[(6.15+.59*k/24,y,.614-.006*math.sin(math.pi*k/24))
                                                   for k in range(25)],.0012,'B_FABRIC_seam')
        for y in (1.79,3.81):
            self.soft_cushion('SOFA_MODULAR_ARM',(6.52,y,.64),(.84,.15,.32),'B_FABRIC_olive',room)
        self.soft_cushion('SOFA_MODULAR_PILLOW',(6.66,2.075,.845),(.19,.37,.37),'B_FABRIC',room,
                          rotation=(-.12,-.18,-.1))
        self.sofa_throw('SOFA_MODULAR_THROW')
        self.tag_variant(set(bpy.data.objects)-before,'sofa','modular')

    def organic_dining_chair(self,key,x,y,angle,width):
        before=set(bpy.data.objects);room='living'
        self.soft_cushion(key+'_SEAT',(0,-.014,.475),(width*.96,.445,.115),'B_FABRIC_olive',room)
        vertices=[];faces=[];columns=30;rows=5
        for side in (-1,1):
            for row in range(rows+1):
                t=row/rows
                for col in range(columns+1):
                    a=-math.pi*.60+col/columns*math.pi*1.20
                    nx,ny=math.sin(a),math.cos(a)
                    xx=nx*(width*.445+side*.012)
                    yy=.002+ny*(.208+side*.012)
                    top=.72+.16*max(0,math.cos(a))
                    vertices.append((xx,yy,.50+(top-.50)*t))
        stride=(columns+1)*(rows+1)
        for side in range(2):
            for row in range(rows):
                for col in range(columns):
                    a=side*stride+row*(columns+1)+col
                    f=(a,a+1,a+columns+2,a+columns+1)
                    faces.append(tuple(reversed(f)) if side else f)
        boundary=list(range(columns+1))+[r*(columns+1)+columns for r in range(1,rows+1)]
        boundary+=list(range(rows*(columns+1)+columns-1,rows*(columns+1)-1,-1))
        boundary+=[r*(columns+1) for r in range(rows-1,0,-1)]
        for i,a in enumerate(boundary):
            b=boundary[(i+1)%len(boundary)];faces.append((a,b,b+stride,a+stride))
        shell=self.mesh(key+'_WRAPPED_SHELL',vertices,faces,'B_FABRIC_olive',room,'furniture')
        for p in shell.data.polygons:p.use_smooth=True
        self.tube_path(key+'_SHELL_EDGE',[(math.sin(-math.pi*.60+i/36*math.pi*1.20)*width*.445,
                        .002+math.cos(-math.pi*.60+i/36*math.pi*1.20)*.208,
                        .72+.16*max(0,math.cos(-math.pi*.60+i/36*math.pi*1.20))) for i in range(37)],
                        .0015,'B_FABRIC_seam')
        for xx in (-width*.34,width*.34):
            for yy in (-.155,.155):
                self.rod(key+'_BRASS_LEG',(xx*1.13,yy*1.10,.036),(xx,yy,.45),.015,'B_METAL_brass',room,'furniture')
                self.cylinder(key+'_FOOT',(xx*1.13,yy*1.10,.041),.019,.018,'B_BLACK',room,'furniture',vertices=12)
        for obj in set(bpy.data.objects)-before:
            loc=obj.location.copy()
            obj.location.x=x+loc.x*math.cos(angle)-loc.y*math.sin(angle)
            obj.location.y=y+loc.x*math.sin(angle)+loc.y*math.cos(angle)
            obj.rotation_euler.z+=angle
        self.tag_variant(set(bpy.data.objects)-before,'chairs','organico')

    def shell_dining_chair(self,key,x,y,angle,width):
        """Moulded oak/linen shell on a continuous dark cantilever frame."""
        before=set(bpy.data.objects);room='living'
        self.soft_cushion(key+'_SEAT',(0,-.016,.473),(width*.95,.437,.095),'B_FABRIC_cream',room)
        self.rounded_slab(key+'_UNDERSEAT',(0,-.012,.418),(width*.97,.43,.025),.11,'B_WOOD',room)
        cols,rows=20,7
        for suffix,mat,offset in (('_OAK_SHELL','B_WOOD',.016),('_INNER_LINER','B_FABRIC_cream',-.002)):
            vertices=[];faces=[]
            for j in range(rows+1):
                t=j/rows
                for i in range(cols+1):
                    u=-1+2*i/cols
                    xx=u*width*.472*(.90+.10*math.sin(math.pi*t/2))
                    yy=.12+.104*t-.099*u*u + offset
                    zz=.49+.385*t-.042*(abs(u)**4)*t
                    vertices.append((xx,yy,zz))
            for j in range(rows):
                for i in range(cols):
                    a=j*(cols+1)+i;faces.append((a,a+1,a+cols+2,a+cols+1))
            obj=self.mesh(key+suffix,vertices,faces,mat,room,'furniture')
            solid=obj.modifiers.new('Laminated shell thickness','SOLIDIFY');solid.thickness=.011
            for face in obj.data.polygons:face.use_smooth=True
        self.tube_path(key+'_BACK_SEAM',[(u*width*.470,.222-.099*u*u,.875-.042*abs(u)**4)
                                        for u in [-1+2*i/28 for i in range(29)]],.0015,'B_FABRIC_seam')
        for side in (-1,1):
            xx=side*width*.36
            self.tube_path(key+'_CONTINUOUS_FRAME',[(xx,.183,.40),(xx,-.12,.40),(xx,-.175,.37),
                           (xx,-.193,.10),(xx,-.168,.054),(xx,.178,.054)],.014,'B_METAL')
            self.box(key+'_GLIDE',(xx,.129,.039),(.045,.078,.013),'B_BLACK',room,bevel=.006)
        self.rod(key+'_REAR_TIE',(-width*.36,.18,.07),(width*.36,.18,.07),.011,'B_METAL',room)
        for obj in set(bpy.data.objects)-before:
            loc=obj.location.copy()
            obj.location.x=x+loc.x*math.cos(angle)-loc.y*math.sin(angle)
            obj.location.y=y+loc.x*math.sin(angle)+loc.y*math.cos(angle)
            obj.rotation_euler.z+=angle
        self.tag_variant(set(bpy.data.objects)-before,'chairs','concha')

    def chair(self, key, x, y, angle, room='living', fabric='B_FABRIC', width=.48):
        if room == 'living':
            before=set(bpy.data.objects)
            seat=self.dining_chair(key, x, y, angle, room, fabric, width)
            self.tag_variant(set(bpy.data.objects)-before,'chairs','contemporaneo')
            self.organic_dining_chair(key+'_ORGANIC',x,y,angle,width)
            self.shell_dining_chair(key+'_SHELL',x,y,angle,width)
            return seat
        # Build around the local origin, then rotate the whole chair as a rigid group.
        before = set(bpy.data.objects)
        seat = self.box(key + '_SEAT', (0, 0, .47), (width, .47, .10), fabric, room, 'furniture', .06, self.furniture, True)
        self.box(key + '_BACK', (0, .21, .74), (width, .095, .40), fabric, room, 'furniture', .06, self.furniture, True,
                 rotation=(math.radians(8), 0, 0))
        for xx in (-width * .36, width * .36):
            for yy in (-.16, .16):
                self.rod(key + '_LEG', (xx * 1.1, yy * 1.1, .035), (xx, yy, .43), .023, 'B_WOOD', room, 'furniture')
        for obj in set(bpy.data.objects) - before:
            loc = obj.location.copy()
            obj.location.x = x + loc.x * math.cos(angle) - loc.y * math.sin(angle)
            obj.location.y = y + loc.x * math.sin(angle) + loc.y * math.cos(angle)
            obj.rotation_euler.z += angle

        self.collider(seat,(x,y,.48),(width,.54,.90))

    def rounded_slab(self, key, center, dims, radius, mat, room):
        """Plan corner radius independent of the slender manufactured edge."""
        width, depth, height = dims
        steps = 8 if self.fine else 5
        edge = min(.004, height * .12)
        vertices, faces = [], []
        for z, inset in ((-height/2, edge), (-height/2+edge, 0),
                         (height/2-edge, 0), (height/2, edge)):
            rr = max(.002, radius-inset)
            for cx, cy, start in ((width/2-radius, depth/2-radius, 0),
                                  (-width/2+radius, depth/2-radius, math.pi/2),
                                  (-width/2+radius, -depth/2+radius, math.pi),
                                  (width/2-radius, -depth/2+radius, 3*math.pi/2)):
                for j in range(steps+1):
                    a = start + j/steps*math.pi/2
                    vertices.append((cx+rr*math.cos(a), cy+rr*math.sin(a), z))
        stride = 4*(steps+1)
        faces.append(tuple(reversed(range(stride))))
        for level in range(3):
            for i in range(stride):
                j = (i+1) % stride
                faces.append((level*stride+i, level*stride+j,
                              (level+1)*stride+j, (level+1)*stride+i))
        faces.append(tuple(range(3*stride, 4*stride)))
        obj = self.mesh(key, vertices, faces, mat, room, 'furniture')
        obj.location = center
        obj['configurable'] = True
        for polygon in obj.data.polygons:
            polygon.use_smooth = len(polygon.vertices) == 4
        obj.modifiers.new('Slab weighted normals', 'WEIGHTED_NORMAL')
        return obj

    def dining_chair(self, key, x, y, angle, room, fabric, width):
        """Upholstered curved back and tapered joinery, in the existing envelope."""
        before = set(bpy.data.objects)
        seat = self.soft_cushion(key+'_SEAT', (0, -.012, .47),
                                 (width, .45, .10), fabric, room)
        self.rounded_slab(key+'_SEAT_FRAME', (0, -.012, .413),
                          (width*.97, .435, .027), .075, 'B_WOOD', room)
        self.upholstery_piping(key+'_SEAT_SEAM', (0,-.012,.479),
                               width*.496, .223, room)
        # At the edges the back wraps forward. Its maximum Y remains .258 m,
        # inside the already validated +/- .27 m chair collider.
        for shell, material, offset, thickness in (
                ('_BACK_SHELL', 'B_WOOD', .013, .021),
                ('_BACK_CUSHION', fabric, -.018, .030)):
            vertices, faces = [], []
            columns, rows = (20, 5) if self.fine else (14, 4)
            for side in (-1, 1):
                for row in range(rows+1):
                    t = row/rows
                    for column in range(columns+1):
                        u = -1 + 2*column/columns
                        # Small upper corner fall avoids a squared-off outline.
                        z = .625 + .265*t - .014*(abs(u)**6)*t
                        xx = u*width*.494*(.94+.06*t)
                        yy = .172 + .060*t - .095*u*u + offset + side*thickness/2
                        if shell == '_BACK_CUSHION':
                            yy -= .008*math.sin(math.pi*t)*(1-u*u)
                        vertices.append((xx, yy, z))
            side_size = (columns+1)*(rows+1)
            for side in range(2):
                for row in range(rows):
                    for column in range(columns):
                        q=side*side_size+row*(columns+1)+column
                        face=(q,q+1,q+columns+2,q+columns+1)
                        faces.append(tuple(reversed(face)) if side else face)
            boundary = list(range(columns+1))
            boundary += [row*(columns+1)+columns for row in range(1,rows+1)]
            boundary += list(range(rows*(columns+1)+columns-1, rows*(columns+1)-1,-1))
            boundary += [row*(columns+1) for row in range(rows-1,0,-1)]
            for i,a in enumerate(boundary):
                b=boundary[(i+1)%len(boundary)]
                faces.append((a,a+side_size,b+side_size,b))
            back = self.mesh(key+shell, vertices, faces, material, room, 'furniture')
            back['configurable'] = True
            for polygon in back.data.polygons: polygon.use_smooth = True
        for xx in (-width*.35, width*.35):
            for yy in (-.15,.16):
                low=Vector((xx*1.08,yy*1.07,.035))
                high=Vector((xx,yy,.424))
                leg=self.cylinder(key+'_LEG',(low+high)/2,.016,(high-low).length,
                                  'B_WOOD',room,'furniture',vertices=16,radius_top=.023)
                leg.rotation_euler=(high-low).to_track_quat('Z','Y').to_euler()
                if yy > 0:
                    self.rod(key+'_BACK_SUPPORT',(xx,yy,.42),(xx,.17,.67),.014,'B_WOOD',room,'furniture')
        for obj in set(bpy.data.objects)-before:
            loc=obj.location.copy()
            obj.location.x=x+loc.x*math.cos(angle)-loc.y*math.sin(angle)
            obj.location.y=y+loc.x*math.sin(angle)+loc.y*math.cos(angle)
            obj.rotation_euler.z += angle
        self.collider(seat,(x,y,.48),(width,.54,.90))
        return seat

    def soft_cushion(self,key,center,dims,mat,room,rotation=None):
        """Rounded sewn form with shared pole vertices and no pinched end caps."""
        rings,sides=(18,36) if self.fine else (12,24)
        verts=[(0,0,-dims[2]/2)];faces=[]
        def signed_power(v,p):return math.copysign(abs(v)**p,v)
        for j in range(1,rings):
            lat=-math.pi/2+math.pi*j/rings
            for i in range(sides):
                lon=2*math.pi*i/sides
                xx=signed_power(math.cos(lat),.62)*signed_power(math.cos(lon),.60)
                yy=signed_power(math.cos(lat),.62)*signed_power(math.sin(lon),.60)
                zz=signed_power(math.sin(lat),.72)
                # Millimetric cloth compression, strongest around sewn edges.
                # Multiplying toward the centre never grows a collision envelope.
                crease=.014*(.5+.5*math.sin(lon*7+lat*2))*abs(zz)**3*(1-abs(zz))
                verts.append((xx*dims[0]/2*(1-crease),yy*dims[1]/2*(1-crease),
                              zz*dims[2]/2*(1-.012*math.cos(lon*4)**2*(1-abs(zz)))))
        top=len(verts);verts.append((0,0,dims[2]/2))
        for i in range(sides):
            faces.append((0,1+(i+1)%sides,1+i))
        for j in range(rings-2):
            for i in range(sides):
                a=1+j*sides+i;b=1+j*sides+(i+1)%sides
                faces.append((a,b,b+sides,a+sides))
        last=1+(rings-2)*sides
        for i in range(sides):faces.append((last+i,last+(i+1)%sides,top))
        obj=self.mesh(key,verts,faces,mat,room,'furniture');obj.location=center
        if rotation:obj.rotation_euler=rotation
        obj['configurable']=True
        for face in obj.data.polygons:face.use_smooth=True
        return obj


    def upholstery_piping(self,key,center,half_width,half_depth,room):
        """One low-poly closed cord at the top seam of a seat cushion."""
        verts,faces=[],[]
        sections=48 if self.fine else 32
        sides=5
        path=[]
        for i in range(sections):
            a=2*math.pi*i/sections
            x=math.copysign(abs(math.cos(a))**.60,math.cos(a))*half_width
            y=math.copysign(abs(math.sin(a))**.60,math.sin(a))*half_depth
            path.append((x,y))
        for i,(x,y) in enumerate(path):
            prev=path[(i-1)%sections];nxt=path[(i+1)%sections]
            dx,dy=nxt[0]-prev[0],nxt[1]-prev[1]
            ll=max(.001,math.hypot(dx,dy));nx,ny=dy/ll,-dx/ll
            for j in range(sides):
                a=2*math.pi*j/sides
                verts.append((center[0]+x+nx*math.cos(a)*.002,
                              center[1]+y+ny*math.cos(a)*.002,center[2]+math.sin(a)*.002))
        for i in range(sections):
            for j in range(sides):
                faces.append((i*sides+j,i*sides+(j+1)%sides,
                              ((i+1)%sections)*sides+(j+1)%sides,((i+1)%sections)*sides+j))
        obj=self.mesh(key,verts,faces,'B_FABRIC',room)
        for face in obj.data.polygons:face.use_smooth=True
        return obj

    def sofa_throw(self,key):
        """A loose textile draped over the seat lip, within the sofa collider."""
        vertices=[];faces=[];nx,ny=30,24
        guide=[(0,6.67,.665),(.53,6.20,.651),(.66,6.145,.60),(.78,6.122,.45),(1,6.115,.21)]
        for iy in range(ny+1):
            v=iy/ny
            for ix in range(nx+1):
                u=ix/nx
                a,b=next((a,b) for a,b in zip(guide,guide[1:]) if a[0]<=u<=b[0])
                t=(u-a[0])/(b[0]-a[0]);xx=a[1]+(b[1]-a[1])*t;zz=a[2]+(b[2]-a[2])*t
                fold=math.sin(v*math.pi*9+.28*math.sin(u*6))*.009+math.sin(v*math.pi*17+u)*.003
                vertices.append((xx+fold*max(0,(u-.55)/.45),3.04+.54*v+.005*math.sin(u*11+v*7),zz+fold*max(0,1-u)))
        for iy in range(ny):
            for ix in range(nx):
                a=iy*(nx+1)+ix;faces.append((a,a+nx+1,a+nx+2,a+1))
        cloth=self.mesh(key,vertices,faces,'B_FABRIC_olive','living','furniture')
        for p in cloth.data.polygons:p.use_smooth=True
        for i in range(25):
            v=i/24
            self.rod(key+'_FRINGE',(6.112,3.04+.54*v,.211),(6.110+.003*math.sin(i),3.04+.54*v+.004,.179),.0017,'B_FABRIC_olive','living','furniture')

    def sofa(self):
        room = 'living'
        before=set(bpy.data.objects)
        body=self.soft_cushion('SOFA_BASE',(6.61,2.80,.32),(.91,1.95,.35),'B_FABRIC',room)
        self.collider(body,(6.575,2.80,.58),(1.04,2.18,1.10))
        self.soft_cushion('SOFA_BACK',(6.96,2.80,.70),(.20,1.97,.75),'B_FABRIC',room)
        for y in (2.27, 3.27):
            self.soft_cushion('SOFA_SEAT',(6.49,y,.53),(.68,.91,.22),'B_FABRIC_cream',room)
            self.upholstery_piping('SOFA_SEAM',(6.49,y,.557),.338,.451,room)
            self.soft_cushion('SOFA_CUSHION',(6.79,y,.84),(.19,.82,.58),'B_FABRIC_cream',room,rotation=(0,-.17,.012 if y<3 else -.018))
            self.seam_on_cushion('SOFA_BACK_TOPSTITCH',(6.696,y,.84),.768,.536,
                                 rotation=(0,-.17,.012 if y<3 else -.018))
        for y in (1.81, 3.79):
            self.soft_cushion('SOFA_ARM',(6.54,y,.64),(.92,.18,.35),'B_FABRIC',room)
        # A recessed lower rail creates a realistic upholstery/leg separation.
        self.box('SOFA_RECESSED_BASE',(6.60,2.80,.157),(.80,1.87,.032),
                 'B_WOOD_dark',room,'furniture',.009)
        for x in (6.28, 6.92):
            for y in (1.99, 3.59):
                self.cylinder('SOFA_FOOT', (x, y, .11), .035, .15, 'B_WOOD_dark', room)
        self.soft_cushion('SOFA_OLIVE_PILLOW',(6.64,3.45,.91),(.20,.40,.42),'B_FABRIC_olive',room,rotation=(.12,-.20,.11))
        self.soft_cushion('SOFA_LUMBAR_PILLOW',(6.61,2.05,.78),(.17,.35,.29),'B_FABRIC',room,rotation=(-.09,-.18,-.09))
        self.sofa_throw('SOFA_THROW')
        self.tag_variant(set(bpy.data.objects)-before,'sofa','contemporaneo')
        self.organic_sofa()
        self.modular_sofa()
        self.box('LIVING_RUG', (5.53, 2.67, .055), (1.48, 2.54, .025), 'B_FABRIC_cream', room, bevel=.08)
        side = self.cylinder('LIVING_SIDE_TABLE_TOP',(6.66,4.12,.55),.23,.04,'B_WOOD',room,'furniture')
        self.collider(side,(6.66,4.12,.29),(.46,.46,.58),'cylinder')
        self.cylinder('LIVING_SIDE_TABLE_BASE',(6.66,4.12,.28),.10,.51,'B_WOOD_dark',room,'furniture')
        self.vase('LIVING_SIDE_TABLE_VASE',6.66,4.12,.58,room,.06)
        self.box('TV_GREEN_LOW', (4.80, 2.70, .40), (.34, 1.86, .55), 'B_ACCENT_green', room, 'furniture', .012, self.furniture, True, True)
        for y in (2.11, 2.70, 3.29):
            self.box('TV_DOOR', (4.985, y, .42), (.025, .586, .44), 'B_ACCENT_green', room, 'furniture', .003, self.furniture, True)
        self.box('TV_BACK_PANEL', (4.70, 2.70, 1.53), (.045, 1.90, 1.68), 'B_WOOD', room, 'decoration', .004, configurable=True)
        self.box('TV_SCREEN_FRAME', (4.744, 2.70, 1.53), (.043, 1.24, .73), 'B_METAL', room, bevel=.023)
        self.box('TV_SCREEN', (4.770, 2.70, 1.53), (.012, 1.19, .676), 'B_BLACK', room, bevel=.012)
        self.plant('LIVING_PLANT',4.89,3.99,.02,.15,.66,room)
        before=set(bpy.data.objects)
        table=self.rounded_slab('DINING_TOP',(6.28,5.16,.78),(1.16,.76,.052),.15,'B_WOOD',room)
        self.collider(table,(6.28,5.16,.42),(1.16,.76,.84))
        for x in (5.84,6.72):
            for y in (4.91,5.41):
                self.cylinder('DINING_LEG',(x,y,.40),.023,.73,'B_WOOD',room,'furniture',vertices=20,radius_top=.031)
        for y in (4.91,5.41):
            self.box('DINING_APRON',(6.28,y,.721),(.86,.025,.06),'B_WOOD',room,'furniture',.004)
        for x in (5.84,6.72):
            self.box('DINING_APRON',(x,5.16,.721),(.025,.48,.06),'B_WOOD',room,'furniture',.004)
        self.tag_variant(set(bpy.data.objects)-before,'table','contemporaneo')
        before=set(bpy.data.objects)
        self.rounded_slab('DINING_ORGANIC_STONE_TOP',(6.28,5.16,.78),(1.16,.76,.052),.32,'B_STONE',room)
        self.rounded_slab('DINING_ORGANIC_UNDERTOP',(6.28,5.16,.742),(1.03,.63,.025),.27,'B_WOOD_dark',room)
        for x in (6.02,6.54):
            self.cylinder('DINING_ORGANIC_PEDESTAL',(x,5.16,.393),.135,.694,'B_WOOD',room,
                          'furniture',vertices=32,radius_top=.104)
            self.cylinder('DINING_ORGANIC_FOOT',(x,5.16,.054),.148,.034,'B_WOOD_dark',room,'furniture',vertices=32)
            for k in range(18):
                a=math.tau*k/18
                self.rod('DINING_ORGANIC_FLUTE',(x+.130*math.cos(a),5.16+.130*math.sin(a),.081),
                         (x+.103*math.cos(a),5.16+.103*math.sin(a),.731),.004,'B_WOOD',room,'furniture')
        self.tag_variant(set(bpy.data.objects)-before,'table','organico')
        for x in (6.00,6.56):
            self.chair('DINING_CHAIR',x,5.81,0,room,width=.43)
            self.chair('DINING_CHAIR',x,4.51,math.pi,room,width=.43)
        self.vase('DINING_VASE',6.28,5.16,.82,room,.08)

    def sink(self, key, x, y, z, width, depth, room, orientation='x'):
        self.box(key + '_BASIN_SHADOW', (x, y, z), (width, depth, .017), 'B_STONE_dark', room, bevel=.055)
        self.box(key + '_BOWL', (x, y, z + .010), (width * .80, depth * .73, .011), 'B_METAL', room, bevel=.065)
        self.cylinder(key + '_DRAIN', (x, y, z + .018), .025, .004, 'B_METAL_brass', room)
        fx, fy = (x - width * .43, y) if orientation == 'y' else (x, y + depth * .43)
        self.rod(key + '_TAP_UP', (fx, fy, z), (fx, fy, z + .24), .018, 'B_METAL', room)
        self.rod(key + '_TAP_SPOUT', (fx, fy, z + .24), (x, y, z + .24), .018, 'B_METAL', room)

    def kitchen(self):
        room='kitchen'
        self.material('B_APPLIANCE_SILVER',(.38,.40,.39),.30,metallic=.62)
        # Both legs follow the visible L in the source. Main sink and hob are
        # on the vertical leg; laundry is on the short north service leg.
        self.box('KITCHEN_BASE',(3.80,6.33,.47),(.60,2.54,.84),'B_ACCENT_green',room,'furniture',.016,self.furniture,True,True)
        self.box('KITCHEN_WORKTOP',(3.81,6.33,.91),(.65,2.57,.04),'B_STONE',room,'furniture',.012,self.furniture)
        for y in (5.38,6.01,6.64,7.27):
            self.box('KITCHEN_LOWER_FRONT',(4.12,y,.49),(.026,.626,.74),'B_ACCENT_green',room,'furniture',.002,self.furniture,True)
            self.rod('KITCHEN_HANDLE',(4.143,y-.11,.78),(4.143,y+.11,.78),.008,'B_METAL_brass',room)
        self.box('KITCHEN_NORTH_BASE',(4.69,7.46,.47),(1.13,.54,.84),'B_ACCENT_green',room,'furniture',.016,self.furniture,True,True)
        self.box('KITCHEN_NORTH_TOP',(4.68,7.46,.91),(1.16,.59,.04),'B_STONE',room,'furniture',.012,self.furniture)
        self.box('KITCHEN_BACKSPLASH',(3.489,6.34,1.22),(.023,2.58,.62),'B_PORCELAIN_warm',room)
        self.box('KITCHEN_UPPER',(3.69,6.28,2.04),(.40,2.24,.70),'B_WOOD',room,'furniture',.016,self.furniture,True)
        for y in (5.42,5.98,6.54,7.10):
            self.box('KITCHEN_UPPER_FRONT',(3.91,y,2.04),(.025,.556,.65),'B_WOOD',room,'furniture',.002,self.furniture,True)
        self.box('KITCHEN_LED_PROFILE',(3.86,6.28,1.683),(.028,2.20,.010),'B_WOOD',room,bevel=.002)
        self.box('KITCHEN_UNDERCABINET_LED',(3.86,6.28,1.675),(.025,2.17,.005),'B_LED',room,bevel=.001)
        self.sink('KITCHEN_SINK',3.82,5.76,.937,.41,.45,room,'y')
        self.sink('LAUNDRY_SINK',4.67,7.45,.937,.42,.35,room,'x')
        self.box('KITCHEN_HOB',(3.82,6.56,.948),(.47,.50,.018),'B_BLACK',room,bevel=.012)
        for x in (3.70,3.94):
            for y in (6.43,6.69):
                self.cylinder('HOB_RING',(x,y,.961),.074,.008,'B_METAL',room)
        self.box('OVEN_FRONT',(4.15,6.56,.51),(.025,.50,.48),'B_APPLIANCE_SILVER',room,bevel=.012)
        self.box('OVEN_GLASS',(4.167,6.56,.47),(.012,.43,.30),'B_GLASS_smoked',room,bevel=.02)
        self.rod('OVEN_HANDLE',(4.19,6.35,.68),(4.19,6.77,.68),.013,'B_METAL',room)
        self.box('WASHER_FRONT',(4.67,7.17,.48),(.55,.035,.75),'B_CERAMIC',room,bevel=.024)
        self.cylinder('WASHER_PORTHOLE',(4.67,7.147,.46),.18,.027,'B_METAL',room,rotation=(math.pi/2,0,0))
        self.cylinder('WASHER_GLASS',(4.67,7.13,.46),.145,.012,'B_GLASS_smoked',room,rotation=(math.pi/2,0,0))
        self.box('FRIDGE',(5.66,7.39,1.02),(.63,.66,1.96),'B_APPLIANCE_SILVER',room,'furniture',.035,self.furniture,collision=True)
        for z,h in ((.56,.93),(1.51,.90)):
            self.box('FRIDGE_DOOR',(5.66,7.041,z),(.60,.045,h),'B_APPLIANCE_SILVER',room,'furniture',.025,self.furniture)
        for lo,hi in ((.33,.77),(1.24,1.75)):
            self.rod('FRIDGE_HANDLE',(5.9,7.0,lo),(5.9,7.0,hi),.013,'B_METAL',room)
        self.box('KITCHEN_BOARD',(3.58,6.13,1.09),(.025,.27,.31),'B_WOOD',room,bevel=.035)
        self.plant('KITCHEN_HERBS',3.77,7.35,.94,.072,.17,room)
        for x,y in ((3.95,5.27),(3.95,5.43)):
            self.cylinder('KITCHEN_CUP',(x,y,.995),.039,.10,'B_CERAMIC',room)

    def cabinetry_variants(self):
        """Swap the complete visible joinery treatment, leaving carcasses fixed."""
        prefixes=('KITCHEN_LOWER_FRONT','KITCHEN_HANDLE','KITCHEN_UPPER_FRONT',
                  'KITCHEN_UPPER_PULL_REVEAL','KITCHEN_NORTH_FRONT','KITCHEN_NORTH_SIDE_REVEAL',
                  'TV_DOOR','TV_PULL_REVEAL','TV_BACK_PANEL','TV_OAK_REED')
        originals=[o for o in self.collection.all_objects if o.type=='MESH' and
                   any(o.name.startswith(PREFIX+'_'+p) for p in prefixes)]
        before=set(bpy.data.objects)
        # Shallow shaker edge on the painted fronts: the centre remains inset.
        for y in (5.38,6.01,6.64,7.27):
            for yy in (y-.284,y+.284):
                self.box('KITCHEN_SHAKER_STILE',(4.136,yy,.49),(.011,.027,.707),
                         'B_ACCENT_green','kitchen',bevel=.003)
            for z in (.150,.830):
                self.box('KITCHEN_SHAKER_RAIL',(4.136,y,z),(.011,.54,.027),
                         'B_ACCENT_green','kitchen',bevel=.003)
        # A narrow, naturally irregular limestone insert at the TV panel edge.
        # Its face remains behind the screen frame and outside the route.
        self.box('TV_STONE_INLAY_BACK',(4.733,3.482,1.53),(.019,.278,1.62),'B_STONE','living',bevel=.003)
        for row in range(9):
            for col in range(2):
                height=.170 + .004*math.sin(row*1.9+col)
                self.box('TV_STONE_INLAY_PIECE',(4.748+(.003 if (row+col)%3 else 0),3.414+col*.137,
                         .82+row*.178),(.017,.132,height),'B_STONE','living',bevel=.009,
                         rotation=(math.sin(row+col)*.003,0,0))
        self.tag_variant(originals+list(set(bpy.data.objects)-before),'cabinetry','contemporaneo')
        before=set(bpy.data.objects)
        for y in (5.38,6.01,6.64,7.27):
            self.box('KITCHEN_ORGANIC_LOWER_FRONT',(4.12,y,.49),(.026,.626,.74),'B_WOOD','kitchen',
                     'furniture',.006,self.furniture,True)
            # A low profile rib at each broad flute produces actual changing
            # highlights without a dense displacement mesh.
            for k in range(10):
                yy=y-.279+k*.062
                self.rod('KITCHEN_ORGANIC_FLUTE',(4.136,yy,.145),(4.136,yy,.835),.0045,'B_WOOD','kitchen')
            self.box('KITCHEN_ORGANIC_GOLA',(4.143,y,.808),(.006,.525,.012),'B_WOOD_dark','kitchen',bevel=.003)
            self.box('KITCHEN_ORGANIC_GOLA_LIP',(4.146,y,.820),(.008,.525,.008),'B_METAL_brass','kitchen',bevel=.002)
        for y in (5.42,5.98,6.54,7.10):
            self.box('KITCHEN_ORGANIC_UPPER_FRONT',(3.91,y,2.04),(.025,.556,.65),'B_ACCENT_wall','kitchen',
                     'furniture',.008,self.furniture,True)
            self.box('KITCHEN_ORGANIC_UPPER_OAK_BORDER',(3.926,y,1.735),(.007,.515,.026),
                     'B_WOOD','kitchen',bevel=.003)
            self.box('KITCHEN_ORGANIC_UPPER_RECESS',(3.929,y,1.715),(.004,.50,.007),'B_WOOD_dark','kitchen')
        self.box('KITCHEN_ORGANIC_NORTH_FRONT',(4.69,7.174,.49),(1.10,.024,.742),'B_WOOD','kitchen',bevel=.006)
        for x in (4.16,5.22):
            self.box('KITCHEN_ORGANIC_NORTH_JOINT',(x,7.156,.49),(.005,.005,.71),'B_WOOD_dark','kitchen')
        for y in (2.11,2.70,3.29):
            self.box('TV_ORGANIC_DOOR',(4.985,y,.42),(.025,.586,.44),'B_WOOD','living',
                     'furniture',.008,self.furniture,True)
            for k in range(9):
                yy=y-.25+k*.0625
                self.rod('TV_ORGANIC_FLUTE',(4.998,yy,.209),(4.998,yy,.631),.0045,'B_WOOD','living')
            self.box('TV_ORGANIC_FINGER_RECESS',(4.999,y,.626),(.007,.42,.010),'B_WOOD_dark','living',bevel=.002)
        self.box('TV_ORGANIC_BACK_PANEL',(4.70,2.70,1.53),(.045,1.90,1.68),'B_ACCENT_wall','living',bevel=.005)
        for y in [1.78+i*.058 for i in range(33)]:
            if 2.01<y<3.39:continue
            self.rod('TV_ORGANIC_OAK_ROUND_REED',(4.733,y,.71),(4.733,y,2.35),.010,'B_WOOD','living')
        self.tag_variant(set(bpy.data.objects)-before,'cabinetry','organico')

    def appliance_variants(self):
        """Two designed appliance sets; independent of the cabinet option."""
        room='kitchen'
        prefixes=('FRIDGE','OVEN','WASHER','KITCHEN_HOB','HOB_RING')
        originals=[o for o in self.collection.all_objects if o.type=='MESH' and
                   any(o.name.startswith(PREFIX+'_'+p) for p in prefixes)]
        before=set(bpy.data.objects)
        # Inox default: knobs, panel reveals, stamped rims and gas pan supports.
        for z in (.318,.779,1.226,1.756):
            self.rod('FRIDGE_HANDLE_ANCHOR',(5.9,7.015,z),(5.9,6.994,z),.010,'B_STEEL_brushed',room)
        self.box('FRIDGE_GASKET_DIVIDER',(5.66,7.011,1.041),(.568,.009,.009),'B_BLACK',room,bevel=.003)
        self.box('FRIDGE_BADGE',(5.66,7.013,1.86),(.089,.005,.012),'B_STEEL_brushed',room,bevel=.002)
        for y in (6.39,6.72):
            self.cylinder('OVEN_CONTROL_DIAL',(4.177,y,.716),.027,.026,'B_STEEL_brushed',room,
                          vertices=28,rotation=(0,math.pi/2,0))
            self.box('OVEN_DIAL_INDEX',(4.192,y,.731),(.003,.003,.010),'B_BLACK',room)
        self.box('OVEN_DISPLAY',(4.179,6.556,.715),(.004,.115,.025),'B_BLACK',room,bevel=.004)
        for y in (6.528,6.557,6.582):
            self.box('OVEN_DIGIT',(4.182,y,.716),(.002,.010,.003),'B_LED_daylight',room)
        self.box('OVEN_GASKET',(4.179,6.56,.296),(.004,.429,.007),'B_BLACK',room)
        for x in (3.70,3.94):
            for y in (6.43,6.69):
                for a in (0,math.pi/2):
                    self.rod('HOB_PAN_SUPPORT',(x-.085*math.cos(a),y-.085*math.sin(a),.979),
                             (x+.085*math.cos(a),y+.085*math.sin(a),.979),.0045,'B_METAL',room)
                self.cylinder('HOB_BURNER_CAP',(x,y,.970),.047,.009,'B_BLACK',room,vertices=24)
        self.ring('WASHER_STAMPED_RIM',(4.67,7.126,.46),.165,.012,'B_STEEL_brushed',room,'y')
        self.ring('WASHER_RUBBER_GASKET',(4.67,7.112,.46),.141,.006,'B_BLACK',room,'y')
        self.box('WASHER_DETERGENT_DRAWER',(4.50,7.143,.758),(.17,.012,.055),'B_CERAMIC',room,bevel=.005)
        self.box('WASHER_DRAWER_GROOVE',(4.50,7.135,.743),(.117,.008,.007),'B_APPLIANCE_SILVER',room,bevel=.002)
        self.cylinder('WASHER_PROGRAM_DIAL',(4.76,7.134,.754),.031,.019,'B_STEEL_brushed',room,
                      vertices=28,rotation=(math.pi/2,0,0))
        self.box('WASHER_STATUS',(4.85,7.137,.754),(.048,.006,.026),'B_BLACK',room,bevel=.003)
        self.tag_variant(originals+list(set(bpy.data.objects)-before),'appliance','contemporaneo')
        before=set(bpy.data.objects)
        # Graphite alternative: full induction top and a flush touch-control oven.
        self.box('APPLIANCE_ORGANIC_HOB',(3.82,6.56,.948),(.47,.50,.018),'B_BLACK',room,bevel=.012)
        for x in (3.71,3.93):
            for y in (6.445,6.67):
                self.ring('APPLIANCE_ORGANIC_INDUCTION_RING',(x,y,.959),.072,.0015,'B_APPLIANCE_SILVER',room)
                self.ring('APPLIANCE_ORGANIC_INDUCTION_CENTRE',(x,y,.959),.014,.001,'B_APPLIANCE_SILVER',room)
        for y in (6.45,6.52,6.59,6.66):
            self.box('APPLIANCE_ORGANIC_HOB_TOUCH',(4.014,y,.960),(.008,.024,.0015),'B_CERAMIC',room,bevel=.001)
        self.box('APPLIANCE_ORGANIC_OVEN_FRAME',(4.15,6.56,.51),(.025,.50,.48),'B_APPLIANCE_GRAPHITE',room,bevel=.011)
        self.box('APPLIANCE_ORGANIC_OVEN_GLASS',(4.167,6.56,.479),(.012,.455,.348),'B_GLASS_smoked',room,bevel=.015)
        self.box('APPLIANCE_ORGANIC_OVEN_CONTROL',(4.169,6.56,.716),(.008,.445,.049),'B_BLACK',room,bevel=.005)
        for y in (6.412,6.562,6.712):
            self.box('APPLIANCE_ORGANIC_OVEN_TOUCH',(4.175,y,.718),(.003,.022,.002),'B_LED_daylight',room)
        self.rod('APPLIANCE_ORGANIC_OVEN_HANDLE',(4.19,6.35,.665),(4.19,6.77,.665),.009,'B_STEEL_brushed',room)
        for y in (6.35,6.77):
            self.rod('APPLIANCE_ORGANIC_OVEN_MOUNT',(4.169,y,.665),(4.193,y,.665),.009,'B_STEEL_brushed',room)
        self.box('APPLIANCE_ORGANIC_WASHER_FRONT',(4.67,7.17,.48),(.55,.035,.75),'B_APPLIANCE_GRAPHITE',room,bevel=.025)
        self.cylinder('APPLIANCE_ORGANIC_WASHER_PORT',(4.67,7.145,.46),.18,.027,'B_BLACK',room,
                      vertices=40,rotation=(math.pi/2,0,0))
        self.cylinder('APPLIANCE_ORGANIC_WASHER_GLASS',(4.67,7.126,.46),.150,.010,'B_GLASS_smoked',room,
                      vertices=40,rotation=(math.pi/2,0,0))
        self.ring('APPLIANCE_ORGANIC_WASHER_RIM',(4.67,7.12,.46),.165,.007,'B_STEEL_brushed',room,'y')
        self.box('APPLIANCE_ORGANIC_WASHER_PANEL',(4.67,7.141,.756),(.44,.009,.059),'B_BLACK',room,bevel=.007)
        self.cylinder('APPLIANCE_ORGANIC_WASHER_DIAL',(4.53,7.128,.756),.023,.019,'B_APPLIANCE_GRAPHITE',room,
                      rotation=(math.pi/2,0,0),vertices=24)
        for x in (4.68,4.74,4.80):
            self.box('APPLIANCE_ORGANIC_WASHER_TOUCH',(x,7.134,.756),(.026,.003,.003),'B_LED_daylight',room)
        # French doors over a bottom freezer alter the geometry, not only colour.
        self.box('APPLIANCE_ORGANIC_FRIDGE_BODY',(5.66,7.39,1.02),(.63,.66,1.96),'B_APPLIANCE_GRAPHITE',room,
                 'furniture',.035,self.furniture)
        self.box('APPLIANCE_ORGANIC_FREEZER',(5.66,7.041,.392),(.60,.045,.593),'B_APPLIANCE_GRAPHITE',room,bevel=.021)
        self.box('APPLIANCE_ORGANIC_FREEZER_REVEAL',(5.66,7.013,.703),(.565,.012,.016),'B_BLACK',room,bevel=.003)
        for x in (5.507,5.813):
            self.box('APPLIANCE_ORGANIC_FRIDGE_DOOR',(x,7.041,1.364),(.293,.045,1.248),
                     'B_APPLIANCE_GRAPHITE',room,bevel=.017)
            self.box('APPLIANCE_ORGANIC_FRIDGE_RECESS',(x+(.126 if x<5.66 else -.126),7.013,1.29),
                     (.012,.012,.71),'B_BLACK',room,bevel=.004)
        self.box('APPLIANCE_ORGANIC_FRIDGE_DISPLAY',(5.512,7.013,1.617),(.092,.006,.141),'B_BLACK',room,bevel=.008)
        for z in (1.579,1.611,1.643):
            self.box('APPLIANCE_ORGANIC_FRIDGE_INDICATOR',(5.512,7.008,z),(.031,.002,.003),'B_LED_daylight',room)
        self.tag_variant(set(bpy.data.objects)-before,'appliance','organico')


    def duvet(self, key, cx, cy, width, length, z, room):
        nx, ny = (24, 30) if self.fine else (12, 18)
        verts, faces = [], []
        for iy in range(ny + 1):
            yy = -length / 2 + length * iy / ny
            for ix in range(nx + 1):
                xx = -width / 2 + width * ix / nx
                folds = .009 * math.sin(iy * 1.7 + ix * .7) + .012 * math.sin(ix * .8 + iy * .22)
                edge = max(0, abs(xx) - width * .39) / (width * .11)
                drop = .10 * edge * edge
                verts.append((cx + xx, cy + yy, z + folds - drop))
        for iy in range(ny):
            for ix in range(nx):
                i = iy * (nx + 1) + ix
                faces.append((i, i + 1, i + nx + 2, i + nx + 1))
        obj = self.mesh(key, verts, faces, 'B_FABRIC_cream', room, 'furniture')
        obj['configurable'] = True
        for p in obj.data.polygons:
            p.use_smooth = True

    def bed(self, key, x, y, width, length, room, angle=0):
        before = set(bpy.data.objects)
        self.box(key + '_FRAME', (x, y, .25), (width + .08, length + .09, .32), 'B_WOOD', room, 'furniture', .055, self.furniture, True, True)
        self.box(key + '_MATTRESS', (x, y, .49), (width, length, .23), 'B_FABRIC_cream', room, 'furniture', .095, self.furniture)
        self.box(key + '_HEADBOARD', (x, y + length / 2 + .10, .72), (width + .22, .11, 1.28), 'B_FABRIC', room, 'furniture', .055, self.furniture, True)
        self.duvet(key + '_DUVET', x, y - .14, width + .16, length - .28, .623, room)
        count = 2 if width > 1.10 else 1
        for i in range(count):
            px = x + (i - (count - 1) / 2) * width / count
            pillow = self.soft_cushion(key + '_PILLOW', (px, y + length / 2 - .33, .70),
                              (width / count - .07, .43, .16), 'B_FABRIC_cream', room)
            pillow.rotation_euler.z = .025 * (i * 2 - 1)
        self.box(key + '_RUNNER', (x, y - length * .28, .643), (width + .07, .43, .027), 'B_FABRIC_olive', room, bevel=.018)
        if angle:
            for obj in set(bpy.data.objects)-before:
                loc=obj.location.copy()
                obj.location.x=x+(loc.x-x)*math.cos(angle)-(loc.y-y)*math.sin(angle)
                obj.location.y=y+(loc.x-x)*math.sin(angle)+(loc.y-y)*math.cos(angle)
                obj.rotation_euler.z+=angle
                for collider in self.contract['colliders']:
                    if collider['object']==obj.name:
                        collider['center']=list(obj.location)
                        collider['rotation_z']=float(obj.rotation_euler.z)


    def bedroom_variants(self):
        # The catalogue shows one coherent suite composition. Twin beds and
        # wardrobes stay fixed; no alternative duplicates their colliders.
        original=[o for o in self.collection.all_objects if o.type=='MESH' and o.name.startswith(
            ('B_UNIT_SUITE_BED','B_UNIT_SUITE_LAMP_','B_UNIT_SUITE_HEADBOARD_'))]
        self.tag_variant(original,'bed','contemporaneo')
        before=set(bpy.data.objects);x,y=2.03,1.50;width,length=1.48,1.88
        self.box('SUITE_ORGANIC_BASE',(0,0,.255),(width+.06,length+.075,.30),'B_FABRIC',
                 'suite','furniture',.06,self.furniture,True)
        self.box('SUITE_ORGANIC_RECESS',(0,0,.095),(width-.16,length-.18,.08),'B_WOOD_dark','suite',bevel=.02)
        self.box('SUITE_ORGANIC_MATTRESS',(0,0,.49),(width,length,.23),'B_FABRIC_cream','suite',bevel=.08)
        self.arched_panel('SUITE_ORGANIC_HEADBOARD',width+.20,.10,.13,1.48,.24,
                          length/2+.10,'B_FABRIC_olive','suite')
        self.duvet('SUITE_ORGANIC_DUVET',0,-.14,width+.14,length-.28,.623,'suite')
        self.box('SUITE_ORGANIC_THROW',(0,-.49,.645),(width+.06,.60,.026),'B_FABRIC','suite',bevel=.014)
        for px in (-.36,.36):
            cushion=self.soft_cushion('SUITE_ORGANIC_PILLOW',(px,.60,.704),(.65,.44,.17),'B_FABRIC_cream','suite')
            cushion.rotation_euler.z=-.05 if px<0 else .045
        self.soft_cushion('SUITE_ORGANIC_ACCENT',(0,.42,.798),(.56,.22,.10),'B_FABRIC_olive','suite')
        for obj in set(bpy.data.objects)-before:
            loc=obj.location.copy();obj.location.x=x+loc.y;obj.location.y=y-loc.x;obj.rotation_euler.z-=math.pi/2
        for by in (.43,2.52):
            self.cylinder('SUITE_ORGANIC_SIDE_BASE',(2.91,by,.31),.105,.51,'B_WOOD_dark','suite',vertices=32,radius_top=.135)
            self.cylinder('SUITE_ORGANIC_SIDE_TOP',(2.91,by,.582),.16,.035,'B_STONE','suite',vertices=40)
            self.cylinder('SUITE_ORGANIC_LAMP_BASE',(2.91,by,.635),.05,.065,'B_WOOD_dark','suite',vertices=24,radius_top=.035)
            self.sphere('SUITE_ORGANIC_LAMP',(2.91,by,.770),(.19,.19,.20),'B_LAMP_OPAL','suite')
        # The slim wall panel replaces the default battens and framed prints,
        # staying in their shallow wall zone, outside the walkable floor.
        self.box('SUITE_ORGANIC_WALL_PANEL',(3.084,1.47,1.73),(.019,2.41,1.94),'B_WOOD_dark','suite',bevel=.008)
        for by in (.66,2.28):
            self.cylinder('SUITE_ORGANIC_WALL_DISC',(3.065,by,2.11),.18,.017,'B_STONE',
                                     'suite',vertices=48,rotation=(0,math.pi/2,0))
        self.tag_variant(set(bpy.data.objects)-before,'bed','organico')
        self.contract['furniture_variants']['bed']['room']='suite'
        self.contract['furniture_variants']['bathroom']['room']='bathroom'

    def wardrobe(self, key, x, y, width, depth, height, room, axis='x', front_sign=1):
        dims = (width, depth, height) if axis == 'x' else (depth, width, height)
        self.box(key + '_BODY', (x, y, height / 2 + .04), dims, 'B_WOOD', room, 'furniture', .018, self.furniture, True, True)
        n = max(2, round(width / .55))
        for i in range(n):
            a = -width / 2 + (i + .5) * width / n
            if axis == 'x':
                c, d = (x + a, y - depth / 2 - .018, height / 2 + .04), (width / n - .014, .026, height - .025)
                handle_a = (x + a + width / n * .32, c[1] - .018, .94)
            else:
                c, d = (x + front_sign * (depth / 2 + .018), y + a, height / 2 + .04), (.026, width / n - .014, height - .025)
                handle_a = (c[0] + front_sign * .018, y + a + width / n * .32, .94)
            mat = 'B_MIRROR' if i == 1 else 'B_ACCENT_wall'
            self.box(key + '_DOOR', c, d, mat, room, 'furniture', .008, self.furniture, mat != 'B_MIRROR')
            self.rod(key + '_PULL', handle_a, (handle_a[0], handle_a[1], 1.34), .009, 'B_METAL_brass', room)

    def bedrooms(self):
        # Source Final1: transverse double bed, headboard on the east side.
        self.bed('SUITE_BED',2.03,1.50,1.48,1.88,'suite',-math.pi/2)
        self.wardrobe('SUITE_WARDROBE',.37,1.85,3.20,.55,2.43,'suite','y')
        self.box('SUITE_RUG',(1.98,1.51,.057),(2.30,2.21,.025),'B_FABRIC','suite',bevel=.05)
        for y in (.43,2.52):
            self.cylinder('SUITE_BEDSIDE',(2.91,y,.37),.16,.64,'B_WOOD','suite','furniture')
            self.cylinder('SUITE_LAMP_BASE',(2.91,y,.707),.055,.025,'B_METAL_brass','suite')
            self.rod('SUITE_LAMP_STEM',(2.91,y,.72),(2.91,y,.93),.010,'B_METAL_brass','suite')
            self.cylinder('SUITE_LAMP_SHADE',(2.91,y,1.01),.11,.19,'B_FABRIC_cream','suite',radius_top=.085)
        self.box('SUITE_DESK',(1.34,3.30,.76),(1.15,.46,.045),'B_WOOD','suite','furniture',.02,self.furniture,True,True)
        for x in (.86,1.82):
            self.box('SUITE_DESK_LEG',(x,3.30,.40),(.04,.38,.70),'B_METAL','suite')
        self.chair('SUITE_DESK_CHAIR',1.34,2.83,math.pi,'suite','B_FABRIC_olive',.44)
        self.wardrobe('SUITE_VESTIBULE_STORAGE',4.28,3.13,.74,.39,2.43,'suite','y',-1)
        # Two quiet framed prints above the transverse headboard.
        for y in (1.10,1.88):
            self.box('SUITE_HEADBOARD_ART_FRAME',(3.087,y,1.98),(.024,.52,.68),'B_WOOD_dark','suite',bevel=.012)
            self.box('SUITE_HEADBOARD_ART',(3.068,y,1.98),(.012,.47,.63),'B_PAPER','suite')
            for offset in (-.09,0,.09):
                self.box('SUITE_HEADBOARD_ART_LINE',(3.059,y+offset,1.98),(.004,.025,.30+abs(offset)), 'B_ACCENT_green','suite',bevel=.008)
        # The reference shows two transverse single beds; no invented desk here.
        self.bed('BEDROOM_BED_A',1.39,7.00,.86,1.88,'bedroom',math.pi/2)
        self.bed('BEDROOM_BED_B',1.39,5.72,.86,1.88,'bedroom',math.pi/2)
        self.wardrobe('BEDROOM_WARDROBE',3.01,6.85,1.64,.58,2.43,'bedroom','y',-1)
        self.cylinder('BEDROOM_NIGHTSTAND',(.29,6.36,.37),.17,.65,'B_WOOD','bedroom','furniture')
        self.vase('BEDROOM_VASE',.29,6.36,.71,'bedroom',.055)


    def toilet(self, key, x, y, room, angle=0):
        before = set(bpy.data.objects)
        self.box(key + '_CISTERN', (0, .20, .61), (.35, .16, .38), 'B_CERAMIC', room, bevel=.047)
        bowl = self.sphere(key + '_BOWL', (0, -.02, .32), (.36, .53, .48), 'B_CERAMIC', room)
        self.box(key + '_PLINTH', (0, .06, .19), (.25, .30, .32), 'B_CERAMIC', room, bevel=.08)
        self.sphere(key + '_SEAT', (0, -.045, .51), (.365, .48, .044), 'B_CERAMIC', room)
        self.cylinder(key + '_BUTTON', (0, .20, .806), .025, .008, 'B_METAL', room)
        for obj in set(bpy.data.objects) - before:
            loc = obj.location.copy()
            obj.location.x = x + loc.x * math.cos(angle) - loc.y * math.sin(angle)
            obj.location.y = y + loc.x * math.sin(angle) + loc.y * math.cos(angle)
            obj.rotation_euler.z += angle

        self.collider(bowl,(x,y,.415),(.39,.62,.83))

    def arched_panel(self,key,width,depth,bottom,top,rise,y,mat,room):
        """A shallow manufactured panel with a real curved upper silhouette."""
        outline=[(-width/2,bottom),(width/2,bottom)]
        for i in range(21):
            a=math.pi*i/20
            outline.append((width/2*math.cos(a),top-rise+rise*math.sin(a)))
        n=len(outline);verts=[(x,y+side*depth/2,z) for side in (-1,1) for x,z in outline]
        faces=[tuple(range(n)),tuple(reversed(range(n,2*n)))]
        faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
        panel=self.mesh(key,verts,faces,mat,room,'furniture')
        bevel=panel.modifiers.new('Fine panel edge','BEVEL');bevel.width=.006;bevel.segments=2
        panel.modifiers.new('Panel face normals','WEIGHTED_NORMAL')
        return panel

    def vessel_basin(self,key,width,depth,room,organic=False):
        # Continuous outer wall, rim and recessed inner bowl. The previous
        # sphere and flat disk made the basin look like a closed solid object.
        profile=[(.08,.831),(.70,.833),(.91,.850),(1.0,.895),(1.01,.934),
                 (.98,.945),(.88,.945),(.85,.928),(.69,.866),(.12,.853)]
        segments=48 if self.fine else 32;verts=[];faces=[]
        for radius,z in profile:
            for i in range(segments):
                a=math.tau*i/segments
                variation=1+.025*math.cos(a*3) if organic else 1
                verts.append((math.cos(a)*width*.5*radius*variation,
                              -.025+math.sin(a)*depth*.5*radius,z))
        for j in range(len(profile)-1):
            for i in range(segments):
                a=j*segments+i;b=j*segments+(i+1)%segments
                faces.append((a,b,b+segments,a+segments))
        faces.append(tuple(range((len(profile)-1)*segments,len(profile)*segments)))
        basin=self.mesh(key,verts,faces,'B_CERAMIC',room,'furniture')
        for face in basin.data.polygons:face.use_smooth=True
        self.cylinder(key+'_DRAIN',(0,-.025,.854),.020,.004,'B_STEEL_brushed',room,vertices=24)
        self.cylinder(key+'_DRAIN_GAP',(0,-.025,.857),.014,.002,'B_BLACK',room,vertices=24)
        return basin

    def vanity(self, key, x, y, width, room, angle=0):
        variants=('contemporaneo','organico') if room=='bathroom' else ('contemporaneo',)
        for variant in variants:
            before=set(bpy.data.objects);organic=variant=='organico'
            label=key+('_ORGANIC' if organic else '')
            base=self.box(label+'_BASE',(0,0,.55),(width,.43,.46),
                          'B_WOOD' if organic else 'B_ACCENT_green',room,'furniture',.019,self.furniture,True)
            self.box(label+'_COUNTER',(0,0,.805),(width+.025,.455,.045),'B_STONE',room,bevel=.012)
            # Drawer fronts and a recessed pull remain inside the existing
            # .49 m plumbing envelope and add no navigation obstacle.
            for z in (.445,.65):
                self.box(label+'_DRAWER',(0,-.218,z),(width-.038,.012,.187),
                         'B_WOOD' if organic else 'B_ACCENT_green',room,bevel=.007)
                self.rod(label+'_PULL',(-width*.22,-.233,z+.052),(width*.22,-.233,z+.052),.004,
                         'B_WOOD_dark' if organic else 'B_METAL_brass',room)
            if organic:
                for i in range(15):
                    self.rod(label+'_REED',(-width*.43+i*width*.86/14,-.228,.36),
                             (-width*.43+i*width*.86/14,-.228,.738),.003,'B_WOOD_dark',room)
            self.vessel_basin(label+'_BASIN',width*.70,.31,room,organic)
            self.cylinder(label+'_FAUCET_FOOT',(0,.17,.834),.025,.011,'B_STEEL_brushed',room)
            self.rod(label+'_FAUCET',(0,.17,.84),(0,.17,1.01),.012,'B_STEEL_brushed',room)
            self.rod(label+'_FAUCET_SPOUT',(0,.17,1.01),(0,.047,1.01),.012,'B_STEEL_brushed',room)
            self.rod(label+'_FAUCET_LEVER',(.021,.17,.957),(.021,.107,.974),.004,'B_STEEL_brushed',room)
            # Both old mirrors were behind their wall tile after rotation.
            # Local +Y=.16 is in front of the finished wall in both bathrooms.
            if organic:
                self.arched_panel(label+'_MIRROR_FRAME',width+.030,.025,1.19,2.09,width*.38,.181,'B_WOOD_dark',room)
                self.arched_panel(label+'_MIRROR',width-.004,.008,1.207,2.073,width*.38-.006,.160,'B_MIRROR',room)
            else:
                self.box(label+'_MIRROR_FRAME',(0,.181,1.63),(width+.040,.026,.89),'B_METAL_brass',room,bevel=.012)
                self.box(label+'_MIRROR',(0,.160,1.63),(width+.010,.008,.856),'B_MIRROR',room,bevel=.015)
            self.box(label+'_MIRROR_LED',(0,.146,2.085),(width*.85,.017,.010),'B_LED',room,bevel=.002)
            self.cylinder(label+'_SOAP_BOTTLE',(-width*.36,-.025,.872),.022,.088,'B_CERAMIC',room,vertices=20)
            self.rod(label+'_SOAP_PUMP',(-width*.36,-.025,.920),(-width*.36,-.025,.940),.007,'B_METAL_brass',room)
            self.rod(label+'_SOAP_NOZZLE',(-width*.36,-.025,.940),(-width*.36,-.054,.940),.004,'B_METAL_brass',room)
            created=set(bpy.data.objects)-before
            for obj in created:
                loc=obj.location.copy();obj.location.x=x+loc.x*math.cos(angle)-loc.y*math.sin(angle)
                obj.location.y=y+loc.x*math.sin(angle)+loc.y*math.cos(angle);obj.rotation_euler.z+=angle
            if not organic:self.collider(base,(x,y,.48),(width+.03,.49,.96))
            if room=='bathroom':self.tag_variant(created,'bathroom',variant)
        # One fixed low-power fixture serves both geometrical mirror options.
        def world(u,v,z):return [x+u*math.cos(angle)-v*math.sin(angle),y+u*math.sin(angle)+v*math.cos(angle),z]
        position=world(0,.123,1.88);target=world(0,-.65,1.25)
        lamp=self.light(key+'_MIRROR_FILL',position,target,1.2,width*.75,(1,.87,.73),room)
        lamp.data.shape='RECTANGLE';lamp.data.size=width*.75;lamp.data.size_y=.10
        self.contract['modeled_lights'].append({'id':key.lower()+'-mirror','type':'area','position':position,
            'target':target,'color':'#ffead1','power':.7,'width':width*.75,'height':.10,
            'blender_watts':1.2,'fixture_role':'mirror-light','room':room})

    def shower(self, key, rect, room, screen_axis='x'):
        x0, y0, x1, y1 = rect
        self.box(key + '_TRAY', ((x0 + x1) / 2, (y0 + y1) / 2, .047), (x1 - x0, y1 - y0, .027), 'B_PORCELAIN_warm', room, bevel=.009)
        self.box(key + '_DRAIN', ((x0 + x1) / 2, y1 - .08, .063), (.30, .045, .006), 'B_METAL', room)
        x, y = x0 + .16, (y0 + y1) / 2
        self.rod(key + '_RISER', (x0 + .065, y, 1.04), (x0 + .065, y, 2.11), .014, 'B_METAL', room)
        self.rod(key + '_ARM', (x0 + .065, y, 2.11), (x + .16, y, 2.11), .017, 'B_METAL', room)
        self.box(key + '_HEAD', (x + .16, y, 2.095), (.21, .21, .025), 'B_METAL', room, bevel=.025)
        if screen_axis == 'y':
            self.box(key + '_GLASS', (x1, (y0 + y1) / 2, 1.11), (.014, y1 - y0, 2.10), 'B_GLASS', room, 'shower-screen', collision=True)
            for y in (y0, y1):
                self.rod(key + '_GLASS_FRAME', (x1, y, .06), (x1, y, 2.17), .012, 'B_METAL', room)
        else:
            self.box(key + '_GLASS', ((x0 + x1) / 2, y1, 1.11), (x1 - x0, .014, 2.10), 'B_GLASS', room, 'shower-screen', collision=True)
            for x in (x0, x1):
                self.rod(key + '_GLASS_FRAME', (x, y1, .06), (x, y1, 2.17), .012, 'B_METAL', room)
        self.box(key + '_SOAP', (x0 + .10, y0 + .16, 1.12), (.10, .14, .045), 'B_STONE', room, bevel=.01)
        self.cylinder(key+'_MIXER',(x0+.067,(y0+y1)/2,1.15),.042,.023,'B_STEEL_brushed',room,
                      rotation=(0,math.pi/2,0))
        self.rod(key+'_MIXER_LEVER',(x0+.09,(y0+y1)/2,1.15),(x0+.13,(y0+y1)/2,1.22),.008,'B_STEEL_brushed',room)
        for row in range(4):
            for column in range(4):
                self.cylinder(key+'_HEAD_JET',(x0+.32+(column-1.5)*.039,(y0+y1)/2+(row-1.5)*.039,2.079),
                              .0025,.003,'B_BLACK',room,vertices=8)
        # Thin shelf and toiletries are entirely inside the shower footprint.
        self.box(key+'_SHELF',(x0+.095,y0+.25,1.38),(.12,.30,.018),'B_STONE',room,bevel=.004)
        for i in range(2):
            self.cylinder(key+'_BOTTLE',(x0+.096,y0+.18+i*.12,1.451),.023,.123,'B_CERAMIC',room,vertices=16)
            self.cylinder(key+'_BOTTLE_CAP',(x0+.096,y0+.18+i*.12,1.519),.015,.013,'B_WOOD_dark',room,vertices=16)

    def bathrooms(self):
        self.shower('SOCIAL_SHOWER',(.09,3.69,.91,4.77),'bathroom','y')
        self.toilet('SOCIAL_TOILET',1.37,3.98,'bathroom',math.pi)
        self.vanity('SOCIAL_VANITY',2.17,3.87,.64,'bathroom',math.pi)
        self.box('SOCIAL_BATH_TILE',(1.33,3.677,1.35),(2.49,.018,2.58),'B_PORCELAIN_warm','bathroom')
        self.shower('ENSUITE_SHOWER',(3.25,.08,4.44,.83),'ensuite','x')
        self.toilet('ENSUITE_TOILET',4.22,1.20,'ensuite',-math.pi/2)
        self.vanity('ENSUITE_VANITY',4.25,1.99,.58,'ensuite',-math.pi/2)
        self.box('ENSUITE_TILE',(4.451,1.33,1.35),(.018,2.49,2.58),'B_PORCELAIN_warm','ensuite')
        self.rod('SOCIAL_TOWEL_RAIL',(1.93,3.77,1.10),(2.19,3.77,1.10),.011,'B_METAL','bathroom')
        self.box('SOCIAL_TOWEL',(2.05,3.79,.93),(.19,.02,.30),'B_FABRIC_cream','bathroom',bevel=.009)


    def balcony(self):
        room = 'balcony'
        # Estimated built-in masonry grill against the right return. Local U
        # runs across the mouth and V runs front-to-back. Front is -X in world
        # coordinates, facing usable balcony space (not facing the guardrail).
        x, y = 6.76, .70

        def point(u, v, z):
            return (x + v, y - u, z)

        def grill_box(key, center, dims, material, bevel=0):
            return self.box(key, point(*center), (dims[1], dims[0], dims[2]),
                            material, room, 'fixed-fixture', bevel, self.arch)

        def grill_rod(key, a, b, radius=.005, material='B_STEEL_brushed'):
            return self.rod(key, point(*a), point(*b), radius, material, room, 'fixed-fixture')

        body = grill_box('BBQ_PLINTH', (0, 0, .435), (.76, .66, .81), 'B_WALL', .008)
        # One conservative collider includes the full built-in stack and its
        # projecting stone edge. The passage at X=6.10 keeps .28 m clearance;
        # the viewing point at X=5.84 has .54 m clearance to the stone edge.
        self.collider(body, (x, y, HEIGHT / 2), (.76, .78, HEIGHT))
        grill_box('BBQ_LEDGE', (0, 0, .8675), (.78, .76, .055), 'B_STONE_dark', .007)
        grill_box('BBQ_LEDGE_FRONT_EDGE', (0, -.367, .855), (.76, .024, .072), 'B_STONE_dark', .004)

        # Side cheeks, masonry rear wall and an actual hollow hearth.
        grill_box('BBQ_BACK', (0, .285, 1.28), (.76, .09, .77), 'B_WALL', .006)
        for u in (-.335, .335):
            grill_box('BBQ_CHEEK', (u, 0, 1.28), (.09, .66, .77), 'B_WALL', .006)
        grill_box('BBQ_FIREBRICK_BACK', (0, .232, 1.28), (.568, .018, .74), 'B_BRICK')
        for u in (-.281, .281):
            grill_box('BBQ_FIREBRICK_SIDE', (u, -.025, 1.28), (.018, .514, .74), 'B_BRICK')
        grill_box('BBQ_FIREBRICK_HEARTH', (0, -.025, .918), (.56, .52, .034), 'B_BRICK')
        # Small joints make the refractory lining legible in both glTF and
        # Cycles; no procedural-only texture is needed to identify the bricks.
        for row in range(9):
            z = .946 + row * .078
            grill_box('BBQ_MORTAR_BACK', (0, .221, z), (.557, .004, .003), 'B_BRICK_mortar')
            for u in (-.270, .270):
                grill_box('BBQ_MORTAR_SIDE', (u, -.027, z), (.004, .504, .003), 'B_BRICK_mortar')
                for v in ((-.145, .075) if row % 2 else (-.035, .18)):
                    grill_box('BBQ_MORTAR_SIDE_VERTICAL', (u, v, z + .039),
                              (.004, .003, .075), 'B_BRICK_mortar')
            for u in ((-.18, 0, .18) if row % 2 else (-.09, .09)):
                grill_box('BBQ_MORTAR_VERTICAL', (u, .220, z + .039),
                          (.003, .004, .075), 'B_BRICK_mortar')

        # Framed mouth, removable ash tray and stainless grate with perimeter
        # bars and supports. Charcoal remains unlit: no fictitious flame/light.
        for u in (-.285, .285):
            grill_box('BBQ_FRAME_SIDE', (u, -.333, 1.282), (.019, .018, .74), 'B_METAL', .002)
        grill_box('BBQ_FRAME_TOP', (0, -.334, 1.648), (.588, .018, .026), 'B_METAL', .002)
        grill_box('BBQ_ASH_TRAY', (0, -.039, .958), (.50, .44, .024), 'B_BLACK')
        for u in (-.255, .255):
            grill_box('BBQ_TRAY_RIM', (u, -.039, .976), (.012, .44, .045), 'B_METAL')
        for v in (-.253, .175):
            grill_box('BBQ_TRAY_RIM', (0, v, .976), (.50, .012, .045), 'B_METAL')
        for u in (-.254, .254):
            grill_rod('BBQ_GRATE_EDGE', (u, -.266, 1.075), (u, .181, 1.075), .006)
        for v in (-.266, .181):
            grill_rod('BBQ_GRATE_EDGE', (-.254, v, 1.075), (.254, v, 1.075), .006)
        for i in range(11):
            u = -.23 + i * .046
            grill_rod('BBQ_GRATE', (u, -.258, 1.075), (u, .174, 1.075), .0035)
        for z in (1.065, 1.18, 1.30):
            for u in (-.269, .269):
                grill_rod('BBQ_RACK_SUPPORT', (u, -.27, z), (u, .17, z), .005, 'B_METAL')
        grill_box('BBQ_CLEANOUT_FRAME', (0, -.337, .50), (.40, .018, .27), 'B_METAL', .004)
        grill_box('BBQ_CLEANOUT_DOOR', (0, -.349, .50), (.365, .012, .237), 'B_STEEL_brushed', .003)
        grill_rod('BBQ_CLEANOUT_PULL', (-.075, -.367, .55), (.075, -.367, .55), .006)

        # Continuous rendered masonry stack joins the ceiling. A tapered metal
        # hood exists inside the casing, rather than a disconnected decorative
        # cube or a short exposed pipe above a freestanding barbecue.
        grill_box('BBQ_LINTEL', (0, -.285, 1.697), (.76, .09, .086), 'B_WALL', .006)
        hood_bottom = [(-.275, -.28, 1.64), (.275, -.28, 1.64),
                       (.275, .22, 1.64), (-.275, .22, 1.64)]
        hood_top = [(-.14, -.06, 2.05), (.14, -.06, 2.05),
                    (.14, .17, 2.05), (-.14, .17, 2.05)]
        hood_vertices = [point(*p) for p in hood_bottom + hood_top]
        self.mesh('BBQ_HOOD_INTERNAL', hood_vertices,
                  [(0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)],
                  'B_METAL', room, 'fixed-fixture')
        # Hollow casing preserves the path from hearth through hood to duct.
        grill_box('BBQ_HOOD_FRONT', (0, -.285, 1.905), (.76, .09, .33), 'B_WALL', .005)
        grill_box('BBQ_HOOD_BACK', (0, .285, 1.862), (.76, .09, .416), 'B_WALL', .005)
        for u in (-.335, .335):
            grill_box('BBQ_HOOD_SIDE', (u, 0, 1.862), (.09, .66, .416), 'B_WALL', .005)
            grill_box('BBQ_FLUE_SIDE', (u, 0, 2.395), (.09, .66, .65), 'B_WALL', .005)
        for v in (-.285, .285):
            grill_box('BBQ_FLUE_FRONT_BACK', (0, v, 2.395), (.76, .09, .65), 'B_WALL', .005)
        for u in (-.15, .15):
            grill_box('BBQ_INTERNAL_DUCT_SIDE', (u, .055, 2.385), (.02, .25, .67), 'B_METAL')
        for v in (-.07, .18):
            grill_box('BBQ_INTERNAL_DUCT_FRONT_BACK', (0, v, 2.385), (.28, .02, .67), 'B_METAL')
        self.contract['balcony_assembly'] = {
            'revision': 4, 'type': 'recessed-niche', 'front_guardrail': 'glass-between-solid-returns',
            'grill': 'built-in-masonry-charcoal-with-refractory-lining-grate-ledge-hood-and-continuous-flue',
            'grill_opening_direction': [-1, 0, 0],
            'grill_collision_bounds_xy': [6.38, .31, 7.14, 1.09],
            'estimated_dimensions': True,
            'note': 'Detalhamento funcional demonstrativo; não é especificação construtiva aprovada.'}
        self.plant('BALCONY_PLANT', 4.73, .36, .02, .18, .73, room)
        table = self.cylinder('BALCONY_SIDE_TABLE', (5.25, .42, .62), .22, .035, 'B_WOOD', room, 'furniture')
        self.collider(table,(5.25,.42,.32),(.44,.44,.64),'cylinder')
        self.cylinder('BALCONY_TABLE_PEDESTAL', (5.25, .42, .325), .055, .55, 'B_METAL', room, 'furniture')
        self.cylinder('BALCONY_TABLE_BASE', (5.25, .42, .035), .16, .025, 'B_METAL', room)
        stool = self.cylinder('BALCONY_STOOL', (5.30, .84, .46), .18, .065, 'B_WOOD', room, 'furniture')
        self.collider(stool,(5.30,.84,.25),(.36,.36,.50),'cylinder')
        for dx, dy in ((-.12, -.11), (.12, -.11), (0, .12)):
            self.rod('BALCONY_STOOL_LEG', (5.30 + dx, .84 + dy, .02), (5.30 + dx * .8, .84 + dy * .8, .43), .016, 'B_METAL', room)
        self.soft_cushion('BALCONY_STOOL_PAD',(5.30,.84,.486),(.325,.325,.025),'B_FABRIC_cream',room)
        self.upholstery_piping('BALCONY_STOOL_SEAM',(5.30,.84,.491),.157,.157,room)
        # Quiet, unlit hearth detail remains below the cooking grate.
        for i,(u,v) in enumerate(((-.16,-.14),(-.03,-.15),(.12,-.12),(-.12,.01),(.02,.015),(.16,.015),(-.025,.10))):
            coal=self.sphere('BBQ_UNLIT_CHARCOAL',point(u,v,1.01),(.045,.075,.032),'B_CHARCOAL',room,'fixed-fixture')
            coal.rotation_euler.z=i*.78
        # Small fabricated details sit wholly on the existing side table.
        self.cylinder('BALCONY_TABLE_COASTER',(5.29,.46,.643),.067,.004,'B_FABRIC',room,vertices=28)
        self.cylinder('BALCONY_CUP',(5.29,.46,.681),.038,.068,'B_CERAMIC',room,vertices=28,radius_top=.041)
        self.cylinder('BALCONY_CUP_INTERIOR',(5.29,.46,.716),.034,.002,'B_WOOD_dark',room,vertices=28)
        self.ring('BALCONY_CUP_HANDLE',(5.338,.46,.682),.021,.004,'B_CERAMIC',room,'y')

    def vase(self, key, x, y, z, room, radius=.075):
        # Keep the previously approved bedroom accessory outside this revision.
        if room != 'living':
            self.cylinder(key,(x,y,z+radius),radius*.73,radius*2,'B_CERAMIC',room,radius_top=radius*.46)
            for i in range(3):
                a=i*2.2
                end=(x+math.cos(a)*radius,y+math.sin(a)*radius,z+radius*(4.2+i*.3))
                self.rod(key+'_BRANCH',(x,y,z+radius*1.7),end,.003,'B_WOOD_dark',room)
                self.sphere(key+'_LEAF',end,(.045,.09,.013),'B_LEAF_light',room)
            return
        # Hollow turned profile with a visible lip, rather than a capped cone.
        profile=[(.58,0),(.71,.055),(.76,.30),(.70,.88),(.50,1.58),
                 (.47,1.93),(.44,2.0),(.35,2.0),(.35,1.93),(.37,1.57),
                 (.57,.84),(.61,.29),(.52,.15)]
        segments=32 if self.fine else 24
        vertices=[(x+math.cos(i*2*math.pi/segments)*r*radius,
                   y+math.sin(i*2*math.pi/segments)*r*radius,z+h*radius)
                  for r,h in profile for i in range(segments)]
        faces=[]
        for row in range(len(profile)-1):
            for i in range(segments):
                j=(i+1)%segments
                faces.append((row*segments+i,row*segments+j,(row+1)*segments+j,(row+1)*segments+i))
        inner_center=len(vertices);vertices.append((x,y,z+radius*.15))
        outer_center=len(vertices);vertices.append((x,y,z))
        last=(len(profile)-1)*segments
        for i in range(segments):
            j=(i+1)%segments
            faces.append((last+i,last+j,inner_center))
            faces.append((outer_center,j,i))
        vase=self.mesh(key,vertices,faces,'B_CERAMIC',room)
        for polygon in vase.data.polygons: polygon.use_smooth=True
        for i in range(3):
            a = i * 2.2
            end = (x + math.cos(a) * radius, y + math.sin(a) * radius, z + radius * (4.2 + i * .3))
            self.rod(key + '_BRANCH', (x, y, z + radius * 1.7), end, .003, 'B_WOOD_dark', room)
            self.sphere(key + '_LEAF', end, (radius*.36, radius*.70, .002), 'B_LEAF_light', room)

    def finishing_details(self):
        """Exportable small details only: no new floor area or collision changes."""
        room='kitchen'
        # Recessed pulls and narrow shadow joints express actual joinery scale.
        for y in (5.42,5.98,6.54,7.10):
            self.box('KITCHEN_UPPER_PULL_REVEAL',(3.924,y,1.725),(.004,.52,.008),
                     'B_WOOD_dark',room,bevel=.001)
        self.box('KITCHEN_TOP_UPSTAND',(3.491,6.34,.956),(.018,2.55,.045),
                 'B_STONE',room,bevel=.003)
        self.box('KITCHEN_NORTH_FRONT',(4.69,7.174,.49),(1.10,.024,.742),
                 'B_ACCENT_green',room,bevel=.002,configurable=True)
        # Washer remains in front of the north cabinetry: do not cover its face.
        self.box('KITCHEN_NORTH_SIDE_REVEAL',(5.205,7.156,.49),(.006,.006,.72),
                 'B_WOOD_dark',room)
        self.box('KITCHEN_SWITCH_PLATE',(3.516,5.04,1.26),(.012,.12,.073),
                 'B_CERAMIC',room,bevel=.008)
        for y in (5.013,5.066):
            self.box('KITCHEN_SWITCH',(3.524,y,1.26),(.004,.036,.044),'B_CERAMIC',room,bevel=.003)
        # Small machined supports keep oven and furniture handles off the fronts.
        for y in (6.35,6.77):
            self.rod('OVEN_HANDLE_MOUNT',(4.171,y,.68),(4.193,y,.68),.009,'B_METAL',room)
        for y in (2.11,2.70,3.29):
            self.box('TV_PULL_REVEAL',(5.000,y,.627),(.006,.49,.007),'B_METAL','living',bevel=.001)
        self.box('TV_COVE_PROFILE',(4.716,2.70,2.390),(.028,1.86,.009),
                 'B_WOOD','living',bevel=.002)
        self.box('TV_COVE_DIFFUSER',(4.716,2.70,2.397),(.025,1.83,.005),
                 'B_LED','living',bevel=.001)
        # Full-width concealed track, with just one narrow panel gathered on
        # the closed left leaf. The validated open right doorway is untouched.
        self.box('LIVING_CURTAIN_TRACK',(5.855,1.327,2.603),(2.45,.039,.025),
                 'B_CERAMIC','living','curtain-high',.003)
        vertices,faces=[],[]
        columns,rows=40,10
        for row in range(rows+1):
            t=row/rows
            for column in range(columns+1):
                u=column/columns
                x=4.70+.30*u+.006*math.sin(math.pi*t)*math.sin(2*math.pi*u)
                y=1.325+(.018+.009*(1-t))*math.sin(10*math.pi*u)+.008*math.sin(math.pi*t)
                z=.092+2.488*t+.004*math.cos(10*math.pi*u)*(1-t)
                vertices.append((x,y,z))
        for row in range(rows):
            for column in range(columns):
                q=row*(columns+1)+column
                faces.append((q,q+1,q+columns+2,q+columns+1))
        panel=self.mesh('LIVING_SHEER_CURTAIN',vertices,faces,'B_FABRIC_sheer','living','curtain-high')
        for polygon in panel.data.polygons: polygon.use_smooth=True
        # Glazing gaskets are kept on the existing closed leaves, not in the gap.
        for offset in (0,.042):
            for x in (4.659+offset,5.751+offset):
                self.box('SLIDER_GASKET',(x,1.121+offset,1.22),(.008,.006,2.30),
                         'B_BLACK','living','window',.001)
        for z in (.058,2.396):
            self.box('SLIDER_CHANNEL',(5.855,1.18,z),(2.45,.014,.012),
                     'B_METAL','living','window',.002)
        self.rod('SLIDER_PULL',(5.734,1.114,.99),(5.734,1.114,1.19),.008,'B_METAL','living','window')
        for z in (.99,1.19):
            self.rod('SLIDER_PULL_MOUNT',(5.734,1.115,z),(5.734,1.14,z),.007,'B_METAL','living','window')
        for x in (4.62,5.865,7.11):
            self.box('BALCONY_POST_SHOE',(x,.028,.072),(.047,.046,.09),
                     'B_METAL','balcony','railing',.003)
        self.interior_refinements()
        self.contract['finish_revision']=7
        self.contract['geometry_revision']=7
        self.contract['finish_note']='Revision 7 retains the six living/kitchen configuration groups and refines suite and wet-room geometry. The Final 1 room distribution, cameras and validated navigation envelopes are unchanged.'

    def interior_refinements(self):
        """Fitted details stay against walls and outside all walking envelopes."""
        def ceiling_line(key,x0,y0,x1,y1,room,power=4,web_power=5):
            x,y=(x0+x1)/2,(y0+y1)/2
            sx,sy=max(.020,abs(x1-x0)),max(.020,abs(y1-y0))
            self.box(key+'_RECESS',(x,y,HEIGHT-.0025),(sx+.003,sy+.003,.005),'B_CERAMIC',room,'ceiling-light',.001,self.ceiling)
            self.box(key+'_DIFFUSER',(x,y,HEIGHT-.006),(sx,sy,.003),'B_LED',room,'ceiling-light',.0005,self.ceiling)
            position=[x,y,HEIGHT-.030];target=[x,y,1.0]
            lamp=self.light(key+'_FILL',position,target,power,max(sx,sy),(1,.84,.67),room)
            lamp.data.shape='RECTANGLE';lamp.data.size=sx;lamp.data.size_y=sy
            self.contract['modeled_lights'].append({'id':key.lower(),'type':'area','position':position,
                'target':target,'color':'#ffe5cc','power':web_power,'width':sx,'height':sy,
                'blender_watts':power,'fixture_role':'ceiling-light','room':room})
        # Continuous L as in the furnished living/kitchen reference, recessed
        # into the ceiling rather than a glowing floating tube.
        ceiling_line('LIVING_LINEAR_LED',4.96,1.62,4.96,6.87,'living',10,11)
        ceiling_line('KITCHEN_LINEAR_RETURN',4.96,6.87,6.87,6.87,'kitchen',4,5)
        for i,(a,b) in enumerate([((.84,.37),(2.91,.37)),((2.91,.37),(2.91,3.17)),
                                   ((2.91,3.17),(.84,3.17)),((.84,3.17),(.84,.37))]):
            ceiling_line('SUITE_PERIMETER_'+str(i),*a,*b,'suite',3,3.5)
        # Shadow gap and warm diffuser below the cabinet fronts. Existing bases
        # retain their exact collision envelopes and circulation clearances.
        self.box('KITCHEN_TOEKICK_RECESS',(4.134,6.30,.103),(.012,2.49,.052),'B_WOOD_dark','kitchen',bevel=.002)
        self.box('KITCHEN_TOEKICK_LED',(4.143,6.30,.117),(.007,2.43,.008),'B_LED','kitchen',bevel=.001)
        self.box('TV_FLOATING_BASE_REVEAL',(4.992,2.70,.145),(.015,1.80,.034),'B_WOOD_dark','living',bevel=.003)
        self.box('TV_FLOATING_BASE_LED',(4.997,2.70,.160),(.007,1.76,.006),'B_LED','living',bevel=.001)
        for key,position,target,span,room in [
                ('KITCHEN_TOEKICK',[4.150,6.30,.109],[4.42,6.30,.035],2.43,'kitchen'),
                ('TV_TOEKICK',[5.006,2.70,.150],[5.25,2.70,.035],1.76,'living')]:
            lamp=self.light(key+'_FILL',position,target,1.7,.02,(1,.78,.54),room)
            lamp.data.shape='RECTANGLE';lamp.data.size=.012;lamp.data.size_y=span
            self.contract['modeled_lights'].append({'id':key.lower(),'type':'area','position':position,
                'target':target,'color':'#ffddae','power':2.0,'width':.012,'height':span,
                'blender_watts':1.7,'fixture_role':'cabinet-light','room':room})
        # Fine, real strips alongside the TV woodwork; not an image of slats.
        for y in [1.78+i*.058 for i in range(33)]:
            if 2.01<y<3.39:continue
            self.box('TV_OAK_REED',(4.732,y,1.54),(.022,.025,1.66),'B_WOOD','living',bevel=.005)
        # A headboard wall of upright oak battens behind the framed prints.
        for i in range(36):
            y=.26+i*.063
            self.box('SUITE_HEADBOARD_REED',(3.082,y,1.70),(.025,.029,1.90),'B_WOOD','suite',bevel=.004)
        self.living_art_and_table()
        # Three shallow lit niches fit the existing wall above the side of the
        # desk; their front ends at Y=3.39, clear of the entry's .35m radius.
        self.box('SUITE_NICHE_BACK',(2.43,3.505,1.76),(.52,.025,1.40),'B_WOOD','suite',bevel=.003)
        for x in (2.15,2.71):self.box('SUITE_NICHE_JAMB',(x,3.465,1.76),(.025,.12,1.43),'B_WOOD','suite',bevel=.003)
        for i,z in enumerate((1.05,1.51,1.97,2.45)):
            self.box('SUITE_NICHE_SHELF',(2.43,3.465,z),(.58,.12,.027),'B_WOOD','suite',bevel=.004)
            if i:
                self.box('SUITE_NICHE_PROFILE',(2.43,3.430,z-.019),(.49,.027,.012),'B_METAL','suite',bevel=.002)
                self.box('SUITE_NICHE_DIFFUSER',(2.43,3.429,z-.026),(.47,.020,.004),'B_LED','suite',bevel=.001)
        for i in range(3):
            self.box('SUITE_NICHE_BOOK',(2.31+i*.055,3.454,1.115+i*.018),(.05,.078,.13),'B_PAPER','suite',bevel=.002)
        self.vase('SUITE_NICHE_VASE',2.43,3.46,1.535,'suite',.045)
        self.cylinder('SUITE_NICHE_BOWL',(2.43,3.463,2.022),.050,.065,'B_CERAMIC','suite',vertices=24,radius_top=.063)
        lamp=self.light('SUITE_NICHE_FILL',(2.43,3.409,2.413),(2.43,3.20,1.51),2,.45,(1,.82,.61),'suite')
        lamp.data.shape='RECTANGLE';lamp.data.size=.47;lamp.data.size_y=.020
        self.contract['modeled_lights'].append({'id':'suite-niches','type':'area','position':[2.43,3.409,2.413],
            'target':[2.43,3.20,1.51],'color':'#ffe2bf','power':3,'width':.47,'height':.020,
            'blender_watts':2,'fixture_role':'cabinet-light','room':'suite'})

    def living_art_and_table(self):
        # Original restrained botanical graphics in thin oak frames. The pair
        # occupies the blank sofa wall shown in the furnished reference.
        for frame,cy in enumerate((2.18,3.22)):
            self.box('SOFA_ART_FRAME',(7.106,cy,1.91),(.035,.77,1.04),'B_WOOD','living',bevel=.008)
            self.box('SOFA_ART_MAT',(7.085,cy,1.91),(.009,.718,.988),'B_CERAMIC','living',bevel=.002)
            self.box('SOFA_ART_CANVAS',(7.077,cy,1.91),(.005,.616,.874),'B_PAPER','living')
            for stem in range(2):
                y0=cy-.12+stem*.16
                for segment in range(8):
                    t=segment/8;u=(segment+1)/8
                    self.rod('SOFA_ART_STEM',(7.073,y0+.10*t*t,1.57+.62*t),(7.073,y0+.10*u*u,1.57+.62*u),.0015,'B_WOOD_dark','living')
                for leaf in range(5):
                    z=1.68+leaf*.10;side=(-1 if (leaf+stem+frame)%2 else 1)
                    center_y=y0+.10*((z-1.57)/.62)**2+side*.043
                    vertices=[(7.071,center_y,z)]
                    for k in range(32):
                        a=k*math.tau/32;du=math.cos(a)*.055;dv=math.sin(a)*.112
                        angle=side*.75
                        vertices.append((7.071,center_y+du*math.cos(angle)-dv*math.sin(angle),z+du*math.sin(angle)+dv*math.cos(angle)))
                    faces=[(0,(k+1)%32+1,k+1) for k in range(32)]
                    self.mesh('SOFA_ART_LEAF',vertices,faces,'B_ACCENT_green' if (leaf+stem)%2 else 'B_ACCENT_wall','living')
        # A small book stack and a real cup handle give the table useful scale.
        self.rounded_slab('DINING_BOOK_COVER',(5.99,5.25,.824),(.30,.205,.026),.009,'B_ACCENT_green','living')
        self.box('DINING_BOOK_PAGES',(5.99,5.25,.840),(.285,.194,.021),'B_PAPER','living',bevel=.003)
        self.rounded_slab('DINING_BOOK_TOP',(6.005,5.246,.861),(.265,.184,.024),.007,'B_FABRIC','living')
        self.cylinder('DINING_CUP_SAUCER',(6.59,4.98,.818),.071,.012,'B_CERAMIC','living',vertices=32)
        self.cylinder('DINING_CUP_BODY',(6.59,4.98,.861),.041,.071,'B_CERAMIC','living',vertices=32,radius_top=.045)
        self.cylinder('DINING_CUP_INSIDE',(6.59,4.98,.898),.037,.003,'B_WOOD_dark','living',vertices=32)
        for k in range(18):
            a=k*math.tau/18;b=(k+1)*math.tau/18
            self.rod('DINING_CUP_HANDLE',(6.641+.024*math.cos(a),4.98,.863+.029*math.sin(a)),
                     (6.641+.024*math.cos(b),4.98,.863+.029*math.sin(b)),.005,'B_CERAMIC','living')

    @staticmethod
    def asset_root():
        return Path.home()/'Documents/Codex/RenderNetwork/Projetos/Botanique-Home-Resort/02-modelos/assets'

    def cc0_potted_plant(self,key,x,y,z,radius,height,room):
        """A real CC0 plant; the pot keeps the pre-existing collision footprint."""
        source=self.asset_root()/'potted_plant_02/potted_plant_02_1k.gltf'
        if not source.is_file():return False
        if not hasattr(self,'_potted_asset'):
            before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(source))
            imported=[o for o in bpy.data.objects if o not in before]
            originals=[o for o in imported if o.type=='MESH']
            meshes=[];points=[];pot_points=[]
            for original in originals:
                mesh=original.data.copy();mesh.transform(original.matrix_world)
                is_leaf=any('leaves' in m.name.lower() for m in mesh.materials if m)
                pp=[v.co.copy() for v in mesh.vertices]
                points.extend(pp)
                if not is_leaf:pot_points.extend(pp)
                meshes.append((mesh,is_leaf))
            if not meshes:raise RuntimeError('Potted Plant02 contains no geometry')
            minz=min(p.z for p in points)
            minx=min(p.x for p in pot_points);maxx=max(p.x for p in pot_points)
            miny=min(p.y for p in pot_points);maxy=max(p.y for p in pot_points)
            center=Vector(((minx+maxx)/2,(miny+maxy)/2,minz))
            for mesh,is_leaf in meshes:
                mesh.transform(Matrix.Translation(-center));mesh.update()
                for mat in mesh.materials:
                    if not mat:continue
                    leaf='leaves' in mat.name.lower() or mat.name.startswith('B_PLANT_CC0_LEAF')
                    mat.name='B_PLANT_CC0_LEAF' if leaf else 'B_PLANT_CC0_POT'
                    mat['source']='https://polyhaven.com/a/potted_plant_02';mat['license']='CC0'
                    if leaf and not mat.get('botanique_alpha_added'):
                        nodes=mat.node_tree.nodes;links=mat.node_tree.links
                        bsdf=next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
                        img=bpy.data.images.load(str(source.parent/'textures/potted_plant_02_leaves_alpha_1k.png'),check_existing=True)
                        img.colorspace_settings.name='Non-Color';img.pack()
                        tex=nodes.new('ShaderNodeTexImage');tex.image=img
                        links.new(tex.outputs['Color'],bsdf.inputs['Alpha'])
                        mat.surface_render_method='DITHERED';mat.use_backface_culling=False
                        mat['botanique_alpha_added']=True
            self._potted_asset={'meshes':meshes,'height':max(p.z for p in points)-minz,
                                'pot_diameter':max(maxx-minx,maxy-miny)}
            for original in imported:bpy.data.objects.remove(original,do_unlink=True)
            self.contract.setdefault('asset_sources',[]).append({'asset':'Potted Plant02','source':'https://polyhaven.com/a/potted_plant_02','author':'Rico Cilliers','license':'CC0','maps':'1K photographic, packed','pot_mesh_decimation':.16})
        asset=self._potted_asset;pot_h=radius*1.45
        scale=min((pot_h+height)/asset['height'],radius*2/asset['pot_diameter'])
        collision_added=False
        for mesh,is_leaf in asset['meshes']:
            obj=bpy.data.objects.new('CC0 plant part',mesh);self.furniture.objects.link(obj)
            suffix='_FOLIAGE' if is_leaf else '_POT' if not collision_added else '_POT_DETAIL'
            self.tag(obj,key+suffix,room,'decoration',self.furniture)
            obj.location=(x,y,z);obj.scale=(scale,scale,scale)
            obj['source']='https://polyhaven.com/a/potted_plant_02';obj['license']='CC0'
            if not is_leaf and len(mesh.polygons)>15000:
                modifier=obj.modifiers.new('Lightweight scanned pot','DECIMATE');modifier.ratio=.16
            if not is_leaf and not collision_added:
                self.collider(obj,(x,y,z+pot_h/2),(radius*2,radius*2,pot_h),'cylinder');collision_added=True
        return True

    def context_vegetation(self):
        """Shared low-LOD real shrubs as a distant illustrative green backdrop.

        This context has no floor, collisions or implication of a measured view.
        Its role is separate so both web and Cycles floorplans can hide it.
        """
        source=self.asset_root()/'context-shrubs/shrub-02-lod2.glb'
        if not source.is_file():return
        before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(source))
        imported=[o for o in bpy.data.objects if o not in before]
        originals=[o for o in imported if o.type=='MESH'];prototypes=[]
        for original in originals:
            mesh=original.data.copy();mesh.transform(original.matrix_world)
            points=[v.co for v in mesh.vertices]
            lo=Vector(tuple(min(p[j] for p in points) for j in range(3)))
            hi=Vector(tuple(max(p[j] for p in points) for j in range(3)))
            mesh.transform(Matrix.Translation(Vector((-(lo.x+hi.x)/2,-(lo.y+hi.y)/2,-lo.z))))
            for mat in mesh.materials:
                if mat:mat.name='B_CONTEXT_CC0_LEAVES';mat['source']='https://polyhaven.com/a/shrub_02';mat['license']='CC0'
            prototypes.append((mesh,max(.01,hi.z-lo.z)))
        collection=self.new_collection('B_UNIT_CONTEXT',self.collection)
        # Modest foreground shrubs and a farther, overlapping tree line keep
        # photographed leaves small in the window instead of magnifying them.
        placements=[(-6,-10,2.4,.3,-.35),(-2,-11,2.7,1.1,-.35),(2,-10,2.4,2.1,-.35),
                    (6,-12,2.9,.7,-.35),(10,-10,2.5,1.7,-.35),
                    (-8,-18,3.9,.6,-.35),(-3,-19,4.2,1.6,-.35),(2,-18,3.8,2.6,-.35),
                    (7,-20,4.1,.8,-.35),(12,-18,3.7,1.8,-.35),
                    (14,4,3.0,.4,-.35),(-8,6,3.1,1.4,-.35)]
        for index,(x,y,height,angle,ground) in enumerate(placements):
            mesh,original_height=prototypes[index%len(prototypes)]
            obj=bpy.data.objects.new('Distant vegetation',mesh);collection.objects.link(obj)
            self.tag(obj,'CONTEXT_CROWN','outside','context',collection)
            scale=height/original_height
            obj.location=(x,y,ground);obj.rotation_euler.z=angle;obj.scale=(scale,scale,scale)
            obj['context_only']=True;obj['exclude_from_bounds']=True
            obj['source']='https://polyhaven.com/a/shrub_02';obj['license']='CC0'
        self.material('B_CONTEXT_GROUND',(.085,.145,.055),1.0)
        ground=self.box('CONTEXT_GROUND',(3,0,-.405),(160,160,.10),'B_CONTEXT_GROUND','outside','context',collection=collection)
        ground['context_only']=True;ground['exclude_from_bounds']=True
        for original in imported:bpy.data.objects.remove(original,do_unlink=True)
        self.contract['context']={'role':'context','instances':len(placements),'source':'https://polyhaven.com/a/shrub_02','license':'CC0',
                                  'geometry':'Shared LOD2 a/c, around31k triangles plus one ground plane','measured_view':False,
                                  'note':'Illustrative distant foliage; no surveyed terrain, floor level or solar orientation claimed.'}

    def plant(self, key, x, y, z, radius, height, room):
        if key in {'LIVING_PLANT','BALCONY_PLANT'} and self.cc0_potted_plant(key,x,y,z,radius,height,room):return
        pot_h = radius * 1.45
        pot = self.cylinder(key + '_POT', (x, y, z + pot_h / 2), radius * .72, pot_h,
                      'B_PORCELAIN_warm', room, radius_top=radius)
        if z < .10:
            self.collider(pot,(x,y,z+pot_h/2),(radius*2,radius*2,pot_h),'cylinder')
        self.cylinder(key + '_SOIL', (x, y, z + pot_h - .01), radius * .89, .015, 'B_SOIL', room)
        # Bent leaf meshes are actual geometry; no downloaded cutout textures.
        leaves = 11 if self.fine else 7
        for i in range(leaves):
            a = i * 2.399963
            base = Vector((x, y, z + pot_h * .9))
            hh = height * (.57 + (i % 4) * .13)
            reach = radius * (1.2 + (i % 3) * .33)
            tip = base + Vector((math.cos(a) * reach, math.sin(a) * reach, hh))
            stemtop = base.lerp(tip, .58)
            self.rod(key + '_STEM', base, stemtop, max(.003, radius * .021), 'B_LEAF', room)
            side = Vector((-math.sin(a), math.cos(a), 0)) * max(.025, radius * .52)
            verts, faces = [], []
            segments = 12 if self.fine else 7
            for j in range(segments + 1):
                t = j / segments
                middle = stemtop.lerp(tip, t) + Vector((0, 0, math.sin(math.pi * t) * height * .07))
                width = math.sin(math.pi * t) ** .78
                for across in (-1, 0, 1):
                    v = middle + side * width * across
                    if across == 0:
                        v.z += height * .018 * width
                    verts.append(tuple(v))
            for j in range(segments):
                for across in range(2):
                    q = j * 3 + across
                    faces.append((q, q + 1, q + 4, q + 3))
            leaf = self.mesh(key + '_LEAF', verts, faces,
                             'B_LEAF_light' if i % 3 == 0 else 'B_LEAF', room)
            for poly in leaf.data.polygons:
                poly.use_smooth = True
            solid = leaf.modifiers.new('Leaf thickness', 'SOLIDIFY')
            solid.thickness = .0007

    def art(self, key, axis, fixed, center, z, width, height, room):
        if axis == 'x':
            self.box(key + '_FRAME', (center, fixed, z), (width, .035, height), 'B_WOOD_dark', room, bevel=.015)
            self.box(key + '_CANVAS', (center, fixed - .022, z), (width - .055, .009, height - .055), 'B_PAPER', room)
            for i in range(3):
                self.box(key + '_BOTANICAL', (center - .1 + i * .11, fixed - .028, z + .06 * (i % 2)),
                         (.045, .004, height * (.42 + .08 * i)), 'B_ACCENT_green', room, bevel=.014,
                         rotation=(0, .20 - i * .13, 0))
        else:
            self.box(key + '_FRAME', (fixed, center, z), (.035, width, height), 'B_WOOD_dark', room, bevel=.015)
            self.box(key + '_CANVAS', (fixed + .022, center, z), (.009, width - .055, height - .055), 'B_PAPER', room)
            for i in range(3):
                self.box(key + '_BOTANICAL', (fixed + .028, center - .10 + i * .10, z),
                         (.004, .045, height * (.4 + i * .09)), 'B_ACCENT_green', room, bevel=.012)

    def light(self, key, position, target, power, size, color, room):
        data = bpy.data.lights.new(self.name(key + '_DATA'), 'AREA')
        data.energy, data.shape, data.size, data.color = power, 'DISK', size, color
        obj = bpy.data.objects.new(self.name(key), data)
        self.lights.objects.link(obj)
        obj.location = position
        obj.rotation_euler = (Vector(target) - Vector(position)).to_track_quat('-Z', 'Y').to_euler()
        obj['room'], obj['role'], obj['project'] = room, 'light', 'botanique'
        obj['render_only'] = True
        return obj

    def lighting(self):
        for x, y, room, power, web_power in [(5.62,2.76,'living',32,13), (5.65,6.44,'kitchen',45,14),
                                             (2.12,1.73,'suite',24,10), (1.81,6.22,'bedroom',24,10),
                                             (2.04,4.03,'bathroom',16,7), (3.99,1.30,'ensuite',10,6)]:
            self.cylinder('DOWNLIGHT_TRIM', (x, y, HEIGHT - .025), .055, .035,
                          'B_CERAMIC', room, 'ceiling-light', collection=self.ceiling)
            self.cylinder('DOWNLIGHT_BAFFLE', (x, y, HEIGHT - .045), .044, .026,
                          'B_METAL', room, 'ceiling-light', collection=self.ceiling)
            self.cylinder('DOWNLIGHT_EMITTER', (x, y, HEIGHT - .061), .035, .004,
                          'B_LED', room, 'ceiling-light', collection=self.ceiling)
            position=[x,y,HEIGHT-.073]
            self.light('CEILING_FILL', position, (x, y, .15), power, .38,
                       (1.0, .82, .63), room)
            self.contract['modeled_lights'].append({
                'id':'downlight-'+room,'type':'spot','position':position,'target':[x,y,.15],
                'color':'#ffe1bd','power':web_power,'range':4.0,'angle':1.10,'penumbra':.85,
                'blender_watts':power,'fixture_role':'ceiling-light','room':room})
        # Low-power internal fittings: caller supplies the actual exterior sun/sky.
        under=self.light('KITCHEN_COUNTER_FILL', (3.86,6.28,1.663), (3.86,6.28,.91),
                         14,.025,(1,.81,.59),'kitchen')
        under.data.shape='RECTANGLE';under.data.size=.025;under.data.size_y=2.17
        self.contract['modeled_lights'].append({
            'id':'kitchen-undercabinet','type':'area','position':[3.86,6.28,1.663],
            'target':[3.86,6.28,.91],'color':'#ffe2c0','power':18,'width':.025,'height':2.17,
            'blender_watts':14,'fixture_role':'cabinet-light','room':'kitchen'})
        cove=self.light('TV_COVE_FILL',(4.716,2.70,2.407),(4.716,2.70,HEIGHT),
                        8,.025,(1,.82,.63),'living')
        cove.data.shape='RECTANGLE';cove.data.size=.025;cove.data.size_y=1.83
        self.contract['modeled_lights'].append({
            'id':'tv-panel-cove','type':'area','position':[4.716,2.70,2.407],
            'target':[4.716,2.70,HEIGHT],'color':'#ffe2c0','power':12,'width':.025,'height':1.83,
            'blender_watts':8,'fixture_role':'cabinet-light','room':'living'})
        before=set(bpy.data.objects)
        self.box('DINING_PENDANT_CANOPY',(6.28,5.16,HEIGHT-.012),(.085,.43,.024),
                 'B_METAL_brass','living','hanging-light',.008)
        for y in (5.03, 5.29):
            self.rod('DINING_PENDANT_CORD', (6.28, y, HEIGHT-.026), (6.28, y, 2.025), .0025, 'B_METAL_brass', 'living', 'hanging-light')
            self.cylinder('DINING_PENDANT_CAP',(6.28,y,2.018),.025,.031,
                          'B_METAL_brass','living','hanging-light')
            self.sphere('DINING_PENDANT_GLOBE', (6.28, y, 1.92), (.18, .18, .18), 'B_LAMP_OPAL', 'living', 'hanging-light')
            self.ring('DINING_PENDANT_CAP_SEAM',(6.28,y,2.018),.025,.0015,'B_METAL','living',role='hanging-light')
        self.tag_variant(set(bpy.data.objects)-before,'pendant','contemporaneo')
        before=set(bpy.data.objects)
        self.box('DINING_PETAL_CANOPY',(6.28,5.16,HEIGHT-.012),(.072,.405,.024),
                 'B_WOOD_dark','living','hanging-light',.008)
        for y in (5.03,5.29):
            self.rod('DINING_PETAL_CORD',(6.28,y,HEIGHT-.026),(6.28,y,2.036),.0024,
                     'B_WOOD_dark','living','hanging-light')
            self.cylinder('DINING_PETAL_NECK',(6.28,y,2.026),.022,.031,'B_METAL_brass','living','hanging-light',vertices=24)
            profile=[(.024,2.037),(.033,2.013),(.058,1.993),(.084,1.971),(.106,1.944),(.108,1.923),(.093,1.908)]
            segments=40;vertices=[];faces=[]
            for radius,z in profile:
                for i in range(segments):
                    a=math.tau*i/segments
                    r=radius*.80*(1+.043*math.sin(a*5))
                    vertices.append((6.28+r*math.cos(a),y+r*math.sin(a),z+.003*math.sin(a*5)))
            for row in range(len(profile)-1):
                for i in range(segments):
                    a=row*segments+i;b=row*segments+(i+1)%segments
                    faces.append((a,b,b+segments,a+segments))
            shade=self.mesh('DINING_PETAL_SHADE',vertices,faces,'B_CERAMIC','living','hanging-light')
            solid=shade.modifiers.new('Fine ceramic shell','SOLIDIFY');solid.thickness=.004
            for face in shade.data.polygons:face.use_smooth=True
            self.sphere('DINING_PETAL_DIFFUSER',(6.28,y,1.916),(.143,.143,.041),'B_LAMP_OPAL','living','hanging-light')
        self.tag_variant(set(bpy.data.objects)-before,'pendant','organico')
        pendant=self.light('DINING_PENDANT_FILL',(6.28,5.16,1.816),(6.28,5.16,.78),
                            9,.18,(1,.82,.63),'living')
        pendant.data.shape='RECTANGLE';pendant.data.size=.18;pendant.data.size_y=.43
        self.contract['modeled_lights'].append({
            'id':'dining-pendant-pair','type':'area','position':[6.28,5.16,1.816],
            'target':[6.28,5.16,.78],'color':'#ffe2c0','power':7,'width':.18,'height':.43,
            'blender_watts':9,'fixture_role':'hanging-light','room':'living'})
        self.contract['modeled_lights_note']='Positions and targets are Blender Z-up metres; transform once to glTF [x,z,-y]. Rectangular lights have local width along Blender X and height along Blender Y. Spot positions are below their diffuser; Three power is a visual calibration, not a conversion of Blender watts.'

    def validate_variant_contract(self):
        """Fail the build if an alternative is missing, hidden in GLB or untagged."""
        counts={group:{key:0 for key,_ in options} for group,(_,options) in FURNITURE_VARIANTS.items()}
        for obj in self.collection.all_objects:
            group=obj.get('variantGroup')
            if not group:continue
            variant=obj.get('variantId')
            if group not in counts or variant not in counts[group]:
                raise ValueError('Unexpected variant metadata on '+obj.name)
            if obj.type!='MESH' or obj.hide_viewport or obj.get('variantDefault')!='contemporaneo':
                raise ValueError('Variant cannot survive export: '+obj.name)
            if obj.hide_render != (variant!='contemporaneo'):
                raise ValueError('Default render visibility is inconsistent: '+obj.name)
            if variant!='contemporaneo' and obj.get('collision'):
                raise ValueError('Alternative must not create another navigation collider: '+obj.name)
            counts[group][variant]+=1
        if any(not count for variants in counts.values() for count in variants.values()):
            raise ValueError('Missing furniture geometry alternative: '+str(counts))
        self.contract['furniture_variant_mesh_counts']=counts
        self.contract['furniture_variant_validation']='all-eight-groups-complete; defaults-only-render-visible; every-option-exportable; shared-navigation'

    def make_cameras(self):
        for camera in CAMERAS:
            data = bpy.data.cameras.new(camera['name'] + '_DATA')
            obj = bpy.data.objects.new(camera['name'], data)
            self.cameras.objects.link(obj)
            obj.location = camera['position']
            direction = Vector(camera['look_at']) - Vector(camera['position'])
            obj.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
            data.clip_start, data.clip_end = .05, 200
            if camera.get('projection') == 'ORTHO':
                data.type, data.ortho_scale = 'ORTHO', camera['ortho_scale']
            else:
                data.lens, data.sensor_width = camera['lens_mm'], 36
                data.dof.use_dof = False
            obj['project'], obj['role'] = 'botanique', 'camera'


def build_unit(detail='web'):
    """Build only this apartment; return room/camera/collision/configuration data.

    `web` avoids procedural bump nodes and dense decorative meshes. `render`
    keeps the same envelope and furniture positions, with finer bevels and
    material microstructure. Both derive from exactly the same layout.
    Caller should hide B_UNIT_CEILING for the orthographic dollhouse view and
    restore it before an interior render. Export selection can exclude cameras
    and AREA lights, whose power is irrelevant to the online viewer.
    """
    if detail not in {'web', 'render', 'high', 'final'}:
        raise ValueError("detail must be 'web', 'render', 'high' or 'final'")
    # Rebuilding affects our named objects only, never another project scene.
    for obj in list(bpy.data.objects):
        if obj.name.startswith(PREFIX + '_'):
            bpy.data.objects.remove(obj, do_unlink=True)
    for collection in list(bpy.data.collections):
        if collection.name == PREFIX or collection.name.startswith(PREFIX + '_'):
            bpy.data.collections.remove(collection)
    builder = UnitBuilder(detail)
    builder.architecture()
    builder.sofa()
    builder.kitchen()
    builder.bedrooms()
    builder.bathrooms()
    builder.balcony()
    builder.finishing_details()
    builder.context_vegetation()
    builder.lighting()
    builder.cabinetry_variants()
    builder.appliance_variants()
    builder.bedroom_variants()
    builder.contract['finish_revision']=7
    builder.contract['geometry_revision']=7
    builder.contract['finish_note']='Revision 7 refines the suite and wet rooms, adds two suite-bed compositions and two social-bath vanity/mirror compositions, corrects mirrors hidden behind wall finishes, and creates recessed vessel basins. Existing architecture, cameras and colliders remain unchanged.'
    builder.validate_variant_contract()
    builder.make_cameras()
    builder.contract['detail'] = detail
    builder.contract['geometry_object_count'] = sum(o.type == 'MESH' for o in builder.collection.all_objects)
    builder.contract['collection'] = builder.collection.name
    builder.contract['configuration_note'] = 'Only decorative materials and furniture are configurable. Walls, doors, window openings, plumbing and the full room distribution are preserved.'
    # Embedded scene provenance travels with .blend and glTF custom properties.
    builder.collection['source_image'] = SOURCE_IMAGE
    builder.collection['scale_status'] = 'estimated-from-humanized-plan'
    bpy.context.scene['botanique_unit_layout'] = json.dumps(builder.contract, ensure_ascii=False)
    bpy.context.scene['botanique_unit_scale_is_estimated'] = True
    return builder.contract
