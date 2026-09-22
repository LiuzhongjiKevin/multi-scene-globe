import bpy
from pathlib import Path
from mathutils import Vector
P=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(P/'yugure-form.blend'))
s=bpy.data.scenes.new('Refined bicycle reference');bpy.context.window.scene=s;s.render.engine='CYCLES';s.cycles.samples=16;s.cycles.use_denoising=True;s.render.threads_mode='FIXED';s.render.threads=6
s.world=bpy.data.worlds.new('Neutral reference');s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[1].default_value=.7
o=bpy.data.objects.new('Refined bicycle',None);o.instance_type='COLLECTION';o.instance_collection=bpy.data.collections['City bicycle • 1.75 metres'];s.collection.objects.link(o)
bpy.ops.mesh.primitive_plane_add(size=200);bpy.context.object.location.z=-.01
d=bpy.data.lights.new('Softbox','AREA');d.energy=300;d.size=4;o=bpy.data.objects.new('Softbox',d);s.collection.objects.link(o);o.location=(1,-3,4)
d=bpy.data.cameras.new('Reference camera');o=bpy.data.objects.new('Reference camera',d);s.collection.objects.link(o);o.location=(2.8,-4,2);o.rotation_euler=(Vector((0,0,.55))-o.location).to_track_quat('-Z','Y').to_euler();d.type='ORTHO';d.ortho_scale=2.5;s.camera=o
s.render.resolution_x=1200;s.render.resolution_y=900;s.render.resolution_percentage=100;s.render.filepath=str(P/'form-renders'/'bicycle-reference.png');bpy.ops.render.render(write_still=True)
