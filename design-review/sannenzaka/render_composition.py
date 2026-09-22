import bpy,json,math,os
from pathlib import Path
from mathutils import Matrix,Vector
P=Path(__file__).resolve().parent
d=json.loads((P/'composition.json').read_text());bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
C=Matrix(((1,0,0,0),(0,0,-1,0),(0,1,0,0),(0,0,0,1)));mats={};meshes={}
for id,v in d['materials'].items():
 m=bpy.data.materials.new(v['name']or id);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*v['color'],1);n.inputs['Roughness'].default_value=.78
 if v.get('opacity',1)<1:n.inputs['Alpha'].default_value=v['opacity'];m.surface_render_method='DITHERED'
 if v.get('emissive'):n.inputs['Emission Color'].default_value=(*v['emissive'],1);n.inputs['Emission Strength'].default_value=v.get('emissiveIntensity',0)
 mats[id]=m
for i,o in enumerate(d['objects']):
 key=o['geometry']+o['material']
 if key not in meshes:
  g=d['geometries'][o['geometry']];ps=g['positions'];verts=[(ps[j],-ps[j+2],ps[j+1]) for j in range(0,len(ps),3)];ids=g['indices'] if g['indices']is not None else list(range(len(verts)));faces=[ids[j:j+3] for j in range(0,len(ids),3)];me=bpy.data.meshes.new(key);me.from_pydata(verts,[],faces);me.materials.append(mats[o['material']]);me.update()
  if g.get('colors'):
   ca=me.color_attributes.new(name='TerrainColors',type='FLOAT_COLOR',domain='POINT');co=g['colors']
   for j in range(len(verts)):ca.data[j].color=(*co[j*3:j*3+3],1)
   m=mats[o['material']];vc=m.node_tree.nodes.new('ShaderNodeVertexColor');vc.layer_name='TerrainColors';m.node_tree.links.new(vc.outputs['Color'],m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
  meshes[key]=me
 ob=bpy.data.objects.new('Runtime_'+str(i),meshes[key]);bpy.context.collection.objects.link(ob);a=o['matrix'];ob.matrix_world=C@Matrix([[a[col*4+row] for col in range(4)] for row in range(4)])@C.inverted()
print('Scene imported',len(d['objects']),flush=True)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True;scene.render.resolution_x=1280;scene.render.resolution_y=800;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.world.color=(.32,.32,.32)
scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.5,.44,.37,1);scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=1.3
bpy.ops.object.light_add(type='SUN',location=(-100,-30,130));sun=bpy.context.object;sun.rotation_euler=(math.radians(28),math.radians(-35),math.radians(-40));sun.data.energy=2.5;sun.data.angle=math.radians(8);sun.data.color=(1,.79,.56)
bpy.ops.object.light_add(type='AREA',location=(70,40,100));bpy.context.object.data.energy=1300;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=80
bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.data.lens=30.91;cam.data.clip_end=1200
views=json.loads((P/'camera-views.json').read_text())
scene.view_settings.view_transform='AgX'
for name,(p,t) in views.items():
 cam.location=(p[0],-p[2],p[1]);target=Vector((t[0],-t[2],t[1]));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(P/(name+'.png'));bpy.ops.render.render(write_still=True);print('RENDERED',name,flush=True)
bpy.ops.wm.save_as_mainfile(filepath=str(P/'district-composition.blend'))
