"""Export the user-reviewed native Blender assets, preserving door and limb pivots."""
import bpy,json,hashlib,math
from pathlib import Path
from mathutils import Matrix,Vector
P=Path(__file__).resolve().parent
review=json.loads((P/'milestone-reviews.json').read_text())
if review['form']['status']!='approved':
 raise RuntimeError('Form approval is required before model export. This script only prepares the export until then.')
source_path=P/'yugure-form.blend'
bpy.ops.wm.open_mainfile(filepath=str(source_path))
source=bpy.context.scene
source.frame_set(1)
for name in ['Leg_L','Leg_R','Arm_L','Arm_R']:
 if bpy.data.objects.get(name):bpy.data.objects[name].name='Source_'+name
runtime=bpy.data.scenes.new('Runtime_asset_library');bpy.context.window.scene=runtime
runtime.unit_settings.system='METRIC'
spec=[('House','House • 6.6 x 6.2 metres'),('Bicycle','City bicycle • 1.75 metres'),('Resident','Resident • 1.74 metres'),('Tree','Tree in paved planter'),('Signal','Traffic signal and road sign'),('Post','Post box and hydrant')]
counts={}
for name,collection in spec:
 col=bpy.data.collections[collection];runtime.collection.children.link(col);runtime.frame_set(1);bpy.context.view_layer.update()
 root=bpy.data.objects.new(name,None);runtime.collection.objects.link(root)
 groups={};origins={'Static':Vector((0,0,0))}
 if name=='House':origins['Door']=Vector((1.11,-3.19,.34))
 if name=='Resident':
  origins.update(Leg_L=Vector((-.115,0,.87)),Leg_R=Vector((.115,0,.87)),Arm_L=Vector((-.27,0,1.34)),Arm_R=Vector((.27,0,1.34)))
 for o in col.objects:
  if o.type not in ('MESH','FONT'):continue
  part='Static'
  if name=='House' and o.parent and o.parent.name.startswith('DoorPivot'):part='Door'
  if name=='Resident':
   if o.name.startswith(('Trouser leg','Shoe')):part='Leg_L' if o.matrix_world.translation.x<0 else 'Leg_R'
   if o.name.startswith(('Sleeve','Hand')):part='Arm_L' if o.matrix_world.translation.x<0 else 'Arm_R'
  evaluated=o.evaluated_get(bpy.context.evaluated_depsgraph_get());me=bpy.data.meshes.new_from_object(evaluated)
  if not me.vertices:continue
  me.transform(Matrix.Translation(-origins[part])@o.matrix_world)
  ob=bpy.data.objects.new(o.name+'_export',me);runtime.collection.objects.link(ob)
  # Material grouping reduces thousands of independent draw calls to reusable primitives.
  material=me.materials[0].name if me.materials else 'none'
  groups.setdefault((part,material),[]).append(ob)
 parts={}
 for part,origin in origins.items():
  if part=='Static':parts[part]=root
  else:
   ob=bpy.data.objects.new(part,None);runtime.collection.objects.link(ob);ob.parent=root;ob.location=origin;parts[part]=ob
 for (part,material),objects in groups.items():
  bpy.ops.object.select_all(action='DESELECT')
  for ob in objects:ob.select_set(True)
  bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();ob=bpy.context.object;ob.name=f'{name}_{part}_{material}';ob.parent=parts[part]
  counts[name]=counts.get(name,0)+sum(len(p.vertices)-2 for p in ob.data.polygons)
 runtime.collection.children.unlink(col)
out=P.parent/'dist'/'assets';out.mkdir(exist_ok=True,parents=True)
bpy.ops.export_scene.gltf(filepath=str(out/'town-assets.glb'),export_format='GLB',use_active_scene=True,export_animations=False,export_cameras=False,export_lights=False,export_extras=True)
proof={'generator':bpy.app.version_string,'source':'design-review/yugure-form.blend','sourceSHA256':hashlib.sha256(source_path.read_bytes()).hexdigest(),'glbSHA256':hashlib.sha256((out/'town-assets.glb').read_bytes()).hexdigest(),'bytes':(out/'town-assets.glb').stat().st_size,'trianglesPerAsset':counts,'coordinateSystem':'glTF Y-up; house front +Z; real metres','dynamicPivots':['Door','Leg_L','Leg_R','Arm_L','Arm_R']}
(out/'provenance.json').write_text(json.dumps(proof,indent=2));print(json.dumps(proof),flush=True)
