"""Trace four owner-labeled plans in pixel coordinates; illustrative elevations.
Blender --background --python tools/moradas-typology-floorplans.py
The original PNGs are preserved. This is geometry authoring, not raster editing.
"""
import bpy, math, json, hashlib
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[1]
out=root/'public/assets/developments/moradas-da-serra/floorplans'
source=root/'assets-source/moradas'
layouts=json.loads((Path(__file__).with_name('moradas-plan-layouts.json')).read_text())

def material(name,color,alpha=1):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,alpha);m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,alpha);bs.inputs['Roughness'].default_value=.65
 if alpha<1:bs.inputs['Alpha'].default_value=alpha;m.surface_render_method='DITHERED'
 return m

def build(kind):
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 cfg=layouts[str(kind)];w,h=cfg['size'];s=.0075;cx=w/2;cy=h/2
 colors={'plaster':(.77,.76,.70),'cap':(.91,.90,.84),'oak':(.25,.15,.09),'floor':(.62,.50,.37),'ivory':(.89,.87,.79),'linen':(.58,.52,.41),'sage':(.19,.27,.20),'charcoal':(.035,.045,.04),'stone':(.62,.61,.55),'ceramic':(.91,.91,.86),'rug':(.66,.65,.59),'leaf':(.12,.25,.08),'joint':(.43,.34,.24),'brass':(.53,.36,.15)}
 mats={k:material(k,c) for k,c in colors.items()};mats['glass']=material('glass',(.58,.76,.77),.24)
 def loc(x,y,z):return ((x-cx)*s,-(y-cy)*s,z)
 def box(name,x,y,pw,pd,ph,z,mat,room='',bevel=.018):
  bpy.ops.mesh.primitive_cube_add(size=1,location=loc(x,y,z+ph/2));o=bpy.context.object;o.name=name;o.dimensions=(pw*s,pd*s,ph);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mats[mat]);o['roomId']=room
  if bevel:
   mod=o.modifiers.new('Soft edges','BEVEL');mod.width=min(bevel,ph/3,pw*s/4,pd*s/4);mod.segments=3;bpy.ops.object.modifier_apply(modifier=mod.name)
   mod=o.modifiers.new('Normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=mod.name)
  return o
 def rect(name,b,mat,room='',z=.002,height=.014):
  x1,y1,x2,y2=b;return box(name,(x1+x2)/2,(y1+y2)/2,x2-x1,y2-y1,height,z,mat,room)
 def polygon(name,points,z,mat,room=''):
  mesh=bpy.data.meshes.new(name);mesh.from_pydata([loc(x,y,z) for x,y in points],[],[tuple(reversed(range(len(points))))]);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.data.materials.append(mats[mat]);o['roomId']=room
  tri=o.modifiers.new('Triangulation','TRIANGULATE');bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=tri.name);return o
 def line(name,x1,y1,x2,y2,thickness,height,z,mat,room=''):
  o=box(name,(x1+x2)/2,(y1+y2)/2,math.hypot(x2-x1,y2-y1),thickness,height,z,mat,room,.008);o.rotation_euler.z=-math.atan2(y2-y1,x2-x1);return o
 def cyl(name,x,y,r,height,z,mat,room='',vertices=24):
  bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r*s,depth=height,location=loc(x,y,z+height/2));o=bpy.context.object;o.name=name;o.data.materials.append(mats[mat]);o['roomId']=room
  mod=o.modifiers.new('Rounded edges','BEVEL');mod.width=min(.01,height/4);mod.segments=2;bpy.ops.object.modifier_apply(modifier=mod.name)
  for p in o.data.polygons:p.use_smooth=True
  return o
 def ellipsoid(name,x,y,rx,ry,rz,z,mat,room=''):
  bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,location=loc(x,y,z));o=bpy.context.object;o.name=name;o.scale=(rx*s,ry*s,rz);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mats[mat]);o['roomId']=room
  for p in o.data.polygons:p.use_smooth=True
  return o
 def rotate_objects(before,x,y,angle):
  center=Vector(loc(x,y,0));a=-math.radians(angle)
  for o in set(bpy.context.scene.objects)-before:
   p=o.location-center;o.location=center+Vector((p.x*math.cos(a)-p.y*math.sin(a),p.x*math.sin(a)+p.y*math.cos(a),p.z));o.rotation_euler.z+=a
 def plant(x,y):
  cyl('Ceramic planter',x,y,18,.22,.02,'ivory')
  for i in range(9):
   a=i*2.399;o=ellipsoid('Plant leaf',x+math.cos(a)*16,y+math.sin(a)*16,9,22,.06,.28+(i%3)*.08,'leaf');o.rotation_euler.z=a
 def bed(room,x,y,pw,pd,angle):
  before=set(bpy.context.scene.objects)
  box('Bed frame',x,y,pw,pd,.20,.08,'oak',room,.03);box('Mattress',x,y,pw-8,pd-6,.19,.28,'ivory',room,.065)
  box('Bed throw',x,y+pd*.16,pw-4,pd*.61,.055,.47,'linen',room,.03);box('Headboard',x,y-pd/2,pw+9,9,.79,.01,'linen',room,.035)
  for px in ([x-pw/4,x+pw/4] if pw>150 else [x]):box('Pillow',px,y-pd*.32,pw/2-15 if pw>150 else pw-20,pd*.2,.10,.49,'ceramic',room,.07)
  rotate_objects(before,x,y,angle)
 def wardrobe(room,x1,y1,x2,y2):
  rect('Wardrobe',(x1,y1,x2,y2),'oak',room,0,.76);vertical=(y2-y1)>(x2-x1);length=(y2-y1 if vertical else x2-x1);n=max(2,round(length/70))
  for j in range(n):
   x=x1+2 if vertical else x1+(j+.5)*length/n;y=y1+(j+.5)*length/n if vertical else y2-2
   box('Wardrobe door',x,y,3 if vertical else length/n-2,length/n-2 if vertical else 3,.72,.02,'linen',room,.004)
 def sofa(x,y,pw,pd,angle):
  before=set(bpy.context.scene.objects);room='living';ellipsoid('Organic rug',x+pw*.55,y,pw*1.1,pd*.58,.009,.028,'rug',room)
  box('Sofa plinth',x,y,pw,pd,.22,.08,'sage',room,.08);box('Sofa back',x-pw*.4,y,pw*.23,pd,.52,.20,'sage',room,.07)
  for dy in [-pd*.3,0,pd*.3]:box('Sofa cushion',x+pw*.08,y+dy,pw*.75,pd*.29,.14,.29,'sage',room,.065)
  for dy in [-pd*.46,pd*.46]:ellipsoid('Rounded arm',x,y+dy,pw*.47,pd*.08,.20,.31,'sage',room)
  for dx,dy,r,z in [(25,pd*.58,24,.28),(-15,pd*.55,18,.4)]:cyl('Side table',x+dx,y+dy,r,.035,z,'oak',room);cyl('Table stem',x+dx,y+dy,4,z,.01,'charcoal',room)
  rotate_objects(before,x,y,angle)
 def dining(x,y,r):
  cyl('Dining top',x,y,r,.05,.72,'charcoal','living',48);cyl('Table pedestal',x,y,18,.7,.02,'oak','living')
  for i in range(4):
   a=(i+.5)*math.pi/2;px=x+math.cos(a)*(r+11);py=y+math.sin(a)*(r+11)
   cyl('Chair cushion',px,py,24,.065,.43,'ivory','living');cyl('Chair leg',px,py,4,.42,.01,'oak','living')
   o=box('Chair back',px+math.cos(a)*22,py+math.sin(a)*22,43,7,.33,.44,'oak','living',.03);o.rotation_euler.z=-a+math.pi/2
 def kitchen(b):
  x1,y1,x2,y2=b;x=(x1+x2)/2;rect('Kitchen base',b,'oak','kitchen',.01,.76);rect('Countertop',(x1-2,y1,x2+2,y2),'ivory','kitchen',.77,.035)
  yy=cfg['sinkY'];box('Inset sink',x,yy,(x2-x1)*.7,51,.012,.81,'charcoal','kitchen');box('Sink basin',x,yy,(x2-x1)*.56,43,.016,.827,'stone','kitchen')
  cyl('Tap stem',x+22,yy-21,2,.23,.82,'brass','kitchen',12);line('Tap spout',x+22,yy-21,x+4,yy-21,3,.02,1.04,'brass','kitchen')
  yy=cfg['cookY'];box('Cooktop',x,yy,(x2-x1)*.75,51,.012,.814,'charcoal','kitchen')
  for dx in [-16,16]:
   for dy in [-16,16]:cyl('Cooking ring',x+dx,yy+dy,8,.006,.83,'stone','kitchen',16)
 def bath(room,shower,vanity,toilet,rotation):
  rect('Shower tray',shower,'stone',room,.02,.02);x1,y1,x2,y2=shower
  if rotation in (0,180):line('Shower screen',x1,y2,x2,y2,2,.77,.04,'glass',room)
  else:line('Shower screen',x1,y1,x1,y2,2,.77,.04,'glass',room)
  rect('Vanity',vanity,'oak',room,.01,.60);rect('Vanity top',vanity,'ivory',room,.61,.035)
  vx=(vanity[0]+vanity[2])/2;vy=(vanity[1]+vanity[3])/2;ellipsoid('Basin',vx,vy,(vanity[2]-vanity[0])*.35,(vanity[3]-vanity[1])*.33,.035,.66,'ceramic',room)
  tx,ty=toilet;ellipsoid('Toilet bowl',tx,ty,23,29,.17,.19,'ceramic',room);ellipsoid('Toilet lid',tx,ty,23,29,.025,.37,'ivory',room)
 def joints(points,room,mat):
  spacing=50 if mat=='stone' else 24
  for y in range(int(min(y for x,y in points))+spacing,int(max(y for x,y in points)),spacing):
   xs=[]
   for (ax,ay),(bx,by) in zip(points,points[1:]+points[:1]):
    if (ay<=y<by) or (by<=y<ay):xs.append(ax+(y-ay)*(bx-ax)/(by-ay))
   xs.sort()
   for x1,x2 in zip(xs[::2],xs[1::2]):line('Floor joint',x1,y,x2,y,.55,.001,.007,'joint' if mat=='floor' else 'stone',room)
 base=polygon('Footprint',cfg['outline'],-.12,'cap');solid=base.modifiers.new('Slab','SOLIDIFY');solid.thickness=.12;bpy.context.view_layer.objects.active=base;bpy.ops.object.modifier_apply(modifier=solid.name)
 polygon('Circulation',cfg['outline'],0,'floor')
 for room,points in cfg['rooms'].items():
  mat='stone' if room in ['bathroom','suite-bath','balcony','laundry'] else 'floor';polygon(room,points,.004,mat,room);joints(points,room,mat)
 for x1,y1,x2,y2 in cfg['walls']:line('Cutaway wall',x1,y1,x2,y2,13,.85,0,'plaster');line('Wall cap',x1,y1,x2,y2,14,.025,.85,'cap')
 for x1,y1,x2,y2 in cfg['windows']:
  line('Window sill',x1,y1,x2,y2,10,.045,.08,'ivory');line('Window glass',x1,y1,x2,y2,1,.66,.13,'glass');line('Window rail',x1,y1,x2,y2,2,.025,.79,'charcoal')
  for t in [0,.5,1]:box('Window mullion',x1+(x2-x1)*t,y1+(y2-y1)*t,2,2,.68,.12,'charcoal',bevel=0)
 for args in cfg['beds']:bed(*args)
 for args in cfg['wardrobes']:wardrobe(*args)
 sofa(*cfg['sofa']);dining(*cfg['dining']);kitchen(cfg['kitchen']);rect('Refrigerator',cfg['fridge'],'stone','kitchen',.01,1.15)
 x1,y1,x2,y2=cfg['island'];rect('Island',cfg['island'],'oak','kitchen',0,.72);box('Island top',(x1+x2)/2,(y1+y2)/2,x2-x1+5,y2-y1,.055,.73,'ivory','kitchen',.11)
 tvx=x1 if cfg['tvSide']=='left' else x2;line('Television',tvx,cfg['tvSpan'][0],tvx,cfg['tvSpan'][1],3,.49,.80,'charcoal','living')
 for yy in [y2-90,y2-165]:
  stoolx=x2+30 if cfg['tvSide']=='left' else x1-30;cyl('Island stool',stoolx,yy,19,.055,.51,'linen','kitchen');cyl('Stool stem',stoolx,yy,4,.50,0,'oak','kitchen')
 for args in cfg['baths']:bath(*args)
 lx1,ly1,lx2,ly2=cfg['laundry'];rect('Laundry counter',cfg['laundry'],'ivory','laundry',.01,.70);box('Service sink',(lx1+lx2)/2,(ly1+ly2)/2,(lx2-lx1)*.62,(ly2-ly1)*.56,.015,.72,'stone','laundry')
 for room,x1,y1,x2,y2 in cfg['desks']:rect('Desk',(x1,y1,x2,y2),'oak',room,.01,.62)
 for x,y in cfg['plants']:plant(x,y)
 bx,by=cfg['balconyChair'];cyl('Lounge seat',bx,by,36,.13,.22,'linen','balcony');cyl('Lounge base',bx,by,27,.22,0,'charcoal','balcony')
 groups={}
 for obj in list(bpy.context.scene.objects):
  if obj.type=='MESH':groups.setdefault((obj.data.materials[0].name,obj.get('roomId','')),[]).append(obj)
 for (mat,room),objects in groups.items():
  bpy.ops.object.select_all(action='DESELECT')
  for obj in objects:obj.select_set(True)
  bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();o=bpy.context.object;o.name=f'{room or "architecture"}_{mat}';o['roomId']=room;o['planType']=kind
 bpy.context.scene['source']=f'Owner supplied Type {kind}, 06/11/2026. Pixel-traced layout; illustrative heights.';bpy.context.scene['planType']=kind
 bpy.ops.wm.save_as_mainfile(filepath=str(source/f'moradas-type-{kind}.blend'))
 path=out/f'moradas-type-{kind}.glb';bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',export_apply=True,export_extras=True,export_yup=True,export_animations=False)
 return {'type':kind,'bedrooms':cfg['bedrooms'],'bathrooms':cfg['bathrooms'],'bytes':path.stat().st_size,'meshes':len(list(bpy.context.scene.objects)),'sourceImage':f'moradas-type-{kind}.png','sourceSha256':hashlib.sha256((out/f'moradas-type-{kind}.png').read_bytes()).hexdigest(),'footprintPixels':cfg['outline'],'rooms':list(cfg['rooms'])}
report={'blender':bpy.app.version_string,'basis':'Four independently traced owner-labeled plans. Image proportions; illustrative furniture and elevations, not a measured project.','models':[build(k) for k in [1,2,3,4]]}
(out/'types-build-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
