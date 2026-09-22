"""Native Blender Function-review draft. No GLB export or deployment approval implied."""
import bpy, math, json, random, os
from pathlib import Path
from mathutils import Vector, Matrix
from collections import Counter
OUT=Path(__file__).resolve().parent
(OUT/'renders').mkdir(exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
random.seed(42)
S=bpy.context.scene
S.name='Spherical_layout_review'
S.unit_settings.system='METRIC'
def mat(name,color,metal=0,rough=.55,emit=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
 if emit:p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=emit
 return m
cream=mat('Warm plaster',(.67,.58,.44));bluewall=mat('Slate plaster',(.3,.42,.47));wood=mat('Cedar',(.25,.115,.057));roof=mat('Blue ceramic',(.055,.105,.14),.15);stone=mat('Paved courtyard',(.34,.35,.33));road=mat('Asphalt',(.055,.065,.083));white=mat('Road paint',(.84,.83,.72));metal=mat('Dark steel',(.065,.08,.085),.65);red=mat('Vermilion',(.55,.035,.025));green=mat('Foliage',(.11,.24,.15));rubber=mat('Rubber',(.018,.023,.028));skin=mat('Skin',(.65,.39,.25));hair=mat('Hair',(.055,.035,.028));coat=mat('Jacket',(.22,.37,.41));pants=mat('Trousers',(.065,.09,.12));light=mat('Warm room light',(1,.56,.2),emit=3);go=mat('Signal green',(.1,.75,.4),emit=3)
glass=mat('Clear glazing',(.8,.92,1),rough=.08)
glass.node_tree.nodes.get('Principled BSDF').inputs['Transmission Weight'].default_value=1
TARGET=None
def put(o,name,ma=None):
 o.name=name
 if ma:o.data.materials.append(ma)
 if TARGET:
  for c in list(o.users_collection):c.objects.unlink(o)
  TARGET.objects.link(o)
 return o
def box(n,p,d,ma,b=.018):
 x,y,z=[v/2 for v in d]
 o=mesh(n,[(-x,-y,-z),(x,-y,-z),(x,y,-z),(-x,y,-z),(-x,-y,z),(x,-y,z),(x,y,z),(-x,y,z)],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],ma);o.location=p
 if b:q=o.modifiers.new('Soft manufactured edges','BEVEL');q.width=b;q.segments=2
 return o
def rod(n,a,b,r,ma,r2=None):
 a,b=Vector(a),Vector(b);v=b-a
 bpy.ops.mesh.primitive_cone_add(vertices=12,radius1=r,radius2=r if r2 is None else r2,depth=v.length,location=(a+b)/2)
 o=put(bpy.context.object,n,ma);o.rotation_quaternion=v.to_track_quat('Z','Y');o.rotation_mode='QUATERNION';o.rotation_quaternion=v.to_track_quat('Z','Y');return o
def ball(n,p,d,ma):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,radius=1,location=p);o=put(bpy.context.object,n,ma);o.scale=d
 for f in o.data.polygons:f.use_smooth=True
 return o
def mesh(n,verts,faces,ma):
 me=bpy.data.meshes.new(n);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(n,me);(TARGET or S.collection).objects.link(o);o.data.materials.append(ma);return o
def label(n,txt,p,size,ma):
 cu=bpy.data.curves.new(n,'FONT');cu.body=txt;cu.size=size;cu.align_x='CENTER';cu.extrude=.002;o=bpy.data.objects.new(n,cu);(TARGET or S.collection).objects.link(o);o.location=p;o.rotation_euler=(math.pi/2,0,0);cu.materials.append(ma);return o
assets=[]
def asset(n):
 global TARGET
 TARGET=bpy.data.collections.new(n);S.collection.children.link(TARGET);assets.append(TARGET);return TARGET
openings=[]
def cut(w,n,p,d):
 cutter=box(n+' cutter',p,d,stone,0);bpy.context.view_layer.objects.active=w
 mod=w.modifiers.new(n,'BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cutter;bpy.ops.object.modifier_apply(modifier=mod.name)
 bpy.data.objects.remove(cutter,do_unlink=True);openings.append(dict(name=n,wall=w.name,center=p,size=d,exactBooleanApplied=True))
house=asset('House • 6.6 x 6.2 metres')
print('Building native assets',flush=True)
box('Foundation',(0,0,.15),(6.8,6.4,.3),stone)
box('Ground floor',(0,0,.31),(6.3,5.9,.08),wood)
front=box('Front wall',(0,-3.1,3.08),(6.6,.18,5.5),cream,0)
rear=box('Rear wall',(0,3.1,3.08),(6.6,.18,5.5),cream,0)
left=box('West wall',(-3.21,0,3.08),(.18,6.2,5.5),bluewall,0)
right=box('East wall',(3.21,0,3.08),(.18,6.2,5.5),bluewall,0)
cut(front,'Entry • 0.98 x 2.12 m',(1.6,-3.1,1.4),(.98,.5,2.12))
for wall,y in [(front,-3.1),(rear,3.1)]:
 for x,z in [(-1.45,1.8),(-1.45,4.45),(1.45,4.45)]:
  cut(wall,'Window',(x,y,z),(1.5,.5,1.3))
  box('Transparent glass',(x,y,z),(1.46,.018,1.26),glass,0)
  for dx in [-.78,0,.78]:box('Window mullion',(x+dx,y-.09,z),(.045,.1,1.4),metal)
  for dz in [-.68,.68]:box('Window frame',(x,y-.09,z+dz),(1.6,.13,.05),metal)
  box('Curtain gathered left',(x-.6,y+(.15 if y<0 else -.15),z),(.2,.04,1.2),white)
for wall,x in [(left,-3.21),(right,3.21)]:
 for z in [1.8,4.45]:
  cut(wall,'Side window',(x,.2,z),(.5,1.45,1.25));box('Side glass',(x,.2,z),(.018,1.42,1.22),glass,0)
  for dy in [-.75,0,.75]:box('Side frame',(x,.2+dy,z),(.1,.045,1.35),metal)
box('Upper floor',(0,0,3.15),(6.3,6,.16),wood)
g=mesh('Gabled roof',[(-3.6,-3.5,5.9),(3.6,-3.5,5.9),(0,-3.5,7.6),(-3.6,3.5,5.9),(3.6,3.5,5.9),(0,3.5,7.6)],[(0,2,1),(3,4,5),(0,3,5,2),(2,5,4,1)],roof)
for y in [i*.28-3.36 for i in range(25)]:
 rod('Roof tile seam',(-3.63,y,5.92),(0,y,7.63),.022,metal);rod('Roof tile seam',(0,y,7.63),(3.63,y,5.92),.022,metal)
for x in [-3.45,3.45]:rod('Rain gutter',(x,-3.5,5.86),(x,3.5,5.86),.065,metal);rod('Downpipe',(x,2.8,.2),(x,2.8,5.86),.05,metal)
pivot=bpy.data.objects.new('DoorPivot',None);TARGET.objects.link(pivot);pivot.location=(1.11,-3.19,.34)
leaf=box('DoorLeaf',(0,0,0),(.92,.07,2.08),wood);leaf.parent=pivot;leaf.location=(.46,0,1.04)
h=box('Door handle',(0,0,0),(.025,.08,.24),metal);h.parent=pivot;h.location=(.8,-.07,1.0)
box('Porch',(1.6,-3.5,.17),(1.5,.85,.34),stone)
box('Porch canopy',(1.6,-3.58,2.65),(1.75,1.1,.1),metal)
box('Porch lamp',(2.34,-3.23,2.2),(.18,.15,.27),light)
box('Door bell',(2.27,-3.22,1.45),(.07,.045,.12),metal)
box('Sofa',(-1.2,.7,.65),(2,.7,.62),coat);box('Sofa back',(-1.2,1,.98),(2,.16,.6),coat)
box('Table',(-1.2,-.7,.7),(1.3,.7,.1),wood)
for x in [-1.7,-.7]:rod('Table leg',(x,-.7,.35),(x,-.7,.65),.045,wood)
box('Bed',(-1,1,3.58),(1.65,2.1,.6),white);box('Room lamp',(0,0,3.04),(.8,.35,.06),light)
for x in [-1.65,-.35]:
 for y in [.15,1.85]:box('Bed foot',(x,y,3.255),(.1,.1,.05),wood)
for z in [2.6,5.4]:
 d=bpy.data.lights.new('Interior warm fill','POINT');d.energy=65;d.color=(1,.63,.32);d.shadow_soft_size=.6;o=bpy.data.objects.new('Interior warm fill',d);TARGET.objects.link(o);o.location=(0,-1,z)
box('Balcony slab',(-1.45,-3.6,3.62),(2.3,1,.13),stone)
rod('Balcony rail',(-2.55,-4.05,4.55),(-.35,-4.05,4.55),.035,metal)
for x in [-2.55+i*.22 for i in range(11)]:rod('Balcony spindle',(x,-4.05,3.69),(x,-4.05,4.55),.018,metal)
box('AC condenser',(3.65,1.1,.62),(.6,.9,.62),white)
for i in range(8):box('Condenser grille',(3.96,1.1,.38+i*.065),(.015,.7,.018),metal,0)
for y in [.85,1.35]:
 box('Condenser wall bracket',(3.58,y,.295),(.72,.045,.035),metal)
 box('Condenser wall plate',(3.315,y,.40),(.03,.1,.23),metal)
bike=asset('City bicycle • 1.75 metres')
for x in [-.53,.53]:
 bpy.ops.mesh.primitive_torus_add(major_radius=.3,minor_radius=.026,major_segments=24,minor_segments=6,location=(x,0,.34),rotation=(math.pi/2,0,0));put(bpy.context.object,'Bicycle tyre',rubber)
 for j in range(12):
  a=j*math.tau/12;rod('Spoke',(x,0,.34),(x+.28*math.cos(a),0,.34+.28*math.sin(a)),.004,metal)
for a,b in [((-.53,0,.34),(-.15,0,.74)),((-.15,0,.74),(.08,0,.32)),((.08,0,.32),(-.53,0,.34)),((-.15,0,.74),(.4,0,.81)),((.4,0,.81),(.08,0,.32)),((.4,0,.81),(.53,0,.34)),((.4,0,.81),(.38,0,1.03)),((-.15,0,.74),(-.15,0,.85))]:rod('Bicycle tube',a,b,.021,red)
box('Saddle',(-.17,0,.88),(.25,.18,.065),rubber);rod('Handlebar',(.38,-.25,1.03),(.38,.25,1.03),.018,metal)
box('Basket base',(.58,0,.85),(.3,.33,.02),metal)
for y in [-.16,.16]:
 for x in [.44,.51,.58,.65,.72]:rod('Basket wire',(x,y,.85),(x,y,1.03),.007,metal)
rod('Kickstand',(.03,0,.4),(-.12,-.25,.035),.018,metal)
person=asset('Resident • 1.74 metres')
for x in [-.115,.115]:
 box('Shoe',(x,-.07,.075),(.18,.31,.14),rubber,.045)
 rod('Trouser leg',(x,0,.15),(x,0,.87),.075,pants,.095)
box('Jacket',(0,0,1.12),(.46,.28,.61),coat,.07)
for side in [-1,1]:
 rod('Sleeve',(side*.27,0,1.34),(side*.32,-.025,.94),.075,coat,.06)
 ball('Hand',(side*.32,-.025,.89),(.057,.06,.095),skin)
rod('Neck',(0,0,1.4),(0,0,1.48),.07,skin)
ball('Head',(0,-.015,1.59),(.118,.105,.15),skin);ball('Hair',(0,.01,1.68),(.121,.105,.075),hair)
for x in [-.041,.041]:ball('Eye',(x,-.115,1.61),(.01,.009,.012),hair)
ball('Nose',(0,-.126,1.575),(.02,.022,.027),skin)
box('Shoulder bag',(.29,.09,1.06),(.15,.25,.3),wood,.025)
tree=asset('Tree in paved planter')
box('Planter',(0,0,.22),(1.45,1.45,.44),stone);box('Soil',(0,0,.445),(1.25,1.25,.015),wood)
rod('Trunk',(0,0,.45),(0,0,2.2),.12,wood,.07)
for p in [(-.45,0,2.2),(.38,.2,2.4),(0,-.35,2.75),(0,.25,2.9)]:ball('Canopy',p,(.65,.65,.65),green)
fixture=asset('Traffic signal and road sign')
rod('Signal pole',(0,0,0),(0,0,3.2),.055,metal);rod('Signal arm',(0,0,3.12),(1,0,3.12),.05,metal)
box('Signal housing',(.7,0,3.08),(.85,.22,.3),metal,.06)
for x,ma in [(.42,go),(.7,wood),(.98,red)]:ball('Signal lens',(x,-.13,3.08),(.09,.018,.09),ma)
box('Street sign',(0,-.07,2.55),(1.1,.055,.25),bluewall);label('Street name','SAKURA',(0,-.104,2.49),.14,white)
post=asset('Post box and hydrant')
rod('Post support',(0,0,0),(0,0,.85),.065,metal);box('Post box',(0,0,1.05),(.48,.35,.52),red,.035);box('Letter slot',(0,-.185,1.12),(.3,.015,.035),metal)
label('Post label','POST',(0,-.19,.95),.095,white)
rod('Hydrant body',(.85,0,0),(.85,0,.65),.1,red);ball('Hydrant cap',(.85,0,.67),(.12,.12,.09),red);rod('Hydrant cross',(.64,0,.46),(1.06,0,.46),.063,red)
TARGET=None
for c in assets:S.collection.children.unlink(c)
def inst(c,p=(0,0,0),rot=None,n=None):
 o=bpy.data.objects.new(n or c.name,None);o.instance_type='COLLECTION';o.instance_collection=c;S.collection.objects.link(o);o.location=p
 if rot:o.rotation_euler=rot
 return o
R=48;N=3;nodes={};edges=set();cells=[]
print('Building sphere grid',flush=True)
def key(v):return tuple(round(c,6) for c in v)
for axis in range(3):
 for sign in [-1,1]:
  others=[a for a in range(3) if a!=axis]
  for i in range(N):
   for j in range(N):
    ks=[]
    for u,v in [(i,j),(i+1,j),(i+1,j+1),(i,j+1)]:
     a=[0.,0.,0.];a[axis]=sign;a[others[0]]=-1+2*u/N;a[others[1]]=-1+2*v/N;k=key(a);nodes[k]=Vector(a).normalized();ks.append(k)
    cells.append(ks)
    for a,b in zip(ks,ks[1:]+ks[:1]):edges.add(tuple(sorted((a,b))))
degree=Counter(a for e in edges for a in e)
assert max(degree.values())==4 and min(degree.values())==3
(OUT/'road-topology.json').write_text(json.dumps({'blocks':len(cells),'segments':len(edges),'junctions':len(nodes),'degreeHistogram':dict(Counter(degree.values())),'radiusMetres':R},indent=2))
ball('Paved little planet',(0,0,0),(R,R,R),stone)
def orient(o,p,f):
 up=p.normalized();f=(f-up*f.dot(up)).normalized();x=up.cross(f);o.rotation_euler=Matrix((x,-f,up)).transposed().to_euler();o.location=p
def at(c,p,f):o=inst(c);orient(o,p,f);return o
def ribbon(a,b,width,height,ma):
 vs=[]
 for t in range(17):
  n=a.lerp(b,t/16).normalized();tangent=(b-a).normalized();side=n.cross(tangent).normalized()
  for s in [-1,1]:vs.append((n*(R+height)+side*s*width/2).normalized()*(R+height))
 return mesh('Continuous road' if ma==road else 'Sidewalk',vs,[(2*i,2*i+1,2*i+3,2*i+2) for i in range(16)],ma)
for ka,kb in sorted(edges):
 a,b=nodes[ka],nodes[kb];ribbon(a,b,7.8,.065,white);ribbon(a,b,5.2,.095,road)
 for t in [.36,.53,.70]:
  n=a.lerp(b,t).normalized();o=box('Centre dash',(0,0,0),(.09,.8,.02),white,0);orient(o,n*(R+.115),b-a)
for idx,ks in enumerate(cells):
 center=sum((nodes[k] for k in ks),Vector()).normalized();front=(nodes[ks[0]]+nodes[ks[1]]).normalized()-center;p=center*(R+.09)
 o=at(house,p,front);basis=o.rotation_euler.to_matrix()
 # Clip a flat paved court to its four road setbacks; its deep foundation meets the sphere.
 poly=[Vector((-15,-15)),Vector((15,-15)),Vector((15,15)),Vector((-15,15))]
 for ka,kb in zip(ks,ks[1:]+ks[:1]):
  normal=nodes[ka].cross(nodes[kb]).normalized()
  if normal.dot(center)<0:normal=-normal
  a=normal.dot(basis.col[0]);b=normal.dot(basis.col[1]);limit=math.sin(4.25/R)*R-normal.dot(p)
  clipped=[]
  for u,v in zip(poly,poly[1:]+poly[:1]):
   du=a*u.x+b*u.y-limit;dv=a*v.x+b*v.y-limit
   if du>=0:clipped.append(u)
   if (du>=0)!=(dv>=0):clipped.append(u.lerp(v,du/(du-dv)))
  poly=clipped
 count=len(poly);verts=[(q.x,q.y,z) for z in [-.9,.02] for q in poly]
 faces=[tuple(range(count-1,-1,-1)),tuple(range(count,2*count))]+[(i,(i+1)%count,(i+1)%count+count,i+count) for i in range(count)]
 pad=mesh('Paved parcel foundation',verts,faces,stone);orient(pad,p,front)
 for c,offset in [(bike,(-4,-1,.02)),(bike,(-4,-2,.02)),(tree,(4,2,.02)),(post,(2.8,-4.4,.03)),(person,(-.5,-5.0,.03))]:
  at(c,p+basis@Vector(offset),front)
 for k in range(3):
  mark=box('Cycle parking bay',(0,0,0),(.04,1.7,.012),white,0);orient(mark,p+basis@Vector((-4.7+k*.72,-1.5,.026)),front)
print('Building junctions',flush=True)
for idx,(k,n) in enumerate(sorted(nodes.items())):
 neighbors=[nodes[b if a==k else a] for a,b in edges if k in (a,b)]
 for v in neighbors:
  f=(v-n*n.dot(v)).normalized();side=n.cross(f)
  for j in range(5):
   q=(n*R+f*4.7+side*((j-2)*.78)).normalized()*(R+.12);o=box('Zebra crossing',(0,0,0),(.43,1.6,.018),white,0);orient(o,q,f)
 if idx%2==0:at(fixture,(n*R+side*3.45+f*3.5).normalized()*(R+.14),-f)
def setup(scene):
 scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True;scene.render.threads_mode='FIXED';scene.render.threads=6
 scene.world=bpy.data.worlds.new(scene.name+' dusk');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.22,.28,.43,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.4
 scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG';scene.render.resolution_percentage=100
 data=bpy.data.lights.new('Late sunset','SUN');data.energy=2.3;data.color=(1,.62,.36);data.angle=.15;o=bpy.data.objects.new('Late sunset',data);scene.collection.objects.link(o);o.rotation_euler=(.45,-.6,-.45)
def camera(n,p,target,lens=48,ortho=None):
 d=bpy.data.cameras.new(n);o=bpy.data.objects.new(n,d);S.collection.objects.link(o);o.location=p;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();d.lens=lens
 if ortho:d.type='ORTHO';d.ortho_scale=ortho
 S.camera=o;return o
def render(n,w=1200,h=900):
 S.render.resolution_x=w;S.render.resolution_y=h;S.render.filepath=str(OUT/'renders'/n);bpy.ops.render.render(write_still=True,scene=S.name)
setup(S);camera('Globe camera',(109,-132,105),(0,0,0),48)
print('Building street scale scene',flush=True)
globe=S
S=bpy.data.scenes.new('Street_scale_review');bpy.context.window.scene=S;S.unit_settings.system='METRIC';setup(S)
box('Street base',(0,-2,-.2),(28,24,.4),stone)
box('Asphalt',(0,-7.8,.014),(28,5.2,.035),road)
box('Kerb',(0,-5.05,.07),(28,.17,.14),white)
for x in range(-12,13,3):box('Centre dash',(x,-7.8,.038),(1.4,.09,.02),white,0)
copies={}
for o in house.objects:
 c=o.copy();S.collection.objects.link(c);copies[o]=c
for o,c in copies.items():
 if o.parent:c.parent=copies[o.parent]
inst(house,(9,1,0))
for x in [-5.7,-4.9,-4.1]:
 inst(bike,(x,-1,.03),(0,0,math.pi/2));rod('Cycle stand',(x-.28,-1.5,.02),(x-.28,-1.5,.58),.025,metal);rod('Cycle stand',(x-.28,-1.5,.58),(x+.28,-1.5,.58),.025,metal)
 box('Cycle bay marking',(x-.37,-1,.025),(.035,2,.025),white,0)
inst(tree,(-6,2,0));inst(tree,(5,3,0));inst(fixture,(-8,-4.5,0));inst(post,(4,-4,0))
box('Parking sign',(-6.4,-2.5,1.55),(.7,.06,.75),bluewall);label('Parking label','P',(-6.4,-2.54,1.44),.4,white);rod('Sign pole',(-6.4,-2.5,0),(-6.4,-2.5,1.3),.04,metal)
for x,y,a in [(-3,-4.4,math.pi/2),(5,-4.4,-math.pi/2)]:inst(person,(x,y,.03),(0,0,a))
actor=inst(person,(1.6,-5.6,.34),n='Resident entering and leaving')
for frame,y,z,a in [(1,-5.6,.03,math.pi),(20,-4.05,.03,math.pi),(28,-3.68,.34,math.pi),(50,-1.9,.34,math.pi),(90,-1.9,.34,0),(125,-3.8,.34,0),(134,-4.06,.03,0),(155,-5.6,.03,0),(180,-5.6,.03,0)]:
 actor.location.y=y;actor.location.z=z;actor.rotation_euler.z=a;actor.keyframe_insert('location',frame=frame);actor.keyframe_insert('rotation_euler',frame=frame)
door=copies[pivot]
for frame,a in [(1,0),(15,0),(28,1.57),(58,1.57),(70,0),(95,0),(113,1.57),(143,1.57),(160,0),(180,0)]:door.rotation_euler.z=a;door.keyframe_insert('rotation_euler',frame=frame)
S.frame_end=180;S.render.fps=30;S.frame_set(36)
camera('Street detail',(17,-23,13),(-.2,-.6,2),48)
(OUT/'openings-evidence.json').write_text(json.dumps(openings,indent=2))
(OUT/'review-status.json').write_text(json.dumps({'stage':'Function draft','blenderVersion':bpy.app.version_string,'nativeBlender':True,'humanApprovals':{'function':False,'form':False,'runtime':False},'notImplementedInWeb':['third-person camera','new native assets','enter/exit navigation'],'paidServicesUsed':False},indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'yugure-review.blend'),compress=True)
if os.environ.get('YUGURE_BUILD_ONLY')=='1':
 print('NATIVE_MODEL_BUILD_COMPLETE',flush=True)
 raise SystemExit(0)
street=S
S=globe;bpy.context.window.scene=S;render('globe-review.png',1280,1100)
S=street;bpy.context.window.scene=S;render('street-detail.png',1400,1000)
camera('Third person composition',(1.6,-8.4,2.35),(1.6,-2.8,1.6),28);S.frame_set(16);render('third-person-study.png')
camera('Actual geometry floor plan',(0,0,45),(0,0,0),ortho=29);S.view_layers[0].material_override=stone;render('orthographic-plan.png',1100,1100)
camera('Actual front elevation',(0,-35,4),(0,0,4),ortho=20);render('front-elevation.png',1200,800)
S.view_layers[0].material_override=None
camera('Street detail',(17,-23,13),(-.2,-.6,2),48);S.frame_set(36)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'yugure-review.blend'),compress=True)
print('NATIVE_BLENDER_REVIEW_COMPLETE',flush=True)
