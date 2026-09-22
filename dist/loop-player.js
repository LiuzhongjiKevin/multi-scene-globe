import * as T from 'three';
import {makeWalkSurface} from './sannen-player.js';
export function createExplorer(scene, resident, town, art) {
  const g=resident.clone(true);g.name='Your_traveller';g.visible=false;
  g.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.transparent=false;o.material.opacity=1;o.castShadow=true;o.receiveShadow=true;if(/Jacket/.test(o.material.name))o.material.color.set('#d6a25f')}});
  scene.add(g);
  const base=makeWalkSurface(town,art.doorStates,art.obstacles),period=town.data.loop.length;
  const nav={...base,move(position,delta){
    const count=Math.max(1,Math.ceil(Math.hypot(delta.x,delta.z)/.07)),dx=delta.x/count,dz=delta.z/count;
    let surface=base.sample(position);
    for(let i=0;i<count;i++)for(const [x,z]of [[dx,dz],[dx,0],[0,dz]]){
      if(!x&&!z)continue;
      const p=position.clone().add(new T.Vector3(x,0,z));p.x=T.MathUtils.euclideanModulo(p.x,period);
      const next=base.sample(p);if(!next||(surface&&Math.abs(next.y-surface.y)>.46))continue;
      if(Math.abs(p.x-position.x)>period/2)player.laps++;
      position.copy(p);surface=next;break;
    }
    if(surface)position.y=surface.y;return surface;
  }};
  const player={g,nav,active:false,initialized:false,yaw:0,pitch:.22,distance:3.8,phase:0,speed:0,target:null,surface:null,heading:new T.Vector3(0,0,1),input:new T.Vector2(),keys:new Set(),distanceWalked:0,laps:0};
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
    const moved=actual.clone().sub(before).setY(0);if(moved.x>period/2)moved.x-=period;if(moved.x<-period/2)moved.x+=period;const distance=moved.length();
    player.speed=dt?distance/dt:0;player.distanceWalked+=distance;
    if(distance>.0001){player.heading.lerp(moved.normalize(),1-Math.exp(-dt*14)).normalize();g.rotation.y=Math.atan2(player.heading.x,player.heading.z)}
    player.phase+=distance*6.4;const swing=Math.sin(player.phase)*.32*Math.min(1,player.speed/.5);
    limbs.forEach((o,i)=>{if(o)o.rotation.x=T.MathUtils.damp(o.rotation.x,swing*(i%2?-1:1)*(i>1?-.7:1),18,dt)});
    player.target=nav.nearby(g.position);
  };
  return player;
}
