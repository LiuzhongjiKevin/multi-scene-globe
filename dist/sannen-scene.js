import * as T from 'three';
export function buildDistrict(scene,town,library,props=null){
 const root=new T.Group();root.name='Ninenzaka_Sannenzaka';scene.add(root);const batches=new Map(),dummy=new T.Object3D(),box=new T.BoxGeometry(1,1,1),ball=new T.IcosahedronGeometry(1,2),cylinder=new T.CylinderGeometry(1,1,1,8),mats={},doorBatches=[],doorDefaults=town.buildings.map(()=>0);
 town.homes.forEach((h,i)=>{if(i%3===0)doorDefaults[h.id]=1});
 const doorStates=[...doorDefaults],doorTargets=[...doorDefaults];
 const material=(name,color,extra={})=>mats[name]??(mats[name]=new T.MeshStandardMaterial({name,color,roughness:.82,...extra}));
 const stone=material('paving','#9a9686'),border=material('granite','#777b78'),earth=material('earth','#756253'),wood=material('cedar','#654231'),black=material('iron','#343c3b'),green=material('moss','#6d8155'),leaf=material('foliage','#748857'),pink=material('sakura','#e6b9ab'),paper=material('paper','#ffc888',{emissive:'#ff9d43',emissiveIntensity:.65}),red=material('cloth','#9b4b40'),glass=material('glass','#bac6bc',{transparent:true,opacity:.23,depthWrite:false});
 const pavingTones=['#999688','#aaa493','#8d8b80','#b0a998'].map((color,i)=>material('paving_'+i,color));
 function add(geo,mat,matrix,key=''){const id=geo.uuid+'|'+mat.uuid+'|'+key;if(!batches.has(id))batches.set(id,{geo,mat,list:[],key});batches.get(id).list.push(matrix.clone())}
 function primitive(geo,mat,p,s,angle=0){dummy.position.copy(p);dummy.scale.set(...s);dummy.rotation.set(0,angle,0);dummy.updateMatrix();add(geo,mat,dummy.matrix)}
 function cube(mat,p,s,yaw=0){primitive(box,mat,p,s,yaw)}
 function beam(a,b,r,mat){dummy.position.copy(a).add(b).multiplyScalar(.5);dummy.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());dummy.scale.set(r,a.distanceTo(b),r);dummy.updateMatrix();add(cylinder,mat,dummy.matrix)}
 function cloneMat(m){if(m.name==='Glass')return glass;const a=m.clone();a.roughness=.8;if(a.name==='Lantern_paper'){a.emissive.set('#ffc888');a.emissiveIntensity=.25}return a}
 library.updateMatrixWorld(true);const sourceMats=new Map(),sourceGeometries=new Map();function normalizedGeometry(o){if(!sourceGeometries.has(o.uuid))sourceGeometries.set(o.uuid,o.geometry.clone().applyMatrix4(o.matrixWorld));return sourceGeometries.get(o.uuid)}for(const b of town.buildings){const model=library.getObjectByName('Machiya'+(b.id%2));const base=new T.Matrix4().compose(b.p,b.q,b.scale);model.traverse(o=>{if(!o.isMesh)return;let parent=o.parent,isDoor=false;while(parent&&parent!==model){if(parent.name.startsWith('SlidingDoor'))isDoor=true;parent=parent.parent}if(!sourceMats.has(o.material.uuid))sourceMats.set(o.material.uuid,cloneMat(o.material));const mat=sourceMats.get(o.material.uuid),geo=normalizedGeometry(o);if(isDoor){let d=doorBatches.find(d=>d.geo===geo);if(!d){d={geo,mat,entries:[]};doorBatches.push(d)}d.entries.push({id:b.id,base,local:new T.Matrix4()})}else add(geo,mat,base)})
  // Retaining plinths meet the sloping ground under each mapped building anchor.
  const support=Math.min(...[-1,1].flatMap(x=>[-1,1].map(z=>town.nearest(b.local(x*3,0,z*3.5)).p.y)))-.35;const depth=Math.max(.45,b.p.y-support);cube(border,b.p.clone().add(new T.Vector3(0,-depth/2,0)),[b.width,depth,b.depth],b.yaw);
 }
 const tower=library.getObjectByName('YasakaPagoda'),towerMatrix=new T.Matrix4().makeTranslation(...town.data.pagoda);tower.traverse(o=>{if(o.isMesh)add(normalizedGeometry(o),cloneMat(o.material),towerMatrix)});
 // Stone paving follows the real centerlines. Stair counts are retained from the map.
 let treadCount=0,paverCount=0;
 for(const r of town.roads){const count=r.steps||Math.ceil(r.length/.8),len=r.length/count;
  for(let i=0;i<count;i++){const s=(i+.5)*len,p=r.at(s),a=r.at(Math.max(0,s-.05),false),b=r.at(Math.min(r.length,s+.05),false),yaw=Math.atan2(b.x-a.x,b.z-a.z);
   if(r.steps){const top=Math.max(r.at(i*len,false).y,r.at((i+1)*len,false).y);p.y=top-.09;cube(stone,p,[r.width,.18,len+.018],yaw);treadCount++;}
   else for(let j=0;j<5;j++){const q=p.clone().add(new T.Vector3((j-2)*r.width/5,0,0).applyAxisAngle(new T.Vector3(0,1,0),yaw));q.y-=.04;cube(pavingTones[(i*7+j*3)%4],q,[r.width/5-.025,.08,len-.022],yaw);paverCount++}
   for(const side of [-1,1]){const q=p.clone().add(new T.Vector3(side*(r.width/2+.16),0,0).applyAxisAngle(new T.Vector3(0,1,0),yaw));q.y+=.03;cube(border,q,[.24,.12,len+.025],yaw)}
  }
 }
 // An irregular terrain cutout hugs the mapped street corridor rather than a globe.
 const [minx,minz,maxx,maxz]=town.bounds,verts=[],colors=[],indices=[],step=2;const grid=new Map(),col=new T.Color();
 function vertex(x,z){const k=x+':'+z;if(grid.has(k))return grid.get(k);const n=town.nearest(new T.Vector3(x,0,z));let y=n.p.y-.15;for(const b of town.buildings){if(Math.abs(x-b.p.x)+Math.abs(z-b.p.z)>b.width+b.depth)continue;const local=new T.Vector3(x,0,z).sub(b.p).applyQuaternion(b.q.clone().invert());if(Math.abs(local.x)<b.width/2&&Math.abs(local.z)<b.depth/2){y=b.p.y-.26;break}}const id=verts.length/3;verts.push(x,y,z);col.set(n.distance>13?'#8b9364':n.distance>5?'#a2987a':'#928d7c');const v=.92+.06*Math.sin(x*.41+z*.22);col.multiplyScalar(v);colors.push(col.r,col.g,col.b);grid.set(k,id);return id}
 const cells=[];for(let x=Math.floor((minx-22)/step)*step;x<maxx+22;x+=step)for(let z=Math.floor((minz-22)/step)*step;z<maxz+22;z+=step){const d=town.nearest(new T.Vector3(x+1,0,z+1)).distance,td=Math.hypot(x-town.data.pagoda[0],z-town.data.pagoda[2]);if(d>20&&td>16)continue;const ids=[[x,z],[x,z+step],[x+step,z+step],[x+step,z]].map(p=>vertex(...p));indices.push(ids[0],ids[1],ids[2],ids[0],ids[2],ids[3]);cells.push([x,z,ids])}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();const terrain=new T.Mesh(geo,new T.MeshStandardMaterial({vertexColors:true,roughness:1}));terrain.receiveShadow=true;root.add(terrain);
 const cellSet=new Set(cells.map(c=>c[0]+':'+c[1]));for(const [x,z,ids] of cells){for(const [dx,dz,a,b] of [[-step,0,0,1],[0,step,1,2],[step,0,2,3],[0,-step,3,0]])if(!cellSet.has((x+dx)+':'+(z+dz))){const pa=new T.Vector3().fromArray(verts,ids[a]*3),pb=new T.Vector3().fromArray(verts,ids[b]*3),top=Math.min(pa.y,pb.y),depth=top+7;const p=pa.clone().add(pb).multiplyScalar(.5);p.y=top-depth/2;cube(earth,p,[Math.abs(pa.x-pb.x)||.14,depth,Math.abs(pa.z-pb.z)||.14])}}
 function label(text,p,yaw,width=1.3,height=.55,bg='#b99c6a',ink='#332b23') {const c=document.createElement('canvas');c.width=512;c.height=192;const cx=c.getContext('2d');if(!cx?.fillText)return;cx.fillStyle=bg;cx.fillRect(0,0,512,192);cx.fillStyle=ink;cx.font='bold 78px serif';cx.textAlign='center';cx.textBaseline='middle';cx.fillText(text,256,96);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.PlaneGeometry(width,height),new T.MeshStandardMaterial({map:tex,roughness:.9}));m.position.copy(p);m.rotation.y=yaw;root.add(m)}
 let lanterns=0;const decorative=[],lanternPositions=[],obstacles=[];
 for(const b of town.buildings){if(b.width<3.2)continue;const p=b.local(-2.7,2.35,3.94);beam(b.local(-2.7,2.75,3.52),p,.025,black);primitive(cylinder,paper,p,[.22,.58,.22]);for(const dy of [-.29,.29])primitive(cylinder,black,p.clone().add(new T.Vector3(0,dy,0)),[.23,.045,.23]);lanterns++;lanternPositions.push(p.clone());
  if(b.id%3===0)label(['茶房','陶器','甘味処','京菓子','おみやげ'][b.id%5],b.local(-1.25,2.53,3.66),b.yaw,Math.min(b.width*.5,1.7),.42);
  // Entrance planters and merchandise stay alongside the doorway.
  for(const x of [-2.6,.35]){const q=b.local(x,.16,3.95);q.y=town.nearest(q).p.y+.16;primitive(cylinder,wood,q,[.22,.3,.22]);primitive(ball,leaf,q.clone().add(new T.Vector3(0,.35,0)),[.3,.36,.3]);obstacles.push({x:q.x,z:q.z,radius:.23})}
  if(b.id%6===0){const q=b.local(-1.3,.35,4.05);q.y=town.nearest(q).p.y+.35;cube(red,q,[1.3,.08,.4],b.yaw);for(const x of [-.5,0,.5]){const p=q.clone().add(new T.Vector3(x,0,0).applyQuaternion(b.q));obstacles.push({x:p.x,z:p.z,radius:.23})}for(const x of [-.5,.5])cube(wood,q.clone().add(new T.Vector3(x,-.17,0).applyQuaternion(b.q)),[.08,.34,.25],b.yaw)}
 }

 // Four fixed warm light pools, each attached to an existing lantern near a main street view.
 const lightAnchors=[town.roads.find(r=>r.id==='179116810').at(8),town.roads.find(r=>r.id==='179116810').at(18),town.roads[0].at(25),town.roads.find(r=>r.id==='710696944').at(35)],usedLights=[];
 for(const anchor of lightAnchors){const p=lanternPositions.filter(p=>!usedLights.includes(p)).sort((a,b)=>a.distanceToSquared(anchor)-b.distanceToSquared(anchor))[0];if(!p)continue;usedLights.push(p);const light=new T.PointLight('#ffc17c',12,8,2);light.position.copy(p);light.castShadow=false;root.add(light)}
 const parking=[];
 if(props){props.updateMatrixWorld(true);const bike=props.getObjectByName('Bicycle');
  if(bike)for(const b of town.buildings){if(parking.length>=4)break;if(!b.accessible||b.width<5.8||b.id%6===0)continue;const p=b.local(-1.15,0,4.65),near=town.nearest(p);if(near.road.steps||near.distance<2.9||near.distance>4.8)continue;
   const obstructed=town.buildings.some(other=>{if(other.id===b.id)return false;const q=p.clone().sub(other.p).applyQuaternion(other.q.clone().invert());return Math.abs(q.x)<other.width/2+1&&Math.abs(q.z)<other.depth/2+1});if(obstructed||parking.some(q=>q.distanceTo(p)<10))continue;p.y=near.p.y;
   const q=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),b.yaw),mx=new T.Matrix4().compose(p,q,new T.Vector3(1,1,1));bike.traverse(o=>{if(o.isMesh){if(!sourceMats.has(o.material.uuid))sourceMats.set(o.material.uuid,cloneMat(o.material));add(normalizedGeometry(o),sourceMats.get(o.material.uuid),mx)}});parking.push(p);
   obstacles.push({x:p.x,z:p.z,radius:.85});for(const x of [-1,1])cube(border,p.clone().add(new T.Vector3(x,.015,0).applyQuaternion(q)),[.045,.025,.75],b.yaw);
  }
 }
 function tree(p,cherry=false,s=1){beam(p,p.clone().add(new T.Vector3(.2,3.2*s,0)),.16*s,wood);for(let i=0;i<7;i++){const a=i*2.399,q=p.clone().add(new T.Vector3(Math.cos(a)*1.15*s,(3.3+(i%3)*.35)*s,Math.sin(a)*1.15*s));beam(p.clone().add(new T.Vector3(0,2*s,0)),q,.055*s,wood);primitive(ball,cherry?pink:leaf,q,[1.1*s,.8*s,1.15*s])}if(cherry)decorative.push(p)}
 for(let i=0;i<45;i++){const x=minx-13+(maxx-minx+26)*((i*.618033)%1),z=minz-14+(maxz-minz+28)*((i*.414213)%1),n=town.nearest(new T.Vector3(x,0,z));if(n.distance<9||n.distance>19||town.buildings.some(b=>Math.hypot(x-b.p.x,z-b.p.z)<Math.max(b.width,b.depth)*.65+2)||Math.hypot(x-town.data.pagoda[0],z-town.data.pagoda[2])<11)continue;tree(new T.Vector3(x,n.p.y,z),i%5===0,.8+(i%3)*.12)}
 // Characteristic flowering canopy near the Sannenzaka steps, outside the stair clearance.
 const stair=town.roads.find(r=>r.id==='179116810'),center=stair.at(stair.length*.65);let tp=null;
 for(let i=0;i<180&&!tp;i++){const a=i*2.399,r=6+(i%9)*1.35,p=center.clone().add(new T.Vector3(Math.cos(a)*r,0,Math.sin(a)*r)),near=town.nearest(p);if(near.distance<4.5||near.distance>19)continue;const blocked=town.buildings.some(b=>{const q=p.clone().sub(b.p).applyQuaternion(b.q.clone().invert());return Math.abs(q.x)<b.width/2+1.8&&Math.abs(q.z)<b.depth/2+1.8});if(!blocked){p.y=near.p.y;tp=p}}
 if(tp)tree(tp,true,1.25);if(!decorative.length)decorative.push(center.clone().add(new T.Vector3(0,0,0)));
 label('二年坂',town.roads[0].at(22).add(new T.Vector3(-2.5,1.45,0)),Math.PI/2,1.3,.5);
 label('産寧坂',stair.at(stair.length).add(new T.Vector3(-2.5,1.45,0)),Math.PI/2,1.3,.5);
 for(const b of batches.values()){const m=new T.InstancedMesh(b.geo,b.mat,b.list.length);b.list.forEach((mx,i)=>m.setMatrixAt(i,mx));m.castShadow=true;m.receiveShadow=true;m.name=b.mat.name;root.add(m)}
 for(const b of doorBatches){const m=new T.InstancedMesh(b.geo,b.mat,b.entries.length);m.name='Interactive_sliding_doors';m.userData.doorIds=b.entries.map(e=>e.id);m.castShadow=true;m.receiveShadow=true;b.mesh=m;root.add(m)}
 const petals=new T.InstancedMesh(new T.PlaneGeometry(.1,.055),new T.MeshStandardMaterial({color:'#f4cab9',side:T.DoubleSide,roughness:1}),100);petals.name='Petals';root.add(petals);
 let lastPetalTick=-1;const shift=new T.Matrix4(),transform=new T.Matrix4();
 function update(time,dt){
  for(let i=0;i<doorStates.length;i++){const next=T.MathUtils.damp(doorStates[i],doorTargets[i],7,dt);doorStates[i]=Math.abs(next-doorTargets[i])<.0005?doorTargets[i]:next}
  for(const b of doorBatches){let changed=false;b.entries.forEach((e,i)=>{const state=doorStates[e.id];if(e.lastState===state)return;e.lastState=state;shift.makeTranslation(state*1.03,0,0);transform.copy(e.base).multiply(shift).multiply(e.local);b.mesh.setMatrixAt(i,transform);changed=true});if(changed)b.mesh.instanceMatrix.needsUpdate=true}
  const tick=Math.floor(time*30);if(tick===lastPetalTick)return;lastPetalTick=tick;
  for(let i=0;i<100;i++){const anchor=decorative[i%decorative.length],phase=(time*.15+i*.371)%1;dummy.position.copy(anchor).add(new T.Vector3(Math.sin(i*3.1+time*.22)*2.2,4.7*(1-phase),Math.cos(i*1.7+time*.2)*2));dummy.rotation.set(time*.3+i,time*.4,Math.sin(i));dummy.scale.setScalar(1);dummy.updateMatrix();petals.setMatrixAt(i,dummy.matrix)}petals.instanceMatrix.needsUpdate=true;
 }
 update(0,1);return {root,doorDefaults,doorTargets,doorStates,obstacles,update,stats:{mappedBuildings:town.buildings.length,storefronts:town.homes.length,stairTreads:treadCount,pavers:paverCount,lanterns,lightPools:usedLights.length,bicycleParking:parking.length,nativeAssets:true}};
}
