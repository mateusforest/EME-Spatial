"""Replace the facade-only lobby with an accessible interpretation of the ZM lobby.
Executed on an in-memory copy of the source before web export. Dimensions remain estimated.
Blender coordinates: front y=-17.4; web coordinates: street z positive.
"""
import bpy, math, random
from mathutils import Vector

def add_walkable_hall(scene):
    coll=bpy.data.collections.new('Amici | Hall visitavel');scene.collection.children.link(coll)
    def mat(name,color,metal=0,rough=.7,emit=0):
        m=bpy.data.materials.new(name);m.use_nodes=True;b=m.node_tree.nodes.get('Principled BSDF')
        rgb=tuple(int(color[i:i+2],16)/255 for i in (0,2,4))
        lin=tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb)
        b.inputs['Base Color'].default_value=(*lin,1);b.inputs['Metallic'].default_value=metal;b.inputs['Roughness'].default_value=rough
        if emit:b.inputs['Emission Color'].default_value=(*lin,1);b.inputs['Emission Strength'].default_value=emit
        return m
    wall=mat('Hall porcelanato claro','D9D5CA');floor=mat('Hall piso acetinado','BDBDB4',rough=.56)
    wood=mat('Hall madeira natural','9B764C');dark=mat('Hall metal grafite','343938',.55,.34)
    fabric=mat('Hall tecido cinza','9FA7A3',rough=.95);linen=mat('Hall linho claro','CCC7B8',rough=.95)
    bronze=mat('Hall bronze','9B7C4A',.72,.32);stone=mat('Hall pedra natural','A7A18D')
    light=mat('Hall luz indireta','FFF0D4',rough=.4,emit=1.5);leaf=mat('Hall folhas','3A5435');soil=mat('Hall terra','38332B')
    glass=next(m for m in bpy.data.materials if 'Vidro' in m.name)
    cache={}
    def add(name,loc,scale,material,bevel=0,kind='box',door=0):
        key=(kind,tuple(scale),material.name);mesh=cache.get(key)
        if mesh is None:
            if kind=='sphere':
                verts=[(math.sin(math.pi*j/8)*math.cos(math.tau*i/16),math.sin(math.pi*j/8)*math.sin(math.tau*i/16),math.cos(math.pi*j/8)) for j in range(9) for i in range(16)]
                faces=[(j*16+i,j*16+(i+1)%16,(j+1)*16+(i+1)%16,(j+1)*16+i) for j in range(8) for i in range(16)]
            elif kind=='cylinder':
                verts=[(math.cos(math.tau*i/32),math.sin(math.tau*i/32),z) for z in (-1,1) for i in range(32)]
                faces=[tuple(reversed(range(32))),tuple(range(32,64))]+[(i,(i+1)%32,(i+1)%32+32,i+32) for i in range(32)]
            else:
                verts=[(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]
                faces=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
            verts=[tuple(v[i]*scale[i]/2 for i in range(3)) for v in verts]
            mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.materials.append(material);cache[key]=mesh
        o=bpy.data.objects.new(name,mesh);coll.objects.link(o);o.location=loc
        if bevel:
            mod=o.modifiers.new('Cantos suaves','BEVEL');mod.width=bevel;mod.segments=3
        if door:o['walkDoor']=door
        if kind!='box':
            for p in o.data.polygons:p.use_smooth=True
        return o
    for o in list(scene.objects):
        if o.name.startswith(('Volume de embasamento','Hall |','Entrada |')):bpy.data.objects.remove(o,do_unlink=True)
    # Hollow the podium so the visitor can physically enter; keep its outside envelope.
    for sign in (-1,1):add('Hall envelope lateral',(sign*6.3,1,3.1),(3.2,32.8,6.2),wall)
    add('Hall envelope fundos',(0,6.55,3.1),(9.4,21.7,6.2),wall)
    add('Hall envelope teto',(0,-10,4.87),(9.4,14.8,2.66),wall)
    # Space interpreted from published plan: central passage, sofas left, lounge right.
    add('Hall piso',(0,-11.9,.18),(9.4,11.1,.12),floor)
    add('Hall parede esquerda',(-4.65,-11.9,1.93),(.18,11.1,3.5),wall)
    add('Hall parede direita',(4.65,-11.9,1.93),(.18,11.1,3.5),wall)
    add('Hall parede fundo',(0,-6.4,1.93),(9.4,.18,3.5),wall)
    add('Hall teto',(0,-11.9,3.62),(9.4,11.1,.14),wall)
    for x in (-3.55,3.55):add('Hall fechamento frontal',(x,-17.28,1.65),(2.3,.2,3.3),wall)
    add('Hall verga entrada',(0,-17.28,3.1),(4.8,.22,.35),wall)
    # Door leaves are kept separate on export and slide automatically near the visitor.
    for sign in (-1,1):
        for x,door in ((sign*1.8,0),(sign*.6,sign)):
            add('Hall porta vidro',(x,-17.65,1.6),(1.16,.014,2.75),glass,door=door)
            for dx in (-.59,.59):add('Hall porta perfil',(x+dx,-17.66,1.6),(.035,.06,2.82),dark,door=door)
            for z in (.2,3):add('Hall porta travessa',(x,-17.66,z),(1.2,.06,.035),dark,door=door)
            if door:add('Hall porta puxador',(sign*.09,-17.72,1.45),(.025,.05,.5),bronze,.008,door=door)
    for x in (-2.43,2.43):add('Hall ombreira',(x,-17.65,1.6),(.08,.14,2.9),dark)
    for i in range(10):add('Hall junta piso X',(-4.5+i,-11.9,.245),(.008,10.8,.003),stone)
    for i in range(11):add('Hall junta piso Y',(0,-17+i,.245),(9.1,.008,.003),stone)
    # Slatted oak wall, lift bank and bronze signage read from the lobby rendering.
    for i in range(55):add('Hall ripado',(-4.5,-16.9+i*.105,1.95),(.08,.045,3.35),wood,.006)
    add('Hall painel elevadores',(-3.3,-6.52,1.8),(2.25,.12,3.1),dark,.06)
    for x in (-3.8,-2.8):
        add('Hall elevador',(x,-6.61,1.54),(.87,.08,2.6),stone,.015)
        add('Hall junta elevador',(x,-6.665,1.54),(.012,.01,2.57),dark)
    add('Hall porta apoio',(1.1,-6.52,1.53),(1,.1,2.6),wood,.025)
    for i in range(40):add('Hall ripado fundos',(-1.65+i*.15,-6.5,1.95),(.07,.08,3.35),wood,.006)
    add('Hall painel marca',(3,-6.66,2.05),(2.9,.14,2.5),wall,.28)
    curve=bpy.data.curves.new('Hall amici marca','FONT');curve.body='amici';curve.align_x='CENTER';curve.size=.62;curve.extrude=.012
    label=bpy.data.objects.new('Hall amici marca',curve);coll.objects.link(label);label.location=(3,-6.77,2.2);label.rotation_euler=(math.pi/2,0,0);curve.materials.append(bronze)
    # Reception lounge. Keep the central x +/-1.2 corridor clear to the back.
    def sofa(x,y,length=2.7):
        add('Hall sofa assento',(x,y,.61),(.85,length,.37),linen,.14)
        add('Hall sofa encosto',(x-.33,y,1),(.22,length,.72),linen,.13)
        for sign in (-1,1):add('Hall sofa braco',(x,y+sign*(length/2-.08),.82),(.83,.18,.65),linen,.08)
        for dy in (-length*.4,length*.4):add('Hall sofa pe',(x,y+dy,.34),(.6,.06,.25),dark)
    sofa(-3.75,-14.2);sofa(-3.75,-10.6,2.5)
    def table(x,y,r=.55):
        add('Hall mesa base',(x,y,.46),(r*.9,r*.9,.48),bronze,kind='cylinder')
        add('Hall mesa tampo',(x,y,.72),(r*2,r*1.4,.08),wall,kind='cylinder')
    def chair(x,y,angle=0):
        seat=add('Hall poltrona assento',(x,y,.63),(.82,.83,.45),fabric,.2);seat.rotation_euler[2]=angle
        back=add('Hall poltrona encosto',(x,y+.3,.96),(.83,.22,.65),fabric,.13);back.rotation_euler[2]=angle
        for dx in (-.34,.34):add('Hall poltrona braco',(x+dx,y,.85),(.18,.7,.4),fabric,.08)
        for dx in (-.3,.3):add('Hall poltrona pe',(x+dx,y,.36),(.035,.5,.27),dark)
    for y in (-14.45,-10.15):
        add('Hall tapete',(2.7,y,.26),(3.1,2.8,.03),fabric,kind='cylinder')
        table(2.5,y,.62);table(3.2,y-.38,.35)
        chair(1.9,y+1);chair(3.65,y+.65);chair(3.2,y-1.1)
    # Background coworking nook, also visible in the published plan and render.
    add('Hall bancada coworking',(4.17,-8.1,.94),(.8,2.8,.09),wood,.08)
    for y in (-8.8,-7.5):add('Hall cadeira coworking',(3.5,y,.57),(.53,.6,.1),wood,.05)
    random.seed(451)
    for x,y in ((-4,-7.35),(4,-16.3)):
        add('Hall vaso',(x,y,.56),(.55,.55,.63),dark,kind='cylinder')
        add('Hall substrato',(x,y,.88),(.48,.48,.02),soil,kind='cylinder')
        for i in range(18):
            theta=random.random()*math.tau;h=random.uniform(1,2.1)
            o=add('Hall planta',(x+math.cos(theta)*.2,y+math.sin(theta)*.2,h),(.18,.48,.035),leaf,kind='sphere');o.rotation_euler=(random.uniform(-.7,.7),.4,theta)
    # Suspended rings and recessed ceiling ribbons.
    for x,y,r in ((2.5,-14.4,.58),(3,-10.1,.7),(2.3,-10.5,.43)):
        verts=[((r+.025*math.cos(math.tau*j/8))*math.cos(math.tau*i/48),(r+.025*math.cos(math.tau*j/8))*math.sin(math.tau*i/48),.025*math.sin(math.tau*j/8)) for i in range(48) for j in range(8)]
        faces=[(i*8+j,((i+1)%48)*8+j,((i+1)%48)*8+(j+1)%8,i*8+(j+1)%8) for i in range(48) for j in range(8)]
        mesh=bpy.data.meshes.new('Hall pendente circular');mesh.from_pydata(verts,[],faces);mesh.materials.append(light)
        o=bpy.data.objects.new('Hall pendente circular',mesh);coll.objects.link(o);o.location=(x,y,2.85)
        for dx in (-r*.6,r*.6):add('Hall cabo pendente',(x+dx,y,3.2),(.008,.008,.7),dark)
    for x in (-1.5,1.5):add('Hall sanca longitudinal',(x,-11.7,3.51),(.04,9.1,.025),light)
    for y in (-16.2,-7.2):add('Hall sanca transversal',(0,y,3.51),(3.03,.04,.025),light)
    for x in (-3.5,0,3.5):
        for y in (-15.5,-12,-8.5):add('Hall spot',(x,y,3.52),(.12,.12,.025),light,kind='cylinder')
    scene['hall_note']='Walkable interpretation of official lobby image and ground-floor plan; dimensions/furniture approximate.'
    bpy.context.view_layer.update()
