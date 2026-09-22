import * as T from 'three';
export const R=48,V=a=>new T.Vector3(...a);
export function riverPoint(t){const lat=.23*Math.sin(t*2+.6)+.07*Math.sin(t*5-.8);return new T.Vector3(Math.cos(lat)*Math.cos(t),Math.sin(lat),Math.cos(lat)*Math.sin(t))}
export function riverDistance(p){const n=p.clone().normalize(),t=Math.atan2(n.z,n.x);return (Math.asin(n.y)-Math.asin(riverPoint(t).y))*R}
export function riverWalkPoint(t){const n=riverPoint(t),side=n.clone().cross(riverPoint(t+.001).sub(n)).normalize();return n.multiplyScalar(R).addScaledVector(side,4.15).normalize().multiplyScalar(R+.105)}
export function roadHeight(p){const d=Math.abs(riverDistance(p));return .14+(d<4.5?.42*Math.pow(Math.cos(d/4.5*Math.PI/2),2):0)}
export function makeTown({theme="yugure"}={}){
 const nodes=[],edges=[],cells=[],graph=[];
 for(let i=0;i<26;i++){const y=1-2*(i+.5)/26,a=i*Math.PI*(3-Math.sqrt(5)),r=Math.sqrt(1-y*y);nodes.push({id:i,n:new T.Vector3(r*Math.cos(a),y,r*Math.sin(a)),edges:[]})}
 const candidates=[];for(let a=0;a<nodes.length;a++)for(let b=a+1;b<nodes.length;b++)candidates.push({a,b,length:nodes[a].n.angleTo(nodes[b].n)*R});candidates.sort((a,b)=>a.length-b.length);
 const parent=nodes.map(n=>n.id),find=i=>parent[i]===i?i:parent[i]=find(parent[i]);
 const arcContains=(a,b,p)=>Math.abs(a.angleTo(p)+p.angleTo(b)-a.angleTo(b))<1e-6;
 function crosses(c){const a=nodes[c.a].n,b=nodes[c.b].n;return edges.some(e=>{if([e.a,e.b].some(i=>i===c.a||i===c.b))return false;const u=nodes[e.a].n,v=nodes[e.b].n,p=a.clone().cross(b).cross(u.clone().cross(v)).normalize();return [p,p.clone().negate()].some(x=>arcContains(a,b,x)&&arcContains(u,v,x))})}
 function add(c){const e={...c,id:edges.length};edges.push(e);nodes[e.a].edges.push(e.id);nodes[e.b].edges.push(e.id)}
 for(const c of candidates)if(find(c.a)!==find(c.b)&&nodes[c.a].edges.length<3&&nodes[c.b].edges.length<3){parent[find(c.a)]=find(c.b);add(c)}
 for(const c of candidates){if(edges.length>=31)break;if(c.length>45||edges.some(e=>e.a===c.a&&e.b===c.b)||nodes[c.a].edges.length>=3||nodes[c.b].edges.length>=3||crosses(c))continue;add(c)}
 if(new Set(nodes.map(n=>find(n.id))).size!==1)throw Error('Street network disconnected');
 const waypoint=p=>{const id=graph.length;graph.push({id,p,links:[]});return id};
 function connect(a,b,kind='sidewalk',junction=-1){if(a===b)return;const length=graph[a].p.distanceTo(graph[b].p);if(length<1e-6)return;graph[a].links.push({to:b,length,kind,junction});graph[b].links.push({to:a,length,kind,junction})}
 const ports=nodes.map(()=>[]);
 for(const e of edges){const a=nodes[e.a].n,b=nodes[e.b].n;e.tangent=b.clone().sub(a).normalize();e.mid=a.clone().add(b).normalize();e.side=e.mid.clone().cross(e.tangent).normalize();e.lanes={};
  e.point=(t,offset=0)=>{const n=a.clone().lerp(b,t).normalize().multiplyScalar(R).addScaledVector(e.side,Math.sin(Math.PI*t)*(e.id%2?1:-1)*.85+offset).normalize();return n.multiplyScalar(R+roadHeight(n))};
  for(const s of [-1,1]){const lane=[];for(let i=0;i<=10;i++){const t=.075+.85*i/10,p=e.point(t,s*2.3);p.addScaledVector(p.clone().normalize(),Math.abs(riverDistance(p))<3.7?.10:.035);lane.push(waypoint(p));if(i)connect(lane[i-1],lane[i])}e.lanes[s]=lane;ports[e.a].push({id:lane[0],edge:e.id});ports[e.b].push({id:lane.at(-1),edge:e.id})}
 }
 for(const n of nodes){const axis=Math.abs(n.n.y)>.9?V([1,0,0]):V([0,1,0]),right=n.n.clone().cross(axis).normalize(),forward=right.clone().cross(n.n),list=ports[n.id];list.sort((a,b)=>Math.atan2(graph[a.id].p.dot(forward),graph[a.id].p.dot(right))-Math.atan2(graph[b.id].p.dot(forward),graph[b.id].p.dot(right)));for(let i=0;i<list.length;i++)connect(list[i].id,list[(i+1)%list.length].id,'corner',n.id)}
 const streetCount=graph.length,riverWalk=[];
 for(let i=0;i<160;i++)riverWalk.push(waypoint(riverWalkPoint(i/160*Math.PI*2)));
 for(let i=0;i<riverWalk.length;i++){connect(riverWalk[i],riverWalk[(i+1)%riverWalk.length],'riverside');let closest=-1,best=2.5;for(let j=0;j<streetCount;j++){const d=graph[j].p.distanceTo(graph[riverWalk[i]].p);if(d<best){best=d;closest=j}}if(closest>=0)connect(riverWalk[i],closest,'riverside')}
 function distanceRoad(p,e){let d=Infinity;for(let i=0;i<=30;i++)d=Math.min(d,p.distanceTo(e.point(i/30)));return d}
 for(const e of edges)for(const [t,s] of [[.28,1],[.67,-1]]){
  const n=e.point(t,s*9.3).normalize(),p=n.clone().multiplyScalar(R+.08);
  if(Math.abs(riverDistance(p))<8.4||cells.some(c=>c.p.distanceTo(p)<11.6)||edges.some(other=>distanceRoad(p,other)<8.5))continue;
  const forward=e.point(t).sub(p).projectOnPlane(n).normalize(),right=n.clone().cross(forward).normalize(),q=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(right,n,forward));
  const c={id:cells.length,n,p,q,forward,right,edge:e,borders:[e.id],court:[new T.Vector2(-3.7,-3.4),new T.Vector2(3.7,-3.4),new T.Vector2(3.7,3.8),new T.Vector2(-3.7,3.8)]};c.local=(x,y,z)=>V([x,y,z]).applyQuaternion(q).add(p);
  c.lane=e.lanes[s][Math.round((t-.075)/.85*10)];c.apron=waypoint(c.local(1.6,.03,4.5));connect(c.apron,c.lane);c.porch=waypoint(c.local(1.6,.34,3.62));connect(c.porch,c.apron);c.door=waypoint(c.local(1.6,.34,3.08));connect(c.door,c.porch,'door',c.id);c.inside=waypoint(c.local(1.6,.34,1.85));connect(c.inside,c.door,'door',c.id);cells.push(c);
 }
 if(cells.length<12)throw Error('Insufficient safe residential plots');
 return {nodes,edges,cells,graph,distanceRoad,riverWalk,theme};
}
export function route(graph,start,end){const distance=new Map([[start,0]]),prev=new Map(),todo=new Set([start]);while(todo.size){let a;for(const x of todo)if(a===undefined||distance.get(x)<distance.get(a))a=x;todo.delete(a);if(a===end)break;for(const l of graph[a].links){const d=distance.get(a)+l.length;if(d<(distance.get(l.to)??Infinity)){distance.set(l.to,d);prev.set(l.to,a);todo.add(l.to)}}}if(!distance.has(end))throw Error('Disconnected pedestrian route');const result=[end];while(result[0]!==start)result.unshift(prev.get(result[0]));return result}
