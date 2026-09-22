import * as T from 'three';
export function makeDistrict(data){
 const graph=[],roads=[],keyMap=new Map();
 function node(p){const key=[p.x,p.z].map(v=>Math.round(v*10)).join(',');if(keyMap.has(key))return keyMap.get(key);const id=graph.length;graph.push({id,p:p.clone(),links:[]});keyMap.set(key,id);return id}
 function link(a,b,kind='street'){if(a===b||graph[a].links.some(e=>e.to===b))return;const length=graph[a].p.distanceTo(graph[b].p);graph[a].links.push({to:b,length,kind});graph[b].links.push({to:a,length,kind})}
 for(const raw of data.roads){const ps=raw.points.map(p=>new T.Vector3(...p)),lengths=[0];for(let i=1;i<ps.length;i++)lengths.push(lengths.at(-1)+Math.hypot(ps[i].x-ps[i-1].x,ps[i].z-ps[i-1].z));const length=lengths.at(-1);
  function at(distance,stepped=true){const d=T.MathUtils.clamp(distance,0,length);let k=1;while(k<lengths.length-1&&lengths[k]<d)k++;const t=(d-lengths[k-1])/(lengths[k]-lengths[k-1]),p=ps[k-1].clone().lerp(ps[k],t);if(raw.steps&&stepped){const u=d/length;const n=Math.min(raw.steps,(ps.at(-1).y>ps[0].y?Math.ceil(u*raw.steps-1e-6):Math.floor(u*raw.steps+1e-6)));p.y=T.MathUtils.lerp(ps[0].y,ps.at(-1).y,n/raw.steps)}return p}
  const samples=[...new Set([...lengths,...Array.from({length:Math.ceil(length/.6)+1},(_,i)=>Math.min(length,i*.6)),length])].sort((a,b)=>a-b),ids=samples.map(d=>node(at(d)));
  for(let i=1;i<ids.length;i++)link(ids[i-1],ids[i],raw.steps?'stairs':'street');roads.push({...raw,ps,lengths,length,at,ids});
 }
 // Nearby endpoints share junctions even when the map splits a way at the junction.
 for(const r of roads)for(const id of [r.ids[0],r.ids.at(-1)]){let best=-1,dmin=.5;for(const n of graph)if(n.id!==id&&!r.ids.includes(n.id)){const d=n.p.distanceTo(graph[id].p);if(d<dmin){dmin=d;best=n.id}}if(best>=0)link(id,best)}
 function nearest(p){let best={distance:Infinity};for(const r of roads)for(let k=1;k<r.ps.length;k++){const a=r.ps[k-1],b=r.ps[k],dx=b.x-a.x,dz=b.z-a.z,t=T.MathUtils.clamp(((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz),0,1),q=a.clone().lerp(b,t),dist=Math.hypot(p.x-q.x,p.z-q.z);if(dist<best.distance){const s=r.lengths[k-1]+t*(r.lengths[k]-r.lengths[k-1]);best={distance:dist,p:r.at(s),road:r,s,tangent:new T.Vector3(dx,0,dz).normalize()}}}return best}
 const buildings=data.buildings.map((b,id)=>{const heightScale=.88+(id%5)*.055,scale=new T.Vector3(b.width/6,heightScale,b.depth/7),q=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),b.yaw),p=new T.Vector3(...b.center);const local=(x,y,z)=>new T.Vector3(x,y,z).multiply(scale).applyQuaternion(q).add(p);const door=local(1.65,.08,3.6),inside=local(1.65,.08,2.6),street=nearest(door);p.y=street.p.y;door.y=inside.y=street.p.y+.08;
  const inId=node(inside),doorId=node(door);link(inId,doorId,'door');let closest=street.road.ids.reduce((best,id)=>graph[id].p.distanceTo(door)<graph[best].p.distanceTo(door)?id:best,street.road.ids[0]);
  // Only storefronts with a direct short apron admit residents; back rows stay architectural scenery.
  const accessible=street.distance<5.7&&b.width>=4.6; if(accessible)link(doorId,closest,'door');return {...b,id,p,q,scale,local,door,inside,inId,doorId,streetId:closest,accessible};
 });
 for(const h of buildings){if(!h.accessible)continue;const a=graph[h.streetId].p;let blocked=false;for(let i=0;i<=10;i++){const p=a.clone().lerp(h.door,i/10);for(const other of buildings){if(other.id===h.id)continue;const q=p.clone().sub(other.p).applyQuaternion(other.q.clone().invert());if(Math.abs(q.x)<other.width/2+.18&&Math.abs(q.z)<other.depth/2+.18)blocked=true}}if(blocked){h.accessible=false;graph[h.doorId].links=graph[h.doorId].links.filter(e=>e.to!==h.streetId);graph[h.streetId].links=graph[h.streetId].links.filter(e=>e.to!==h.doorId)}}
 return {data,graph,roads,buildings,nearest,homes:buildings.filter(b=>b.accessible),bounds:data.bounds};
}
export function route(graph,start,end){const dist=new Map([[start,0]]),prev=new Map(),todo=new Set([start]);while(todo.size){let a=[...todo].reduce((a,b)=>dist.get(a)<dist.get(b)?a:b);todo.delete(a);if(a===end)break;for(const e of graph[a].links){const d=dist.get(a)+e.length;if(d<(dist.get(e.to)??Infinity)){dist.set(e.to,d);prev.set(e.to,a);todo.add(e.to)}}}if(!dist.has(end))return [];const path=[end];while(path[0]!==start)path.unshift(prev.get(path[0]));return path}
