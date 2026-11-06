"""Conceptual dollhouses traced from DeVille's supplied plans.jpg brochure.
Pixel proportions only: not measured plans, not mapped to specific unit types.
Blender --background --python tools/moradas-floorplans.py
"""
import bpy, math, json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
out=root/'public/assets/developments/moradas-da-serra/floorplans'
out.mkdir(parents=True,exist_ok=True)
source=root/'assets-source/moradas';source.mkdir(parents=True,exist_ok=True)

def material(name,color,rough=.7,metal=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal
 return m

def build(beds):
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 mats={k:material(k,c) for k,c in {'plaster':(.79,.77,.69),'oak':(.43,.29,.18),'floor':(.63,.51,.38),'ivory':(.89,.87,.79),'linen':(.69,.68,.58),'sage':(.19,.29,.21),'charcoal':(.075,.10,.09),'stone':(.69,.68,.62),'ceramic':(.91,.91,.85),'rug':(.52,.54,.47),'leaf':(.15,.27,.12)}.items()}
 mats['brass']=material('brass',(.55,.35,.12),.32,.65)
 bounds=(51,590,545,888) if beds==3 else (669,648,1033,888)
 cx=(bounds[0]+bounds[2])/2;cy=(bounds[1]+bounds[3])/2;s=.021
 def loc(x,y,z):return ((x-cx)*s,-(y-cy)*s,z)
 def box(name,x,y,w,d,h,z,mat,bevel=.02,room=''):
  bpy.ops.mesh.primitive_cube_add(size=1,location=loc(x,y,z+h/2));o=bpy.context.object;o.name=name;o.dimensions=(w*s,d*s,h);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mats[mat])
  if room:o['roomId']=room
  if bevel:
   mod=o.modifiers.new('Soft edges','BEVEL');mod.width=min(bevel,h/3,w*s/4,d*s/4);mod.segments=2;bpy.ops.object.modifier_apply(modifier=mod.name)
   mod=o.modifiers.new('Normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=mod.name)
  return o
 def rect(name,b,mat='floor',room=''):
  x1,y1,x2,y2=b
  box(name,(x1+x2)/2,(y1+y2)/2,x2-x1,y2-y1,.12,-.12,mat,room=room)
  if mat=='floor':
   for y in range(int(y1)+9,int(y2),10):box('Oak joint',(x1+x2)/2,y,x2-x1,.35,.002,.001,'oak',0,room)
 def wall(x1,y1,x2,y2):
  w=math.hypot(x2-x1,y2-y1);o=box('Cutaway wall',(x1+x2)/2,(y1+y2)/2,w,5,.82,0,'plaster',.012);o.rotation_euler.z=-math.atan2(y2-y1,x2-x1)
  o=box('Wall cap',(x1+x2)/2,(y1+y2)/2,w,5.4,.025,.82,'ivory',.005);o.rotation_euler.z=-math.atan2(y2-y1,x2-x1)
 def cyl(name,x,y,r,h,z,mat,room='',vertices=24):
  bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r*s,depth=h,location=loc(x,y,z+h/2));o=bpy.context.object;o.name=name;o.data.materials.append(mats[mat]);o['roomId']=room
  for p in o.data.polygons:p.use_smooth=True
  return o
 def plant(x,y):
  cyl('Planter',x,y,6,.25,0,'ceramic')
  for i in range(7):
   angle=i*2.399;bpy.ops.mesh.primitive_uv_sphere_add(segments=8,ring_count=4,location=loc(x+math.cos(angle)*5,y+math.sin(angle)*5,.3+i*.045));o=bpy.context.object;o.name='Foliage';o.scale=(.065,.16,.12);o.rotation_euler.z=angle;o.data.materials.append(mats['leaf'])
 def bed(x,y,w=63,room='bedroom'):
  box('Bed frame',x,y,w,91,.24,.08,'oak',room=room)
  box('Mattress',x,y,w-3,88,.20,.32,'ivory',.07,room)
  box('Blanket',x,y+14,w-1,56,.07,.52,'linen',.025,room)
  box('Headboard',x,y-45,w+3,5,.8,0,'linen',room=room)
  for px in ([x-w/4,x+w/4] if w>50 else [x]):box('Pillow',px,y-29,w/2-6 if w>50 else w-5,21,.10,.54,'ceramic',.08,room)
  for px in [x-w/2-9,x+w/2+9]:box('Bedside',px,y-28,13,17,.36,0,'oak',room=room);cyl('Bedside lamp',px,y-28,3,.13,.36,'brass',room)
 def wardrobe(x,y,w,d,room):
  box('Wardrobe',x,y,w,d,.8,0,'oak',room=room)
  count=max(2,int(w/22))
  for i in range(count):box('Wardrobe panel',x-w/2+(i+.5)*w/count,y-d/2,w/count-.6,1,.76,.02,'linen',.005,room)
 def bath(b,room='bathroom'):
  rect('Bathroom tiles',b,'stone',room);x1,y1,x2,y2=b
  box('Shower tray',x1+18,y1+18,30,30,.04,.01,'ceramic',room=room)
  box('Shower partition',x1+35,y1+18,1,33,.75,.02,'stone',room=room)
  box('Vanity',x1+18,y2-13,25,18,.55,0,'oak',room=room)
  cyl('Washbasin',x1+18,y2-13,7,.06,.55,'ceramic',room)
  cyl('Toilet',x2-15,y2-27,8,.35,0,'ceramic',room)
 def sofa(x,y,room='living'):
  box('Sofa base',x,y,29,86,.23,.08,'sage',.06,room)
  box('Sofa back',x-12,y,7,88,.58,.08,'sage',.06,room)
  for yy in [y-29,y,y+29]:box('Seat cushion',x+1,yy,25,27,.13,.31,'sage',.05,room)
  for yy in [y-43,y+43]:box('Arm rest',x,yy,29,6,.48,.08,'sage',.05,room)
  box('Woven rug',x+42,y,73,105,.012,.003,'rug',.008,room)
  cyl('Coffee table',x+40,y,16,.04,.31,'oak',room)
  cyl('Table pedestal',x+40,y,4,.30,.01,'charcoal',room)
 def dining(x,y):
  cyl('Dining top',x,y,19,.06,.70,'oak','living');cyl('Dining pedestal',x,y,5,.70,0,'charcoal','living')
  for i in range(4):
   a=i*math.pi/2;px=x+math.cos(a)*26;py=y+math.sin(a)*26
   cyl('Chair seat',px,py,8,.07,.42,'linen','living');cyl('Chair leg',px,py,2,.42,0,'oak','living')
   o=box('Chair back',px+math.cos(a)*7,py+math.sin(a)*7,14,3,.38,.43,'sage',.02,'living');o.rotation_euler.z=-a+math.pi/2
 def kitchen(x,y,length,side=1):
  box('Kitchen cabinets',x,y,24,length,.78,0,'linen',room='kitchen')
  box('Stone counter',x,y,26,length+1,.04,.78,'ivory',room='kitchen')
  box('Sink',x,y-20,17,22,.015,.825,'charcoal',room='kitchen')
  box('Sink inset',x,y-20,13,18,.017,.831,'stone',room='kitchen')
  box('Cooktop',x,y+24,21,25,.02,.825,'charcoal',room='kitchen')
  for dx in [-6,6]:
   for dy in [-6,6]:cyl('Hob',x+dx,y+24+dy,3,.008,.848,'stone','kitchen',16)
  box('Refrigerator',x,y-length/2-14,24,25,1.25,0,'stone',room='kitchen')
 if beds==3:
  footprint=[(51,695),(121,695),(121,590),(311,590),(311,644),(480,644),(480,756),(545,756),(545,843),(480,843),(480,888),(309,888),(309,844),(51,844)]
  rect('Suite',(51,695,155,844),room='bedroom');rect('Bedroom',(121,590,238,695),room='bedroom');rect('Single bedroom',(211,740,311,844),room='single');rect('Hall',(155,695,311,740));rect('Living',(311,644,480,888),room='living');rect('Balcony',(480,756,545,843),'stone','living')
  bath((238,590,311,695));bath((155,740,211,844))
  for a,b in zip(footprint,footprint[1:]+footprint[:1]):wall(*a,*b)
  for line in [(121,695,196,695),(225,695,238,695),(238,590,238,662),(238,682,238,695),(238,695,282,695),(311,590,311,644),(155,695,155,794),(155,818,155,844),(155,740,183,740),(207,740,211,740),(211,740,211,844),(211,740,274,740),(298,740,311,740),(311,768,311,844),(480,756,480,780),(480,816,480,843)]:wall(*line)
  bed(101,762,62);bed(182,639,66);bed(275,793,38,'single')
  wardrobe(99,831,89,18,'bedroom');wardrobe(133,642,18,78,'bedroom');wardrobe(266,752,65,15,'single')
  sofa(333,797);dining(356,689);kitchen(463,756,101)
  box('TV console',405,797,13,94,.34,0,'oak',room='living');box('TV',403,797,2,58,.55,.38,'charcoal',room='living')
  plant(329,859);plant(405,858);plant(522,826)
 else:
  footprint=[(669,648),(833,648),(833,692),(1033,692),(1033,835),(933,835),(933,888),(669,888)]
  rect('Living',(669,692,833,888),room='living');rect('Balcony',(669,648,833,692),'stone','living');rect('Bedroom',(934,692,1033,835),room='bedroom');rect('Single bedroom',(833,692,934,835),room='single');bath((833,835,900,888));rect('Service',(900,835,933,888),'stone','kitchen')
  for a,b in zip(footprint,footprint[1:]+footprint[:1]):wall(*a,*b)
  for line in [(707,692,790,692),(818,692,833,692),(833,692,833,777),(833,810,833,835),(833,835,868,835),(894,835,933,835),(934,692,934,802),(934,825,934,835),(900,835,900,860)]:wall(*line)
  bed(983,771,62);bed(867,758,40,'single');wardrobe(982,704,86,18,'bedroom');wardrobe(922,747,16,95,'single')
  sofa(795,752);kitchen(683,760,85);dining(789,858)
  box('TV console',732,752,12,70,.34,0,'oak',room='living');box('TV',735,752,2,48,.5,.38,'charcoal',room='living')
  plant(816,875);plant(723,677);plant(1016,818)
 # Glazing frames on the cutaway perimeter: restrained vertical detail.
 for x,y,w in ([(183,592,72),(100,697,62),(278,842,42),(543,798,50)] if beds==3 else [(983,833,64),(867,694,42),(753,650,78)]):
  box('Window sill',x,y,w,7,.06,.83,'stone')
  for dx in [-w/2,0,w/2]:box('Window frame',x+dx,y,1.4,2,.36,.88,'charcoal',.003)
  box('Window rail',x,y,w,2,.025,1.24,'charcoal',.003)
 # Merge meshes by material + room; preserve semantic room IDs for selection.
 groups={}
 for obj in list(bpy.context.scene.objects):
  if obj.type=='MESH':groups.setdefault((obj.data.materials[0].name,obj.get('roomId','')),[]).append(obj)
 for (mat,room),objects in groups.items():
  bpy.ops.object.select_all(action='DESELECT')
  for obj in objects:obj.select_set(True)
  bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();o=bpy.context.object;o.name=f'{room or "architecture"}_{mat}';o['roomId']=room
 bpy.context.scene['source']='DeVille plans.jpg, illustration only. No measured drawing supplied.'
 bpy.ops.wm.save_as_mainfile(filepath=str(source/f'moradas-plan-{beds}bed.blend'))
 bpy.ops.export_scene.gltf(filepath=str(out/f'moradas-plan-{beds}bed.glb'),export_format='GLB',export_apply=True,export_extras=True,export_yup=True,export_animations=False)
 return {'bedrooms':beds,'bytes':(out/f'moradas-plan-{beds}bed.glb').stat().st_size,'meshes':len(list(bpy.context.scene.objects))}
report={'blender':bpy.app.version_string,'basis':'Proportional tracing of the supplied commercial illustration; conceptual, no measured dimensions or unit mapping.','models':[build(2),build(3)]}
(out/'build-report.json').write_text(json.dumps(report,indent=2))
