// Small reusable landscape details, batched by shape/material to keep draw calls bounded.
import * as T from 'three';
import {R,riverPoint,riverDistance,riverWalkPoint} from './town-network.js';
const UP=new T.Vector3(0,1,0);
export function addDetails(planet,town,treeSites,cherries){
 const palette={wood:'#af845a',steel:'#4e6260',stone:'#b1b4a0',pot:'#c88e76',leaf:'#789563',flower:'#ead5df',cream:'#eee8ca',soil:'#736750',light:'#ffe2a0'};
 const materials=Object.fromEntries(Object.entries(palette).map(([k,color])=>[k,new T.MeshStandardMaterial({color,roughness:k==='steel'?.55:.9})]));materials.light.emissive.set('#ffd292');materials.light.emissiveIntensity=2.1;
 const geometries={box:new T.BoxGeometry(1,1,1),cylinder:new T.CylinderGeometry(.5,.5,1,10),ball:new T.IcosahedronGeometry(.5,1)};
 const batches=new Map(),anchors=[],benchSites=[],lampSites=[];
 const frame=(p,f)=>{const n=p.clone().normalize(),z=f.clone().projectOnPlane(n).normalize(),x=n.clone().cross(z).normalize();return new T.Matrix4().makeBasis(x,n,z).setPosition(p)};
 function part(key,shape,base,p,size){const matrix=base.clone().multiply(new T.Matrix4().compose(new T.Vector3(...p),new T.Quaternion(),new T.Vector3(...size))),id=key+':'+shape;if(!batches.has(id))batches.set(id,[]);batches.get(id).push(matrix)}
 function safe(p,space=.8){return !town.cells.some(c=>c.p.distanceTo(p)<6.1+space)&&!treeSites.some(q=>q.distanceTo(p)<1.25+space)&&!anchors.some(q=>q.distanceTo(p)<2.1+space)&&!town.edges.some(e=>town.distanceRoad(p,e)<3.0+space)}
 // Seats face the water, placed outside the walking strip and away from trees.
 for(let i=0;i<32;i++){const t=i/32*Math.PI*2,p=riverWalkPoint(t),n=p.clone().normalize(),out=p.clone().sub(riverPoint(t).multiplyScalar(R)).projectOnPlane(n).normalize();p.addScaledVector(out,1.15).normalize().multiplyScalar(R+.025);if(!safe(p,.1))continue;
  const m=frame(p,out.negate());anchors.push(p);benchSites.push(p);
  for(let j=0;j<4;j++)part('wood','box',m,[0,.49,-.22+j*.14],[1.65,.065,.12]);for(let j=0;j<3;j++)part('wood','box',m,[0,.73+j*.12,-.29],[1.65,.095,.055]);
  for(const x of [-.62,.62]){part('steel','box',m,[x,.24,0],[.07,.48,.50]);part('steel','box',m,[x,.78,-.30],[.055,.70,.06]);part('steel','box',m,[x,.67,.015],[.075,.055,.51]);part('steel','box',m,[x,.58,.22],[.055,.20,.055])}
  part('stone','box',m,[0,-.035,0],[1.95,.09,1.0]);
 }
 // Warm lanterns placed along residential lanes; no unbounded collection of dynamic lights.
 for(const e of town.edges){const t=e.id%2?.38:.65,p=e.point(t,e.id%2?3.7:-3.7).normalize().multiplyScalar(R+.025);if(Math.abs(riverDistance(p))<5||!safe(p,.05))continue;const m=frame(p,e.tangent);anchors.push(p);lampSites.push(p);
  part('stone','cylinder',m,[0,.07,0],[.36,.14,.36]);part('steel','cylinder',m,[0,1.65,0],[.08,3.3,.08]);part('steel','box',m,[0,3.26,.2],[.07,.08,.48]);part('steel','box',m,[0,3.19,.38],[.45,.07,.40]);part('light','box',m,[0,3.07,.38],[.27,.18,.24]);part('steel','box',m,[0,2.96,.38],[.35,.045,.31]);
 }
 // Potted porch flowers, low garden shrubs and individual entrance plaques.
 for(const c of town.cells){const m=new T.Matrix4().compose(c.p,c.q,new T.Vector3(1,1,1));
  for(const x of [-2.2,-.8]){part('pot','cylinder',m,[x,.53,3.62],[.35,.38,.35]);part('soil','cylinder',m,[x,.72,3.62],[.29,.025,.29]);part('leaf','ball',m,[x,.83,3.62],[.45,.29,.43]);for(let j=0;j<3;j++)part(c.id%3?'flower':'cream','ball',m,[x+Math.cos(j*2.1)*.14,.99+(j%2)*.04,3.62+Math.sin(j*2.1)*.1],[.12,.10,.12])}
  const p=c.local(4.3,0,-1.4).normalize().multiplyScalar(R+.015),garden=frame(p,c.forward);part('stone','box',garden,[0,.10,0],[.8,.2,2.1]);for(let j=0;j<4;j++)part('leaf','ball',garden,[0,.35,-.75+j*.5],[.73,.62,.71]);
  part('steel','box',m,[-1.7,1.75,3.16],[.33,.16,.035]);for(let j=0;j<2+c.id%3;j++)part('cream','box',m,[-1.8+j*.065,1.75,3.182],[.025,.075,.006]);
 }
 // Small utility covers set into the lane surface.
 for(const e of town.edges){const p=e.point(.48);if(Math.abs(riverDistance(p))<5)continue;const m=frame(p,e.tangent);part('steel','cylinder',m,[0,.04,0],[.46,.012,.46]);for(let j=-2;j<=2;j++)part('stone','box',m,[j*.058,.048,0],[.012,.004,.29])}
 for(const [id,list] of batches){const [key,shape]=id.split(':'),mesh=new T.InstancedMesh(geometries[shape],materials[key],list.length);mesh.name='Detail_'+id;list.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.castShadow=key!=='light';mesh.receiveShadow=true;planet.add(mesh)}
 // Local falling petals follow each tree's own radial up direction, including the underside.
 const count=Math.min(240,cherries.length*3),petals=new T.InstancedMesh(new T.IcosahedronGeometry(.07,0),new T.MeshStandardMaterial({color:'#ffd8e3',roughness:1,side:T.DoubleSide}),count);petals.name='Falling_sakura';petals.instanceMatrix.setUsage(T.DynamicDrawUsage);planet.add(petals);
 const ripples=new T.InstancedMesh(new T.BoxGeometry(1,.007,1),new T.MeshBasicMaterial({color:'#e2f0d7',transparent:true,opacity:.33,depthWrite:false}),72);ripples.name='Flowing_water';ripples.instanceMatrix.setUsage(T.DynamicDrawUsage);planet.add(ripples);
 const q=new T.Quaternion(),m=new T.Matrix4(),pos=new T.Vector3(),scale=new T.Vector3();
 let lastTick=-1;
 function update(time){const tick=Math.floor(time*30);if(tick===lastTick)return;lastTick=tick;
  for(let i=0;i<count;i++){const f=(time*.075+i*.61803398875)%1;pos.set(Math.sin(i*2.4+time*.45)*.9+f*.7,3.8-f*3.7,Math.cos(i*1.7+time*.3)*.9);q.setFromEuler(new T.Euler(time*.9+i,time*.7+i*.2,time*.45));scale.set(.6,.16,1);m.compose(pos,q,scale).premultiply(cherries[i%cherries.length]);petals.setMatrixAt(i,m)}petals.instanceMatrix.needsUpdate=true;
  for(let i=0;i<72;i++){const t=i/72*Math.PI*2+time*.002,n=riverPoint(t),f=riverPoint(t+.005).sub(n),side=n.clone().cross(f).normalize(),p=n.multiplyScalar(R).addScaledVector(side,Math.sin(i*2.1)*1.2).normalize().multiplyScalar(R+.092);m.copy(frame(p,f));m.scale(scale.set(.12+.07*Math.sin(i),1,.23+(i%3)*.18));ripples.setMatrixAt(i,m)}ripples.instanceMatrix.needsUpdate=true;
 }
 update(0);
 return {update,stats:{benches:benchSites.length,lanterns:lampSites.length,porchPlanters:town.cells.length*2,petals:count},anchors};
}
