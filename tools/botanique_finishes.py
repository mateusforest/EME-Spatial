"""Small PBR textures and metre-based UVs for the Botanique apartment.

Run with ordinary Python --generate-assets to produce the deterministic 512 px
maps. Pillow/numpy are used only during that offline step. Inside Blender call
apply_web_finishes() after build_unit(), before joining meshes and GLB export.

No scene geometry/layout, render settings, infrastructure or queue is changed.
Wood, fabric microstructure and plaster use documented Poly Haven CC0 textures.
Fabric colours and porcelain remain original. Client images are never texture maps.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import zlib
from pathlib import Path


ASSET_DIR = Path(__file__).resolve().parents[1] / 'public' / 'assets' / 'botanique' / 'materials'
UV_NAME = 'B_REAL_METRES'
SIZE = 512

# Map span is the size in metres represented by a complete 0..1 UV tile.
# Wood fibres run vertically in the texture (V); UVs follow real panel grain.
FINISHES = {
    'B_WOOD': {'base': 'oak-veneer-color.png', 'normal': 'oak-veneer-normal.png', 'rough': 'oak-veneer-roughness.png',
               'span': (1.83, 1.83), 'kind': 'wood', 'normal_strength': .20, 'average': (164, 130, 93),
               'source': 'Poly Haven CC0: oak_veneer_01, Jenelle van Heerden'},
    'B_WOOD_dark': {'base': 'oak-veneer-dark-color.png', 'normal': 'oak-veneer-normal.png', 'rough': 'oak-veneer-roughness.png',
                    'span': (1.83, 1.83), 'kind': 'wood', 'normal_strength': .18, 'average': (108, 86, 61),
                    'source': 'Poly Haven CC0: oak_veneer_01, stained colour derivative'},
    'B_FABRIC': {'base': 'linen-natural-color.png', 'normal': 'linen-photo-normal.png', 'rough': 'linen-photo-roughness.png',
                 'span': (.38, .38), 'kind': 'linen', 'normal_strength': .30,
                 'source': 'Poly Haven CC0 fabric_pattern_07 normal/roughness, Rob Tuytel; original coloured albedo', 'average': (204, 197, 177)},
    'B_FABRIC_cream': {'base': 'linen-cream-color.png', 'normal': 'linen-photo-normal.png', 'rough': 'linen-photo-roughness.png',
                       'span': (.38, .38), 'kind': 'linen', 'normal_strength': .30,
                 'source': 'Poly Haven CC0 fabric_pattern_07 normal/roughness, Rob Tuytel; original coloured albedo', 'average': (228, 223, 206)},
    'B_FABRIC_olive': {'base': 'linen-olive-color.png', 'normal': 'linen-photo-normal.png', 'rough': 'linen-photo-roughness.png',
                       'span': (.38, .38), 'kind': 'linen', 'normal_strength': .30,
                 'source': 'Poly Haven CC0 fabric_pattern_07 normal/roughness, Rob Tuytel; original coloured albedo', 'average': (133, 150, 111)},
    'B_FABRIC_sheer': {'base':'linen-cream-color.png','normal':'linen-photo-normal.png','rough':'linen-photo-roughness.png',
                       'span':(.26,.26),'kind':'linen','normal_strength':.035,'average':(228,223,206),
                       'alpha':.68,'sheen':.10,
                       'source':'Existing CC0 fabric_pattern_07 microstructure with original cream albedo; gathered sheer curtain'},
    'B_WALL': {'base':'clean-ivory-color.png','normal':'plaster-normal.png','rough':'plaster-roughness.png',
               'span':(1.0,1.0),'kind':'plaster','normal_strength':.035,'average':(230,228,222),
               'source':'Original clean ivory albedo; Poly Haven CC0 white_plaster_02 normal/roughness, Rob Tuytel'},
    'B_FLOOR': {'base': 'porcelain-color.png', 'normal': 'porcelain-normal.png', 'rough': 'porcelain-roughness.png',
                'span': (.80, .80), 'kind': 'stone', 'normal_strength': .045, 'average': (208, 205, 189)},
    'B_STONE': {'base':'porcelain-color.png','normal':'porcelain-normal.png','rough':'porcelain-roughness.png',
                'span':(.80,.80),'kind':'stone','normal_strength':.045,'average':(208,205,189),
                'source':'Original ivory porcelain maps, fine honed counter finish; packed and shared with the floor'},
    'B_PORCELAIN_warm': {'base':'porcelain-color.png','normal':'porcelain-normal.png','rough':'porcelain-roughness.png',
                'span':(.80,.80),'kind':'stone','normal_strength':.035,'average':(208,205,189),
                'source':'Original porcelain maps at measured scale, used for the kitchen backsplash and bathroom lining'},
}

# Revision 6 keeps the existing photographed veneer and adds separate, subtle
# microstructure for upholstery, wool rugs, honed counters and brushed metal.
# The v6 folder is generated independently: earlier releases remain reproducible.
for _name in ('B_WOOD', 'B_WOOD_dark'):
    FINISHES[_name]['span'] = (1.22, 1.83)
    FINISHES[_name]['normal_strength'] = .13
    FINISHES[_name]['source'] += '; decorative veneer width 1.22 m, grain length 1.83 m'
for _name in ('B_FABRIC', 'B_FABRIC_cream', 'B_FABRIC_olive'):
    FINISHES[_name].update(normal='v6/upholstery-normal.png', rough='v6/upholstery-roughness.png',
                           span=(.256, .256), normal_strength=.42, sheen=.24)
FINISHES.update({
    'B_STONE': {'base':'v6/honed-limestone-color.png','normal':'v6/honed-limestone-normal.png',
                'rough':'v6/honed-limestone-roughness.png','span':(1.60,1.60),'kind':'stone',
                'normal_strength':.035,'average':(218,215,202),'source':'Original subtle honed limestone, mineral pores and independent roughness; illustrative finish'},
    'B_STONE_dark': {'base':'v6/charcoal-stone-color.png','normal':'v6/charcoal-stone-normal.png',
                'rough':'v6/charcoal-stone-roughness.png','span':(.60,.60),'kind':'stone',
                'normal_strength':.065,'average':(68,72,68),'source':'Original finely grained charcoal stone; illustrative finish'},
    'B_FABRIC_rug_cream': {'base':'v6/wool-cream-color.png','normal':'v6/wool-normal.png',
                'rough':'v6/wool-roughness.png','span':(.32,.32),'kind':'linen',
                'normal_strength':.62,'average':(216,211,196),'sheen':.32,'source':'Original loop-pile wool maps at 5 mm loop spacing'},
    'B_FABRIC_rug_natural': {'base':'v6/wool-natural-color.png','normal':'v6/wool-normal.png',
                'rough':'v6/wool-roughness.png','span':(.32,.32),'kind':'linen',
                'normal_strength':.62,'average':(193,186,169),'sheen':.32,'source':'Original loop-pile wool maps at 5 mm loop spacing'},
    'B_METAL': {'base':'v6/metal-graphite-color.png','normal':'v6/brushed-metal-normal.png',
                'rough':'v6/metal-graphite-roughness.png','span':(.24,.65),'kind':'metal',
                'normal_strength':.10,'average':(58,63,60),'metallic':.87,'source':'Original fine brushed graphite metal'},
    'B_METAL_brass': {'base':'v6/metal-brass-color.png','normal':'v6/brushed-metal-normal.png',
                'rough':'v6/metal-brass-roughness.png','span':(.24,.65),'kind':'metal',
                'normal_strength':.09,'average':(180,145,88),'metallic':.94,'source':'Original satin champagne brass'},
    'B_STEEL_brushed': {'base':'v6/metal-steel-color.png','normal':'v6/brushed-metal-normal.png',
                'rough':'v6/metal-steel-roughness.png','span':(.24,.65),'kind':'metal',
                'normal_strength':.035,'average':(173,178,176),'metallic':.96,'source':'Original satin brushed stainless steel'},
})


def generate_v6_assets(output_dir=ASSET_DIR):
    """Generate only new v6 original maps; do not rewrite existing CC0 sources."""
    import numpy as np
    from PIL import Image
    output = Path(output_dir) / 'v6'
    output.mkdir(parents=True, exist_ok=True)
    n = 512
    yy, xx = np.mgrid[0:n, 0:n].astype(float)
    u, v = xx / n, yy / n

    def field(sx, sy, seed):
        noise = np.random.default_rng(seed).normal(size=(n, n))
        fx, fy = np.fft.fftfreq(n)[None, :], np.fft.fftfreq(n)[:, None]
        result = np.fft.ifft2(np.fft.fft2(noise) * np.exp(-2 * math.pi**2 * (fx*fx*sx*sx + fy*fy*sy*sy))).real
        return np.clip((result-result.mean()) / max(result.std(), 1e-9), -3, 3) / 3

    def write(name, arr):
        arr = np.clip(np.rint(arr), 0, 255).astype(np.uint8)
        if arr.ndim == 2: arr = np.repeat(arr[:, :, None], 3, 2)
        Image.fromarray(arr, 'RGB').save(output / name, optimize=True)

    def normal(name, height, span):
        dx = (np.roll(height, -1, 1)-np.roll(height, 1, 1))/(2*span[0]/n)
        dy = (np.roll(height, -1, 0)-np.roll(height, 1, 0))/(2*span[1]/n)
        vector = np.stack((-dx, dy, np.ones_like(dx)), -1)
        vector /= np.linalg.norm(vector, axis=-1, keepdims=True)
        write(name, (vector*.5+.5)*255)

    broad, medium, grain = field(32, 32, 6101), field(4, 4, 6102), field(.65, .65, 6103)
    veins = np.exp(-((np.sin(math.tau*(u*2+v+.23*broad))) / .13)**2)
    pores = np.maximum(0, -grain-.52)
    limestone = .023*broad+.015*medium+.009*grain-.022*veins-.018*pores
    write('honed-limestone-color.png', np.array((218,215,202))[None,None,:]*(1+limestone[:,:,None]))
    write('honed-limestone-roughness.png', 255*(.35+.070*medium+.025*broad+.07*pores))
    normal('honed-limestone-normal.png', .000055*medium+.000035*grain-.00008*pores, (1.60,1.60))
    charcoal=.044*broad+.042*medium+.070*grain
    write('charcoal-stone-color.png', np.array((68,72,68))[None,None,:]*(1+charcoal[:,:,None]))
    write('charcoal-stone-roughness.png',255*(.37+.048*medium+.042*grain))
    normal('charcoal-stone-normal.png',.00007*grain+.000035*medium,(.60,.60))

    # Fine alternating yarns, gently irregular at macro scale; not a checkerboard.
    fu, fv = u*128, v*128
    warp, weft = np.cos(math.tau*fu), np.cos(math.tau*fv)
    parity = (np.floor(fu)+np.floor(fv)) % 2
    yarn = .000065*(warp*(.42+.16*parity)+weft*(.58-.16*parity))
    fuzz=field(.4,.4,6104);cloth=field(10,10,6105)
    normal('upholstery-normal.png',yarn+.000010*fuzz,(.256,.256))
    write('upholstery-roughness.png',255*(.79+.048*cloth+.014*(warp+weft)+.019*fuzz))
    loops = ((.5+.5*np.cos(math.tau*u*64))*(.5+.5*np.cos(math.tau*v*64)))**.65
    pile=field(1.1,2.0,6106);pile_broad=field(13,13,6107)
    wool_height=.00048*loops+.000080*pile+.0001*pile_broad
    normal('wool-normal.png',wool_height,(.32,.32))
    write('wool-roughness.png',255*(.89+.025*pile_broad-.020*loops+.012*pile))
    for name,base in [('wool-cream-color.png',(216,211,196)),('wool-natural-color.png',(193,186,169))]:
        write(name,np.array(base)[None,None,:]*(1+(.025*pile_broad+.022*loops+.012*pile)[:,:,None]))

    brushing=field(.5,45,6108);metal_broad=field(18,18,6109)
    normal('brushed-metal-normal.png',.000012*brushing,(.24,.65))
    for name,base,rough in [('graphite',(58,63,60),.32),('brass',(180,145,88),.26),('steel',(173,178,176),.29)]:
        write('metal-'+name+'-color.png',np.array(base)[None,None,:]*(1+(.012*metal_broad+.008*brushing)[:,:,None]))
        write('metal-'+name+'-roughness.png',255*(rough+.050*brushing+.018*metal_broad))
    # Context surface maps are original and shared by the whole balcony garden.
    lawn=field(19,19,6110);blades=field(.45,1.2,6111)
    write('context-grass-color.png',np.array((94,118,62))[None,None,:]*(1+(.15*lawn+.09*blades)[:,:,None]))
    normal('context-grass-normal.png',.0035*blades+.0015*lawn,(3,3))
    aggregate=field(.45,.45,6112)
    write('context-asphalt-color.png',np.array((83,87,87))[None,None,:]*(1+(.065*aggregate+.026*broad)[:,:,None]))
    normal('context-asphalt-normal.png',.0008*aggregate,(3,3))
    write('context-paving-color.png',np.array((183,180,166))[None,None,:]*(1+(.025*medium+.028*grain)[:,:,None]))
    normal('context-paving-normal.png',.00035*grain,(3,3))
    files=[{'file':p.name,'size':[n,n],'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(output.glob('*.png'))]
    manifest={'schema':'eme.botanique.pbr/6','finish_revision':6,'files':files,'total_bytes':sum(p['bytes'] for p in files),
              'provenance':'Original deterministic physical material maps by EME Spatial. Existing photographed CC0 veneer remains unchanged in the parent folder.',
              'color_space':'Albedo sRGB; normals and roughness linear, OpenGL +Y.',
              'geometry_changed':False,'configuration':'B_WOOD and B_FABRIC material prefixes retained.'}
    (output/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    return manifest


def generate_assets(output_dir=ASSET_DIR):
    """Create seamless original maps; no downloads, reference edits or Blender."""
    import numpy as np
    from PIL import Image

    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)
    n = SIZE
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float64)
    u, v = xx / n, yy / n
    rng = np.random.default_rng(20261010)

    def field(sigma_x, sigma_y, seed):
        random = np.random.default_rng(seed).normal(size=(n, n))
        fx = np.fft.fftfreq(n)[None, :]
        fy = np.fft.fftfreq(n)[:, None]
        kernel = np.exp(-2 * math.pi ** 2 * (fx ** 2 * sigma_x ** 2 + fy ** 2 * sigma_y ** 2))
        smooth = np.fft.ifft2(np.fft.fft2(random) * kernel).real
        smooth -= smooth.mean()
        smooth /= max(smooth.std(), 1e-8)
        return np.clip(smooth, -3, 3) / 3

    def write(name, array):
        data = np.clip(np.rint(array), 0, 255).astype(np.uint8)
        if data.ndim == 2:
            data = np.repeat(data[:, :, None], 3, axis=2)
        Image.fromarray(data, 'RGB').save(output / name, optimize=True)

    def normal(height_m, span):
        # PNG rows increase downward; tangent-space UV V increases upward.
        dx = (np.roll(height_m, -1, 1) - np.roll(height_m, 1, 1)) / (2 * span[0] / n)
        dy = (np.roll(height_m, -1, 0) - np.roll(height_m, 1, 0)) / (2 * span[1] / n)
        vector = np.stack((-dx, dy, np.ones_like(dx)), axis=-1)
        vector /= np.linalg.norm(vector, axis=-1, keepdims=True)
        return (vector * .5 + .5) * 255

    # Oak: elongated pores and gentle wandering growth bands, with a handful
    # of knot traces. Fields are FFT-periodic so the wrap has no hard seam.
    drift = field(27, 90, 141)
    broad = field(16, 65, 142)
    fibre = field(.65, 21, 143)
    pores = field(.40, 5, 144)
    phase = 2 * math.pi * (u * 24 + .68 * drift + .07 * np.sin(2 * math.pi * v * 3))
    grain = np.sin(phase) * .40 + np.sin(phase * 2 + .6) * .13
    knots = np.zeros((n, n), dtype=np.float64)
    for cu, cv, scale in ((.22, .35, .042), (.75, .83, .027)):
        du = (u - cu + .5) % 1 - .5
        dv = (v - cv + .5) % 1 - .5
        rr = np.sqrt((du / scale) ** 2 + (dv / (scale * 2.3)) ** 2)
        envelope = np.exp(-rr ** 2 * .22)
        knots += envelope * (np.sin(rr * 10) * .21 - .16)
    oak_height = (.18 * grain + .23 * fibre + .035 * pores + .14 * knots) * .00015
    oak_variation = .062 * grain + .078 * broad + .041 * fibre + .014 * pores + .075 * knots
    for name, base in (('oak-color.png', (173, 139, 102)), ('oak-dark-color.png', (89, 65, 43))):
        rgb = np.array(base, dtype=float)[None, None, :] * (1 + oak_variation[:, :, None])
        write(name, rgb)
    write('oak-normal.png', normal(oak_height, (.85, 2.20)))
    write('oak-roughness.png', (.46 + .045 * broad - .02 * grain + .025 * pores) * 255)

    # Fine linen, 128 yarns across 19.2 cm (1.5 mm/yarn), with a deliberately
    # subtle normal amplitude. Mipmaps can fade the weave at ordinary distance.
    phase_u, phase_v = u * 128, v * 128
    warp, weft = np.cos(2 * math.pi * phase_u), np.cos(2 * math.pi * phase_v)
    over = ((np.floor(phase_u) + np.floor(phase_v)) % 2)
    linen_height = (warp * (.40 + .20 * over) + weft * (.60 - .20 * over)) * .000060
    linen_broad = field(11, 11, 260)
    linen_fuzz = rng.normal(0, 1, (n, n))
    linen_var = .024 * linen_broad + .012 * (warp + weft) + .005 * linen_fuzz
    for name, base in (
        ('linen-natural-color.png', (204, 197, 177)),
        ('linen-cream-color.png', (228, 223, 206)),
        ('linen-olive-color.png', (133, 150, 111)),
    ):
        write(name, np.array(base, dtype=float)[None, None, :] * (1 + linen_var[:, :, None]))
    write('linen-normal.png', normal(linen_height, (.192, .192)))
    write('linen-roughness.png', (.84 + .022 * linen_broad + .015 * (warp + weft)) * 255)

    # Honed warm porcelain. The geometry already has 80 cm tile joints; these
    # maps add mineral variation only and do not introduce a second grout grid.
    stone_large = field(33, 33, 371)
    stone_mid = field(4, 4, 372)
    stone_small = field(.48, .48, 373)
    stone_var = .025 * stone_large + .014 * stone_mid + .008 * stone_small
    write('porcelain-color.png', np.array((208, 205, 189))[None, None, :] * (1 + stone_var[:, :, None]))
    write('porcelain-normal.png', normal((stone_mid * .30 + stone_small * .18) * .00010, (.80, .80)))
    write('porcelain-roughness.png', (.49 + .025 * stone_large + .035 * stone_mid + .015 * stone_small) * 255)

    records = []
    for image in sorted(output.glob('*.png')):
        with Image.open(image) as im:
            assert im.mode == 'RGB'
        records.append({'file': image.name, 'bytes': image.stat().st_size,
                        'sha256': hashlib.sha256(image.read_bytes()).hexdigest()})
    manifest = {
        'schema': 'eme.botanique.pbr/1', 'size': [SIZE, SIZE],
        'provenance': 'Original deterministic procedural material maps generated by tools/botanique_finishes.py. No photograph, downloaded bitmap or paid asset used.',
        'usage': 'Reusable in the EME Spatial Botanique project, its renders and glTF exports.',
        'base_color': 'sRGB', 'roughness': 'linear grayscale replicated to RGB',
        'normal': 'linear OpenGL tangent-space +Y; generated from physical height derivatives',
        'uv': 'B_REAL_METRES. Metre-based box projection; cylindrical wood sides use arc length. No UV stretch to fit individual furniture objects.',
        'families': FINISHES, 'files': records, 'total_bytes': sum(x['bytes'] for x in records),
    }
    (output / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    return manifest


def prepare_cc0_assets(source_dir, output_dir=ASSET_DIR):
    """Prepare documented local CC0 sources. Run only in ordinary Python.

    Oak grain remains V, at the source's approximately 1.83 m physical span.
    Fabric weave spans .30 m; plaster 1 m. Normal vectors are renormalized
    after resizing. This does not alter any client image or scene geometry.
    """
    import numpy as np
    from PIL import Image
    source, output = Path(source_dir), Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)
    conversions = [
        ('oak_veneer_01-color.webp','oak-veneer-color.png',1024,'base','oak_veneer_01'),
        ('oak_veneer_01-color.webp','oak-veneer-dark-color.png',512,'dark','oak_veneer_01'),
        ('oak_veneer_01-normal.webp','oak-veneer-normal.png',512,'normal','oak_veneer_01'),
        ('oak_veneer_01-rough.webp','oak-veneer-roughness.png',512,'linear','oak_veneer_01'),
        ('fabric_pattern_07-normal.jpg','linen-photo-normal.png',512,'normal','fabric_pattern_07'),
        ('fabric_pattern_07-rough.jpg','linen-photo-roughness.png',512,'linear','fabric_pattern_07'),
        ('white_plaster_02_nor_gl_1k.jpg','plaster-normal.png',512,'normal','white_plaster_02'),
        ('white_plaster_02_rough_1k.jpg','plaster-roughness.png',512,'linear','white_plaster_02'),
    ]
    derived=[]
    for original,dest,size,kind,asset in conversions:
        src=source/original
        im=Image.open(src).convert('RGB').resize((size,size),Image.Resampling.LANCZOS)
        arr=np.asarray(im,dtype=np.float32)/255
        if kind=='normal':
            vector=arr*2-1
            vector/=np.maximum(np.linalg.norm(vector,axis=-1,keepdims=True),1e-6)
            arr=vector*.5+.5
        elif asset=='oak_veneer_01' and kind in ('base','dark'):
            # Attenuate 40% of tonal variation in linear light. Real photographed
            # grain remains; avoid overpowering the small domestic interior.
            linear=np.where(arr<=.04045,arr/12.92,((arr+.055)/1.055)**2.4)
            mean=linear.mean(axis=(0,1),keepdims=True)
            linear=mean+.60*(linear-mean)
            if kind=='dark':linear*=.42
            arr=np.where(linear<=.0031308,linear*12.92,1.055*linear**(1/2.4)-.055)
        Image.fromarray(np.clip(np.rint(arr*255),0,255).astype(np.uint8),'RGB').save(output/dest,optimize=True)
        derived.append({'file':dest,'source_file':str(src),'source_sha256':hashlib.sha256(src.read_bytes()).hexdigest(),
                        'asset':asset,'url':'https://polyhaven.com/a/'+asset,'license':'CC0',
                        'processing':kind+'; resized to '+str(size)+' px',
                        'sha256':hashlib.sha256((output/dest).read_bytes()).hexdigest()})
    Image.new('RGB',(32,32),(230,228,222)).save(output/'clean-ivory-color.png')
    manifest_path=output/'manifest.json'
    manifest=json.loads(manifest_path.read_text(encoding='utf-8')) if manifest_path.exists() else {}
    required=sorted({spec[k] for spec in FINISHES.values() for k in ('base','normal','rough')})
    records=[]
    for name in required:
        path=output/name
        with Image.open(path) as im:
            records.append({'file':name,'size':list(im.size),'bytes':path.stat().st_size,
                            'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
    manifest.update({'schema':'eme.botanique.pbr/2','families':FINISHES,'files':records,
        'provenance':'Poly Haven CC0 wood veneer plus fabric/plaster normal and roughness; original clean ivory, cloth colours and mineral porcelain.',
        'license_url':'https://polyhaven.com/license','derivatives':derived,
        'normal':'Linear OpenGL tangent-space +Y; CC0 source normals renormalized after reduction, original porcelain from physical height derivatives.',
        'finish_revision':2,
        'art_direction':'Clean ivory walls; plaster normal at .035 strength, photographic oak contrast reduced 40% in linear light; no geometry, lighting or client image alteration.',
        'total_bytes':sum(r['bytes'] for r in records),
        'resolutions':sorted({tuple(r['size']) for r in records}),
        'scale_note':'Oak veneer 1.83 m from published physical size; fabric .30 m from asset scale; plaster 1 m. Decorative proposal, not a finish specified by the developer.'})
    manifest.pop('size',None)
    manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    return manifest


def _srgb_to_linear(value):
    value = value / 255
    return value / 12.92 if value <= .04045 else ((value + .055) / 1.055) ** 2.4


def _make_pbr_material(material, spec, folder, cache):
    import bpy

    nodes = material.node_tree.nodes
    nodes.clear()
    output = nodes.new('ShaderNodeOutputMaterial')
    output.location = (720, 80)
    principled = nodes.new('ShaderNodeBsdfPrincipled')
    principled.location = (410, 80)
    principled.inputs['Base Color'].default_value = (1, 1, 1, 1)
    principled.inputs['Metallic'].default_value = spec.get('metallic', 0)
    principled.inputs['Alpha'].default_value = spec.get('alpha',1.0)
    principled.inputs['Roughness'].default_value = .85 if spec['kind'] == 'linen' else .46
    if spec['kind'] == 'linen' and 'Sheen Weight' in principled.inputs:
        principled.inputs['Sheen Weight'].default_value = spec.get('sheen',.22)
    material.node_tree.links.new(principled.outputs['BSDF'], output.inputs['Surface'])
    uv = nodes.new('ShaderNodeUVMap')
    uv.uv_map = UV_NAME
    uv.location = (-650, 0)

    def image_node(filename, colorspace, location):
        key = (filename, colorspace)
        if key not in cache:
            path = folder / filename
            image = bpy.data.images.load(str(path), check_existing=True)
            image.name = 'B_PBR_' + filename.replace('.png', '')
            image.colorspace_settings.name = colorspace
            if not image.packed_file:
                image.pack()
            cache[key] = image
        texture = nodes.new('ShaderNodeTexImage')
        texture.image = cache[key]
        texture.extension = 'REPEAT'
        texture.interpolation = 'Linear'
        texture.location = location
        material.node_tree.links.new(uv.outputs['UV'], texture.inputs['Vector'])
        return texture

    base = image_node(spec['base'], 'sRGB', (-380, 300))
    material.node_tree.links.new(base.outputs['Color'], principled.inputs['Base Color'])
    rough = image_node(spec['rough'], 'Non-Color', (-380, 0))
    separate = nodes.new('ShaderNodeSeparateColor')
    separate.mode = 'RGB'
    separate.location = (-100, 0)
    material.node_tree.links.new(rough.outputs['Color'], separate.inputs['Color'])
    material.node_tree.links.new(separate.outputs['Green'], principled.inputs['Roughness'])
    normal = image_node(spec['normal'], 'Non-Color', (-380, -280))
    convert = nodes.new('ShaderNodeNormalMap')
    convert.space = 'TANGENT'
    convert.uv_map = UV_NAME
    convert.inputs['Strength'].default_value = spec['normal_strength']
    convert.location = (-60, -250)
    material.node_tree.links.new(normal.outputs['Color'], convert.inputs['Color'])
    material.node_tree.links.new(convert.outputs['Normal'], principled.inputs['Normal'])
    material.diffuse_color = (*(_srgb_to_linear(v) for v in spec['average']), spec.get('alpha',1.0))
    if spec.get('alpha',1.0) < 1:
        material.surface_render_method='DITHERED'
        material.use_backface_culling=False
    material['pbr_source'] = spec.get('source','Botanique original procedural 512')
    material['pbr_uv_metres'] = list(spec['span'])
    material['pbr_texture_kind'] = spec['kind']


def _project_uvs(obj, material_specs):
    """Local grain orientation, physical lengths, stable world-aligned floors."""
    mesh = obj.data
    # The apartment generators already apply primitive scale. Accommodate any
    # remaining uniform/nonuniform object scale without changing geometry.
    scale = [abs(v) for v in obj.scale]
    coords = [(v.co.x * scale[0], v.co.y * scale[1], v.co.z * scale[2]) for v in mesh.vertices]
    if not coords:
        return 0
    extents = [max(p[a] for p in coords) - min(p[a] for p in coords) for a in range(3)]
    minimum = [min(p[a] for p in coords) for a in range(3)]
    centre = [(max(p[a] for p in coords) + min(p[a] for p in coords)) / 2 for a in range(3)]
    cylinder = (len(mesh.polygons) >= 18 and
                abs(extents[0] - extents[1]) < max(.001, extents[0] * .035) and
                any(len(p.vertices) >= 12 for p in mesh.polygons))
    while len(mesh.uv_layers):
        mesh.uv_layers.remove(mesh.uv_layers[0])
    uv_layer = mesh.uv_layers.new(name=UV_NAME)
    uv_layer.active_render = True
    texture_offset = (zlib.crc32(obj.name.encode('utf-8')) % 997) / 997
    count = 0
    for poly in mesh.polygons:
        spec = material_specs.get(poly.material_index)
        if not spec:
            continue
        span_u, span_v = spec['span']
        n = [abs(v) for v in poly.normal]
        normal_axis = max(range(3), key=lambda a: n[a])
        if cylinder and spec['kind'] == 'wood' and n[2] < .6:
            angles = [math.atan2(coords[mesh.loops[i].vertex_index][1] - centre[1],
                                 coords[mesh.loops[i].vertex_index][0] - centre[0]) for i in poly.loop_indices]
            if max(angles) - min(angles) > math.pi:
                angles = [a + (2 * math.pi if a < 0 else 0) for a in angles]
            for loop_index, angle in zip(poly.loop_indices, angles):
                p = coords[mesh.loops[loop_index].vertex_index]
                uv_layer.data[loop_index].uv = (angle * extents[0] / 2 / span_u + texture_offset,
                                                p[2] / span_v)
        elif spec['kind'] == 'stone' and n[2] > .5:
            for loop_index in poly.loop_indices:
                point = obj.matrix_world @ mesh.vertices[mesh.loops[loop_index].vertex_index].co
                uv_layer.data[loop_index].uv = (point.x / span_u, point.y / span_v)
        else:
            available = [a for a in range(3) if a != normal_axis]
            # Vertical joinery gets upright grain regardless of panel width.
            # Horizontal furniture surfaces use their longest in-plane axis.
            if spec['kind'] == 'wood' and 2 in available and extents[2] >= .65:
                grain_axis = 2
            else:
                grain_axis = max(available, key=lambda a: extents[a])
            across_axis = next(a for a in available if a != grain_axis)
            # Keep all planar projections right handed; mirrored UVs would
            # invert tangent-space normals on the opposite side of a cabinet.
            outward_sign = 1 if poly.normal[normal_axis] >= 0 else -1
            cross_sign = 1 if (across_axis, grain_axis) in {(0, 1), (1, 2), (2, 0)} else -1
            sign = outward_sign * cross_sign
            for loop_index in poly.loop_indices:
                p = coords[mesh.loops[loop_index].vertex_index]
                uv_layer.data[loop_index].uv = (sign * (p[across_axis] - minimum[across_axis]) / span_u + texture_offset,
                                                (p[grain_axis] - minimum[grain_axis]) / span_v)
        count += 1
    mesh.update()
    obj['uv_mapping'] = 'real-metre projection, no fit-to-bounds stretch'
    obj['uv_layer'] = UV_NAME
    return count


def apply_web_finishes(asset_dir=None):
    """Apply glTF-compatible PBR maps/UVs to apartment decorative surfaces.

    Call before material-based mesh merging. Textures are image nodes directly
    linked to Principled Base Color, SeparateColor G to Roughness and a tangent
    NormalMap node to Normal. Images are packed in the .blend. No bake required.

    Material names/configurator keys are retained. Grout is left unchanged;
    existing physical tile seams remain the only grout pattern in the floor.
    """
    import bpy

    folder = Path(asset_dir) if asset_dir else ASSET_DIR
    required = sorted({v[k] for v in FINISHES.values() for k in ('base', 'normal', 'rough')})
    missing = [name for name in required if not (folder / name).is_file()]
    if missing:
        raise FileNotFoundError('Generate Botanique PBR assets before Blender: ' + ', '.join(missing))
    objects = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('B_UNIT_')]
    # Rugs need pile rather than the same flat linen used on the sofa. Only
    # their material slots change, preserving exact meshes and collider bounds.
    rugs = []
    for obj in objects:
        if '_RUG' not in obj.name or obj.get('role') == 'context':
            continue
        for slot in obj.material_slots:
            old = slot.material
            if not old or not old.name.startswith('B_FABRIC'):
                continue
            name = 'B_FABRIC_rug_cream' if 'cream' in old.name else 'B_FABRIC_rug_natural'
            mat = bpy.data.materials.get(name) or old.copy()
            mat.name = name
            slot.material = mat
        rugs.append(obj.name)
    material_names = {slot.material.name for obj in objects for slot in obj.material_slots if slot.material}
    cache, processed = {}, []
    for name, spec in FINISHES.items():
        if name not in material_names:
            continue
        mat = bpy.data.materials.get(name)
        if mat:
            mat.use_nodes = True
            _make_pbr_material(mat, spec, folder, cache)
            processed.append(name)
    uv_objects, uv_faces = 0, 0
    for obj in objects:
        specs = {i: FINISHES[s.material.name] for i, s in enumerate(obj.material_slots)
                 if s.material and s.material.name in FINISHES}
        if specs:
            if obj.data.users > 1:
                obj.data = obj.data.copy()
            uv_faces += _project_uvs(obj, specs)
            uv_objects += 1
    glass_refined = []
    for name in ('B_GLASS', 'B_GLASS_smoked'):
        mat = bpy.data.materials.get(name)
        if not mat or not mat.use_nodes: continue
        p = mat.node_tree.nodes.get('Principled BSDF')
        if not p: continue
        p.inputs['IOR'].default_value = 1.48
        p.inputs['Roughness'].default_value = .025 if name == 'B_GLASS' else .095
        # Preserve transmission/alpha from the original model and avoid an
        # expensive extra coat/transmission layer in mobile WebGL.
        glass_refined.append(name)
    report = {'schema': 'eme.botanique.finishes/7', 'finish_revision': 7, 'materials': processed,
              'uv_objects': uv_objects, 'uv_faces': uv_faces, 'packed_images': len(cache),
              'resolutions': sorted({tuple(image.size) for image in cache.values()}), 'uv_layer': UV_NAME,
              'texture_bytes': sum((folder / n).stat().st_size for n in required),
              'source': 'Documented Poly Haven CC0 oak veneer and plaster; original cloth colours, porcelain, wool pile, honed limestone, charcoal stone and brushed metal. All images packed/local.',
              'rug_objects':rugs, 'glass_refined':glass_refined,
              'geometry_changed': False, 'navigation_changed':False, 'asset_dir': str(folder)}
    bpy.context.scene['botanique_finishes_report'] = json.dumps(report, ensure_ascii=False)
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--generate-assets', action='store_true')
    parser.add_argument('--generate-v6-assets', action='store_true')
    parser.add_argument('--output', type=Path, default=ASSET_DIR)
    parser.add_argument('--prepare-cc0', type=Path, help='Folder containing documented local CC0 source maps')
    args = parser.parse_args()
    if args.generate_v6_assets:
        result=generate_v6_assets(args.output)
        print(json.dumps({'files':len(result['files']),'bytes':result['total_bytes'],'output':str(args.output/'v6')},ensure_ascii=False))
    elif args.generate_assets or args.prepare_cc0:
        result = generate_assets(args.output) if args.generate_assets else None
        if args.prepare_cc0: result = prepare_cc0_assets(args.prepare_cc0,args.output)
        print(json.dumps({'files': len(result['files']), 'bytes': result['total_bytes'],
                          'output': str(args.output)}, ensure_ascii=False))
    else:
        parser.error('Use --generate-assets outside Blender, or import apply_web_finishes() inside Blender.')
