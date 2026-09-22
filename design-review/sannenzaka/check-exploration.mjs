import assert from 'node:assert/strict';
import * as T from 'three';

export function checkExploration(d, dom, listeners, pointer, tick) {
  const checks=[],p=d.player,nav=p.nav;
  const key=(code,key)=>({code,key,preventDefault(){}});
  d.setExplore(true);tick();
  assert(p.active&&p.g.visible&&!d.state.follow);
  const start=p.g.position.clone();
  listeners.keydown(key('KeyW','w'));for(let i=0;i<15;i++)tick();listeners.keyup(key('KeyW','w'));
  assert(p.g.position.distanceTo(start)>.5,'Keyboard must move the player, not a selected NPC');
  const stopped=p.g.position.clone();for(let i=0;i<4;i++)tick();
  assert(Math.hypot(p.g.position.x-stopped.x,p.g.position.z-stopped.z)<1e-8);
  const saved=p.g.position.clone();d.setExplore(false);d.setExplore(true);assert(p.g.position.equals(saved));
  checks.push('Independent player moves with WASD and keeps its position between modes');

  const yaw=p.yaw,clicks=d.events.doorClicks;
  pointer.pointerdown({clientX:600,clientY:350,pointerId:3,button:0});
  pointer.pointermove({clientX:660,clientY:390,pointerId:3});
  pointer.pointerup({clientX:660,clientY:390,pointerId:3});
  assert.notEqual(p.yaw,yaw);assert.equal(d.events.doorClicks,clicks);
  checks.push('Drag rotates the third-person camera without triggering an interaction');

  const stick=dom.get('#joystick').handlers;
  stick.pointerdown({clientX:80,clientY:520,pointerId:10,preventDefault(){}});assert(p.input.y>.9);
  const beforeTouch=p.g.position.clone();for(let i=0;i<10;i++)tick();assert(p.g.position.distanceTo(beforeTouch)>.25);
  stick.pointerup({pointerId:10});assert.equal(p.input.length(),0);
  stick.pointerdown({clientX:80,clientY:520,pointerId:11,preventDefault(){}});stick.pointercancel({pointerId:11});assert.equal(p.input.length(),0);
  listeners.keydown(key('KeyW','w'));listeners.blur();assert.equal(p.keys.size,0);
  checks.push('Touch joystick moves and releases; pointer cancellation and window blur clear input');

  // Actual map and actual art obstacles: all real street centerlines remain traversable.
  for(const road of d.town.roads) {
    const pos=road.at(0);assert(nav.sample(pos));
    for(let s=.06;s<=road.length+.06;s+=.06){
      const target=road.at(Math.min(s,road.length));nav.move(pos,target.clone().sub(pos));
      assert(Math.hypot(pos.x-target.x,pos.z-target.z)<.005,`Street ${road.id} blocked at ${s}`);
    }
    assert(Math.abs(pos.y-road.at(road.length).y)<.01);
    if(road.steps)for(let s=road.length;s>=0;s-=.06){const target=road.at(s);nav.move(pos,target.clone().sub(pos));assert(Math.hypot(pos.x-target.x,pos.z-target.z)<.005,'Downstairs route blocked')}
  }
  checks.push('All eight street centerlines and both stair flights work, ascending and descending');

  // Use every shop, including the narrowest mapped door. Do not teleport through
  // a doorway: sweep from the apron across the actual wall plane in both directions.
  for(const home of d.town.homes) {
    const from=home.local(1.65,0,4.2),inside=home.local(1.65,0,2.5);
    assert(nav.sample(from),`Apron ${home.id} must be reachable`);
    d.art.doorStates[home.id]=0;
    const blocked=from.clone();nav.move(blocked,inside.clone().sub(blocked));
    const local=blocked.clone().sub(home.p).applyQuaternion(home.q.clone().invert());
    assert(local.z>3.6*home.scale.z,'Closed door must stop the player outside');
    d.art.doorStates[home.id]=1;
    const approach=d.town.graph[home.streetId].p.clone();
    nav.move(approach,home.door.clone().sub(approach));
    assert(Math.hypot(approach.x-home.door.x,approach.z-home.door.z)<.1,`Shop ${home.id} must connect to its street`);
    nav.move(blocked,inside.clone().sub(blocked));
    assert(Math.hypot(blocked.x-inside.x,blocked.z-inside.z)<.01,`Open door ${home.id} must admit the player`);
    assert.equal(nav.sample(blocked).home,home.id);
    nav.move(blocked,from.clone().sub(blocked));
    assert(Math.hypot(blocked.x-from.x,blocked.z-from.z)<.01,`Player can leave shop ${home.id}`);
    d.art.doorStates[home.id]=0;
  }
  const home=d.town.homes[1];
  for(const local of [[-2.92,0,0],[2.92,0,0],[0,0,-1.8],[-1.7,0,0],[-1.25,0,3],[0,0,3.42]])assert.equal(nav.sample(home.local(...local)),null,'Walls, counters and display glass are solid');
  const far=new T.Vector3(10000,0,10000);assert.equal(nav.sample(far),null);assert.equal(nav.nearby(far),null);
  checks.push('All 39 open shop doors allow entry and exit; closed doors, walls, counters and scene edges block traversal');

  p.g.position.copy(home.local(1.65,.12,4.2));p.surface=nav.sample(p.g.position);p.update(0);
  assert.equal(p.target?.id,home.id);
  const clickBefore=d.events.doorClicks;
  pointer.pointerdown({clientX:640,clientY:400,pointerId:20,button:2});pointer.pointerup({clientX:640,clientY:400,pointerId:20});assert.equal(d.events.doorClicks,clickBefore);
  pointer.pointerdown({clientX:640,clientY:400,pointerId:21,button:0});pointer.pointerup({clientX:640,clientY:400,pointerId:21});assert.equal(d.events.doorClicks,clickBefore+1);
  assert.equal(dom.get('#interaction-prompt').hidden,false);
  for(let i=0;i<18;i++)tick();assert(d.art.doorStates[home.id]>.9);
  const doorPosition=home.local(1.65,.12,3.48);p.g.position.copy(doorPosition);p.surface=nav.sample(doorPosition);
  d.interact();for(let i=0;i<16;i++)tick();assert(d.art.doorStates[home.id]>.9,'Door may not close into a player standing in its opening');
  p.g.position.copy(far);p.update(0);const farClicks=d.events.doorClicks;d.interact();assert.equal(d.events.doorClicks,farClicks);assert.equal(dom.get('#interact').disabled,true);
  p.g.position.copy(saved);p.surface=nav.sample(saved);p.update(0);
  checks.push('Nearby prompt, left-click action, range limit and occupied-door safety use production callbacks');

  dom.get('#pause').click();const paused=p.g.position.clone();listeners.keydown(key('KeyW','w'));for(let i=0;i<6;i++)tick();assert(p.g.position.equals(paused));listeners.keyup(key('KeyW','w'));dom.get('#pause').click();
  d.setFollow(true);assert(!p.active&&!p.g.visible&&d.state.follow);d.setExplore(true);assert(p.active&&!d.state.follow);
  listeners.keydown(key('Escape','Escape'));assert(!p.active&&!d.state.follow);
  checks.push('Pause, follow mode and Escape switch cleanly without leaving movement active');
  return {pass:true,checks,limitations:'Node production-logic checks with DOM/renderer stubs; no browser GPU or touch-device visual validation.'};
}
