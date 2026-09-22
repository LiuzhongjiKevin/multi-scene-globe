import bpy,json,bmesh
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
P=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(P/'yugure-form.blend'))
s=bpy.data.scenes['Street_scale_review'];bpy.context.window.scene=s;s.frame_set(1)
col=bpy.data.collections['House • 6.6 x 6.2 metres'];s.collection.children.link(col);bpy.context.view_layer.update();dep=bpy.context.evaluated_depsgraph_get()
checks=[]
for opening in json.loads((P/'openings-evidence.json').read_text()):
 wall=bpy.data.objects[opening['wall']];p=Vector(opening['center']);axis=0 if opening['size'][0]==.5 else 1;direction=Vector((0,0,0));direction[axis]=-1;origin=p-direction
 ev=wall.evaluated_get(dep);inv=wall.matrix_world.inverted();hit=ev.ray_cast(inv@origin,(inv.to_3x3()@direction).normalized(),distance=2)[0]
 checks.append({'opening':opening['name'],'wall':wall.name,'rayPassesThroughWall':not hit})
shell=[]
for o in col.objects:
 if o.type=='MESH' and ('wall' in o.name.lower() or o.name.startswith(('Foundation','Gabled roof'))):
  ev=o.evaluated_get(dep);me=bpy.data.meshes.new_from_object(ev);bm=bmesh.new();bm.from_mesh(me);boundary=sum(not e.is_manifold for e in bm.edges);bm.free();shell.append({'object':o.name,'nonManifoldEdges':boundary});bpy.data.meshes.remove(me)
resident=bpy.data.collections['Resident • 1.74 metres'];s.collection.children.link(resident);bpy.context.view_layer.update();points=[o.matrix_world@Vector(c) for o in resident.objects if o.type=='MESH' for c in o.bound_box];height=max(p.z for p in points)-min(p.z for p in points)
actor=bpy.data.objects['Resident entering and leaving'];walls=[o for o in col.objects if o.type=='MESH' and 'wall' in o.name.lower()]
door=next(o for o in s.objects if o.name.startswith('DoorLeaf') and o.parent and o.parent.animation_data)
contacts=[]
for frame in [1,16,28,36,50,90,113,125,143,155]:
 s.frame_set(frame);bpy.context.view_layer.update();dep=bpy.context.evaluated_depsgraph_get();minimum=100
 for wall in walls+[door]:
  tree=BVHTree.FromObject(wall,dep);inv=wall.matrix_world.inverted()
  for h in [.5,1.0,1.5]:
   p=actor.location+Vector((0,0,h));nearest=tree.find_nearest(inv@p)
   if nearest[0] is not None:minimum=min(minimum,nearest[3])
 contacts.append({'frame':frame,'minimumTorsoClearanceMetres':round(minimum,4),'clearForRadius023':minimum>=.23})
s.frame_set(1);bpy.context.view_layer.update()
lamp=bpy.data.objects['Room lamp'];floor=bpy.data.objects['Upper floor'];lampTop=max((lamp.matrix_world@Vector(p)).z for p in lamp.bound_box);ceilingBottom=min((floor.matrix_world@Vector(p)).z for p in floor.bound_box)
audit={'source':'yugure-form.blend','blenderVersion':bpy.app.version_string,'openingRayTests':checks,'shellMeshes':shell,'residentHeightMetres':round(height,4),'doorLeafDimensionsMetres':[.92,.07,2.08],'doorOpeningDimensionsMetres':[.98,.18,2.12],'roadTopology':json.loads((P/'road-topology.json').read_text()),'pass':all(c['rayPassesThroughWall'] for c in checks) and all(c['nonManifoldEdges']==0 for c in shell) and 1.6<height<1.9,'scope':'Actual mesh opening, structural manifoldness, human scale and graph checks. Browser collisions and performance belong to Runtime and are not certified here.'}
audit['doorwayBVHChecks']=contacts;audit['ceilingFixtureGapMetres']=round(ceilingBottom-lampTop,5);audit['pass']=audit['pass'] and all(c['clearForRadius023'] for c in contacts) and abs(ceilingBottom-lampTop)<.005
audit['articulatedParts']={name:len(bpy.data.objects[name].children) for name in ['Leg_L','Leg_R','Arm_L','Arm_R']};audit['pass']=audit['pass'] and all(n==2 for n in audit['articulatedParts'].values())
(P/'form-audit.json').write_text(json.dumps(audit,indent=2));print(json.dumps(audit),flush=True)
if not audit['pass']:raise RuntimeError('Form geometry audit failed')
