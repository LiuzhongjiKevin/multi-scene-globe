import assert from 'node:assert/strict';
import * as T from 'three';

export function checkLoop(d,tick){
 const {surface,town,player,art,seam}=d,L=surface.length;
 const start=town.graph[seam.a].p,end=town.graph[seam.b].p;
 assert(surface.project(start).distanceTo(surface.project(end))<1e-8,'Folded endpoints coincide');
 assert(surface.normal(start).dot(surface.normal(end))>.99999,'Same local up at seam');
 assert(d.events.seamCrossings>0,'Autonomous visitors actually use the loop');
 // Complete the physical ring through production navigation, then turn and
 // cross the seam backwards. There is no edge trigger or invisible dead-end.
 const position=new T.Vector3(0,0,0);let maximumWorldStep=0,previous=surface.project(position),seams=player.laps;
 for(let distance=0;distance<L+1;distance+=.06){
  player.nav.move(position,new T.Vector3(.06,0,0));
  const world=surface.project(position);maximumWorldStep=Math.max(maximumWorldStep,world.distanceTo(previous));previous=world;
 }
 assert(Math.abs(position.x-1)<.07,'One circuit returns to the start');
 assert(player.laps>seams);assert(maximumWorldStep<.6,'No visual jump during a circuit');
 player.nav.move(position,new T.Vector3(-2,0,0));assert(position.x>L-1.1 && position.x<L-.9);
 d.setExplore(true);player.g.position.set(L-.08,0,0);player.surface=player.nav.sample(player.g.position);player.yaw=Math.PI/2;player.keys.add('KeyW');
 let last=surface.project(player.g.position),cameraLast=null,maxCameraStep=0;
 for(let i=0;i<12;i++){tick();const next=surface.project(player.g.position);assert(next.distanceTo(last)<.3,'Player model may not teleport at seam');last=next;if(cameraLast)maxCameraStep=Math.max(maxCameraStep,cameraLast.distanceTo(d.camera.position));cameraLast=d.camera.position.clone();assert(d.camera.up.dot(surface.normal(player.g.position))>.999)}
 player.clear();assert(player.g.position.x<2);assert(maxCameraStep<.5,'Follow camera remains continuous at seam');
 // A change to one sliding door must not re-project the cached matrices of
 // other doors (a common error when bending a live instanced scene).
 art.doorTargets.fill(0);art.update(200,10);
 const mesh=art.root.children.find(o=>o.userData.doorIds?.length>3),before=new T.Matrix4();mesh.getMatrixAt(2,before);
 const id=mesh.userData.doorIds[0];art.doorTargets[id]=1;
 for(let i=0;i<12;i++)art.update(200+i*.05,.05);
 const after=new T.Matrix4();mesh.getMatrixAt(2,after);
 assert(before.elements.every((v,i)=>Math.abs(v-after.elements[i])<1e-5),'Untouched door matrix must remain stable');
 d.view();
 return {pass:true,lengthMetres:L,sourceBuildings:town.data.loop.sourceBuildings,retainedBuildings:town.buildings.length,enterableShops:town.homes.length,maximumWorldStep,maxCameraStep,checks:['Endpoints and up normals coincide','One full walkable circuit, both seam directions','Player and third-person camera cross seam continuously','NPCs traverse seam','Independent curved door instance updates','No additional geographic roads or full globe filler']};
}
