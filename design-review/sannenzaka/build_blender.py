"""Native Blender asset authoring for the authorized Kyoto replacement.
Metric Y-up interface, converted to Blender Z-up. Exact Boolean storefront openings.
"""
import bpy,math,json,hashlib
from pathlib import Path
from mathutils import Vector
P=Path(__file__).resolve().parent;ROOT=P.parents[1]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def v(p):return (p[0],-p[2],p[1])
def mat(name,color,alpha=1,emission=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,alpha);m.use_nodes=True;b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(*color,alpha);b.inputs['Roughness'].default_value=.68;b.inputs['Alpha'].default_value=alpha
 if emission:b.inputs['Emission Color'].default_value=(*color,1);b.inputs['Emission Strength'].default_value=emission
 if alpha<1:m.surface_render_method='DITHERED'
 return m
wood=mat('Cedar',(.19,.105,.06));dark=mat('Dark_timber',(.065,.049,.043));plaster=mat('Warm_plaster',(.7,.61,.43));plasterB=mat('Ochre_plaster',(.52,.34,.18));roof=mat('Kawara',(.16,.19,.2));edge=mat('Tile_ribs',(.24,.27,.27));stone=mat('Foundation',(.38,.37,.33));glass=mat('Glass',(.76,.85,.77),.22);warm=mat('Lantern_paper',(.98,.63,.27),1,.45);inside=mat('Shop_interior',(.48,.33,.16));cloth=mat('Indigo_noren',(.13,.24,.28));red=mat('Bengara',(.38,.105,.075));gold=mat('Bronze',(.47,.33,.14))
active=[];root=None
def cube(n,p,s,m):
 bpy.ops.mesh.primitive_cube_add(size=1,location=v(p));o=bpy.context.object;o.name=n;o.dimensions=(s[0],s[2],s[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m);active.append(o);return o

def mesh(n,verts,faces,m):
 me=bpy.data.meshes.new(n);me.from_pydata([v(p) for p in verts],[],faces);me.update();o=bpy.data.objects.new(n,me);bpy.context.collection.objects.link(o);me.materials.append(m);active.append(o);return o

def beam(n,a,b,r,m,vertices=8):
 a,b=Vector(v(a)),Vector(v(b));bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=(b-a).length,location=(a+b)/2);o=bpy.context.object;o.name=n;o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();o.data.materials.append(m);active.append(o);return o

def cut(w,p,s):
 c=cube('Boolean_cutter',p,s,stone);mod=w.modifiers.new('Exact_opening','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=c;bpy.context.view_layer.objects.active=w;bpy.ops.object.modifier_apply(modifier=mod.name);active.remove(c);bpy.data.objects.remove(c,do_unlink=True)

def roof_gable(y,w,d,rise):
 verts=[(-w/2,y,-d/2),(w/2,y,-d/2),(-w/2,y+rise,0),(w/2,y+rise,0),(-w/2,y,d/2),(w/2,y,d/2)]
 ob=mesh('Kawara_roof',verts,[(2,3,1,0),(4,5,3,2)],roof);mod=ob.modifiers.new('Roof_thickness','SOLIDIFY');mod.thickness=.14;bpy.context.view_layer.objects.active=ob;bpy.ops.object.modifier_apply(modifier=mod.name)
 for i in range(int(w/.25)+1):
  x=-w/2+i*w/int(w/.25)
  for sign in [-1,1]:beam('Round_roof_tiles',(x,y+.04,sign*d/2),(x,y+rise+.04,0),.045,edge,6)
 for i in range(1,10):
  z=d/2*i/10
  for sign in [-1,1]:beam('Tile_rows',(-w/2,y+rise*(1-i/10)+.035,sign*z),(w/2,y+rise*(1-i/10)+.035,sign*z),.021,roof,5)
 beam('Ridge',(-w/2-.12,y+rise+.08,0),(w/2+.12,y+rise+.08,0),.12,edge)
 for z in [-d/2,d/2]:beam('Rain_gutter',(-w/2,y-.02,z),(w/2,y-.02,z),.075,dark)

def join_root(name,objects,exclude=[]):
 rt=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(rt);groups={}
 for o in objects:
  if o in exclude:continue
  groups.setdefault(o.data.materials[0].name,[]).append(o)
 for material,obs in groups.items():
  bpy.ops.object.select_all(action='DESELECT')
  for o in obs:o.select_set(True)
  bpy.context.view_layer.objects.active=obs[0];bpy.ops.object.join();o=bpy.context.object;o.name=name+'_'+material;o.parent=rt
 return rt
assets=[];openings=[]
for variant in range(2):
 active=[]
 cube('Foundation',(0,-.13,0),(6.08,.26,7.08),stone);cube('Shop_floor',(0,.06,0),(5.8,.12,6.8),inside)
 for x in [-2.92,2.92]:cube('Side_wall',(x,2.65,0),(.16,5.3,7),plaster if variant==0 else plasterB)
 cube('Back_wall',(0,2.65,-3.42),(6,5.3,.16),plaster)
 w=cube('Front_shell',(0,2.65,3.42),(6,5.3,.18),plaster if variant==0 else plasterB)
 for id,p,s in [('door',(1.65,1.18,3.42),(1.18,2.36,.8)),('display',(-1.25,1.4,3.42),(2.6,1.9,.8)),('upper',(0,3.92,3.42),(5,1.4,.8))]:
  cut(w,p,s);openings.append(dict(asset='Machiya'+str(variant),id=id,center=p,dimensions=s,method='Applied Exact Boolean'))
 cube('Display_glass',(-1.25,1.4,3.43),(2.55,1.85,.035),glass);cube('Upper_glass',(0,3.92,3.43),(4.96,1.35,.035),glass)
 for x in [-2.9,-2.58,.08,1.03,2.27,2.9]:cube('Cedar_post',(x,1.4,3.55),(.13,2.8,.17),wood)
 for y in [.43,2.4,2.8,3.17,4.67,5.26]:cube('Front_beam',(0,y,3.55),(6,.13,.2),dark)
 for i in range(23):cube('Upper_koshi',(-2.45+i*.223,3.92,3.55),(.046,1.38,.12),dark)
 for y in [3.48,4.35]:cube('Koshi_rail',(0,y,3.56),(5,.045,.08),wood)
 for i in range(13):cube('Display_koshi',(-2.5+i*.205,1.4,3.55),(.04,1.9,.1),wood)
 for y in [.65,1.2]:cube('Display_shelf',(-1.25,y,2.95),(2.55,.09,.6),wood)
 for i in range(7):cube('Tea_boxes',(-2.25+i*.31,.81,3),(.23,.25,.25),warm if i%2 else red)
 cube('Interior_back',(0,1.4,-1.8),(5.8,2.7,.12),inside)
 for z in [-1,1]:cube('Interior_counter',(-1.7,.68,z),(1.2,1.35,1.8),wood)
 cube('Upper_floor',(0,2.82,0),(5.8,.12,6.8),wood)
 for side in [-1,1]:
  g=mesh('Sealed_gable',[(side*2.92,5.25,-3.5),(side*2.92,6.8,0),(side*2.92,5.25,3.5)],[(0,1,2) if side>0 else (2,1,0)],plaster)
  mod=g.modifiers.new('Gable_thickness','SOLIDIFY');mod.thickness=.16;bpy.context.view_layer.objects.active=g;bpy.ops.object.modifier_apply(modifier=mod.name)
 roof_gable(5.2,6.8,8,1.8)
 # Lower front eave spans the pavement edge, with the same tiled pitch.
 ob=cube('Shop_eave',(0,2.8,3.91),(6.65,.14,1.5),roof);ob.rotation_euler.x=math.radians(15)
 for i in range(28):beam('Eave_tile',(-3.3+i*.244,3.02,3.2),(-3.3+i*.244,2.64,4.65),.04,edge,6)
 for x in [-2.65,2.65]:beam('Downpipe',(x,2.62,3.58),(x,.14,3.58),.042,dark)
 for i in range(3):cube('Noren',(1.22+i*.4,2.01,3.65),(.38,.6,.035),cloth if variant==0 else red)
 # Sliding door remains independent and moves laterally into a pocket.
 doorparts=[];start=len(active)
 cube('Door_glass',(1.65,1.14,3.47),(1.12,2.25,.06),glass)
 for x in [1.1,2.2]:cube('Door_stile',(x,1.14,3.52),(.08,2.28,.09),wood)
 for y in [.06,.65,1.3,2.27]:cube('Door_rail',(1.65,y,3.52),(1.18,.075,.09),wood)
 for x in [1.38,1.66,1.94]:cube('Door_lattice',(x,1.17,3.52),(.03,2.23,.08),dark)
 doorparts=active[start:];rt=join_root('Machiya'+str(variant),active,doorparts);dr=join_root('SlidingDoor',doorparts);dr.parent=rt;assets.append(rt)
# Yasaka pagoda: five diminishing hipped roofs, timber brackets and sorin.
active=[]
cube('Pagoda_stone',(0,.28,0),(11,.56,11),stone)
for floor in range(5):
 y=.56+floor*4.4;w=8.5-floor*.75
 cube('Tower_core',(0,y+1.95,0),(w*.72,3.8,w*.72),dark)
 for x in [-w*.37,0,w*.37]:
  for z in [-w*.37,w*.37]:cube('Pillar',(x,y+1.9,z),(.28,3.8,.28),wood)
 for z in [-w*.37,0,w*.37]:
  for x in [-w*.37,w*.37]:cube('Pillar',(x,y+1.9,z),(.28,3.8,.28),wood)
 for a in range(4):
  for j in range(7):
   x=-w*.44+j*w*.88/6;z=w*.45;co,si=math.cos(a*math.pi/2),math.sin(a*math.pi/2)
   cube('Bracket',(x*co-z*si,y+3.1,x*si+z*co),(.22,.42,.52),wood)
 # Three rings form subtly swept hips, with distinct eave thickness.
 ext=w*.73;verts=[]
 for size,height in [(ext,y+3.3),(ext*.72,y+3.38),(w*.29,y+4.55)]:
  for x,z in [(-1,-1),(1,-1),(1,1),(-1,1)]:verts.append((x*size,height,z*size))
 ob=mesh('Swept_hip_roof',verts,[(k+4+i,k+4+(i+1)%4,k+(i+1)%4,k+i) for k in [0,4] for i in range(4)],roof);mod=ob.modifiers.new('Eaves_depth','SOLIDIFY');mod.thickness=.2;bpy.context.view_layer.objects.active=ob;bpy.ops.object.modifier_apply(modifier=mod.name)
 for side in range(4):
  a=side*math.pi/2;co,si=math.cos(a),math.sin(a)
  for j in range(31):
   x=-ext+2*ext*j/30;xx=x/ext*w*.29
   def turn(x,z,h):return (x*co-z*si,h,x*si+z*co)
   beam('Hip_tile_rib',turn(x,ext,y+3.35),turn(xx,w*.29,y+4.61),.04,edge,5)
 for x,z in [(-1,-1),(1,-1),(1,1),(-1,1)]:beam('Hip_corner',(x*ext,y+3.38,z*ext),(x*w*.29,y+4.65,z*w*.29),.095,edge)
beam('Sorin',(0,22.7,0),(0,30.8,0),.14,gold)
for i in range(9):
 bpy.ops.mesh.primitive_torus_add(major_segments=16,minor_segments=5,location=v((0,24+i*.53,0)),major_radius=.9-i*.056,minor_radius=.062);o=bpy.context.object;o.data.materials.append(gold);active.append(o)
assets.append(join_root('YasakaPagoda',active))
# Export only asset roots. Blender source is retained before runtime composition.
bpy.ops.wm.save_as_mainfile(filepath=str(P/'sannenzaka-assets.blend'))
bpy.ops.export_scene.gltf(filepath=str(ROOT/'dist/assets/sannenzaka/architecture.glb'),export_format='GLB',export_animations=False,export_cameras=False,export_lights=False,export_extras=True)
(P/'openings.json').write_text(json.dumps(openings,indent=2))
proof=dict(generator=bpy.app.version_string,source='design-review/sannenzaka/sannenzaka-assets.blend',sourceSHA256=hashlib.sha256((P/'sannenzaka-assets.blend').read_bytes()).hexdigest(),glbSHA256=hashlib.sha256((ROOT/'dist/assets/sannenzaka/architecture.glb').read_bytes()).hexdigest(),nativeAssets=['Machiya0','Machiya1','YasakaPagoda'],openingCount=len(openings),method='Native mesh construction and applied Exact Boolean apertures; no paid generation')
(ROOT/'dist/assets/sannenzaka/provenance.json').write_text(json.dumps(proof,indent=2));print('NATIVE_ASSETS_READY',json.dumps(proof),flush=True)
