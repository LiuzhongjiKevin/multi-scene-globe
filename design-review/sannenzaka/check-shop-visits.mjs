import assert from 'node:assert/strict';

export function checkShopVisits(d,tick){
  const walkers=d.people.filter(p=>!p.visitsShops);
  assert(walkers.every(p=>p.g.visible),'Street-only pedestrians remain visible during normal simulation');
  for(const p of walkers)for(let i=0;i<p.path.length-1;i++){
    const edge=d.town.graph[p.path[i]].links.find(e=>e.to===p.path[i+1]);
    assert.notEqual(edge.kind,'door','Street-only routes never pass through shops');
  }
  const saved=d.people.map(p=>({p,state:{...p},position:p.g.position.clone(),visible:p.g.visible}));
  const defaults=[...d.art.doorDefaults];
  // Isolate one real pedestrian on an actual mapped entrance, keeping the production frame loop.
  for(const p of d.people){p.wait=100000;p.g.visible=false}
  const p=d.people.find(p=>p.visitsShops),h=d.town.homes[2];
  Object.assign(p,{path:[h.streetId,h.doorId,h.inId],index:0,u:0,wait:0,entering:true,from:d.town.homes[3].id,to:h.id,walkSpeed:0,laneOffset:0,alpha:1});
  p.g.position.copy(d.town.graph[h.streetId].p);p.g.visible=true;
  d.art.doorDefaults[h.id]=0;d.art.doorStates[h.id]=0;
  // Put the visitor just outside the threshold so the closed-door wait is observable.
  p.index=1;p.g.position.copy(h.door);
  const outside=p.g.position.clone();tick();
  assert(p.g.position.distanceTo(outside)<.001,'Visitor must wait outside a closed door');
  assert(d.art.doorTargets[h.id]===1,'Visitor requests opening before entering');
  let crossed=false,disappeared=false;
  for(let i=0;i<250;i++){
    tick();
    const local=p.g.position.clone().sub(h.p).applyQuaternion(h.q.clone().invert());
    if(p.g.visible&&local.z<3.4*h.scale.z){crossed=true;assert(d.art.doorStates[h.id]>.8,'Door stays open while the visitor crosses')}
    if(!p.g.visible){assert(local.z<=2.61*h.scale.z,'Visitor disappears only after reaching the shop interior');disappeared=true;break}
  }
  assert(crossed&&disappeared,'Visitor visibly crosses the threshold and disappears inside');
  for(let i=0;i<35;i++)tick();
  assert(d.art.doorStates[h.id]<.01,'Shop door closes after the visitor is fully inside');
  assert(!p.g.visible,'Visitor remains hidden inside after the door closes');
  // A shop that starts open is also closed after its next visit.
  Object.assign(p,{index:1,u:0,wait:0,entering:true,walkSpeed:0,alpha:1});
  p.g.position.copy(h.door);p.g.visible=true;d.art.doorDefaults[h.id]=1;d.art.doorStates[h.id]=1;
  for(let i=0;i<250&&p.g.visible;i++)tick();
  assert(!p.g.visible);
  for(let i=0;i<35;i++)tick();
  assert(d.art.doorStates[h.id]<.01,'Initially open shops also close after entry');
  // A manually opened door still closes after the visitor finishes entering.
  Object.assign(p,{index:1,u:0,wait:0,entering:true,walkSpeed:0,alpha:1});
  p.g.position.copy(h.door);p.g.visible=true;d.art.doorDefaults[h.id]=0;d.art.doorStates[h.id]=0;
  d.toggleDoor(h.id);
  for(let i=0;i<250&&p.g.visible;i++)tick();
  assert(!p.g.visible);
  for(let i=0;i<35;i++)tick();
  assert(d.art.doorStates[h.id]<.01,'A previous manual opening must not delay closing after entry');
  // Two visitors share an entrance: the first arrival must not close it onto the second.
  const second=d.people.find(other=>other!==p&&other.visitsShops);
  for(const [visitor,speed]of [[p,2],[second,.25]]){
    Object.assign(visitor,{path:[h.doorId,h.inId],index:0,u:0,wait:0,entering:true,from:d.town.homes[3].id,to:h.id,walkSpeed:0,laneOffset:0,alpha:1,speed});
    visitor.g.position.copy(h.door);visitor.g.visible=true;
  }
  d.art.doorStates[h.id]=1;
  for(let i=0;i<100&&p.g.visible;i++)tick();
  assert(!p.g.visible&&second.g.visible,'Faster visitor finishes while the second is still crossing');
  for(let i=0;i<250&&second.g.visible;i++){assert(d.art.doorStates[h.id]>.8,'Shared door stays open until both visitors are inside');tick()}
  assert(!second.g.visible);
  for(let i=0;i<35;i++)tick();
  assert(d.art.doorStates[h.id]<.01,'Shared door closes after the last visitor');
  for(const {p,state,position,visible}of saved){Object.assign(p,state);p.g.position.copy(position);p.g.visible=visible;p.g.traverse(o=>{if(o.isMesh)o.material.opacity=p.alpha})}
  d.art.doorDefaults.splice(0,defaults.length,...defaults);
  return {pass:true,checks:['Street-only walkers avoid doors and remain visible','Visitors wait for closed doors','Visible threshold crossing precedes disappearance','Doors close after entry, including initially open shops','Manual openings close after a completed visit','Shared doors stay open until the last visitor crosses']};
}
