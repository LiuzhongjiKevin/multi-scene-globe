import * as T from 'three';

export function createLoopSurface(length){
 const radius=length/(Math.PI*2),up=new T.Vector3(0,1,0);
 function project(p){
  const theta=p.x/length*Math.PI*2;
  const latitude=.3*Math.sin(theta)+.22*Math.sin(theta*2)+.12*Math.cos(theta*3);
  const phi=latitude+.92*Math.atan(p.z/radius);
  const r=radius*(1+.045*Math.sin(theta*3)+.025*Math.sin(theta*2)) + p.y;
  return new T.Vector3(Math.sin(theta)*Math.cos(phi)*r*1.04,Math.cos(theta)*Math.cos(phi)*r*.96,Math.sin(phi)*r);
 }
 function frame(p){
  const x=project(p.clone().add(new T.Vector3(.025,0,0))).sub(project(p.clone().add(new T.Vector3(-.025,0,0)))).multiplyScalar(20);
  const z=project(p.clone().add(new T.Vector3(0,0,.025))).sub(project(p.clone().add(new T.Vector3(0,0,-.025)))).multiplyScalar(20);
  const y=project(p.clone().add(up)).sub(project(p)).normalize();
  return new T.Matrix4().makeBasis(x,y,z).setPosition(project(p));
 }
 function matrix(m){const p=new T.Vector3().setFromMatrixPosition(m),basis=m.clone();basis.setPosition(0,0,0);return frame(p).multiply(basis)}
 function normal(p){return project(p.clone().add(up)).sub(project(p)).normalize()}
 function direction(p,d){return d.clone().transformDirection(frame(p))}
 function actor(g){g.updateMatrix();g.matrix.copy(matrix(g.matrix));g.matrixAutoUpdate=false;g.matrixWorldNeedsUpdate=true}
 function bendArt(art){
  const dynamic=[];const temp=new T.Matrix4();
  // Back only the existing terrain footprint. The uncharted globe stays empty,
  // while an oblique orbit sees earth under the diorama rather than shop floors.
  const ground=art.root.children.find(o=>o.isMesh&&!o.isInstancedMesh&&o.geometry.attributes.color);
  if(ground){
   const geometry=ground.geometry.clone(),positions=geometry.attributes.position;
   for(let i=0;i<positions.count;i++)positions.setY(i,-7);
   const ids=geometry.index.array;for(let i=0;i<ids.length;i+=3){const t=ids[i+1];ids[i+1]=ids[i+2];ids[i+2]=t}
   const backing=new T.Mesh(geometry,new T.MeshStandardMaterial({name:'Terrain_backing',color:'#756253',roughness:1}));backing.name='Mapped_terrain_backing';backing.receiveShadow=true;art.root.add(backing);
  }
  for(const o of art.root.children){
   if(o.isInstancedMesh){
    const originals=Array.from({length:o.count},(_,i)=>{o.getMatrixAt(i,temp);return temp.clone()});
    const entry={o,originals,version:o.instanceMatrix.version,states:o.userData.doorIds?.map(id=>art.doorStates[id])};
    function bend(entry){entry.originals.forEach((m,i)=>entry.o.setMatrixAt(i,matrix(m)));entry.o.instanceMatrix.needsUpdate=true;entry.version=entry.o.instanceMatrix.version;entry.o.computeBoundingSphere()}
    entry.bend=bend;bend(entry);
    if(o.userData.doorIds||o.name==='Petals')dynamic.push(entry);
   }else if(o.isMesh){
    o.updateMatrix();const m=o.matrix.clone();o.geometry=o.geometry.clone();const pos=o.geometry.attributes.position;
    for(let i=0;i<pos.count;i++){const p=new T.Vector3().fromBufferAttribute(pos,i).applyMatrix4(m);const q=project(p);pos.setXYZ(i,q.x,q.y,q.z)}
    o.position.set(0,0,0);o.rotation.set(0,0,0);o.scale.set(1,1,1);pos.needsUpdate=true;o.geometry.computeVertexNormals();o.geometry.computeBoundingSphere();
   }else if(o.isLight)o.position.copy(project(o.position));
  }
  const originalUpdate=art.update;
  // A plain, irregular earth support is scenery underside, never extra map:
  // no paths, houses, vegetation or walk surface are added to uncharted areas.
  const coreGeometry=new T.IcosahedronGeometry(radius*.79,3),cp=coreGeometry.attributes.position;
  for(let i=0;i<cp.count;i++){
   const p=new T.Vector3().fromBufferAttribute(cp,i),theta=Math.atan2(p.x,p.y),v=p.z/radius;
   const wobble=1+.045*Math.sin(3*theta)+.025*Math.cos(5*theta+v*3);
   cp.setXYZ(i,p.x*wobble*1.04,p.y*wobble*.96,p.z*wobble*.86);
  }
  coreGeometry.computeVertexNormals();
  const core=new T.Mesh(coreGeometry,new T.MeshStandardMaterial({name:'Unmapped_earth_support',color:'#67694f',roughness:1,flatShading:true}));core.name='Unmapped_structural_base';core.castShadow=true;core.receiveShadow=true;art.root.add(core);
  art.update=(time,dt)=>{
   originalUpdate(time,dt);
   for(const entry of dynamic){if(entry.o.instanceMatrix.version===entry.version)continue;for(let i=0;i<entry.o.count;i++){if(entry.states){const value=art.doorStates[entry.o.userData.doorIds[i]];if(value===entry.states[i])continue;entry.states[i]=value}entry.o.getMatrixAt(i,temp);entry.originals[i].copy(temp)}entry.bend(entry)}
  };
 }
 return {length,radius,project,frame,matrix,normal,direction,actor,bendArt};
}
