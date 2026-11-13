"""Executed by the exporter before mesh evaluation. Preserve floor IDs and paths."""
for i in range(6):
 z=3.65+i*3.2
 c=next(c for c in bpy.data.collections if c.name.startswith(f'{i+1:02d} | Nivel visual'))
 for ob in list(c.objects):
  if ob.name.startswith(('Parede lateral direita','Parede lateral esquerda','Parede fundos')):
   bpy.data.objects.remove(ob,do_unlink=True)
 # Real recesses behind the side glazing, instead of full walls behind windows.
 for sign,ys,width in [(1,[-4,1,6],2.3),(-1,[-3,2,7],1.8)]:
  x=sign*5.76;lo=-8.5;hi=9.9
  for bottom,top in [(0,.46),(2.74,3.075)]:
   box('Fachada | peitoril e verga',(x,(lo+hi)/2,z+(bottom+top)/2),(.28,hi-lo,top-bottom),mat('Concreto mineral'),c)
  cuts=sorted([(max(lo,y-width/2-.035),min(hi,y+width/2+.035)) for y in ys]);cursor=lo
  for a,b in cuts+[(hi,hi)]:
   if a>cursor:box('Fachada | entre janelas',(x,(cursor+a)/2,z+1.6),(.28,a-cursor,2.28),mat('Concreto mineral'),c)
   cursor=max(cursor,b)
 for bottom,top in [(0,.46),(2.74,3.075)]:box('Fundos | peitoril e verga',(0,9.78,z+(bottom+top)/2),(11.8,.24,top-bottom),mat('Concreto mineral'),c)
 for x in [-4.7,4.7]:box('Fundos | pilar lateral',(x,9.78,z+1.6),(2.4,.24,2.28),mat('Concreto mineral'),c)
 # Fine horizontal reveals on the side, matching the darker front edge palette.
 for sign in [-1,1]:
  box('Friso lateral | sombra',(sign*5.915,.5,z+.15),(.025,18.5,.035),mat('Esquadrias e serralheria'),c)
 for ob in c.objects:
  if ob.name.startswith('Fachada | nivel') and '| cortina' in ob.name:
   # Gather the front curtain to the left, revealing the room behind the glazing.
   ob.data=ob.data.copy()
   for v in ob.data.vertices:v.co.x=-4.75+(v.co.x+4.75)*(.47 if i%2==0 else .62)
  if ob.name.startswith(('Friso da moldura','Laje | nivel')):
   # Make mesh single-user before replacing its palette.
   ob.data=ob.data.copy();ob.data.materials.clear();ob.data.materials.append(mat('Revestimento grafite'))
 # A small furnished zone is visible through each open balcony glazing.
 if i>0:
  box('Living | sofa por pavimento',(2.1,-4.8,z+.6),(2.4,.9,.7),mat('Linho claro'),c)
  box('Living | mesa baixa',(2.1,-6.1,z+.4),(1.2,.65,.15),mat('Madeira natural | veio procedural'),c)
  box('Living | fundo recuado',(0,-2.7,z+1.6),(11.1,.12,2.9),mat('Paredes internas'),c)
 # Façade screens get narrow physical battens instead of a featureless tan plate.
 for j in range(13):
  box('Brise | ripado de madeira',(-5.0+j*.095,-7.94,z+1.65),(.045,.045,2.6),mat('Madeira natural | veio procedural'),c)

scene['revisao_visual']='Aberturas laterais vazadas, frisos grafite, madeira e pedra com UV metricas e mapas PBR.'
