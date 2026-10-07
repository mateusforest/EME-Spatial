"""Production-only detail overlay. Source architecture, furniture positions and balcony remain intact."""
import bpy, math, random
from mathutils import Vector

def refine(manifest):
    rng=random.Random(74); source_colors={m['name']:m['color'] for item in manifest['meshes'] for m in item['materials'] if m.get('color')}
    detail=bpy.data.collections.new('M14 | Detalhes de produção 74');bpy.context.scene.collection.children.link(detail)
    def material(name,color,rough=.5):
        m=bpy.data.materials.new(name);m.use_nodes=True;b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(*color,1);b.inputs['Roughness'].default_value=rough;return m
    greens=[material('M14 | Folha natural '+str(i),c,.4) for i,c in enumerate([(.028,.07,.019),(.055,.11,.025),(.085,.15,.035)])]
    for m in greens:
        bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Subsurface Weight'].default_value=.08;bs.inputs['Coat Weight'].default_value=.18
    bark=material('M14 | Ramos naturais',(.075,.038,.016),.85)
    def mesh_obj(name,verts,faces,mat):
        mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);detail.objects.link(o);mesh.materials.append(mat)
        for p in mesh.polygons:p.use_smooth=True
        return o
    def curve(name,points,radius,mat):
        d=bpy.data.curves.new(name,'CURVE');d.dimensions='3D';d.bevel_depth=radius;d.bevel_resolution=2
        sp=d.splines.new('POLY');sp.points.add(len(points)-1)
        for p,co in zip(sp.points,points):p.co=(*co,1)
        o=bpy.data.objects.new(name,d);detail.objects.link(o);d.materials.append(mat)
    def connected(mesh):
        adj=[set() for _ in mesh.vertices];same={}
        for v in mesh.vertices:
            key=tuple(round(x,5) for x in v.co)
            if key in same:
                other=same[key];adj[v.index].add(other);adj[other].add(v.index)
            else:same[key]=v.index
        for edge in mesh.edges:
            a,b=edge.vertices;adj[a].add(b);adj[b].add(a)
        return adj
    # Give each solid leaf proxy an individual crown, at its original position and within its envelope.
    leaf_objects=[o for o in bpy.context.scene.objects if o.type=='MESH' and any(m and m.name=='M14 leaf' for m in o.data.materials)]
    crowns=0
    for obj in leaf_objects:
        mesh=obj.data;adj=connected(mesh)
        unseen=set(range(len(mesh.vertices)))
        while unseen:
            todo=[unseen.pop()];component=[]
            while todo:
                i=todo.pop();component.append(i)
                for j in adj[i]:
                    if j in unseen:unseen.remove(j);todo.append(j)
            points=[obj.matrix_world@mesh.vertices[i].co for i in component]
            lo=Vector(tuple(min(p[k] for p in points) for k in range(3)));hi=Vector(tuple(max(p[k] for p in points) for k in range(3)));size=hi-lo;center=(lo+hi)/2
            if max(size)<.05:continue
            if crowns>40:raise RuntimeError('Unexpected foliage topology; refinement stopped safely.')
            crowns+=1;radius=max(size.x,size.y)*.48;base=Vector((center.x,center.y,lo.z))
            for branch in range(11):
                angle=branch*2.399;r=radius*(.35+.55*rng.random());height=size.z*(.4+.57*rng.random())
                tip=Vector((center.x+math.cos(angle)*r,center.y+math.sin(angle)*r,lo.z+height))
                mid=base.lerp(tip,.5)+Vector((0,0,size.z*.18));curve('M14 | Ramo', [base,mid,tip],.003,bark)
                for leaf in range(9):
                    t=.22+leaf*.083;stem=base.lerp(tip,t)+Vector((0,0,math.sin(t*math.pi)*size.z*.10));a=angle+(1 if leaf%2 else -1)*1.1
                    length=min(.18,radius*.45)*(.7+rng.random()*.6);direction=Vector((math.cos(a),math.sin(a),.35)).normalized();side=Vector((-math.sin(a),math.cos(a),0));verts=[]
                    for j in range(7):
                        u=j/6;spine=stem+direction*(u*length)+Vector((0,0,-u*u*length*.22));w=math.sin(math.pi*u)*length*.23
                        verts.extend([spine-side*w,spine+Vector((0,0,.012*math.sin(math.pi*u))),spine+side*w])
                    faces=[]
                    for j in range(6):
                        for k in range(2):i=j*3+k;faces.append((i,i+1,i+4,i+3))
                    mesh_obj('M14 | Folha',verts,faces,greens[rng.randrange(3)])
        obj.hide_render=True;obj['production74_replaced_by']='Natural leaf clusters at source crown positions'
    # Physical, metre-scaled weave and stone pores. Preserve the selected base color.
    for m in list(bpy.data.materials):
        if not m.use_nodes:continue
        n=m.node_tree.nodes;links=m.node_tree.links;b=next((x for x in n if x.type=='BSDF_PRINCIPLED'),None)
        if not b:continue
        name=m.name.lower();fabric=any(x in name for x in ('fabric','rug','woven linen','upholstery')) or name=='m14 accent'
        wood=any(x in name for x in ('m14 wood','timber screens','oiled teak'))
        stone=name=='m14 stone' or 'honed limestone' in name
        if not(fabric or wood or stone):continue
        g=n.new('ShaderNodeNewGeometry');mapping=n.new('ShaderNodeVectorMath');mapping.operation='MULTIPLY';mapping.inputs[1].default_value=(7,7,.32) if wood and 'timber' not in name else (.4,22,22) if wood else (1,1,1);links.new(g.outputs['Position'],mapping.inputs[0])
        noise=n.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=4 if wood else 260 if fabric else 18;noise.inputs['Detail'].default_value=3;links.new(mapping.outputs[0],noise.inputs['Vector'])
        ramp=n.new('ShaderNodeValToRGB');base=source_colors.get(m.name,(.5,.4,.3));variation=.18 if wood else .045 if fabric else .10
        for element,mult in zip(ramp.color_ramp.elements,(1-variation,1+variation)):element.color=(*(min(1,c*mult) for c in base),1)
        links.new(noise.outputs['Fac'],ramp.inputs[0]);links.new(ramp.outputs['Color'],b.inputs['Base Color'])
        bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.3 if fabric else .16;bump.inputs['Distance'].default_value=.0014 if fabric else .0007;links.new(noise.outputs['Fac'],bump.inputs['Height']);links.new(bump.outputs['Normal'],b.inputs['Normal'])
        b.inputs['Roughness'].default_value=.83 if fabric else .44 if wood else .32
        if fabric:b.inputs['Sheen Weight'].default_value=.32;b.inputs['Sheen Roughness'].default_value=.7
        if wood:b.inputs['Coat Weight'].default_value=.14
    # Micro bevels catch light on the original furniture, without moving or substituting it.
    for o in list(bpy.context.scene.objects):
        if o.type!='MESH' or o in detail.objects.values():continue
        names=[m.name if m else '' for m in o.data.materials]
        if any(x in ('M14 stone','M14 wood','M14 metal') for x in names):
            bevel=o.modifiers.new('M14 | Aresta de acabamento','BEVEL');bevel.width=.008;bevel.segments=3;bevel.limit_method='ANGLE'
            for p in o.data.polygons:p.use_smooth=True
            normal=o.modifiers.new('M14 | Normais de acabamento','WEIGHTED_NORMAL');normal.keep_sharp=True
    # Delicate seams trace existing disconnected upholstered cushion volumes.
    for o in list(bpy.context.scene.objects):
        if o.type!='MESH' or not any(m and m.name=='M14 fabric' for m in o.data.materials):continue
        # Find actual cushion components by linked vertices; no estimated sofa replacement.
        mesh=o.data;adj=connected(mesh)
        unseen=set(range(len(mesh.vertices)));seam=material('M14 | Costura linho',(.43,.39,.32),.9)
        while unseen:
            todo=[unseen.pop()];comp=[]
            while todo:
                i=todo.pop();comp.append(i)
                for j in adj[i]:
                    if j in unseen:unseen.remove(j);todo.append(j)
            points=[o.matrix_world@mesh.vertices[i].co for i in comp];lo=Vector(tuple(min(p[k] for p in points) for k in range(3)));hi=Vector(tuple(max(p[k] for p in points) for k in range(3)));sz=hi-lo
            if .45<sz.x<1.8 and .45<sz.y<1.5 and .12<sz.z<.4:
                inset=.035;z=hi.z-.045;r=.075;pts=[]
                for cx,cy,a in [(hi.x-inset-r,hi.y-inset-r,0),(lo.x+inset+r,hi.y-inset-r,90),(lo.x+inset+r,lo.y+inset+r,180),(hi.x-inset-r,lo.y+inset+r,270)]:
                    for j in range(10):angle=math.radians(a+j*10);pts.append(Vector((cx+math.cos(angle)*r,cy+math.sin(angle)*r,z)))
                pts.append(pts[0]);curve('M14 | Vivo da almofada',pts,.0018,seam)
    return {'naturalPlantCrowns':crowns,'productionDetailObjects':len(detail.objects),'architectureChanged':False,'furniturePositionsChanged':False,'sourceFloorPreserved':True}
