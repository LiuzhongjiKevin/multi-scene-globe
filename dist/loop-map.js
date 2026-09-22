import * as T from 'three';
import {makeDistrict} from './sannen-network.js';

// This separate adaptation folds existing street sections into a loop. It does
// not add geographic streets or synthesize a city on the uncharted hemisphere.
export function makeLoopData(source){
 const original=makeDistrict(source),main=['710696944','526198271','179116810','1251544286'];
 const offsets=new Map();let length=0;
 for(const id of main){const r=original.roads.find(r=>r.id===id);offsets.set(id,length);length+=r.length}
 const kiy=original.roads.find(r=>r.id==='28514434'),junction=length;
 length+=kiy.length-kiy.lengths[1];
 const branchLength=original.roads.slice(0,3).reduce((sum,r)=>sum+r.length,0);
 const mainJunction=original.roads.find(r=>r.id===main[0]).length;
 function flat(r,s){
  const p=r.at(s,false);let x,z;
  if(offsets.has(r.id)){x=offsets.get(r.id)+(r.id===main[0]?s:r.length-s);z=0}
  else if(r.id===kiy.id){x=junction+Math.max(0,s-r.lengths[1]);z=Math.min(0,s-r.lengths[1])}
  else {const before=original.roads.slice(0,original.roads.indexOf(r)).reduce((sum,r)=>sum+r.length,0);x=mainJunction+p.x*.45;z=before+s-branchLength}
  return new T.Vector3(x,p.y+.4-15*x/length,z);
 }
 const roads=original.roads.map(r=>({...source.roads.find(s=>s.id===r.id),points:r.lengths.map(s=>flat(r,s).toArray())}));
 const buildings=[];
 const packed=[];
 const roadSegments=roads.flatMap(r=>r.points.slice(1).map((b,i)=>({a:new T.Vector3(...r.points[i]),b:new T.Vector3(...b),width:r.width})));
 function overlapsRoad(c,yaw,width,depth){
  const q=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),-yaw);
  for(const seg of roadSegments){const a=seg.a.clone().sub(c).applyQuaternion(q),b=seg.b.clone().sub(c).applyQuaternion(q),halfX=width/2+seg.width/2+.22,halfZ=depth/2+seg.width/2+.22;
   let lo=0,hi=1;for(const axis of ['x','z']){const half=axis==='x'?halfX:halfZ,delta=b[axis]-a[axis];if(Math.abs(delta)<1e-8){if(Math.abs(a[axis])>half){hi=-1;break}}else{const t1=(-half-a[axis])/delta,t2=(half-a[axis])/delta;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2))}}if(lo<=hi)return true;
  }return false;
 }
 function collides(c,yaw,w,d){
  const ux=new T.Vector2(Math.cos(yaw),-Math.sin(yaw)),uz=new T.Vector2(Math.sin(yaw),Math.cos(yaw));
  return packed.some(b=>{
   const delta=new T.Vector2(c.x-b.c.x,c.z-b.c.z);
   return [ux,uz,b.ux,b.uz].every(a=>Math.abs(delta.dot(a))<w/2*Math.abs(ux.dot(a))+d/2*Math.abs(uz.dot(a))+b.w/2*Math.abs(b.ux.dot(a))+b.d/2*Math.abs(b.uz.dot(a))+.3);
  });
 }
 const candidates=source.buildings.map(b=>({b,n:original.nearest(new T.Vector3(...b.center))})).sort((a,b)=>a.n.distance-b.n.distance);
 for(const {b,n} of candidates){
  const src=new T.Vector3(...b.center),side=Math.sign((src.x-n.p.x)*n.tangent.z-(src.z-n.p.z)*n.tangent.x)||1;
  const width=Math.min(10,b.width*.86),depth=Math.min(10,b.depth*.86);
  const p=flat(n.road,n.s),t=flat(n.road,Math.min(n.road.length,n.s+.1)).sub(flat(n.road,Math.max(0,n.s-.1))).setY(0).normalize();
  const normal=new T.Vector3(t.z,0,-t.x).multiplyScalar(side),yaw=Math.atan2(-normal.x,-normal.z);
  const distance=Math.max(n.distance*.92,n.road.width/2+depth/2+.5);
  let center=null;
  for(const shift of [0,2,-2,4,-4,6,-6,9,-9,12,-12]){
   const c=p.clone().addScaledVector(t,shift).addScaledVector(normal,distance);
   if(c.x<7+width/2||c.x>length-7-width/2||overlapsRoad(c,yaw,width,depth)||collides(c,yaw,width,depth))continue;
   center=c;break;
  }
  if(!center)continue;
  buildings.push({...b,center:center.toArray(),yaw,width,depth,adaptedFrom:b.osmId});
  packed.push({c:center,yaw,w:width,d:depth,ux:new T.Vector2(Math.cos(yaw),-Math.sin(yaw)),uz:new T.Vector2(Math.sin(yaw),Math.cos(yaw))});
 }
 const towerNear=original.nearest(new T.Vector3(...source.pagoda)),tower=flat(towerNear.road,towerNear.s);tower.z=-14;tower.y=0;
 const all=roads.flatMap(r=>r.points).concat(buildings.map(b=>b.center));
 return {...source,roads,buildings,pagoda:tower.toArray(),bounds:[Math.min(...all.map(p=>p[0])),Math.min(...all.map(p=>p[2])),Math.max(...all.map(p=>p[0])),Math.max(...all.map(p=>p[2]))],loop:{length,mainJunction,join:'Folded west Sannenzaka / east Kiyomizuzaka endpoints; artistic, not a real geographic connection',sourceBuildings:source.buildings.length,retainedBuildings:buildings.length}};
}

export function closeLoop(town){
 const west=town.roads.find(r=>r.id==='710696944'),kiy=town.roads.find(r=>r.id==='28514434');
 const a=west.ids[0],b=kiy.ids.at(-1);
 town.graph[a].links.push({to:b,length:.01,kind:'seam'});town.graph[b].links.push({to:a,length:.01,kind:'seam'});
 return {a,b,length:town.data.loop.length};
}
