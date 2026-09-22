import * as T from 'three';

// Metres in the existing Blender/Three.js scene. Keep the player within the
// authored pavement, shop aprons and real Boolean door openings.
export const PLAYER_RADIUS = .22;
export function makeWalkSurface(town, doorStates, obstacles = []) {
  const radius = PLAYER_RADIUS;
  const homes = new Set(town.homes.map(h => h.id));
  const frames = town.buildings.map(h => ({h, inverse: h.q.clone().invert()}));
  function local(p, frame) { return p.clone().sub(frame.h.p).applyQuaternion(frame.inverse); }
  function segment(p, a, b) {
    const dx=b.x-a.x, dz=b.z-a.z;
    const t=T.MathUtils.clamp(((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz || 1),0,1);
    return {t, distance:Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz)};
  }
  function sample(p) {
    let surface=null;
    for (const r of town.roads) for(let i=1;i<r.ps.length;i++) {
      const s=segment(p,r.ps[i-1],r.ps[i]);
      if(s.distance <= r.width/2-radius) {
        const at=r.at(r.lengths[i-1]+s.t*(r.lengths[i]-r.lengths[i-1]));
        if(!surface || s.distance<surface.distance) surface={y:at.y,stairs:!!r.steps,home:null,distance:s.distance};
      }
    }
    for(const h of town.homes) {
      const s=segment(p,town.graph[h.streetId].p,h.door);
      if(s.distance<.72-radius && (!surface || s.distance<surface.distance)) {
        surface={y:T.MathUtils.lerp(town.graph[h.streetId].p.y,h.p.y+.12*h.scale.y,s.t),stairs:false,home:null,distance:s.distance};
      }
    }
    for(const frame of frames) {
      const h=frame.h, q=local(p,frame), sx=h.scale.x, sz=h.scale.z;
      if(Math.abs(q.x)>3.08*sx+radius || Math.abs(q.z)>3.58*sz+radius) continue;
      if(!homes.has(h.id)) return null;
      const inDoor=q.x>1.105*sx+radius && q.x<2.195*sx-radius;
      const inside=q.x>-2.72*sx+radius && q.x<2.72*sx-radius && q.z>-1.66*sz+radius && q.z<3.28*sz-radius;
      const passage=inDoor && q.z>2.8*sz && q.z<3.75*sz+radius;
      if(!inside && !passage) return null;
      // The leaf remains solid until it has actually slid far enough away.
      if(q.z>3.34*sz-radius && q.z<3.61*sz+radius && doorStates[h.id]<.9) return null;
      // Native counters and display shelves occupy the left of the shop.
      if(q.x>-2.32*sx-radius && q.x<-1.08*sx+radius && q.z>-1.9*sz-radius && q.z<1.9*sz+radius) return null;
      if(q.x>-2.55*sx-radius && q.x<.04*sx+radius && q.z>2.63*sz-radius) return null;
      surface={y:h.p.y+.12*h.scale.y,stairs:false,home:h.id,distance:0};
    }
    if(!surface) return null;
    for(const o of obstacles) if(Math.hypot(p.x-o.x,p.z-o.z)<o.radius+radius) return null;
    return surface;
  }
  function move(position,delta) {
    // Swept short steps prevent tunnelling through a shut door at low FPS.
    const count=Math.max(1,Math.ceil(Math.hypot(delta.x,delta.z)/.07));
    const dx=delta.x/count,dz=delta.z/count;
    let surface=sample(position);
    for(let i=0;i<count;i++) {
      const attempts=[[dx,dz],[dx,0],[0,dz]];
      for(const [x,z] of attempts) {
        if(!x&&!z)continue;
        const candidate=position.clone().add(new T.Vector3(x,0,z)),s=sample(candidate);
        if(!s || (surface && Math.abs(s.y-surface.y)>.46))continue;
        position.x=candidate.x;position.z=candidate.z;surface=s;break;
      }
    }
    if(surface)position.y=surface.y;
    return surface;
  }
  function nearby(position) {
    const occupied=sample(position)?.home;
    return town.homes.map(h=>({h,d:Math.hypot(position.x-h.door.x,position.z-h.door.z)}))
      .filter(({h,d})=>{
        if(d>2.25 || Math.abs(position.y-h.door.y)>.7)return false;
        const q=position.clone().sub(h.p).applyQuaternion(h.q.clone().invert());
        return occupied===h.id || (q.z>=3.5*h.scale.z && Math.abs(q.x-1.65*h.scale.x)<1.7);
      }).sort((a,b)=>a.d-b.d)[0]?.h ?? null;
  }
  return {sample,move,nearby};
}

export function createExplorer(scene, resident, town, art) {
  const g=resident.clone(true);g.name='Your_traveller';g.visible=false;
  g.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.transparent=false;o.material.opacity=1;o.castShadow=true;o.receiveShadow=true;if(/Jacket/.test(o.material.name))o.material.color.set('#d6a25f')}});
  scene.add(g);
  const nav=makeWalkSurface(town,art.doorStates,art.obstacles);
  const player={g,nav,active:false,initialized:false,yaw:0,pitch:.22,distance:3.8,phase:0,speed:0,target:null,surface:null,heading:new T.Vector3(0,0,1),input:new T.Vector2(),keys:new Set(),distanceWalked:0};
  const limbs=['Leg_L','Leg_R','Arm_L','Arm_R'].map(n=>g.getObjectByName(n));
  player.clear=()=>{player.keys.clear();player.input.set(0,0);player.speed=0};
  player.start=()=>{
    if(!player.initialized){
      const r=town.roads.find(r=>r.id==='526198271');
      const candidates=[r.at(12),...town.roads.flatMap(road=>road.ids.map(id=>town.graph[id].p))];
      const p=candidates.find(p=>nav.sample(p));
      g.position.copy(p);player.surface=nav.sample(p);g.position.y=player.surface.y;
      const f=r.at(13).sub(r.at(12)).setY(0).normalize();player.heading.copy(f);player.yaw=Math.atan2(f.x,f.z);g.rotation.y=player.yaw;player.initialized=true;
    }
    player.clear();player.active=true;g.visible=true;player.target=nav.nearby(g.position);
  };
  player.stop=()=>{player.active=false;g.visible=false;player.target=null;player.clear()};
  player.update=(dt)=>{
    if(!player.active)return;
    const k=player.keys;
    const x=Number(k.has('KeyD')||k.has('ArrowRight'))-Number(k.has('KeyA')||k.has('ArrowLeft'))+player.input.x;
    const y=Number(k.has('KeyW')||k.has('ArrowUp'))-Number(k.has('KeyS')||k.has('ArrowDown'))+player.input.y;
    const input=new T.Vector2(x,y);if(input.length()>1)input.normalize();
    const forward=new T.Vector3(Math.sin(player.yaw),0,Math.cos(player.yaw));
    const right=new T.Vector3(-forward.z,0,forward.x);
    const direction=forward.multiplyScalar(input.y).addScaledVector(right,input.x);
    const before=g.position.clone(),delta=direction.multiplyScalar(dt*(player.surface?.stairs?1.2:1.9));
    const actual=g.position.clone();player.surface=nav.move(actual,delta)??player.surface;
    g.position.x=actual.x;g.position.z=actual.z;
    g.position.y=T.MathUtils.damp(g.position.y,actual.y,24,dt);
    const moved=actual.clone().sub(before).setY(0),distance=moved.length();
    player.speed=dt?distance/dt:0;player.distanceWalked+=distance;
    if(distance>.0001){player.heading.lerp(moved.normalize(),1-Math.exp(-dt*14)).normalize();g.rotation.y=Math.atan2(player.heading.x,player.heading.z)}
    player.phase+=distance*6.4;const swing=Math.sin(player.phase)*.32*Math.min(1,player.speed/.5);
    limbs.forEach((o,i)=>{if(o)o.rotation.x=T.MathUtils.damp(o.rotation.x,swing*(i%2?-1:1)*(i>1?-.7:1),18,dt)});
    player.target=nav.nearby(g.position);
  };
  return player;
}
