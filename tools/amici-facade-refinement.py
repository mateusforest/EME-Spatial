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
    for obj in list(scene.objects):
        if obj.name.startswith('Cipreste | folhagem'):
            height=max(v.co.z for v in obj.data.vertices)
            rng=random.Random(901+int(abs(obj.location.x)*100));verts=[];faces=[];indices=[]
            for i in range(26000):
                t=rng.uniform(.04,.998);a=rng.random()*math.tau
                envelope=.46*math.sin(math.pi*t)**.68
                r=envelope*rng.random()**.3*(.94+.06*math.sin(t*60+a*3))
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
            obj.scale.z*=1.24;obj.scale.y*=1.12
        elif obj.name.startswith('Ramo pendente'):
            obj.scale.z*=1.15
        elif obj.name.startswith('Vaso entrada'):
            # Narrow rim and foot give the existing terracotta pots their real profile.
            obj.data=obj.data.copy()
            for v in obj.data.vertices:
                factor=.78 if v.co.z<0 else 1
                v.co.x*=factor;v.co.y*=factor
    # Retain source geometry and foliage placement; no invented site surveying.
    scene['facade_refinement']='Finer cypress sprays, fuller hanging planters, PBR facade textures; reference ZM Amici facade.'
    bpy.context.view_layer.update()
