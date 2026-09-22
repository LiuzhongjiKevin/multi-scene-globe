import * as T from 'three';
import {addKyoto} from './kyoto-theme.js';
import {addDetails} from './town-details.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {R,riverPoint,riverDistance,riverWalkPoint} from './town-network.js';
const Y=new T.Vector3(0,1,0),one=new T.Vector3(1,1,1);
export function buildTown(scene,town,library){
 const planet=new T.Group();scene.add(planet);const doors=[],doorTargets=new Float32Array(town.cells.length);
 const mats={road:new T.MeshStandardMaterial({color:'#8d9688',roughness:.95}),paving:new T.MeshStandardMaterial({color:'#ddd6ba',roughness:.9}),paint:new T.MeshStandardMaterial({color:'#f8edd8'}),kerb:new T.MeshStandardMaterial({color:'#b9c3a0'}),bank:new T.MeshStandardMaterial({color:'#a7c47f',roughness:1}),water:new T.MeshStandardMaterial({color:'#78b9b0',roughness:.28,metalness:.16}),wood:new T.MeshStandardMaterial({color:'#b29670',roughness:.83}),ripple:new T.MeshBasicMaterial({color:'#e1f5d9',transparent:true,opacity:.35,depthWrite:false})};
 if(town.theme==='kyoto'){mats.wood.color.set('#aca99d');mats.water.color.set('#839e86');mats.bank.color.set('#859d72')}
 const terrain=new T.SphereGeometry(R,96,72),colors=[],a=terrain.attributes.position;
 for(let i=0;i<a.count;i++){const x=a.getX(i),y=a.getY(i),z=a.getZ(i),k=.5+.25*Math.sin(x*.24+y*.16)+.15*Math.sin(z*.36-x*.19);const c=new T.Color('#8faa72').lerp(new T.Color('#c4d594'),k);colors.push(c.r,c.g,c.b)}terrain.setAttribute('color',new T.Float32BufferAttribute(colors,3));const globe=new T.Mesh(terrain,new T.MeshStandardMaterial({vertexColors:true,roughness:1}));globe.receiveShadow=true;planet.add(globe);
 function pose(p,forward){const up=p.clone().normalize(),f=forward.clone().projectOnPlane(up).normalize(),right=up.clone().cross(f).normalize();return new T.Matrix4().makeBasis(right,up,f).setPosition(p)}
 function localMatrix(c,x,y,z,yaw=0){return new T.Matrix4().compose(c.local(x,y,z),c.q.clone().multiply(new T.Quaternion().setFromAxisAngle(Y,yaw)),one)}
 function ancestor(o,n){for(let p=o;p;p=p.parent)if(p.name===n)return true;return false}
 function repeated(name,placements,filter=()=>true,tint=null){const root=library.getObjectByName(name);root.updateMatrixWorld(true);root.traverse(o=>{if(!o.isMesh||!filter(o))return;const material=o.material.clone();if(town.theme==='kyoto'&&/Blue ceramic/.test(material.name))material.color.set('#666d6c');if(material.transmission>0){material.transmission=0;material.transparent=true;material.opacity=.23;material.depthWrite=false;material.color.set('#cfebde')}
  const m=new T.InstancedMesh(o.geometry,material,placements.length);m.name=o.name;m.castShadow=!material.transparent;m.receiveShadow=true;placements.forEach((p,i)=>{m.setMatrixAt(i,p.clone().multiply(o.matrixWorld));if(/plaster/i.test(material.name))m.setColorAt(i,new T.Color((town.theme==='kyoto'?['#eee3cb','#ddd7c8','#d5c4aa','#e6dfd0']:['#fff6e4','#e7ead9','#efdac8','#e5e4dc'])[i%4]));if(tint&&/Foliage/.test(material.name)){material.color.set('#ffffff');m.setColorAt(i,new T.Color(tint[i%tint.length]))}});planet.add(m)})}
 repeated('House',town.cells.map(c=>new T.Matrix4().compose(c.p,c.q,one)),o=>!ancestor(o,'Door'));
 for(const c of town.cells){const g=new T.Group();g.position.copy(c.p);g.quaternion.copy(c.q);const d=library.getObjectByName('House').getObjectByName('Door').clone(true);d.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});g.add(d);planet.add(g);doors.push(d)}
 const bikes=[],posts=[];for(const c of town.cells){if(c.id%2===0)bikes.push(localMatrix(c,-4.15,.04,.6,Math.PI/2));if(c.id%5===0)posts.push(localMatrix(c,2.8,.03,4.5))}repeated('Bicycle',bikes);repeated('Post',posts);
 const geometries={road:[],paint:[],kerb:[],paving:[],bank:[],water:[],wood:[],ripple:[]};
 function boxAt(key,p,size,forward){const g=new T.BoxGeometry(...size);g.applyMatrix4(pose(p,forward));geometries[key].push(g)}
 function band(key,points,width,height=0){const vs=[];for(let i=0;i<points.length;i++){const p=points[i],f=points[Math.min(i+1,points.length-1)].clone().sub(points[Math.max(0,i-1)]),side=p.clone().normalize().cross(f).normalize();for(const s of [-1,1]){const v=p.clone().addScaledVector(side,s*width/2).normalize().multiplyScalar(p.length()+height);vs.push(...v.toArray())}}const indices=[];for(let i=0;i<points.length-1;i++){const k=i*2;indices.push(k,k+2,k+1,k+1,k+2,k+3)}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vs,3));g.setIndex(indices);g.computeVertexNormals();geometries[key].push(g.toNonIndexed())}
 const river=[];for(let i=0;i<=256;i++)river.push(riverPoint(i/256*Math.PI*2).multiplyScalar(R+.035));band('bank',river,5.8);band('water',river,3.5,.035);const walk=[];for(let i=0;i<=256;i++)walk.push(riverWalkPoint(i/256*Math.PI*2));band('paving',walk,1.05);
 const bridges=[];
 for(const e of town.edges){const points=[];for(let i=0;i<=40;i++)points.push(e.point(i/40));band('kerb',points,5.55,.005);band('paving',points,5.3,.018);band('road',points,3.55,.036);
  for(let i=1;i<40;i++){const t=i/40,p=e.point(t);if(Math.abs(riverDistance(p))<3.7){const f=e.point(Math.min(1,t+.01)).sub(e.point(Math.max(0,t-.01)));boxAt('wood',p.clone().normalize().multiplyScalar(p.length()+.064),[5.2,.06,e.length/40*1.13],f);for(const s of [-1,1]){const bank=e.point(t,s*2.52),n=bank.clone().normalize();if(i%2===0)boxAt('wood',bank.clone().addScaledVector(n,.53),[.12,1.0,.12],f);boxAt('wood',bank.clone().addScaledVector(n,.99),[.10,.10,e.length/40*1.08],f)}if(!bridges.includes(e.id))bridges.push(e.id)}}
 }
 for(const n of town.nodes){const e=town.edges[n.edges[0]],p=e.point(n.id===e.a?0:1),road=new T.CylinderGeometry(n.edges.length===3?2.1:1.85,n.edges.length===3?2.1:1.85,.014,20);road.applyMatrix4(pose(p.clone().addScaledVector(n.n,.037),e.tangent));geometries.road.push(road)}
 for(const c of town.cells){const slab=new T.BoxGeometry(7.55,.82,7.05);slab.applyMatrix4(localMatrix(c,0,-.40,.10));geometries.paving.push(slab);
  const start=town.graph[c.apron].p,end=town.graph[c.lane].p,points=[];for(let i=0;i<=8;i++){const t=i/8,p=start.clone().lerp(end,t),r=T.MathUtils.lerp(start.length(),end.length(),t);points.push(p.normalize().multiplyScalar(r))}band('paving',points,1.45,.025);
  if(c.id%2===0)for(let i=0;i<2;i++)boxAt('paint',c.local(-4.25,.06,.05+i*.85),[1.4,.015,.035],c.forward);
 }
 const trees=[],cherries=[],treeSites=[];
 function clear(p){if(town.cells.some(c=>c.p.distanceTo(p)<6.6))return false;return !town.edges.some(e=>town.distanceRoad(p,e)<4.7)}
 function plant(p,cherry,scale=1){if(Math.abs(riverDistance(p))<5.5||!clear(p)||treeSites.some(q=>q.distanceTo(p)<3.0))return;treeSites.push(p);const f=new T.Vector3(.2,.7,1).projectOnPlane(p.clone().normalize()).normalize(),m=pose(p,f).scale(new T.Vector3(scale,scale,scale));(cherry?cherries:trees).push(m)}
 for(let i=0;i<360;i++){const y=1-2*(i+.5)/360,a=i*2.3999632297+.15*Math.sin(i*2.1),r=Math.sqrt(1-y*y),p=new T.Vector3(r*Math.cos(a),y,r*Math.sin(a)).multiplyScalar(R+.035);if(Math.abs(riverDistance(p))>4.5)plant(p,i%5<2,.85+.28*(.5+.5*Math.sin(i*4.7)))}
 for(let i=0;i<76;i++){const t=i/76*Math.PI*2,center=riverPoint(t),f=riverPoint(t+.01).sub(center),side=center.clone().cross(f).normalize();for(const s of [-1,1]){const p=center.clone().multiplyScalar(R).addScaledVector(side,s*(5.2+1.1*Math.sin(i*2.7))).normalize().multiplyScalar(R+.04);plant(p,true,1.05+.18*Math.sin(i))}}
 const treeFilter=o=>!/Planter|Soil|Paved_courtyard/.test(o.name);repeated('Tree',trees,treeFilter,['#799a65','#a3b57a','#88a574']);repeated('Tree',cherries,treeFilter,['#e9b8c4','#f2cbd0','#f4d9d4','#dfacba']);
 const blossom=new T.InstancedMesh(new T.IcosahedronGeometry(1,2),new T.MeshStandardMaterial({color:'#f4c9d0',roughness:.95}),cherries.length*5);blossom.castShadow=true;blossom.receiveShadow=true;
 cherries.forEach((m,i)=>{for(let j=0;j<5;j++){const a=j*Math.PI*2/5,local=new T.Matrix4().compose(new T.Vector3(Math.cos(a)*.8,2.9+(j%2)*.4,Math.sin(a)*.7),new T.Quaternion(),new T.Vector3(.88,.63,.83));blossom.setMatrixAt(i*5+j,m.clone().multiply(local));blossom.setColorAt(i*5+j,new T.Color(['#f8d6d8','#efc0cb','#f5deda'][(i+j)%3]))}});planet.add(blossom);
 const flowers=[];for(let i=0;i<treeSites.length;i+=3){const p=treeSites[i],n=p.clone().normalize(),f=new T.Vector3(1,.2,.3).projectOnPlane(n).normalize();for(let j=0;j<5;j++){const q=p.clone().addScaledVector(f,1.5+j*.16).normalize().multiplyScalar(R+.16);flowers.push(pose(q,f))}}
 const flower=new T.InstancedMesh(new T.IcosahedronGeometry(.10,0),new T.MeshStandardMaterial({color:'#f1e5b1'}),flowers.length);flowers.forEach((m,i)=>flower.setMatrixAt(i,m));planet.add(flower);
 for(const [key,gs] of Object.entries(geometries)){if(!gs.length)continue;const clean=gs.map(g=>{const h=g.index?g.toNonIndexed():g;h.deleteAttribute('uv');return h}),m=new T.Mesh(mergeGeometries(clean),mats[key]);m.name='Landscape_'+key;m.receiveShadow=key!=='water'&&key!=='ripple';planet.add(m)}
 const details=addDetails(planet,town,treeSites,cherries);const place=town.theme==='kyoto'?addKyoto(planet,town,treeSites):null;
 function update(time,dt){details.update(time);doors.forEach((d,i)=>d.rotation.y=T.MathUtils.damp(d.rotation.y,doorTargets[i],8,dt));mats.ripple.opacity=.25+.12*Math.sin(time*.8);mats.water.roughness=.28+.035*Math.sin(time*.4)}
 return {planet,doors,doorTargets,update,pose,place,details:details.stats,landscape:{trees:trees.length,cherries:cherries.length,bridges:bridges.length,river:true}};
}
