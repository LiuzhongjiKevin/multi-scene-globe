import bpy, json
from pathlib import Path
from mathutils import Vector
P=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(P/'yugure-review.blend'))
s=bpy.data.scenes['Street_scale_review'];bpy.context.window.scene=s
def cam(pos,target,scale):
 c=s.camera;c.data.type='ORTHO';c.data.ortho_scale=scale;c.location=pos;c.rotation_euler=(Vector(target)-c.location).to_track_quat('-Z','Y').to_euler()
def render(name,w=1000,h=1000):
 s.render.resolution_x=w;s.render.resolution_y=h;s.cycles.samples=12;s.render.filepath=str(P/'renders'/name);bpy.ops.render.render(write_still=True)
cam((0,0,45),(0,0,0),29);s.view_layers[0].material_override=bpy.data.materials['Paved courtyard'];render('roof-plan.png')
hidden=[]
for o in bpy.data.objects:
 if o.type=='MESH' and o.location.z>2.8 or o.name.startswith(('Gabled roof','Roof tile seam','Rain gutter')):
  if not o.hide_render:o.hide_render=True;hidden.append(o)
render('lower-floor-plan.png')
for o in hidden:o.hide_render=False
s.view_layers[0].material_override=None
s=bpy.data.scenes.new('Bicycle reference');bpy.context.window.scene=s;s.render.engine='CYCLES';s.cycles.samples=16;s.cycles.use_denoising=True;s.world=bpy.data.worlds.new('Reference world');s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[1].default_value=.7
o=bpy.data.objects.new('Native bicycle',None);o.instance_type='COLLECTION';o.instance_collection=bpy.data.collections['City bicycle • 1.75 metres'];s.collection.objects.link(o)
bpy.ops.mesh.primitive_plane_add(size=200);bpy.context.object.location.z=-.01
d=bpy.data.lights.new('Softbox','AREA');d.energy=300;d.size=4;o=bpy.data.objects.new('Softbox',d);s.collection.objects.link(o);o.location=(1,-3,4)
d=bpy.data.cameras.new('Reference camera');o=bpy.data.objects.new('Reference camera',d);s.collection.objects.link(o);s.camera=o;cam((2.8,-4,2),(0,0,.55),2.5);render('bicycle-reference.png',1200,900)
print('EXTRA_REVIEW_COMPLETE',flush=True)
