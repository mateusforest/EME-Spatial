"""Finer exterior foliage and facade details from the published Amici frontage.
Keeps estimated massing unchanged; modifies only the in-memory web derivative.
"""
import bpy,math,random
from mathutils import Vector

def refine_facade(scene):
    def material(name,color):
        m=bpy.data.materials.new(name);m.use_nodes=True
        rgb=[int(color[i:i+2],16)/255 for i in (0,2,4)]
        b=m.node_tree.nodes.get('Principled BSDF')
        b.inputs['Base Color'].default_value=(*[c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in rgb],1)
        b.inputs['Roughness'].default_value=.85
        return m
    leaves=[material('Cipreste folhas '+str(i),c) for i,c in enumerate(('294633','3B5537','526447'))]
    # The reference alternates four C-shaped white frames above the first level.
    ribbons=sorted([o for o in scene.objects if o.name.startswith('Fita vertical branca')],key=lambda o:o.location.z)
    for index,o in enumerate(ribbons):
        if index>=4:bpy.data.objects.remove(o,do_unlink=True);continue
        o.location.z=6.2+(1+index*2)*3.05+1.46;o.dimensions.x=.25;o.dimensions.y=.48;o.dimensions.z=3.05
    for o in scene.objects:
        if o.name.startswith(('Fita horizontal branca','Borda de laje aparente')):
            o.dimensions.z=.29;o.dimensions.y=.48
    # Rounded topiary and low flower groups on both sides of the clear entrance.
    template=next(o for o in scene.objects if o.name.startswith('Buxo vaso'))
    garden=template.users_collection[0]
    flower_mat=material('Jardim flores lilas','9D85B5')
    for sign in (-1,1):
        for i,(x,r) in enumerate(((3.25,.38),(4.65,.31),(6.3,.43),(7.1,.28))):
            o=bpy.data.objects.new('Topiaria arredondada entrada',template.data.copy());garden.objects.link(o)
            o.location=(sign*x,-19.25,r+.23);o.scale=(r,r,r);o.rotation_euler.z=i*1.71
        for i in range(6):
            o=bpy.data.objects.new('Flores jardim entrada',template.data.copy());garden.objects.link(o)
            o.location=(sign*(3.8+i*.56),-19.32,.42);o.scale=(.22,.20,.25);o.rotation_euler.z=i*2.1
            o.data.materials[2]=flower_mat
    for obj in list(scene.objects):
        if obj.name.startswith('Cipreste | folhagem'):
            height=max(v.co.z for v in obj.data.vertices)
            rng=random.Random(901+int(abs(obj.location.x)*100));verts=[];faces=[];indices=[]
            for i in range(26000):
                t=rng.uniform(.04,.998);a=rng.random()*math.tau
                envelope=.34*math.sin(math.pi*t)**.48
                r=envelope*rng.random()**.3*(.85+.15*math.sin(t*39+a*3))
                center=Vector((math.cos(a)*r,math.sin(a)*r,t*height))
                outward=Vector((math.cos(a),math.sin(a),rng.uniform(.7,1.8))).normalized()
                side=Vector((-math.sin(a),math.cos(a),0));length=rng.uniform(.025,.065);width=rng.uniform(.009,.020)
                n=len(verts);verts.extend([center-outward*length*.3,center+side*width,center+outward*length,center-side*width])
                faces.append((n,n+1,n+2,n+3));indices.append(rng.choices((0,1,2),(7,3,1))[0])
            mesh=bpy.data.meshes.new('Cipreste microfolhagem');mesh.from_pydata(verts,[],faces)
            for m in leaves:mesh.materials.append(m)
            for p,i in zip(mesh.polygons,indices):p.material_index=i
            obj.data=mesh
        elif obj.name.startswith('Folhagem irregular de sacada'):
            # Full crowns hide the planter edge without a uniform hedge silhouette.
            variation=random.Random(obj.name).uniform(.85,1.45)
            obj.scale.z*=variation;obj.scale.y*=1.20
        elif obj.name.startswith('Ramo pendente'):
            variation=random.Random(obj.name).uniform(1.15,1.9)
            obj.scale.z*=variation;obj.location.z-=.07*variation
        elif obj.name.startswith('Painel letreiro'):
            obj.dimensions.y=.12
            for mod in obj.modifiers:
                if mod.type=='BEVEL':mod.width=.015
        elif obj.name.startswith('Letreiro Amici'):
            obj.data.size=1.02;obj.data.extrude=.035
        elif obj.name.startswith('Vaso entrada'):
            # Narrow rim and foot give the existing terracotta pots their real profile.
            obj.data=obj.data.copy()
            for v in obj.data.vertices:
                factor=.78 if v.co.z<0 else 1
                v.co.x*=factor;v.co.y*=factor
    # Retain source geometry and foliage placement; no invented site surveying.
    scene['facade_refinement']='Finer cypress sprays, fuller hanging planters, PBR facade textures; reference ZM Amici facade.'
    bpy.context.view_layer.update()
