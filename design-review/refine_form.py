"""Complete native Form-stage modelling. Export remains a separate gated operation."""
import bpy,math,json,random
from pathlib import Path
from mathutils import Vector,Matrix
P=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(P/'yugure-review.blend'))
S=bpy.data.scenes['Street_scale_review'];bpy.context.window.scene=S
house=bpy.data.collections['House • 6.6 x 6.2 metres'];bike=bpy.data.collections['City bicycle • 1.75 metres'];resident=bpy.data.collections['Resident • 1.74 metres']
steel=bpy.data.materials['Dark steel'];rubber=bpy.data.materials['Rubber'];wood=bpy.data.materials['Cedar'];red=bpy.data.materials['Vermilion']
def link(o,col):
 for c in list(o.users_collection):c.objects.unlink(o)
 col.objects.link(o);return o
def rod(n,a,b,r,ma,col):
 a,b=Vector(a),Vector(b);v=b-a;bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=r,depth=v.length,location=(a+b)/2);o=link(bpy.context.object,col);o.name=n;o.rotation_mode='QUATERNION';o.rotation_quaternion=v.to_track_quat('Z','Y');o.data.materials.append(ma);return o
def box(n,p,d,ma,col):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=link(bpy.context.object,col);o.name=n;o.dimensions=d;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(ma);q=o.modifiers.new('Edge bevel','BEVEL');q.width=.008;q.segments=2;return o
for c in [bike,resident,house]:S.collection.children.link(c)
for y in [-.16,.16]:
 rod('Basket upper rim',(.44,y,1.03),(.73,y,1.03),.01,steel,bike)
 for z in [.90,.96]:rod('Basket horizontal weave',(.44,y,z),(.73,y,z),.005,steel,bike)
for x in [.44,.73]:
 rod('Basket end rim',(x,-.16,1.03),(x,.16,1.03),.01,steel,bike)
 for y in [-.1,-.03,.04,.11]:rod('Basket end weave',(x,y,.85),(x,y,1.03),.005,steel,bike)
for y in [-.17,.17]:
 rod('Bicycle crank',(.08,y,.32),(.19,y,.22 if y<0 else .42),.015,steel,bike)
 box('Bicycle pedal',(.19,y*1.4,.22 if y<0 else .42),(.11,.16,.025),rubber,bike)
for z in [.29,.38]:rod('Chain',(-.53,.06,.34),(.08,.06,z),.008,steel,bike)
for x in [-.53,.53]:
 rod('Mudguard stay',(x,0,.34),(x-.22,0,.56),.009,steel,bike)
for y in [-.22,.22]:rod('Handlebar rubber grip',(.38,y-.04,1.03),(.38,y+.04,1.03),.025,rubber,bike)
# Visible thickness on the gable surface, including the editable street copies.
for o in bpy.data.objects:
 if o.type=='MESH' and o.name.startswith('Gabled roof'):
  m=o.modifiers.new('Roof construction thickness','SOLIDIFY');m.thickness=.09;m.offset=1
# Gentle material grain is native and independent of external textures.
for name,scale,strength in [('Asphalt',95,.16),('Warm plaster',55,.1),('Slate plaster',55,.1),('Paved courtyard',30,.15)]:
 m=bpy.data.materials[name];nodes=m.node_tree.nodes;noise=nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=scale;noise.inputs['Detail'].default_value=2;bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=strength;bump.inputs['Distance'].default_value=.025;m.node_tree.links.new(noise.outputs['Fac'],bump.inputs['Height']);m.node_tree.links.new(bump.outputs['Normal'],nodes.get('Principled BSDF').inputs['Normal'])
# Four articulation pivots preserve physical foot/shoulder positions.
rig=[]
for kind,x,z,prefix in [('Leg',-.115,.87,('Trouser leg','Shoe')),('Leg',.115,.87,('Trouser leg','Shoe')),('Arm',-.27,1.34,('Sleeve','Hand')),('Arm',.27,1.34,('Sleeve','Hand'))]:
 root=bpy.data.objects.new(f'{kind}_{"L" if x<0 else "R"}',None);resident.objects.link(root);root.location=(x,0,z);bpy.context.view_layer.update()
 for o in list(resident.objects):
  if o.type=='MESH' and o.parent is None and o.name.startswith(prefix) and (o.location.x<0)==(x<0):
   world=o.matrix_world.copy();o.parent=root;o.matrix_world=world
 sign=(1 if x<0 else -1)*(-1 if kind=='Arm' else 1)
 for f in range(1,182,6):
  angle=math.sin((f-1)*math.tau/30)*.36*sign;root.rotation_euler.x=angle;root.keyframe_insert('rotation_euler',frame=f)
  if kind=='Leg':root.location.z=.87-.85*(1-math.cos(angle));root.keyframe_insert('location',frame=f)
 rig.append(root)
# Reuse the same shell with a restrained palette, without distorting door/person scale.
variants=[]
for idx,tint in enumerate([(.47,.55,.53),(.66,.43,.32),(.61,.60,.53)]):
 c=bpy.data.collections.new('House palette '+str(idx));mapping={}
 for o in house.objects:
  q=o.copy();c.objects.link(q);mapping[o]=q
  if o.type=='MESH' and any(m and 'plaster' in m.name for m in o.data.materials):
   q.data=o.data.copy()
   for i,ma in enumerate(q.data.materials):
    if ma and 'plaster' in ma.name:
     new=ma.copy();new.name='Facade palette '+str(idx);new.diffuse_color=(*tint,1);new.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(*tint,1);q.data.materials[i]=new
 for o,q in mapping.items():
  if o.parent in mapping:q.parent=mapping[o.parent]
 variants.append(c)
globe=bpy.data.scenes['Spherical_layout_review'];homes=[o for o in globe.objects if o.instance_type=='COLLECTION' and o.instance_collection==house]
for i,o in enumerate(homes):
 if i%4:o.instance_collection=variants[(i%4)-1]
for o in S.objects:
 if o.instance_type=='COLLECTION' and o.instance_collection==house:o.instance_collection=variants[0]
for c in [bike,resident,house]:S.collection.children.unlink(c)
S.frame_set(36);S.render.threads_mode='FIXED';S.render.threads=6
for s in [S,globe]:s.cycles.samples=24;s.view_settings.exposure=.4
(P/'form-renders').mkdir(exist_ok=True)
def camera(n,p,target,lens=42):
 d=bpy.data.cameras.new(n);o=bpy.data.objects.new(n,d);S.collection.objects.link(o);o.location=p;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();d.lens=lens;S.camera=o
def render(name,w=1280,h=900):
 S.render.resolution_x=w;S.render.resolution_y=h;S.render.filepath=str(P/'form-renders'/name);bpy.ops.render.render(write_still=True)
camera('Refined street camera',(16,-22,11),(-.8,-.4,2.2),44)
bpy.ops.wm.save_as_mainfile(filepath=str(P/'yugure-form.blend'),compress=True)
render('street-detail.png',1400,1000)
street=S;S=globe;bpy.context.window.scene=S;render('globe.png',1280,1100)
S=street;bpy.context.window.scene=S;S.frame_set(16);camera('Third person review',(1.6,-8.4,2.35),(1.6,-2.8,1.6),28);render('third-person.png')
# Four wide corners, plus the interior ceiling and opposing obliques.
S.cycles.samples=8
for i,(p,t) in enumerate([((-10,-12,6),(0,0,2)),((12,-12,6),(0,0,2)),((12,10,6),(0,0,2)),((-10,10,6),(0,0,2))]):
 camera('Corner '+str(i),p,t,10.4);render('corner-'+str(i)+'.png',720,540)
for i,(p,t) in enumerate([((0,-.5,1.3),(0,-.5,3)),((-2,-1,1.3),(1,1,3)),((2,1,1.3),(-1,-1,3))]):
 camera('Interior ceiling '+str(i),p,t,16);render('ceiling-'+str(i)+'.png',720,540)
camera('Actual roof plan',(0,0,45),(0,0,0));S.camera.data.type='ORTHO';S.camera.data.ortho_scale=29;S.view_layers[0].material_override=bpy.data.materials['Paved courtyard'];render('roof-plan.png',1000,1000)
hidden=[]
for o in bpy.data.objects:
 if o.type=='MESH' and (o.location.z>2.8 or o.name.startswith(('Gabled roof','Roof tile seam','Rain gutter'))):
  if not o.hide_render:o.hide_render=True;hidden.append(o)
render('floor-plan.png',1000,1000)
for o in hidden:o.hide_render=False
camera('Actual front elevation',(0,-35,4),(0,0,4));S.camera.data.type='ORTHO';S.camera.data.ortho_scale=20;render('front-elevation.png',1000,700)
S.view_layers[0].material_override=None
camera('Refined street camera',(16,-22,11),(-.8,-.4,2.2),44);S.frame_set(36)
bpy.ops.wm.save_as_mainfile(filepath=str(P/'yugure-form.blend'),compress=True)
print('FORM_MODEL_AND_RENDERS_COMPLETE',flush=True)
