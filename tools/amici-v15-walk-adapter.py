"""Keep the approved V15 frontage and connect it to the existing walkable interior.
Only modifies the in-memory web derivative, never the source .blend.
"""
import bpy, runpy
from pathlib import Path
from mathutils import Vector

def adapt(scene):
    runpy.run_path(str(Path(__file__).with_name('amici-walkable-hall.py')))['add_walkable_hall'](scene)
    # Keep the approved doors, sidelights, stone panels and furniture at the entrance.
    for ob in list(scene.objects):
        if ob.name.startswith(('Hall porta ', 'Hall ombreira', 'Hall fechamento frontal', 'Hall verga entrada', 'Hall V15 | parede de fundo')):
            bpy.data.objects.remove(ob,do_unlink=True)
    # Tag all parts of the approved dark doors for the existing automatic sliding action.
    for ob in scene.objects:
        if ob.name.startswith('Porta V15 |'):
            center=sum((ob.matrix_world@Vector(v) for v in ob.bound_box),Vector())/8
            ob['walkDoor']=-1 if center.x<0 else 1
    assert sum(ob.name.startswith('Porta V15 | folha') for ob in scene.objects)==2
    assert not any(ob.name.startswith('Hall V15 | parede de fundo') for ob in scene.objects)
