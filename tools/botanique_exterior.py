"""Botanique concept reconstruction from public images, not a surveyed BIM model.
Blender metres: X right, Y back into the woodland, Z up. Own procedural geometry.
"""
import bpy, math, random, importlib.util
from pathlib import Path
from mathutils import Vector

_RENDER_TREE_RECORDS=[]

def build_exterior(detail='web'):
    global _RENDER_TREE_RECORDS
    _RENDER_TREE_RECORDS=[]
    rng=random.Random(1009)
    mats={}; batches={}; uv_batches={}; surfaces=[]; paths=[]; obstacles=[]; modeled_lights=[]
    walk_z=.32
    def obstacle(id,p,d):
        obstacles.append({'id':id,'min':[round(p[i]-d[i]/2,4) for i in range(3)],'max':[round(p[i]+d[i]/2,4) for i in range(3)]})
    def walk_rect(id,x,y,w,h,z=walk_z):
        surfaces.append({'id':id,'polygon':[[x-w/2,y-h/2],[x+w/2,y-h/2],[x+w/2,y+h/2],[x-w/2,y+h/2]],'height':z})
    def night_light(id,position,target,power=18,range=4.5,kind='spot',room='exterior'):
        modeled_lights.append({'id':id,'type':kind,'position':list(position),'target':list(target),
            'color':'#ffe1b8','power':power,'range':range,'angle':1.1,'penumbra':.82,
            'night_only':True,'room':room,'fixture_role':'exterior-light'})
    def mat(name,col,rough=.7,metal=0,alpha=1):
        m=bpy.data.materials.new('B_'+name);m.diffuse_color=(*col,alpha);m.use_nodes=True
        b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(*col,1)
        b.inputs['Roughness'].default_value=rough;b.inputs['Metallic'].default_value=metal;b.inputs['Alpha'].default_value=alpha
        if alpha<1:
            m.surface_render_method='DITHERED';b.inputs['Transmission Weight'].default_value=.25
        mats[name]=m;return m
    mat('WALL_limestone',(.41,.415,.398));mat('WALL_ivory',(.76,.755,.725));mat('WALL_greige',(.265,.275,.27));mat('WALL_graphite',(.09,.095,.09))
    mat('WINDOW_recess',(.028,.036,.035),.88);mat('WINDOW_curtain',(.44,.43,.37),.92)
    mat('STONE_entry',(.36,.35,.28),.88);mat('LIGHT_warm',(.82,.66,.39),.45)
    light=mats['LIGHT_warm'].node_tree.nodes.get('Principled BSDF');light.inputs['Emission Color'].default_value=(.9,.62,.29,1);light.inputs['Emission Strength'].default_value=1.1
    mat('METAL_anthracite',(.045,.057,.055),.3,.65);mat('WINDOW_reflections',(.11,.145,.14),.20,.35)
    # Independent occupied-window materials let the viewer blend day/night
    # without replacing facade meshes. Most windows remain unlit.
    window_temperatures=[('2700',(1.0,.57,.25)),('3000',(1.0,.72,.43)),('4000',(1.0,.88,.69))]
    for kelvin,color in window_temperatures:
        material=mat('WINDOW_glow_'+kelvin,(.15,.17,.145),.30,.12)
        principled=material.node_tree.nodes.get('Principled BSDF')
        principled.inputs['Emission Color'].default_value=(*color,1)
        principled.inputs['Emission Strength'].default_value=.06
        material['night_emission_color']=color;material['night_emission_strength']=1.5
    mat('GLASS_railing',(.25,.36,.35),.16,.1,.32);mat('FLOOR_stone',(.47,.45,.39));mat('FLOOR_concrete',(.35,.36,.34))
    mat('FLOOR_sidewalk',(.43,.435,.41),.9);mat('PALM_bark',(.245,.235,.205),.94)
    mat('ROAD_asphalt',(.09,.105,.10),.97);mat('ROAD_marking',(.8,.79,.69));mat('GROUND_grass',(.105,.17,.063),.94)
    mat('GROUND_context',(.14,.21,.10),.98)
    mat('PATH_gravel',(.47,.42,.31));mat('WOOD_deck',(.29,.17,.085),.54);mat('WOOD_bark',(.105,.069,.039),.98)
    mat('WATER_pool',(.55,.78,.70),.13,0);mat('POOL_tiles',(.22,.39,.30),.29)
    mat('POOL_coping',(.61,.58,.49),.69);mat('POOL_deck_wood',(.33,.21,.12),.55)
    mat('POOL_fabric',(.65,.61,.51),.84)
    mat('FABRIC_outdoor',(.72,.68,.56),.86);mat('ACCENT_green',(.16,.26,.18),.8);mat('COURT_green',(.12,.25,.115),.9);mat('COURT_ochre',(.53,.28,.085),.9)
    for i,c in enumerate([(.045,.105,.023),(.065,.145,.031),(.094,.18,.038),(.135,.235,.058),(.19,.27,.07)]):
        m=mat('LEAF_'+str(i),c,.8);m.node_tree.nodes.get('Principled BSDF').inputs['Subsurface Weight'].default_value=.07
    mat('FOLIAGE_CC0',(.08,.14,.035),.8)
    # Entire material groups are batched: predictable draw calls even in the woodland.
    def face(name,verts,faces,uv=None):
        vv,ff=batches.setdefault(name,([],[]));n=len(vv);vv.extend(verts);ff.extend([tuple(n+i for i in f) for f in faces])
        if uv is not None:uv_batches.setdefault(name,[]).extend([[uv[i] for i in f] for f in faces])
    def box(name,p,d,angle=0):
        x,y,z=p;a,b,c=(v/2 for v in d);co=math.cos(angle);si=math.sin(angle)
        v=[(x+u*co-v*si,y+u*si+v*co,z+w) for u,v,w in [(-a,-b,-c),(a,-b,-c),(a,b,-c),(-a,b,-c),(-a,-b,c),(a,-b,c),(a,b,c),(-a,b,c)]]
        face(name,v,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)])
    def prism(name,polygon,z0,z1):
        """An extruded perimeter preserves the two real inward L steps."""
        area=sum(polygon[i][0]*polygon[(i+1)%len(polygon)][1]-polygon[(i+1)%len(polygon)][0]*polygon[i][1] for i in range(len(polygon)))
        if area<0:polygon=list(reversed(polygon))
        n=len(polygon);verts=[(x,y,z) for z in (z0,z1) for x,y in polygon]
        face(name,verts,[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)])
    def tube(name,a,b,r,n=7,r2=None):
        a,b=Vector(a),Vector(b);axis=(b-a).normalized();u=axis.cross(Vector((0,0,1)))
        if u.length<.01:u=axis.cross(Vector((0,1,0)))
        u.normalize();v=axis.cross(u);r2=r if r2 is None else r2
        vv=[a+(u*math.cos(i*math.tau/n)+v*math.sin(i*math.tau/n))*r for i in range(n)]+[b+(u*math.cos(i*math.tau/n)+v*math.sin(i*math.tau/n))*r2 for i in range(n)]
        ff=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
        face(name,vv,ff)
    def disk(name,p,r,height=.06,n=32):tube(name,(p[0],p[1],p[2]-height/2),(p[0],p[1],p[2]+height/2),r,n)
    def path(points,width,material='PATH_gravel',height=.07,id=None):
        vv=[]
        for i,p in enumerate(points):
            before=Vector(points[max(0,i-1)]);after=Vector(points[min(len(points)-1,i+1)]);v=after-before;v.z=0;v.normalize();side=Vector((-v.y,v.x,0))*width/2
            center=Vector(p)+Vector((0,0,height));vv.extend([center-side,center+side])
        face(material,vv,[(i*2,i*2+1,i*2+3,i*2+2) for i in range(len(points)-1)])
        if id:
            points=[[round(p[0],4),round(p[1],4),round(p[2]+height,4)] for p in points]
            paths.append({'id':id,'points':points,'width':width})
            for i in range(len(vv)//2-1):
                polygon=[[round(vv[k].x,4),round(vv[k].y,4)] for k in (i*2,i*2+1,i*2+3,i*2+2)]
                surfaces.append({'id':id+'-'+str(i),'polygon':polygon,'height':points[i][2]})
                if id=='passeio-chegada':
                    # Solid paving bed reaches the visual slope; the original
                    # navigation surface and its exact points remain untouched.
                    bottom=min(terrain_z(x,y) for x,y in polygon)-.12
                    prism('WALL_greige',polygon,bottom,points[i][2]-.015)
    # One continuous terrain replaces overlapping rectangles. The sloping road
    # remains visible instead of disappearing below a large flat grass plane.
    # Context topography is illustrative, never a cadastral/geographic claim.
    def street_z(x):return -.35-max(-50,min(50,x))*.012
    def terrain_z(x,y):
        if y>=112:
            t=max(0,min(1,(y-112)/120));t=t*t*(3-2*t)
            return .24+t*(9+6*math.sin(x*.013+y*.009)+3*math.cos(x*.027-y*.011))
        if y>=-16:return .24
        if y>=-21:
            t=(-16-y)/5;t=t*t*(3-2*t)
            return .24+t*(street_z(x)-.27)
        if y>=-33:return street_z(x)-.03
        return street_z(x)-.03+max(-3,(y+33)*.007)
    xs=sorted(set([-900,-600,-300,-180,-100,-30.4,-21.6,100,180,300,600,900]+list(range(-80,81,10))))
    ys=sorted([-900,-400,-160,-70,-33,-21,-16,-2.7,0,12.7,40,80,112,140,180,250,400,650,900])
    terrain=[(x,y,terrain_z(x,y)) for y in ys for x in xs]
    faces=[]
    for j in range(len(ys)-1):
        for i in range(len(xs)-1):
            if -30.4 <= xs[i] and xs[i+1] <= -21.6 and -2.7 <= ys[j] and ys[j+1] <= 12.7:continue
            q=j*len(xs)+i;faces.append((q,q+1,q+len(xs)+1,q+len(xs)))
    face('GROUND_grass',terrain,faces)
    for a,b in zip([-900,-80,80,900],[-80,80,900]):
        face('ROAD_asphalt',[(a,-21,street_z(a)),(b,-21,street_z(b)),(b,-33,street_z(b)),(a,-33,street_z(a))],[(0,3,2,1)])
    # The reference street is unmarked; no artificial bright diagonal stripe.
    for a,b in zip(xs,xs[1:]):
        if a < -180 or b >180:continue
        face('FLOOR_sidewalk',[(a,-21,terrain_z(a,-21)+.045),(b,-21,terrain_z(b,-21)+.045),
                            (b,-18,terrain_z(b,-18)+.045),(a,-18,terrain_z(a,-18)+.045)],[(0,1,2,3)])
    # Low retaining walls close to the actual sloping context mesh. The former
    # fixed-bottom boxes left daylight below the entrance and downhill podium.
    def grounded_solid(name,x,y,w,d,top):
        corners=[(x-w/2,y-d/2),(x+w/2,y-d/2),(x+w/2,y+d/2),(x-w/2,y+d/2)]
        # A buried flat footing also closes the nonlinear transition between
        # the street and the plateau, rather than interpolating above its slope.
        footing=min(top-.12,min(terrain_z(a,b) for a,b in corners)-.30)
        bottom=[(a,b,footing) for a,b in corners]
        face(name,bottom+[(a,b,top) for a,b in corners],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)])
    # The ground floor supports both complete tower wings. The former footprint
    # extended toward the street while stopping short of the rear tower walls.
    grounded_solid('WALL_greige',0,-.25,27,17.9,.12)
    box('FLOOR_stone',(0,-.25,.22),(27,17.9,.20))
    # Wall panels genuinely stop at the openings: glazing sits within a reveal,
    # instead of being pasted over a solid block. No hidden apartment interiors.
    def facade_wall(tone,cx,cy,z,width,openings,angle=0,panels=(),span=None):
        co,si=math.cos(angle),math.sin(angle)
        def local(name,u,d,v,su,sd,sv):
            box(name,(cx+u*co-d*si,cy+u*si+d*co,z+v),(su,sd,sv),angle)
        ends=span or (-width/2,width/2)
        xs=sorted(set(list(ends)+[v for o in openings for v in (o[0]-o[1]/2,o[0]+o[1]/2)]+[v for a,b in panels for v in (a,b) if ends[0]<v<ends[1]]))
        # Continuous painted wall conceals the floor edge; only loggia floors
        # remain exposed, rather than a pale grid across every storey.
        zs=sorted(set([-.04,2.74]+[v for o in openings for v in (o[2],o[3])]))
        for a,b in zip(xs,xs[1:]):
            for lo,hi in zip(zs,zs[1:]):
                u,v=(a+b)/2,(lo+hi)/2
                if not any(abs(u-o[0])<o[1]/2 and o[2]<v<o[3] for o in openings):
                    finish='WALL_ivory' if any(a<=u<=b for a,b in panels) else tone
                    local(finish,u,.15,v,b-a,.30,hi-lo)
        for number,(u,w,lo,hi,balcony) in enumerate(openings):
            h=hi-lo
            # A balcony aperture has a real 1.7 m cavity. A dark backing at .62 m
            # would close it prematurely and turn the guardrail into pasted glass.
            if balcony:continue
            # Opaque dark backing gives depth without loading every unit.
            local('WINDOW_recess',u,.62,(lo+hi)/2,w,.06,h)
            for edge in (-1,1):local('METAL_anthracite',u+edge*(w/2-.036),.195,(lo+hi)/2,.072,.10,h)
            for edge in (lo+.035,hi-.035):local('METAL_anthracite',u,.195,edge,w,.10,.07)
            occupied=(int(round(z*100))+int(round(cx*19+cy*13))+number*7)%11
            glazing='WINDOW_glow_'+window_temperatures[occupied%3][0] if occupied in (1,2,5,7) else 'WINDOW_reflections'
            local(glazing,u,.255,(lo+hi)/2,w-.15,.022,h-.13)
            local('METAL_anthracite',u,.178,(lo+hi)/2,.045,.07,h-.10)
            local('WALL_ivory',u,-.045,lo-.025,w+.14,.39,.065)
            # A few recessed blind panels vary reflections across repeated bays.
            if int(z*7+number)%4==0:
                local('WINDOW_curtain',u+w*.24,.30,(lo+hi)/2,w*.39,.018,h-.18)
                for k in range(5):local('METAL_anthracite',u+w*.24,.17,hi-.17-k*.045,w*.40,.035,.018)
        return local
    # Individual ground-floor openings replace the unrelated full-width glass
    # storefront. Its footprint now follows the tower instead of introducing
    # an unrelated large frontal roof terrace.
    box('WINDOW_recess',(0,-.25,1.69),(26.5,16.7,2.66))
    ground_windows=[(x,1.42,.65,2.19,False) for x in (-11.4,-8.1,-4.8,-1.5,5.1,8.4,11.4)]
    facade_wall('WALL_ivory',0,-9.2,.36,27,ground_windows+[(2,2.6,0,2.40,False)])
    facade_wall('WALL_ivory',0,8.7,.36,27,[(x,1.42,.65,2.19,False) for x in (-11.4,-8.1,-4.8,-1.5,1.8,5.1,8.4,11.4)],math.pi)
    for side,angle in [(-13.5,-math.pi/2),(13.5,math.pi/2)]:
        facade_wall('WALL_ivory',side,-.25,.36,17.9,[(v,1.18,.69,2.12,False) for v in (-6.5,-3.25,0,3.25,6.5)],angle)
    box('WALL_ivory',(0,-.25,3.10),(27,17.9,.12))

    def recessed_balcony(local,u,width,corner=0,occupied=0):
        """Inside the slab perimeter: enclosed loggia or a laterally open corner."""
        depth=1.70
        local('FLOOR_stone',u,depth/2,.115,width,depth,.11)
        local('WALL_ivory',u,depth/2,2.655,width,depth,.12)
        # Closed loggias have two reveals; the corner type has only its inner one.
        for side in (-1,1):
            if side==corner:continue
            local('WALL_limestone',u+side*(width/2+.055),depth/2,1.37,.11,depth,2.48)
        local('WINDOW_recess',u,depth+.08,1.37,width,.12,2.47)
        door_glazing='WINDOW_glow_'+window_temperatures[occupied%3][0] if occupied%7 in (1,4) else 'WINDOW_reflections'
        local(door_glazing,u,depth-.015,1.34,width-.18,.025,2.29)
        for offset in (-width/2+.08,0,width/2-.08):
            local('METAL_anthracite',u+offset,depth-.055,1.34,.048,.055,2.33)
        for v in (.19,2.50):local('METAL_anthracite',u,depth-.06,v,width-.10,.06,.045)
        # Grill sits at the rear/closed side, not in front of the balcony opening.
        closed=-corner if corner else -1
        grill=u+closed*(width/2-.32)
        local('WALL_greige',grill,depth-.33,1.38,.58,.57,2.39)
        local('WINDOW_recess',grill,depth-.625,1.26,.40,.025,.49)
        local('FLOOR_stone',grill,depth-.70,.96,.64,.72,.055)
        # Front glass lies behind the facade plane. The L return identifies the
        # open corner; neither its floor nor its cover projects beyond the tower.
        local('GLASS_railing',u,.065,.715,width-.10,.024,1.05)
        local('METAL_anthracite',u,.055,1.26,width-.08,.036,.035)
        for offset in (-width/2+.045,width/2-.045):
            local('METAL_anthracite',u+offset,.055,.72,.032,.042,1.10)
        if corner:
            edge=u+corner*(width/2-.045)
            local('GLASS_railing',edge,depth/2,.715,.024,depth-.10,1.05)
            local('METAL_anthracite',edge,depth/2,1.26,.036,depth-.08,.035)
            local('METAL_anthracite',edge,depth-.04,.72,.032,.042,1.10)

    # V5: read each module from its OUTER edge toward the CENTRAL joint:
    # outer window -> enclosed loggia -> open-corner loggia -> inward L step
    # -> two-window recessed wall. The V4 outer-corner balcony interpretation
    # was wrong. The central pair and its volume now match the supplied facade.
    # The rear uses a mirrored hypothesis; it is not a confirmed rear elevation.
    # 20 typical floors are explicitly stated in the received official brochure,
    # page 21. Heights and the connection to ground/service levels are estimated.
    level=2.78;base=3.16;levels=20
    step_t=1.40;step_depth=1.70;facade_bays=[]
    def wing_outline(cx,cy,outward,pad=0):
        # Local T runs from the exterior edge toward the joint between towers.
        outline=[(-6-pad,-7-pad),(step_t+pad,-7-pad),
                 (step_t+pad,-7+step_depth-pad),(6+pad,-7+step_depth-pad),
                 (6+pad,7-step_depth+pad),(step_t+pad,7-step_depth+pad),
                 (step_t+pad,7+pad),(-6-pad,7+pad)]
        return [(cx-outward*t,cy+y) for t,y in outline]
    for i in range(levels):
        z=base+i*level
        tone='WALL_ivory' if i in (0,1,5,6,7) else 'WALL_limestone'
        for cx,cy in [(-6.8,.6),(6.8,-.5)]:
            outward=-1 if cx<0 else 1
            prism(tone,wing_outline(cx,cy,outward,-.065),z-.025,z+.135)
            # The backing stops behind both rows of balcony doors. It must not
            # occupy the inset cavities as the former 12.8 m deep block did.
            box('WINDOW_recess',(cx,cy,z+1.4),(10.8,10.5,2.46))
            for yy,angle,hand in [(cy-7,0,-outward),(cy+7,math.pi,outward)]:
                panels=[tuple(sorted((hand*a,hand*b))) for a,b in [(-3.42,-2.975),(-1.225,-.65)]]
                front_span=tuple(sorted((hand*-6,hand*step_t)))
                openings=[(hand*-4.70,1.34,.82,2.22,False),
                          (hand*-2.10,1.75,.17,2.59,True),(hand*.375,2.05,.17,2.59,True)]
                local=facade_wall(tone,cx,yy,z,12,openings,angle,panels,front_span)
                recessed_balcony(local,hand*-2.10,1.75,occupied=i+int(cx))
                recessed_balcony(local,hand*.375,2.05,hand,occupied=i+int(cx)+3)
                # Recessed inner block starts at the open corner's back plane.
                # No forward slab/box remains below these two windows.
                inner_x=cx-step_depth*math.sin(angle);inner_y=yy+step_depth*math.cos(angle)
                inner_span=tuple(sorted((hand*step_t,hand*6)))
                inner_openings=[(hand*2.65,1.27,.82,2.22,False),(hand*4.85,1.27,.82,2.22,False)]
                inner=facade_wall(tone,inner_x,inner_y,z,12,inner_openings,angle,(),inner_span)
                if i==0:
                    facade_bays.append({'wing': 'left' if cx<0 else 'right','side':'front' if angle==0 else 'rear',
                        'outerToJointSequence':['window','enclosed-loggia','open-corner-loggia','inward-L-step','two-window-wall'],
                        'outerWindowLocalT':-4.70,'enclosedBalconyLocalT':-2.10,'openBalconyLocalT':.375,
                        'innerWindowLocalT':[2.65,4.85],'stepLocalT':step_t,'stepDepth':step_depth,
                        'rearElevationConfirmed':False})
                if i in (2,4,8,11,14,17,19):
                    # Pale bands follow both planes, never bridge the balcony void.
                    for a,b in [(-6,-2.975),(-1.225,-.65)]:
                        local('WALL_ivory',hand*(a+b)/2,.018,.35,b-a,.045,.40)
                    inner('WALL_ivory',hand*(step_t+6)/2,.018,.35,6-step_t,.045,.40)
            side=cx+outward*6
            side_openings=[(sy,1.36,.83,2.2,False) for sy in (-3.4,0,3.4)]
            facade_wall(tone if tone=='WALL_ivory' else 'WALL_greige',side,cy,z,14,side_openings,
                        -math.pi/2 if cx<0 else math.pi/2,[(-7,-6.65),(6.65,7)])
            # Close the narrow reveal toward the central joint. Its face starts
            # at the receded window plane, so no floating/slashed wall is exposed.
            facade_wall('WALL_greige',cx-outward*6,cy,z,14-2*step_depth,[],
                        math.pi/2 if cx<0 else -math.pi/2)
            # Fine pale courses visible in the reference's base/middle/crown
            # composition. Their vertical registration is approximate, not a
            # claim about the numbered storeys. No alternating painted floors.
            if i in (2,4,8,11,14,17,19):
                box('WALL_ivory',(side-outward*.018,cy,z+.35),(.055,14,.40))
        box('WALL_graphite',(0,1.1,z+1.36),(1.58,8.45,2.75))
    height=base+levels*level
    for cx,cy in [(-6.8,.6),(6.8,-.5)]:
        outward=-1 if cx<0 else 1
        prism('WALL_ivory',wing_outline(cx,cy,outward,.23),height-.145,height+.17)
        prism('WALL_graphite',wing_outline(cx,cy,outward,.12),height+.17,height+.31)
        prism('FLOOR_concrete',wing_outline(cx,cy,outward,-.07),height+.31,height+.35)
        perimeter=wing_outline(cx,cy,outward,.04)
        for a,b in zip(perimeter,perimeter[1:]+perimeter[:1]):
            dx,dy=b[0]-a[0],b[1]-a[1]
            box('WALL_limestone',((a[0]+b[0])/2,(a[1]+b[1])/2,height+.63),(math.hypot(dx,dy),.15,.66),math.atan2(dy,dx))
            box('WALL_greige',((a[0]+b[0])/2,(a[1]+b[1])/2,height+.985),(math.hypot(dx,dy)+.04,.20,.07),math.atan2(dy,dx))
    box('WALL_greige',(0,2,height+1.20),(6.1,5.8,2.25))
    box('WALL_limestone',(0,2,height+2.38),(6.35,6.05,.14))
    # Sheltered entry on a grounded terrace. Preserve the .32 m common-area
    # walking datum; the street and cadastral elevation remain illustrative.
    grounded_solid('WALL_greige',0,-18.6,13.2,3.3,.23)
    box('FLOOR_stone',(0,-18.6,.275),(13.2,3.3,.09))
    # Three shallow visual treads connect the near-level street to the arrival
    # paving. Road remains outside the existing walking/navigation contract.
    road_at_entry=street_z(2)
    for step in range(3):
        y=-22.60+step*.42;top=road_at_entry+(walk_z-road_at_entry)*(step+1)/4
        grounded_solid('WALL_greige',2,y,3.4,.44,top-.035)
        box('FLOOR_sidewalk',(2,y,top-.018),(3.4,.44,.036))
    # Low arrival walk connects the street canopy to the actual ground-floor
    # door; planting replaces the former elevated roof terrace in front.
    grounded_solid('WALL_greige',2,-13.1,3.4,8,.25)
    box('FLOOR_stone',(2,-13.1,.285),(3.4,8,.07))
    walk_rect('entrada-passarela',2,-13.1,3.4,8)
    for x,w in [(-5.2,8.7),(8.6,8.9)]:
        grounded_solid('WALL_greige',x,-12.7,w,5.6,.22)
        box('GROUND_grass',(x,-12.7,.24),(w-.16,5.44,.04))
    box('WALL_graphite',(-3,-18,1.555),(6,1.4,2.47))
    box('WALL_ivory',(0,-17.8,2.91),(13.2,2.8,.26))
    for x in (-6,6):box('WALL_greige',(x,-17.8,1.55),(.34,1.4,2.46))
    box('WINDOW_reflections',(2,-18.08,1.56),(3.1,.035,2.42))
    for x in (.48,2,3.52):box('METAL_anthracite',(x,-18.12,1.56),(.045,.055,2.44))
    for z in (.35,2.77):box('METAL_anthracite',(2,-18.12,z),(3.12,.055,.045))
    box('METAL_anthracite',(2.15,-18.16,1.45),(.035,.06,.55))
    for x in (-18,19):
        grounded_solid('WALL_greige',x,-15,4.8,5,1.05)
        for i in range(23):box('METAL_anthracite',(x-2.25+i*.2,-17.55,.35),(.035,.065,1.9))
    # Textured stone, timber soffit and sheltered seating give the arrival scale.
    for row in range(6):
        for column in range(9):
            xx=-5.8+column*.34+(row%2)*.14
            box('STONE_entry',(xx,-18.72,.54+row*.32),(.31,.10,.285))
    for x in range(29):box('WOOD_deck',(-6.2+x*.43,-17.8,2.755),(.12,2.5,.045))
    for n,x in enumerate((-4.6,0,4.6)):
        box('LIGHT_warm',(x,-18.75,2.726),(.09,.09,.018))
        night_light('portaria-downlight-'+str(n),(x,-18.75,2.69),(x,-18.75,.32),20,4,'spot','chegada')
    # A shallow planted cornice and bed-like masonry bases give the entrance
    # its reference silhouette without adding a second random vegetation system.
    box('WALL_greige',(0,-19.09,3.04),(13.05,.20,.26))
    box('GROUND_grass',(0,-18.96,3.175),(12.82,.30,.03))
    for x in (-11,10):
        grounded_solid('WALL_greige',x,-16.55,3.5,.8,.78)
        for k in range(8):box('WOOD_deck',(x,-16.88+k*.09,.81),(3.62,.07,.065))
        obstacle('entrada-banco-'+str(x),(x,-16.55,.6),(3.65,.9,1.2))
    # Horizontal metal slats follow the forecourt boundary without floating
    # posts or a glass wall across the entrance. The pedestrian route stays open.
    for x,w in [(-9.35,5.7),(9.55,5.8)]:
        grounded_solid('WALL_greige',x,-18.10,w,.26,.54)
        for z in (.66,.81,.96,1.11,1.26):box('METAL_anthracite',(x,-18.11,z),(w,.035,.025))
        for sign in (-1,1):box('METAL_anthracite',(x+sign*(w/2-.04),-18.10,.91),(.045,.055,.79))
        obstacle('entrada-guarda-corpo-'+str(x),(x,-18.10,.90),(w,.30,.82))
    obstacle('torre-embasamento',(0,-.25,(height+2)/2),(27,17.9,height+4))
    obstacle('portaria-painel',(-3,-18,1.555),(6,1.4,2.47))
    obstacle('portaria-vidro',(2,-18.08,1.56),(3.2,.18,2.44))
    for x in (-6,6):obstacle('portaria-pilar-'+str(x),(x,-17.8,1.55),(.45,1.5,2.46))
    # Stalls and vehicles share one layout. Long vehicle axis follows the 5 m
    # depth of each bay; the former Y-oriented cars straddled painted divisions.
    box('FLOOR_concrete',(5.5,30,.23),(49,48,.18))
    parking_stalls=[]
    for row,x in enumerate((-14,-1.5,11,27)):
        for slot in range(16):
            y=10.5+slot*2.7
            parking_stalls.append({'id':f'parking-{row}-{slot}','center':[x,y],
                                   'size':[5.2,2.7],'angle':0,'covered':row==3})
            box('ROAD_marking',(x,y-1.35,.334),(5.2,.065,.014))
            box('ROAD_marking',(x-2.6,y,.334),(.065,2.7,.014))
        box('ROAD_marking',(x,10.5+15*2.7+1.35,.334),(5.2,.065,.014))
        # End kerbs articulate each row and stop cars from drifting off the pad.
        for y in (8.92,52.58):box('POOL_coping',(x,y,.43),(5.5,.20,.22))
    for y in (7,14.5,22,29.5,37,44.5,52):
        for x in (23.65,30.35):tube('METAL_anthracite',(x,y,.32),(x,y,2.82),.075)
    box('WALL_greige',(27,29.5,2.94),(7.2,46,.20))
    for x in (23.35,30.65):box('WALL_ivory',(x,29.5,2.98),(.13,46.3,.34))
    for y in (6.4,52.6):box('WALL_ivory',(27,y,2.98),(7.3,.13,.34))
    # Pool at front-left: long basin, curved ceramic shelf, lateral gourmet gallery
    # and an enclosed glazed party room at the street end. Reference proportions,
    # not surveyed dimensions; the whole walking level remains at walk_z.
    px,py=-27,3
    mat('POOL_shallow_grout',(.37,.44,.32),.56)
    for i,col in enumerate([(.47,.55,.38),(.43,.51,.34),(.50,.57,.40),(.45,.52,.37)]):
        mat('POOL_shallow_tile_'+str(i),col,.30)
    mat('POOL_bbq_refractory',(.31,.19,.105),.87)
    mat('POOL_stone_counter',(.12,.13,.115),.30)
    mat('POOL_deck_wood_interior',(.46,.34,.21),.62)
    mat('POOL_fabric_sage',(.20,.29,.19),.88)
    mat('POOL_wicker',(.245,.215,.174),.87)
    mat('WALL_pool_greige',(.44,.42,.385),.82)
    for i,col in enumerate([(.038,.100,.030),(.056,.132,.044),(.081,.163,.056)]):
        leaf_material=mat('POOL_leaf_'+str(i),col,.69)
        leaf_material.node_tree.nodes.get('Principled BSDF').inputs['Subsurface Weight'].default_value=.035
    glass=mat('POOL_clear_glass',(.76,.84,.79),.10,0,.20)
    glass.node_tree.nodes.get('Principled BSDF').inputs['Transmission Weight'].default_value=.86
    glass.node_tree.nodes.get('Principled BSDF').inputs['IOR'].default_value=1.45
    # Four strips leave a genuine opening in the deck. Root terrain has the same
    # basin cutout, so transparent water reveals ceramic rather than a grass plane.
    for x,y,w,d in [(-32.425,3,4.15,23),(-20.575,3,2.15,23),(-26,-5.575,8.7,5.85),(-26,13.575,8.7,1.85)]:
        box('POOL_coping',(x,y,.195),(w,d,.25))
    walk_rect('deck-piscina',px,py,15,23)
    box('POOL_tiles',(px+1,py+2,-.65),(8.7,15.3,.08))
    for x,y,w,d in [(-30.35,5,.12,15.3),(-21.65,5,.12,15.3),(-26,-2.65,8.7,.12),(-26,12.65,8.7,.12)]:
        box('POOL_tiles',(x,y,-.13),(w,d,1.04))
    face('WATER_pool',[(-30.2,-2.5,.3625),(-21.8,-2.5,.3625),(-21.8,12.5,.3625),(-30.2,12.5,.3625)],[(0,1,2,3)])
    def shelf_edge(y):
        # The organic shelf swells gently beside the loungers, then curls back
        # toward the garden end. Forty-eight segments avoid an angular outline.
        t=max(0,min(1,(y+2.5)/15))
        return -27.90+.83*math.exp(-((t-.65)/.22)**2)-.24*t*t
    shelf_ys=[-2.5+15*i/48 for i in range(49)]
    for a,b in zip(shelf_ys,shelf_ys[1:]):
        ea,eb=shelf_edge(a),shelf_edge(b)
        face('POOL_shallow_grout',[(-30.2,a,.215),(ea,a,.215),(eb,b,.215),(-30.2,b,.215)],[(0,1,2,3)])
        face('POOL_tiles',[(ea,a,-.61),(eb,b,-.61),(eb,b,.215),(ea,a,.215)],[(0,1,2,3)])
    tile_rng=random.Random(196)
    for row in range(63):
        ya=-2.5+row*.24;yb=min(12.5,ya+.24)
        if yb<=ya:continue
        for column in range(16):
            xa=-30.2+column*.24+.006;ra=min(xa+.228,shelf_edge(ya+.006));rb=min(xa+.228,shelf_edge(yb-.006))
            if max(ra,rb)<=xa:continue
            face('POOL_shallow_tile_'+str(tile_rng.randrange(4)),[(xa,ya+.006,.219),(max(xa,ra),ya+.006,.219),(max(xa,rb),yb-.006,.219),(xa,yb-.006,.219)],[(0,1,2,3)])
    obstacle('piscina-agua-e-prainha',(px+1,py+2,.2),(8.85,15.7,2))
    for x,y,sx,sy in [(px-3.3,py+2,.15,15.6),(px+5.3,py+2,.15,15.6),(px+1,py-5.7,8.7,.15),(px+1,py+9.7,8.7,.15)]:box('POOL_coping',(x,y,.4),(sx,sy,.16))
    for i in range(80):box('POOL_deck_wood',(-32.425,-5.5+i*.24,.287),(4.12,.225,.066))
    def lounger(x,y,ang=0,z_offset=0):
        def local(p):return (x+p[0]*math.cos(ang)-p[1]*math.sin(ang),y+p[0]*math.sin(ang)+p[1]*math.cos(ang),p[2]+z_offset)
        def panel(y1,y2,z1,z2):
            corners=[(-.32,y1,z1),(.32,y1,z1),(.32,y2,z2),(-.32,y2,z2)]
            verts=[local((a,b,c+dz)) for dz in (-.025,.025) for a,b,c in corners]
            face('POOL_fabric',verts,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)])
            for side in (-1,1):
                tube('POOL_fabric',local((side*.317,y1,z1+.027)),local((side*.317,y2,z2+.027)),.009,6)
        # A low sling seat and a genuinely inclined back, rather than stacked cushions.
        panel(-1.02,.32,.61,.65);panel(.32,.99,.65,1.12)
        for xx in (-.35,.35):
            for a,b in [((xx,-1.04,.57),(xx,.34,.61)),((xx,.34,.61),(xx,1.02,1.10)),((xx,-.77,.34),(xx,-.77,.57)),((xx,.66,.34),(xx,.45,.70))]:
                tube('METAL_anthracite',local(a),local(b),.024,8)
            tube('POOL_deck_wood',local((xx,.26,.78)),local((xx,-.27,.78)),.026,8)
        obstacle('espreguicadeira-'+str(len(obstacles)),(x,y,.7+z_offset),(abs(math.cos(ang))*.72+abs(math.sin(ang))*1.95,abs(math.sin(ang))*.72+abs(math.cos(ang))*1.95,1.4))
    for y in (-.8,3.1,7.0,10.9):lounger(-31.43,y,math.pi/2)
    for y in (1.1,5.0,8.9):lounger(-29.10,y,math.pi/2,-.105)
    def chair(x,y,ang=0,pool=False):
        wood='METAL_anthracite' if pool else 'WOOD_deck';fabric='POOL_fabric' if pool else 'FABRIC_outdoor'
        def local(dx,dy,z):return(x+dx*math.cos(ang)-dy*math.sin(ang),y+dx*math.sin(ang)+dy*math.cos(ang),z)
        disk(wood,(x,y,.73),.31,.055,24)
        for dx in (-.23,.23):
            for dy in (-.23,.23):tube(wood,local(dx*1.09,dy*1.09,.34),local(dx,dy,.74),.024,8)
        disk(fabric,(x,y,.79),.305,.08,32)
        for i in range(14):
            a=-math.pi/2+i*math.pi/14;b=-math.pi/2+(i+1)*math.pi/14
            p=(math.sin(a)*.34,math.cos(a)*.31);q=(math.sin(b)*.34,math.cos(b)*.31)
            tube(wood,local(*p,1.17),local(*q,1.17),.021,6)
            tube(wood,local(*p,.85),local(*p,1.17),.012,5)
            face('POOL_wicker' if pool else fabric,[local(*p,.89),local(*q,.89),local(*q,1.13),local(*p,1.13)],[(0,1,2,3)])
            if pool:
                for z in (.91,.985,1.06):tube('POOL_wicker',local(*p,z),local(*q,z),.008,5)
    def table(x,y,pool=False):
        disk('POOL_deck_wood' if pool else 'WOOD_deck',(x,y,1.10),.7,.07)
        tube('METAL_anthracite',(x,y,.34),(x,y,1.07),.09)
        for a in (0,math.pi/2,math.pi,3*math.pi/2):chair(x+math.cos(a)*1.06,y+math.sin(a)*1.06,a-math.pi/2,pool)
        if pool:
            # Small objects remain within the existing table collider.
            tube('POOL_coping',(x+.22,y+.16,1.15),(x+.22,y+.16,1.31),.06,16,.045)
            for offset in (-.11,.11):disk('POOL_coping',(x+offset,y-.16,1.146),.10,.015,20)
        obstacle('mesa-convivencia-'+str(len(obstacles)),(x,y,.9),(2.65,2.65,1.8))
    def pavilion(cx,cy,wx=9,wy=5):
        box('FLOOR_stone',(cx,cy,.195),(wx+.6,wy+.6,.25))
        walk_rect('quiosque-'+str(cx)+'-'+str(cy),cx,cy,wx+.6,wy+.6)
        for x in (-wx/2,wx/2):
            for y in (-wy/2,wy/2):
                box('WALL_greige',(cx+x,cy+y,1.65),(.25,.25,3))
                obstacle('quiosque-pilar-'+str(len(obstacles)),(cx+x,cy+y,1.65),(.30,.30,3))
        for y in (-wy/2,wy/2):box('WALL_ivory',(cx,cy+y,3.16),(wx+.35,.3,.42))
        for i in range(int(wx/.35)+1):box('WOOD_deck',(cx-wx/2+i*.35,cy,3.13),(.095,wy+.4,.22))
        for n,dx in enumerate((-2.5,0,2.5)):
            disk('METAL_anthracite',(cx+dx,cy,3.005),.09,.04,12)
            disk('LIGHT_warm',(cx+dx,cy,2.98),.061,.012,12)
            night_light('quiosque-downlight-'+str(n),(cx+dx,cy,2.94),(cx+dx,cy,.32),16,4.5,'spot','quiosque')
        box('WALL_greige',(cx,cy+wy/2,1.33),(wx,.22,2.6))
        box('WALL_graphite',(cx+wx/2-1.4,cy+wy/2-.4,1.73),(1.75,.7,1.35))
        box('FLOOR_stone',(cx,cy+wy/2-.45,1.20),(wx-.5,.9,.13))
        box('WALL_greige',(cx+wx/2-1.4,cy+wy/2,3.6),(1.25,1,1.4))
        obstacle('quiosque-fundo-'+str(cy),(cx,cy+wy/2,1.33),(wx,.28,2.6))
        obstacle('quiosque-bancada-'+str(cy),(cx,cy+wy/2-.45,.85),(wx-.5,1,1.7))
        table(cx-2,cy-.5,cy<0);table(cx+1.3,cy-.5,cy<0)
    # Local helpers below are only for the front amenity complex. The pavilion()
    # contract above stays unchanged for the independent rear sports pavilion.
    def amenity_wall(id,p,d):
        box('WALL_pool_greige',p,d);obstacle(id,p,d)
    def rounded(name,p,d,r=.12):
        x,y,z=p;sx,sy,sz=d;r=min(r,sx/2,sy/2)
        points=[]
        for cx,cy,start in [(x+sx/2-r,y+sy/2-r,0),(x-sx/2+r,y+sy/2-r,math.pi/2),
                            (x-sx/2+r,y-sy/2+r,math.pi),(x+sx/2-r,y-sy/2+r,math.pi*1.5)]:
            for i in range(7):
                a=start+i*math.pi/12;points.append((cx+math.cos(a)*r,cy+math.sin(a)*r))
        n=len(points);verts=[(a,b,z+level*sz/2) for level in (-1,1) for a,b in points]
        face(name,verts,[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)])
    def pool_leaf(x,y,z,angle,length=.54,width=.18):
        # A gently bowed blade with a tapered outline and shallow midrib. The
        # former four triangular faces made foreground planting look like kites.
        dx,dy=math.cos(angle),math.sin(angle);verts=[];segments=9 if width>=.075 else 4
        phase=math.sin(x*3.7+y*2.1+angle)*.11
        for i in range(segments+1):
            t=i/segments;arch=math.sin(math.pi*t)
            half_width=width*.72*arch**.78
            cx=x+dx*length*t-dy*length*phase*arch
            cy=y+dy*length*t+dx*length*phase*arch
            cz=z+length*(.23*arch-.17*t*t)
            for side in (-1,0,1):
                verts.append((cx-dy*half_width*side,cy+dx*half_width*side,
                              cz+(1-abs(side))*length*.022*arch))
        faces=[]
        for i in range(segments):
            a=i*3;b=(i+1)*3
            faces.extend([(a,b,b+1,a+1),(a+1,b+1,b+2,a+2)])
        face('POOL_leaf_'+str(int(abs(x*17+y*13+z*7))%3),verts,faces)
    def pool_planter(id,x,y,sx,sy):
        box('POOL_coping',(x,y,.53),(sx,sy,.42));box('GROUND_grass',(x,y,.751),(sx-.14,sy-.14,.025))
        obstacle(id,(x,y,.63),(sx,sy,1.0))
        count=max(3,int(sx*sy*3.5))
        for i in range(count):
            xx=x+math.sin(i*2.39)*max(.02,sx/2-.2);yy=y+math.cos(i*1.73)*max(.02,sy/2-.2)
            for k in range(6):pool_leaf(xx,yy,.81+(i%3)*.06,k*2.399+i,.48+(i%3)*.09,.13)
    def front_glazing(y,x0,x1,opening=None):
        cuts=sorted(set([x0,x1]+([] if opening is None else list(opening))))
        box('WALL_pool_greige',((x0+x1)/2,y,3.08),(x1-x0,.22,.25))
        for a,b in zip(cuts,cuts[1:]):
            if opening and opening[0]<(a+b)/2<opening[1]:continue
            count=max(1,math.ceil((b-a)/1.65))
            for i in range(count):
                lo=a+(b-a)*i/count;hi=a+(b-a)*(i+1)/count
                box('POOL_clear_glass',((lo+hi)/2,y,1.655),(hi-lo-.055,.024,2.60))
                obstacle('salao-vidro-'+str(len(obstacles)),((lo+hi)/2,y,1.64),(hi-lo,.13,2.64))
                for edge in (lo,hi):box('METAL_anthracite',(edge,y-.025,1.66),(.044,.065,2.68))
            for z in (.344,2.988):box('METAL_anthracite',((a+b)/2,y-.025,z),(b-a,.065,.052))
    def pool_barbecue(y):
        # A true recessed hearth facing the pool, with jambs, lintel and hood.
        for side in (-1,1):box('WALL_pool_greige',(-37.17,y+side*.63,1.66),(.96,.18,2.48))
        box('WALL_pool_greige',(-37.17,y,2.47),(.96,1.42,.85))
        box('POOL_stone_counter',(-37.10,y,1.13),(1.10,1.46,.13))
        box('POOL_bbq_refractory',(-37.63,y,1.59),(.07,1.05,.78))
        box('POOL_bbq_refractory',(-37.17,y,1.23),(.92,1.06,.08))
        box('WINDOW_recess',(-37.59,y,1.38),(.035,.92,.21))
        for row in range(5):
            for column in range(5):
                yy=y-.45+column*.19+(row%2)*.06
                if yy>y+.47:continue
                box('POOL_bbq_refractory',(-37.58,yy,1.26+row*.145),(.018,.174,.129))
        for i in range(8):tube('METAL_anthracite',(-37.47,y-.48+i*.137,1.35),(-36.80,y-.48+i*.137,1.35),.009,5)
        box('WALL_pool_greige',(-37.26,y,3.54),(.94,1.10,1.12))
        box('WALL_graphite',(-37.26,y,4.12),(1.10,1.25,.15))
        for i in range(4):box('METAL_anthracite',(-36.77,y,3.93+i*.042),(.036,1.02,.018))

    # Closed party-room volume at the front of the complex, with broad glazing
    # and actual 2.2 m door gaps on the safe x=-32.5 circulation axis.
    box('POOL_coping',(-29.5,-12.1,.195),(17.1,7.8,.25))
    walk_rect('salao-festas',-29.5,-12.1,16.6,7.4)
    box('POOL_coping',(-32.5,-16.35,.195),(2.8,1.3,.25))
    walk_rect('patamar-salao-festas',-32.5,-16.35,2.8,1.3)
    for i in range(71):
        box('POOL_deck_wood_interior',(-37.66+i*.235,-12.1,.337),(.228,7.13,.028))
    amenity_wall('salao-parede-oeste',(-37.80,-12.1,1.72),(.22,7.4,2.80))
    front_glazing(-15.8,-37.7,-21.2,(-33.6,-31.4))
    front_glazing(-8.4,-37.7,-21.2,(-33.6,-31.4))
    box('POOL_clear_glass',(-21.2,-12.1,1.66),(.026,7.35,2.61))
    obstacle('salao-vidro-leste',(-21.2,-12.1,1.66),(.13,7.4,2.64))
    for y in (-15.77,-14.3,-12.83,-11.36,-9.89,-8.43):box('METAL_anthracite',(-21.18,y,1.66),(.065,.045,2.68))
    box('WALL_ivory',(-29.5,-12.1,3.045),(16.65,7.4,.12))
    box('WALL_pool_greige',(-29.5,-12.1,3.22),(17.10,7.82,.24))
    for y in (-16.00,-8.20):box('WALL_pool_greige',(-29.5,y,3.43),(17.1,.17,.28))
    for x in (-38.00,-21.00):box('WALL_pool_greige',(x,-12.1,3.43),(.17,7.82,.28))
    for x in (-35.0,-29.3,-24.8):
        for y in (-13.7,-10.1):
            box('METAL_anthracite',(x,y,2.969),(.26,.15,.035))
            for dx in (-.068,.068):disk('LIGHT_warm',(x+dx,y,2.945),.045,.016,12)
            night_light('salao-downlight-'+str(len(modeled_lights)),(x,y,2.91),(x,y,.32),17,4.3,'spot','gourmet')
    # Left-hand catering counter, dining tables and sage upholstered living edge.
    box('WALL_ivory',(-37.17,-12.25,.77),(.94,5.30,.89))
    box('POOL_stone_counter',(-37.13,-12.25,1.245),(1.04,5.42,.10))
    obstacle('salao-bancada',(-37.14,-12.25,.85),(1.07,5.46,1.7))
    for y in (-14.15,-12.9,-11.65,-10.4):box('POOL_deck_wood_interior',(-36.67,y,.79),(.035,1.21,.82))
    for x,y in [(-35.2,-11.65),(-28.95,-11.65),(-24.4,-11.65)]:table(x,y,True)
    for x in (-28.35,-24.55):
        rounded('POOL_fabric_sage',(x,-14.86,.69),(3.40,.88,.53),.17)
        rounded('POOL_fabric_sage',(x,-15.18,1.07),(3.40,.27,.82),.115)
        for dx in (-1.1,0,1.1):rounded('POOL_fabric_sage',(x+dx,-14.76,.99),(1.07,.70,.17),.10)
        obstacle('salao-sofa-'+str(x),(x,-14.89,.82),(3.48,1.06,1.65))
    for i in range(11):box('POOL_deck_wood_interior',(-33.98,-11.0+i*.15,1.76),(.09,.055,2.85))
    obstacle('salao-divisoria',(-33.98,-10.25,1.76),(.16,1.66,2.85))
    pool_planter('salao-jardineira',-22.0,-14.65,.66,.80)
    # The open terrace in front of the pool connects party room, deck and gallery.
    box('POOL_coping',(-29.40,-6.48,.195),(16.80,3.85,.25))
    walk_rect('terraco-salao-piscina',-29.4,-6.48,16.8,3.85)
    for x in (-29.0,-25.1):
        rounded('POOL_fabric', (x,-6.45,.74),(1.28,.76,.35),.12)
        rounded('POOL_fabric', (x,-6.72,1.03),(1.28,.20,.70),.095)
        box('POOL_deck_wood',(x,-6.46,.53),(1.36,.80,.10))
        obstacle('terraco-poltrona-'+str(x),(x,-6.45,.88),(1.42,.94,1.55))
    rounded('POOL_deck_wood',(-27.03,-6.28,.79),(1.20,.76,.15),.07)
    obstacle('terraco-mesa',(-27.03,-6.28,.62),(1.26,.82,1.25))

    # The compact service/bathroom wing closes the left side between the hall and
    # gourmet gallery. It leaves the deck circulation strip x>-34.8 unobstructed.
    box('POOL_coping',(-36.5,-4.3,.195),(3.3,8.35,.25))
    for x in (-37.9,-35.1):amenity_wall('apoio-parede-'+str(x),(x,-4.3,1.71),(.20,8.2,2.78))
    for y in (-8.35,-.2):amenity_wall('apoio-fundo-'+str(y),(-36.5,y,1.71),(2.9,.20,2.78))
    box('WALL_pool_greige',(-36.5,-4.3,3.20),(3.18,8.4,.26))
    for y in (-6.1,-2.9):
        box('METAL_anthracite',(-34.978,y,2.2),(.022,.88,.65))
        box('WINDOW_reflections',(-34.963,y,2.2),(.025,.77,.54))

    # Long side-facing barbecue wall and pergola: it sits beside the pool, not
    # across its front. Tables sit in the shade with a continuous deck aisle east.
    box('POOL_coping',(-35.78,6.25,.195),(4.65,13.15,.25))
    walk_rect('quiosque-lateral-piscina',-35.78,6.25,4.65,13.15)
    amenity_wall('gourmet-parede-lateral',(-37.88,6.25,1.72),(.24,13.1,2.8))
    for a,b in [(-.10,.82),(2.38,9.82),(11.38,12.60)]:
        box('WALL_ivory',(-37.15,(a+b)/2,.82),(.96,b-a,.98))
        box('POOL_stone_counter',(-37.10,(a+b)/2,1.33),(1.09,b-a+.035,.12))
    obstacle('gourmet-bancada-lateral',(-37.12,6.25,.91),(1.16,12.9,1.82))
    for y in (1.6,10.6):pool_barbecue(y)
    for y in (4.8,7.1):
        box('METAL_anthracite',(-37.04,y,1.397),(.60,.57,.025))
        box('WINDOW_recess',(-37.04,y,1.415),(.49,.46,.03))
        tube('METAL_anthracite',(-37.34,y+.32,1.38),(-37.34,y+.32,1.75),.022,10)
        tube('METAL_anthracite',(-37.34,y+.32,1.75),(-37.10,y+.32,1.75),.022,10)
    for y in (-.10,6.25,12.60):
        amenity_wall('gourmet-pilar-'+str(y),(-33.58,y,1.71),(.22,.22,2.80))
    box('WALL_pool_greige',(-36.84,6.25,3.16),(2.30,13.38,.22))
    box('POOL_deck_wood',(-36.85,6.25,3.027),(2.25,13.15,.07))
    box('POOL_deck_wood',(-33.52,6.25,3.17),(.22,13.50,.30))
    for i in range(43):box('POOL_deck_wood',(-35.65,-.35+i*.314,3.23),(4.78,.095,.19))
    # Concealed warm ribbons and recessed spots respect the timber beam rhythm.
    box('LIGHT_warm',(-36.76,6.25,2.986),(.026,12.9,.014))
    for n,y in enumerate((2.4,6.3,10.2)):
        disk('METAL_anthracite',(-35.75,y,3.005),.095,.032,12)
        disk('LIGHT_warm',(-35.75,y,2.983),.063,.012,12)
        night_light('gourmet-downlight-'+str(n),(-35.75,y,2.945),(-35.3,y,.65),20,4.5,'spot','piscina')
    for y in (2.5,6.0,9.5):table(-35.2,y,True)
    for i in range(39):
        yy=-.1+i*.337
        for k in range(7):pool_leaf(-33.43+math.sin(k*1.7)*.13,yy,3.23-k*.10,k*2.399+i,.30,.08)
    # Broad-leaf beds and slender palms line the pool's right-hand edge.
    for y in (0.1,5.1,10.1):pool_planter('piscina-jardineira-'+str(y),-20.55,y,1.62,4.30)
    for x,y,h in [(-20.5,.4,6.6),(-20.5,7.4,7.2)]:
        tube('PALM_bark',(x,y,.45),(x+.12,y,h),.19,12,.135)
        obstacle('piscina-palmeira-'+str(y),(x,y,h/2),(.39,.39,h))
        for frond in range(18):
            angle=frond*math.tau/18;reach=2.85+.35*math.sin(frond*2.39);lift=.60+.40*(frond%3)
            for step in range(26):
                t=step/26;u=(step+1)/26
                a=(x+math.cos(angle)*t*reach,y+math.sin(angle)*t*reach,h+math.sin(t*math.pi)*lift-t*(.45+.2*(frond%3)))
                b=(x+math.cos(angle)*u*reach,y+math.sin(angle)*u*reach,h+math.sin(u*math.pi)*lift-u*(.45+.2*(frond%3)))
                tube('POOL_deck_wood',a,b,.015,4)
                for side in (-1,1):pool_leaf(*a,angle+side*1.12,.22+math.sin(t*math.pi)*.74,.048)
    for y in (-2.6,2.5,7.6,12.7):
        tube('METAL_anthracite',(-19.58,y,.3),(-19.58,y,1.45),.028,6)
    for z in (.78,1.12,1.45):tube('METAL_anthracite',(-19.58,-2.6,z),(-19.58,12.7,z),.022,6)
    obstacle('piscina-guarda-corpo',(-19.58,5.05,.87),(.14,15.5,1.74))
    # Three shade parasols along the pool edge.
    for x in (-33,-28,-23):
        tube('POOL_deck_wood',(x,16,.2),(x,16,2.8),.045)
        face('POOL_fabric',[(x,y,z) for x,y,z in [(x,16,3.1)]]+[(x+math.cos(i*math.tau/8)*1.5,16+math.sin(i*math.tau/8)*1.5,2.63) for i in range(8)],[(0,i+1,(i+1)%8+1) for i in range(8)])
        for i in range(8):
            a=i*math.tau/8
            tube('POOL_deck_wood',(x,16,2.93),(x+math.cos(a)*1.45,16+math.sin(a)*1.45,2.61),.013,5)
        table(x,16,True)
    # Reference mini-court: transverse to the parking rows, with the goal/basket
    # on the right, rather than the former long north-south court.
    box('COURT_green',(19,64,.23),(20,13,.18))
    walk_rect('miniquadra',19,64,20,13)
    box('COURT_ochre',(26.05,64,.335),(5.3,5.7,.012))
    for x in (9.3,28.7):box('ROAD_marking',(x,64,.35),(.075,12.4,.013))
    for y in (57.8,70.2):box('ROAD_marking',(19,y,.35),(19.4,.075,.013))
    for y in (61.15,66.85):box('ROAD_marking',(26.05,y,.35),(5.3,.075,.013))
    box('ROAD_marking',(23.4,64,.35),(.075,5.7,.013))
    # One basket court: paint an arc and key, not a full-court centre circle.
    path([(27.8-math.cos(-math.pi/2+i*math.pi/64)*6.3,64+math.sin(-math.pi/2+i*math.pi/64)*6.3,.35) for i in range(65)],.075,'ROAD_marking',0)
    path([(23.4-math.cos(-math.pi/2+i*math.pi/40)*1.8,64+math.sin(-math.pi/2+i*math.pi/40)*1.8,.35) for i in range(41)],.075,'ROAD_marking',0)
    def court_fence(a,b,id):
        a,b=Vector((*a,0)),Vector((*b,0));length=(b-a).length
        steps=math.ceil(length/2.5)
        for k in range(steps+1):
            p=a.lerp(b,k/steps);tube('METAL_anthracite',(p.x,p.y,.32),(p.x,p.y,3.6),.034)
        for z in (.35,3.55):tube('METAL_anthracite',(a.x,a.y,z),(b.x,b.y,z),.029)
        # Lightweight wire mesh, batched with the metal details.
        for k in range(math.ceil(length/.24)+1):
            p=a.lerp(b,min(1,k*.24/length));tube('METAL_anthracite',(p.x,p.y,.37),(p.x,p.y,3.53),.006,4)
        for k in range(1,14):
            z=.35+k*.23;tube('METAL_anthracite',(a.x,a.y,z),(b.x,b.y,z),.006,4)
        obstacle(id,((a.x+b.x)/2,(a.y+b.y)/2,1.95),(abs(b.x-a.x)+.13,abs(b.y-a.y)+.13,3.4))
    court_fence((29.15,57.45),(29.15,70.55),'quadra-gradil-direita')
    # The supplied view has an open terrace toward the pavilion, with ball-stop
    # mesh behind the goal. Do not enclose it in an invented perimeter cage.
    # Goal faces across the width of the site; the basketball support sits behind it.
    for y in (62.5,65.5):
        tube('ROAD_marking',(28.05,y,.34),(28.05,y,2.40),.044)
        tube('ROAD_marking',(28.05,y,2.40),(28.70,y,2.08),.034)
        tube('ROAD_marking',(28.70,y,.34),(28.70,y,2.08),.034)
    tube('ROAD_marking',(28.05,62.5,2.4),(28.05,65.5,2.4),.044)
    for k in range(16):
        y=62.5+k*.2;tube('FABRIC_outdoor',(28.70,y,.36),(28.70,y,2.08),.005,4)
    for k in range(9):tube('FABRIC_outdoor',(28.7,62.5,.4+k*.2),(28.7,65.5,.4+k*.2),.005,4)
    tube('METAL_anthracite',(29.4,64,.32),(29.4,64,4.0),.075)
    tube('METAL_anthracite',(29.4,64,3.8),(28.1,64,3.8),.055)
    box('WALL_ivory',(28.1,64,3.65),(.075,1.8,1.05))
    for k in range(24):
        a=k*math.tau/24;b=(k+1)*math.tau/24
        tube('COURT_ochre',(27.75+math.cos(a)*.23,64+math.sin(a)*.23,3.23),(27.75+math.cos(b)*.23,64+math.sin(b)*.23,3.23),.018,5)
    obstacle('quadra-trave',(28.4,64,1.3),(.85,3.2,2.5))
    obstacle('quadra-cesta',(29.4,64,2),(.35,.35,4))
    pavilion(20,79,10,5)
    # Curving, branching woodland trails; shown as a visual study, never as APP boundaries.
    trail=[(-42,-12,0),(-48,3,0),(-50,21,0),(-43,36,0),(-51,55,0),(-48,76,0),(-31,91,0),(-6,92,0),(18,91,0),(31,83,0),(34,68,0)]
    path(trail,2.7,height=walk_z,id='trilha-principal')
    path([(-43,36,0),(-28,46,0),(-24,63,0),(-12,77,0),(12,79,0),(16,77,0)],2.4,height=walk_z,id='trilha-quiosque')
    path([(-48,76,0),(-24,63,0),(6,55,0),(6,53,0),(18.8,53,0),(18.8,57.5,0)],2.4,height=walk_z,id='trilha-quadra')
    path([(18.8,70.5,0),(18.8,73.8,0),(26.8,74,0),(26.8,78,0),(24,78,0)],2.2,height=walk_z,id='quadra-quiosque')
    # Continuous real walking surfaces connect the public-facing common spaces.
    path([(4,-20,0),(-12,-20,0),(-37,-20,0),(-40,-15,0),(-42,-12,0)],3.1,'FLOOR_sidewalk',walk_z,id='passeio-chegada')
    path([(-32.5,-13.8,0),(-32.5,-8.4,0),(-33.8,-5.8,0),(-33.8,-3,0)],1.75,'FLOOR_stone',walk_z,id='acesso-deck')
    path([(-40,-15,0),(-39.6,-18,0),(-32.5,-18,0),(-32.5,-13.8,0)],1.75,'FLOOR_stone',walk_z,id='acesso-gourmet')
    path([(-34,12,0),(-35.7,18,0),(-40,22,0),(-50,21,0)],2.5,height=walk_z,id='deck-mata')
    # An upper deck opens a safe passage behind the parasol seating.
    box('POOL_coping',(-28,17,.195),(15,6,.25));walk_rect('deck-sombra',-28,17,15,6)
    for x,y in [(-40,29),(-33,62),(-18,86),(-41,76)]:
        for i in range(4):box('WOOD_deck',(x,y+i*.13,.52),(2,.11,.06))
        for xx in (-.8,.8):box('METAL_anthracite',(x+xx,y+.18,.26),(.06,.37,.47))
        box('WOOD_deck',(x,y+.5,.89),(2,.08,.5))
        obstacle('banco-mata-'+str(len(obstacles)),(x,y+.2,.65),(2.2,.8,1.3))
    # Procedural trees with branching trunks and individual folded leaves, no painted spheres.
    def route_distance(x,y):
        best=1e9
        for route in paths:
            for a,b in zip(route['points'],route['points'][1:]):
                dx,dy=b[0]-a[0],b[1]-a[1]
                t=max(0,min(1,((x-a[0])*dx+(y-a[1])*dy)/max(dx*dx+dy*dy,1e-8)))
                best=min(best,math.hypot(x-a[0]-t*dx,y-a[1]-t*dy)-route['width']/2)
        return best
    def leaf(center,angle,length,width,matname):
        p=Vector(center);d=Vector((math.cos(angle),math.sin(angle),rng.uniform(-.28,.6)));s=Vector((-math.sin(angle),math.cos(angle),0))
        face(matname,[p,p+d*length*.45+s*width,p+d*length+Vector((0,0,-length*.17)),p+d*length*.45-s*width,p+d*length*.46+Vector((0,0,.075))],[(0,1,4),(1,2,4),(2,3,4),(3,0,4)])
    def tree(x,y,h,radius,seed):
        starts={name:len(batches.get(name,([],[]))[1]) for name in ('WOOD_bark','FOLIAGE_CC0')}
        rr=random.Random(seed);ground=terrain_z(x,y);trunk=(x,y,ground+h*.56)
        tube('WOOD_bark',(x,y,ground),trunk,h*.025,8,h*.009)
        distance=route_distance(x,y);close=distance<9
        branches,clusters=(15,5) if close else (12,4)
        if distance<12:obstacle('arvore-'+str(seed),(x,y,ground+h/2),(h*.055,h*.055,h))
        for b in range(branches):
            a=b*2.399;spread=radius*(.35+rr.random()*.7);zz=ground+h*(.59+rr.random()*.37)
            tip=(x+math.cos(a)*spread,y+math.sin(a)*spread,zz)
            tube('WOOD_bark',(x,y,ground+h*(.3+rr.random()*.28)),tip,h*.007,5,.012)
            for cluster in range(clusters):
                cx=tip[0]+rr.uniform(-.65,.65);cy=tip[1]+rr.uniform(-.65,.65);cz=tip[2]+rr.uniform(-.35,.4)
                # Three lightly folded twig cards hold photographic CC0 leaves.
                # Hundreds of small leaves per crown, without giant diamond leaves
                # or the hundreds of thousands of faces in the source tree mesh.
                for l in range(3):
                    la=rr.random()*math.tau
                    d=Vector((math.cos(la),math.sin(la),rr.uniform(-.2,.65))).normalized()
                    side=Vector((-math.sin(la),math.cos(la),rr.uniform(-.8,.8))).normalized()
                    p=Vector((cx,cy,cz));length=rr.uniform(1.35,2.1)*max(1,radius/3.8);width=length*.48
                    vertices=[p-d*length*.5-side*width*.5,p-d*length*.5+side*width*.5,
                              p+d*length*.5+side*width*.5,p+d*length*.5-side*width*.5]
                    face('FOLIAGE_CC0',vertices,[(0,1,2),(0,2,3)],[(.005,.005),(.465,.005),(.465,.995),(.005,.995)])
        _RENDER_TREE_RECORDS.append({'id':seed,'position':[x,y,ground],'height':h,'radius':radius,
            'ranges':{name:[starts[name],len(batches[name][1])] for name in starts}})
    # Forest band covers the left and back edges, and keeps paths open.
    positions=[]
    for x in range(-65,45,7):
        for y in range(-8,104,7):
            if (x < -38 or y>86 or (x<-20 and y>24)) and not(-55<x<-46 and 0<y<90):
                tx,ty=x+rng.uniform(-2,2),y+rng.uniform(-2,2)
                if route_distance(tx,ty)>.85:positions.append((tx,ty))
    for i,(x,y) in enumerate(positions):tree(x,y,rng.uniform(6.5,12),rng.uniform(2.4,3.8),i+74)
    for i in range(23):tree(44+rng.uniform(1,7),-5+i*4.5,rng.uniform(8,12),3.6,500+i)
    # A staggered woodland backdrop closes the empty lawn behind the tower.
    # Distant trees use the cheaper branch/leaf profile and share existing batches.
    context_positions=[]
    for y in range(106,181,12):
        for x in range(-96,111,12):
            context_positions.append((x+rng.uniform(-2.3,2.3),y+rng.uniform(-2.3,2.3)))
    for x in (60,73,87):
        for y in range(0,106,14):context_positions.append((x+rng.uniform(-2,2),y+rng.uniform(-2,2)))
    for y in range(195,336,23):
        for x in range(-168,169,23):context_positions.append((x+rng.uniform(-3,3),y+rng.uniform(-3,3)))
    for i,(x,y) in enumerate(context_positions):tree(x,y,rng.uniform(9,14),rng.uniform(3.8,5.0),900+i)
    # Palms are used sparingly, as in the entry/pool reference, not throughout the woodland.
    def palm(x,y,h):
        ground=terrain_z(x,y)
        tube('PALM_bark',(x,y,ground),(x+.2,y,h),.21,12,.15)
        obstacle('palmeira-'+str(len(obstacles)),(x,y,(h+ground)/2),(.43,.43,h-ground))
        for k in range(18):
            a=k*math.tau/18;pts=[];reach=3.2+.45*math.sin(k*2.39);lift=.75+.42*(k%3)
            for j in range(37):
                t=j/36;pts.append((x+math.cos(a)*t*reach,y+math.sin(a)*t*reach,h+math.sin(t*math.pi)*lift-t*(.65+.17*(k%3))))
            for j in range(36):
                tube('WOOD_deck',pts[j],pts[j+1],.018,4)
                for sign in (-1,1):pool_leaf(*pts[j],a+sign*1.12,(.20+math.sin(j/36*math.pi)*.98),.042)
    for x,y,h in [(-18,-18,11.5),(18,-17,12.8),(27,-14,9.8),(-20,13,6.5),(-34,12,6),(-34,-6,6.7)]:palm(x,y,h)
    # Planted entry cornice: individually curved trailing leaves instead of a
    # flat grass strip. They remain above the pedestrian head-clearance zone.
    for i in range(48):
        x=-6.12+i*.259;length=.32+.22*(.5+.5*math.sin(i*2.39))
        tube('WOOD_bark',(x,-19.14,3.17),(x+.05*math.sin(i),-19.20,3.17-length),.007,5)
        for k in range(5):
            pool_leaf(x+.025*math.sin(i+k),-19.20,3.14-k*length/5,
                      -math.pi/2+(-1 if k%2 else 1)*.62,.16,.055)
    # Low, broad-leaf planting at the entrance and pool.
    for i in range(115):
        x,y=(rng.uniform(-13,13),rng.uniform(-17,-15)) if i<45 else (rng.uniform(-40.8,-39.2),rng.uniform(-12,18))
        if route_distance(x,y)<.6:continue
        for l in range(9):
            if i<45:pool_leaf(x,y,max(.28,terrain_z(x,y)+.22)+rng.uniform(.05,.33),l*2.399,rng.uniform(.35,.65),.14)
            else:leaf((x,y,terrain_z(x,y)+rng.uniform(.1,.55)),l*2.399,rng.uniform(.35,.65),.19,'LEAF_'+str(i%5))
    # Near-path understory makes the woodland read at eye level, while leaving
    # a clear shoulder. It uses the same five leaf batches as the distant canopy.
    for i in range(190):
        x,y=rng.uniform(-61,-28),rng.uniform(8,92)
        if -39<x<-18 and -17<y<21:continue
        if not .8<route_distance(x,y)<7:continue
        for l in range(11):leaf((x,y,.12+rng.uniform(0,.3)),l*2.399,rng.uniform(.48,.82),.16,'LEAF_'+str(i%5))
        obstacle('sub-bosque-'+str(i),(x,y,.5),(1.05,1.05,1))
    for x,y in [(-12,-21.7),(-37,-18),(-37,1),(-37,13),(-48,32),(-28,44),(11,49.2),(27.7,76.2)]:
        box('METAL_anthracite',(x,y,.65),(.14,.14,1.05))
        box('LIGHT_warm',(x,y,1.15),(.17,.17,.07))
        obstacle('balizador-'+str(len(obstacles)),(x,y,.65),(.20,.20,1.3))
        night_light('balizador-'+str(len(modeled_lights)),(x,y,1.18),(x,y,.32),8,3.2,'point','paisagismo')
    # Cars are centred in selected bays, including the covered row. Sloped
    # windscreens, wheel arches and lamps make their orientation unambiguous.
    parked_vehicles=[]
    for i,(row,slot) in enumerate([(0,2),(0,7),(1,4),(1,13),(2,8),(2,14),(3,5)]):
        stall=parking_stalls[row*16+slot];x,y=stall['center']
        paint='WALL_ivory' if i%3==0 else 'WALL_graphite' if i%3==1 else 'WALL_limestone'
        box(paint,(x,y,.89),(4.35,1.82,.62))
        box(paint,(x-.09,y,1.20),(3.95,1.77,.16))
        # The front hood points towards +X. All dimensions fit inside 5.2 x 2.7.
        cabin=[(-1.28,-.77,1.25),(1.05,-.77,1.25),(.60,-.69,1.83),(-.76,-.69,1.83),
               (-1.28,.77,1.25),(1.05,.77,1.25),(.60,.69,1.83),(-.76,.69,1.83)]
        face('WINDOW_reflections',[(x+u,y+v,z) for u,v,z in cabin],[(0,1,2,3),(4,7,6,5),(1,5,6,2),(0,3,7,4)])
        box(paint,(x-.08,y,1.835),(1.43,1.43,.075))
        for side in (-1,1):
            box(paint,(x-.05,y+side*.754,1.53),(.105,.055,.52))
            box('METAL_anthracite',(x+.70,y+side*.94,1.27),(.26,.17,.13))
            for xx in (-1.34,1.32):
                tube('ROAD_asphalt',(x+xx,y+side*.79,.66),(x+xx,y+side*1.00,.66),.33,16)
                tube('METAL_anthracite',(x+xx,y+side*.985,.66),(x+xx,y+side*1.015,.66),.20,16)
                for k in range(5):
                    a=k*math.tau/5;tube('WALL_ivory',(x+xx,y+side*1.018,.66),(x+xx+math.cos(a)*.16,y+side*1.018,.66+math.sin(a)*.16),.019,5)
            box('LIGHT_warm',(x+2.185,y+side*.62,1.03),(.035,.42,.14))
            box('COURT_ochre',(x-2.185,y+side*.66,1.04),(.035,.29,.13))
        box('METAL_anthracite',(x+2.19,y,.82),(.035,1.07,.15))
        box('ROAD_marking',(x+2.213,y,.84),(.019,.48,.10))
        obstacle('veiculo-'+str(i),(x,y,1.1),(4.48,2.10,1.7))
        parked_vehicles.append({'id':'veiculo-'+str(i),'stall':stall['id'],'center':[x,y],'size':[4.48,2.10],'angle':0})
    # Material group meshes, with a small edge radius where it matters architecturally.
    built=[]
    for name,(verts,faces) in batches.items():
        mesh=bpy.data.meshes.new('B_EXT_'+name);mesh.from_pydata(verts,[],faces);mesh.update()
        obj=bpy.data.objects.new('B_EXT_'+name,mesh);bpy.context.collection.objects.link(obj);mesh.materials.append(mats[name])
        if name in uv_batches:
            uv=mesh.uv_layers.new(name='B_EXT_CANOPY')
            for polygon,coords in zip(mesh.polygons,uv_batches[name]):
                for loop,co in zip(polygon.loop_indices,coords):uv.data[loop].uv=co
        built.append(obj)
        if name.startswith('GROUND'):
            obj.visible_shadow=False;obj['noShadow']=True
        if name=='WATER_pool':
            obj.visible_shadow=False;obj['noShadow']=True;obj['surface']='pool-water'
        if name=='GROUND_grass':
            for p in mesh.polygons:
                if p.normal.z>.65:p.use_smooth=True
        if name.startswith('POOL_leaf_'):
            for p in mesh.polygons:p.use_smooth=True
        if name.startswith(('WALL','WOOD_deck','FABRIC','FLOOR','POOL_coping','POOL_deck_wood','POOL_fabric')):
            bevel=obj.modifiers.new('Light-catching edges','BEVEL');bevel.width=.022 if name.startswith('WALL') else .012;bevel.segments=1
            bevel.limit_method='ANGLE'
    finish_path=Path(__file__).with_name('botanique_exterior_finishes.py')
    spec=importlib.util.spec_from_file_location('botanique_exterior_finishes',finish_path)
    finishes=importlib.util.module_from_spec(spec);spec.loader.exec_module(finishes)
    finish_report=finishes.apply_exterior_finishes(built,mats)
    shrub_places=[]
    for x,y in [(-12,-17.8),(-9,-17.8),(8,-17.8),(11,-17.8),(-19.3,1),(-19.3,6),(-19.3,11),(-36.7,8),(-36.7,12)]:
        if route_distance(x,y)>1.25:shrub_places.append((x,y,1.05,rng.random()*math.tau,terrain_z(x,y)))
    for route in paths:
        if not route['id'].startswith(('trilha','deck-mata')):continue
        for i,(a,b) in enumerate(zip(route['points'],route['points'][1:])):
            dx,dy=b[0]-a[0],b[1]-a[1];length=max(math.hypot(dx,dy),.001)
            for sign in (-1,1):
                distance=route['width']/2+1.7
                x=(a[0]+b[0])/2-sign*dy/length*distance
                y=(a[1]+b[1])/2+sign*dx/length*distance
                if route_distance(x,y)>1.25:shrub_places.append((x,y,.8+(i%3)*.13,rng.random()*math.tau,terrain_z(x,y)))
    shrub_report=finishes.add_cc0_shrubs(shrub_places)
    obstacles.extend(shrub_report.pop('obstacles',[]))
    finish_report['shrubs']=shrub_report
    pool_plant_places=[(x,y,terrain_z(x,y)) for x in (-40.5,-39.3) for y in (0,4,8,12,16) if route_distance(x,y)>1.4]
    pool_plant_report=finishes.add_pool_planting(pool_plant_places,mats['FOLIAGE_CC0'])
    finish_report['poolPlanting']=pool_plant_report
    views=[
        {'id':'fachada','label':'A torre e a natureza','position':[-45,-83,42],'target':[-1,7,25],'lens':25},
        {'id':'implantacao','label':'Conheça a implantação','position':[-73,-75,116],'target':[-5,31,10],'lens':42},
        {'id':'entrada','label':'Chegada ao Botanique','position':[-27,-38,5.5],'target':[-1,-11,9],'lens':32},
        {'id':'piscina','label':'Piscina e espaço gourmet','position':[-19,-7,3.3],'target':[-28,11,1.1],'lens':27},
        {'id':'lazer','label':'Lazer junto à mata','position':[5,50,5],'target':[21,72,1.6],'lens':31},
        {'id':'mata','label':'Um passeio na natureza','position':[-45,33,2.05],'target':[-34,63,3.5],'lens':31},
        {'id':'salao-piscina','label':'Salão e piscina','position':[-15,-30,8],'target':[-30,-7,1.7],'lens':28},
    ]
    for i,v in enumerate(views):
        d=bpy.data.cameras.new('B_EXT_CAM_'+v['id']);o=bpy.data.objects.new(d.name,d);bpy.context.collection.objects.link(o)
        o.location=v['position'];o.rotation_euler=(Vector(v['target'])-o.location).to_track_quat('-Z','Y').to_euler();d.lens=v['lens'];d.clip_end=2500
        marker=bpy.context.scene.timeline_markers.new(v['id'],frame=i+1);marker.camera=o
        if i==0:bpy.context.scene.camera=o
    navigation={'coordinateSystem':'BLENDER_Z_UP','units':'metres','eyeHeight':1.6,'radius':.35,'maxStep':.18,
        'surfaces':surfaces,'paths':paths,'obstacles':obstacles,
        'entries':[
            {'id':'chegada','label':'Passeio de chegada','position':[-11,-20,walk_z],'target':[-3,-18,walk_z+1.6]},
            {'id':'piscina','label':'Deck da piscina','position':[-33.8,-3,walk_z],'target':[-26,7,walk_z+1.6]},
            {'id':'gourmet','label':'Espaço gourmet','position':[-32.5,-13.8,walk_z],'target':[-28,-11,walk_z+1.6]},
            {'id':'mata','label':'Trilha na mata','position':[-50,21,walk_z],'target':[-43,36,walk_z+1.6]},
            {'id':'quadra','label':'Miniquadra','position':[18.8,60,walk_z],'target':[27.5,64,walk_z+1.6]},
            {'id':'quiosque','label':'Quiosque de convivência','position':[23.8,77,walk_z],'target':[20,79,walk_z+1.6]},
        ],'scope':'Illustrative continuous common-area routes; street, pool water and tower interiors are excluded.'}
    return {'views':views,'bounds':{'min':[-75,-35,-5],'max':[75,114,height+3]},
        'navigation':navigation,'finishes':finish_report,
        'facade':{'revision':5,'typicalFloors':levels,'typicalFloorsSource':'botanique-home-resort-bbdr-engemafferpdf.pdf, page 21',
                  'bays':facade_bays,'balconiesProjectBeyondOuterEnvelope':False,
                  'geometryNote':'Facade positions traced from supplied commercial elevations; dimensions, heights and rear elevation remain inferred.'},
        'modeled_lights':modeled_lights,
        'night_lighting':{'coordinateSystem':'BLENDER_Z_UP','fixtureMaterial':'B_LIGHT_warm',
            'windowMaterials':[{'name':'B_WINDOW_glow_'+kelvin,'colorLinear':list(color),'dayEmissionStrength':.06,'nightEmissionStrength':1.5} for kelvin,color in window_temperatures],
            'occupancy':'Deterministic mixed lit/unlit window panes; an illustrative evening scenario, not unit occupancy information.',
            'lightsNote':'Position/target use Blender metres. Convert once to glTF [x,z,-y]. Runtime powers are visual calibration, not electrical specifications.'},
        'terrain':{'visualPlateauZ':.24,'walkingSurfaceZ':walk_z,'pathAboveGrass':.08,
                   'street':'Approximate gentle slope; no surveyed elevations claimed.',
                   'note':'Visual ground raised to meet the existing walking datum; navigation points and surfaces retain their original heights.'},
        'parking':{'stalls':parking_stalls,'vehicles':parked_vehicles,'scope':'Illustrative arrangement traced from reference, no official bay numbering'},
        'court':{'center':[19,64],'size':[20,13],'goalDirection':'positive-X','scope':'Orientation corrected against aerial reference'},
        'reconstruction':'Official brochure confirms one tower and 20 typical floors; dimensions, heights, rear facade, planting and terrain remain illustrative, not surveyed.',
        'trees':len(positions)+23+len(context_positions),'materials':len(batches),
        'performance':{'materialBatches':len(batches)+shrub_report.get('materialBatches',0)+pool_plant_report.get('materialBatches',0),'baseVertices':sum(len(v) for v,f in batches.values()),
                       'baseTriangles':sum(sum(max(0,len(poly)-2) for poly in f) for v,f in batches.values()),
                       'foliage':'More detailed near walkways; simplified in the distant forest; all material-batched.'}}


def apply_render_foliage(result):
    """Production-only foliage. The build calls this after the lightweight GLB."""
    helper=Path(__file__).with_name('botanique_exterior_finishes.py')
    spec=importlib.util.spec_from_file_location('botanique_exterior_render_finishes',helper)
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    return module.apply_render_foliage(_RENDER_TREE_RECORDS)
