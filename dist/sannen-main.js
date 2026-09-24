import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {makeDistrict,route} from './sannen-network.js';
import {buildDistrict} from './sannen-scene.js';
import {createExplorer} from './sannen-player.js';
const $=s=>document.querySelector(s),scene=new T.Scene();
const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;$('#world').appendChild(renderer.domElement);
const bg=document.createElement('canvas');bg.width=4;bg.height=512;const ctx=bg.getContext('2d'),gradient=ctx.createLinearGradient(0,0,0,512);gradient.addColorStop(0,'#535c70');gradient.addColorStop(.5,'#b59a8f');gradient.addColorStop(1,'#efd4af');ctx.fillStyle=gradient;ctx.fillRect(0,0,4,512);const tex=new T.CanvasTexture(bg);tex.colorSpace=T.SRGBColorSpace;scene.background=tex;scene.fog=new T.Fog('#c8b4a1',300,650);
scene.add(new T.HemisphereLight('#ffe8c8','#777d71',2.1));const sun=new T.DirectionalLight('#ffd19c',3.2);sun.position.set(-100,130,30);sun.target.position.set(-35,0,40);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-140,right:140,top:140,bottom:-140,near:1,far:400});sun.shadow.normalBias=.035;scene.add(sun,sun.target);const fill=new T.DirectionalLight('#aebddd',.7);fill.position.set(80,40,-80);scene.add(fill);
const camera=new T.PerspectiveCamera(40,innerWidth/innerHeight,.08,1000);const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.enablePan=true;controls.minDistance=5;controls.maxDistance=460;controls.minPolarAngle=.2;controls.maxPolarAngle=Math.PI*.48;controls.autoRotate=false;controls.autoRotateSpeed=.18;
const loader=new GLTFLoader();const [data,native,residents]=await Promise.all([fetch('./assets/sannenzaka/map.json').then(r=>{if(!r.ok)throw Error('Map unavailable');return r.json()}),loader.loadAsync('./assets/sannenzaka/architecture.glb'),loader.loadAsync('./assets/town-assets.glb')]);
const town=makeDistrict(data),art=buildDistrict(scene,town,native.scene,residents.scene),people=[],events={arrivals:0,departures:0,doorClicks:0,doorWaitFrames:0,stairFrames:0},manualDoors=new Map(),up=new T.Vector3(0,1,0);let follow=false,selected=0,paused=false,simTime=0,lastTime=0,lookYaw=0,cameraSnap=true;
const player=createExplorer(scene,residents.scene.getObjectByName('Resident'),town,art);
let down=null,stickId=null;
function leaveExplore(){down=null;player.stop();document.body.classList.remove('exploring');$('#explore').setAttribute('aria-pressed','false');$('#explore').textContent='自由探索';$('#explore-hud').hidden=true;resetJoystick()}
function view(name='overview'){leaveExplore();follow=false;document.body.classList.remove('following');$('#follow').setAttribute('aria-pressed','false');controls.enabled=true;camera.up.copy(up);const s=town.roads.find(r=>r.id==='179116810'),n=town.roads.find(r=>r.id==='30882783'),west=town.roads.find(r=>r.id==='710696944');const views={overview:{p:[-228,220,335],t:[-40,6,42]},ninen:{p:n.at(n.length-1).add(new T.Vector3(0,2.65,0)).toArray(),t:town.roads[0].at(town.roads[0].length-18).add(new T.Vector3(0,1,0)).toArray()},sannen:{p:s.at(1).add(new T.Vector3(0,2.5,0)).toArray(),t:town.roads.find(r=>r.id==='526198271').at(35).add(new T.Vector3(0,1,0)).toArray()},yasaka:{p:west.at(west.length*.42).add(new T.Vector3(0,2.8,0)).toArray(),t:[town.data.pagoda[0],15,town.data.pagoda[2]]}};const v=views[name]??views.overview;camera.position.set(...v.p);controls.target.set(...v.t);if(name==='overview'&&innerWidth<700)camera.position.sub(controls.target).multiplyScalar(1.35).add(controls.target);camera.lookAt(controls.target);controls.update();$('#instructions').textContent='拖动环视 · 滚轮缩放 · 点击店门';document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===name)))}
view('sannen');
function chooseHome(seed,except){
 const homes=town.homes,previous=town.buildings[except];
 for(let i=0;i<homes.length;i++){const h=homes[(seed+i)%homes.length];if(h.id!==except&&h.streetId!==previous?.streetId)return h}
 return homes[seed%homes.length];
}
function nextWalk(p,fromInside=false){
 p.from=p.to;const from=town.buildings[p.from],to=chooseHome(Math.floor(Math.random()*town.homes.length),p.from);
 p.to=to.id;p.trips++;p.entering=p.visitsShops&&p.trips%3===0;
 p.path=route(town.graph,fromInside?from.inId:from.streetId,p.entering?to.inId:to.streetId);
 p.index=0;p.u=0;p.walkSpeed=0;
 p.g.position.copy(town.graph[p.path[0]].p);p.g.visible=true;
}
for(let i=0;i<30;i++){const g=residents.scene.getObjectByName('Resident').clone(true);g.name='Visitor_'+i;g.scale.setScalar(.95+(i%4)*.035);g.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.transparent=true;if(/Jacket/.test(o.material.name))o.material.color.set(['#7d9894','#c79b76','#a79cb7','#a8ac81','#b86e65','#77738b'][i%6]);o.castShadow=true;o.receiveShadow=true}});scene.add(g);const from=chooseHome(i*7),to=chooseHome(i*13+11,from.id),visitsShops=i%3===0,path=route(town.graph,from.streetId,visitsShops?to.inId:to.streetId),index=Math.min(path.length-2,Math.max(1,Math.floor(path.length*((i*.618)%1))));const a=town.graph[path[index]].p,b=town.graph[path[index+1]].p;g.position.copy(a);const f=b.clone().sub(a).setY(0).normalize();g.rotation.y=Math.atan2(f.x,f.z);people.push({g,path,index,u:0,from:from.id,to:to.id,speed:.86+(i%7)*.065,wait:0,phase:i*.71,f,alpha:1,limbs:['Leg_L','Leg_R','Arm_L','Arm_R'].map(n=>g.getObjectByName(n)),lane:.55+(i%3)*.08,walkSpeed:0,mode:"walking",visitsShops,entering:visitsShops,trips:0})}
function setFollow(value){leaveExplore();if(value&&!people[selected].g.visible)selected=Math.max(0,people.findIndex(p=>p.g.visible));follow=value;document.body.classList.toggle('following',value);$('#follow').setAttribute('aria-pressed',String(value));controls.enabled=!value;cameraSnap=true;lookYaw=0;if(value)$('#instructions').textContent='跟随行人 · 拖动观察 · Esc 返回全景';else view()}
function setExplore(value){
 if(!value){view();return}
 follow=false;document.body.classList.remove('following');$('#follow').setAttribute('aria-pressed','false');
 player.start();controls.enabled=false;controls.autoRotate=false;$('#rotate').setAttribute('aria-pressed','false');cameraSnap=true;
 document.body.classList.add('exploring');$('#explore').setAttribute('aria-pressed','true');$('#explore').textContent='退出探索';$('#explore-hud').hidden=false;
 document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed','false'));
 $('#instructions').textContent=matchMedia('(pointer: coarse)').matches?'左侧摇杆移动 · 拖动画面环视 · 靠近店门轻触交互':'WASD / 方向键移动 · 拖动环视 · 左键交互 · Esc 全景';
 updatePrompt();
}
$('#explore').onclick=()=>setExplore(!player.active);
$('#follow').onclick=()=>setFollow(!follow);$('#next-person').onclick=()=>{for(let i=1;i<=people.length;i++){const next=(selected+i)%people.length;if(people[next].g.visible){selected=next;break}}lookYaw=0;cameraSnap=true;if(!follow)setFollow(true)};$('#home').onclick=()=>view();$('#pause').onclick=()=>{paused=!paused;$('#pause').setAttribute('aria-pressed',String(paused));$('#pause').textContent=paused?'继续散步':'暂停动画'};$('#rotate').onclick=()=>{controls.autoRotate=!controls.autoRotate;$('#rotate').setAttribute('aria-pressed',String(controls.autoRotate))};document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>view(b.dataset.view));
const raycaster=new T.Raycaster(),mouse=new T.Vector2();
renderer.domElement.addEventListener('pointerdown',e=>{
 if(e.button!==undefined && e.button!==0 && e.button!==2)return;
 down={id:e.pointerId,button:e.button??0,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,dragged:false};
 if(follow||player.active)renderer.domElement.setPointerCapture(e.pointerId);
});
renderer.domElement.addEventListener('pointermove',e=>{
 if(!down||e.pointerId!==down.id)return;
 if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)down.dragged=true;
 if(player.active){player.yaw-=(e.clientX-down.lastX)*.006;player.pitch=T.MathUtils.clamp(player.pitch+(e.clientY-down.lastY)*.004,-.05,.85)}
 else if(follow){lookYaw+=(e.clientX-down.lastX)*.006;lookYaw=T.MathUtils.clamp(lookYaw,-1.1,1.1)}
 down.lastX=e.clientX;down.lastY=e.clientY;
});
renderer.domElement.addEventListener('pointercancel',()=>down=null);
renderer.domElement.addEventListener('contextmenu',e=>{if(player.active)e.preventDefault()});
renderer.domElement.addEventListener('wheel',e=>{if(player.active){e.preventDefault();player.distance=T.MathUtils.clamp(player.distance+e.deltaY*.003,2,5)}},{passive:false});
function toggleDoor(id){manualDoors.set(id,{open:!(manualDoors.get(id)?.open??art.doorStates[id]>.5),until:simTime+12});events.doorClicks++}
function interact(){if(!player.active||paused)return;player.target=player.nav.nearby(player.g.position);if(player.target)toggleDoor(player.target.id);updatePrompt()}
function setText(selector,value){const el=$(selector);if(el.textContent!==value)el.textContent=value}
function updatePrompt(){
 const h=player.target;$('#interaction-prompt').hidden=!player.active||!h||paused;$('#interact').disabled=!h||paused;
 if(h){const open=manualDoors.get(h.id)?.open??art.doorStates[h.id]>.5;setText('#interaction-label',open?'关闭店门':'打开店门');setText('#interact',open?'关门':'开门')}else setText('#interact','交互');
}
renderer.domElement.addEventListener('pointerup',e=>{
 if(!down||e.pointerId!==down.id)return;const moved=down.dragged||Math.hypot(e.clientX-down.x,e.clientY-down.y)>6,button=down.button;down=null;
 if(moved||button!==0)return;if(player.active){interact();return}
 mouse.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);raycaster.setFromCamera(mouse,camera);
 const hits=raycaster.intersectObjects(art.root.children,true).filter(h=>h.object.name!=='Petals'&&(!h.object.material?.transparent||h.object.material.opacity>.4||h.object.userData.doorIds));const hit=hits[0];if(hit?.object.userData.doorIds)toggleDoor(hit.object.userData.doorIds[hit.instanceId]);
});
// Independent touch pointers allow a left-thumb walk and right-thumb look at once.
function resetJoystick(){stickId=null;player.input.set(0,0);$('#joystick-knob').style.transform='translate(0px,0px)'}
const stick=$('#joystick');
function moveStick(e){if(e.pointerId!==stickId)return;const b=stick.getBoundingClientRect(),v=new T.Vector2(e.clientX-b.left-b.width/2,e.clientY-b.top-b.height/2);if(v.length()>36)v.setLength(36);player.input.set(v.x/36,-v.y/36);$('#joystick-knob').style.transform=`translate(${v.x}px,${v.y}px)`}
stick.addEventListener('pointerdown',e=>{if(!player.active||stickId!==null)return;e.preventDefault();stickId=e.pointerId;stick.setPointerCapture(e.pointerId);moveStick(e)});
stick.addEventListener('pointermove',moveStick);
for(const type of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(type,e=>{if(e.pointerId===stickId)resetJoystick()});
$('#interact').onclick=interact;
function clearInput(){down=null;player.clear();resetJoystick()}
addEventListener('blur',clearInput);document.addEventListener('visibilitychange',()=>{if(document.hidden)clearInput()});
function animatePerson(p,dt){if(!dt)return;if(p.wait>0){p.wait-=dt;p.g.visible=false;if(p.wait<=0){nextWalk(p,true);events.departures++}else return}
 let a=town.graph[p.path[p.index]],b=town.graph[p.path[p.index+1]],link=a.links.find(e=>e.to===b.id);
 let factor=link.kind==='stairs'?.62:link.kind==='door'?.6:1;p.mode=link.kind==='stairs'?'stairs':'walking';
 if(link.kind==='stairs')events.stairFrames++;
 if(link.kind==='door'){
  for(const id of [p.from,p.to])if(p.g.position.distanceTo(town.buildings[id].door)<2.5){art.doorTargets[id]=1;if(art.doorStates[id]<.82){factor=0;p.mode='door';events.doorWaitFrames++}}
 }
 // Keep to the right and maintain space behind visitors travelling in the same direction.
 if(link.kind!=='door')for(const other of people){if(other===p||!other.g.visible||p.f.dot(other.f)<.7)continue;const delta=other.g.position.clone().sub(p.g.position),ahead=delta.dot(p.f),side=Math.abs(delta.x*p.f.z-delta.z*p.f.x);if(ahead>0&&ahead<1.6&&side<.48&&Math.abs(delta.y)<.55)factor=Math.min(factor,T.MathUtils.clamp((ahead-.65)/.95,0,1))}
 const targetSpeed=p.speed*factor;p.walkSpeed=factor===0?0:T.MathUtils.damp(p.walkSpeed,targetSpeed,8,dt);const distance=dt*p.walkSpeed;p.u+=distance/link.length;
 while(p.u>=1){const rest=(p.u-1)*link.length;p.index++;if(p.index>=p.path.length-1){
  p.g.position.copy(b.p);
  if(p.entering){
   p.wait=20+Math.random()*20;p.g.visible=false;p.alpha=0;
   p.g.traverse(o=>{if(o.isMesh)o.material.opacity=0});
   art.doorDefaults[p.to]=0;manualDoors.delete(p.to);events.arrivals++;
  }else nextWalk(p);
  return;
 }a=town.graph[p.path[p.index]];b=town.graph[p.path[p.index+1]];link=a.links.find(e=>e.to===b.id);p.u=rest/link.length}
 const pos=a.p.clone().lerp(b.p,p.u),f=b.p.clone().sub(a.p).setY(0).normalize();if(f.lengthSq()>.1)p.f.lerp(f,1-Math.exp(-dt*8)).normalize();const side=new T.Vector3(p.f.z,0,-p.f.x),offset=link.kind==='door'?0:p.lane;p.laneOffset=T.MathUtils.damp(p.laneOffset??0,offset,9,dt);pos.addScaledVector(side,p.laneOffset);p.g.position.x=pos.x;p.g.position.z=pos.z;p.g.position.y=T.MathUtils.damp(p.g.position.y,pos.y,20,dt);p.g.rotation.y=Math.atan2(p.f.x,p.f.z);
 if(link.kind==='door')for(const id of [p.from,p.to])if(pos.distanceTo(town.buildings[id].door)<2)art.doorTargets[id]=1;
 // Fade only inside the shop, preserving the visible threshold crossing.
 let alpha=1;if(link.kind==='door')for(const id of [p.from,p.to]){const h=town.buildings[id],local=pos.clone().sub(h.p).applyQuaternion(h.q.clone().invert());if(Math.abs(local.x-1.65*h.scale.x)<.8&&local.z<3.4*h.scale.z){alpha=Math.min(alpha,T.MathUtils.clamp((local.z-2.6*h.scale.z)/(.8*h.scale.z),0,1))}}
 if(Math.abs(alpha-p.alpha)>.02){p.alpha=alpha;p.g.traverse(o=>{if(o.isMesh)o.material.opacity=alpha})}p.phase+=dt*p.walkSpeed*6.4;const swing=Math.sin(p.phase)*.31*Math.min(1,p.walkSpeed/.5);p.limbs.forEach((o,i)=>o.rotation.x=swing*(i%2?-1:1)*(i>1?-.7:1));
}
const collisionRay=new T.Raycaster();
function clampCamera(aim,position){
 const delta=position.clone().sub(aim),len=delta.length();if(len<.01)return;
 collisionRay.set(aim,delta.divideScalar(len));collisionRay.far=len;
 const hit=collisionRay.intersectObjects(art.root.children,true).find(h=>h.distance>.12&&h.object.name!=='Petals'&&!(h.object.material?.transparent));
 if(hit)position.copy(aim).addScaledVector(delta,Math.max(.08,hit.distance-.2));
}
function followCamera(dt){let p=people[selected];if(!p.g.visible){selected=Math.max(0,people.findIndex(p=>p.g.visible));p=people[selected];cameraSnap=true}const aim=p.g.position.clone().add(new T.Vector3(0,1.45,0)),f=p.f.clone().applyAxisAngle(up,lookYaw),desired=p.g.position.clone().addScaledVector(f,-3.2).add(new T.Vector3(0,2.3,0));
 desired.y=Math.max(desired.y,town.nearest(desired).p.y+.65);clampCamera(aim,desired);
 if(cameraSnap){camera.position.copy(desired);cameraSnap=false}else camera.position.lerp(desired,1-Math.exp(-dt*7));
 // The interpolated camera also needs collision correction while turning a corner.
 clampCamera(aim,camera.position);camera.lookAt(aim);$('#person-status').textContent='旅人 '+(selected+1)+' / '+(p.mode==='door'?'等店门打开':p.mode==='stairs'?'慢慢走过石阶':'沿着町屋散步');
}
function explorerCamera(dt){
 const aim=player.g.position.clone().add(new T.Vector3(0,1.35,0));
 const f=new T.Vector3(Math.sin(player.yaw),0,Math.cos(player.yaw));
 const desired=aim.clone().addScaledVector(f,-player.distance*Math.cos(player.pitch));desired.y+=player.distance*Math.sin(player.pitch);
 desired.y=Math.max(desired.y,(player.nav.sample(desired)?.y??town.nearest(desired).p.y)+.45);clampCamera(aim,desired);
 if(cameraSnap){camera.position.copy(desired);cameraSnap=false}else camera.position.lerp(desired,1-Math.exp(-dt*12));
 clampCamera(aim,camera.position);camera.lookAt(aim);
 const opacity=T.MathUtils.smoothstep(camera.position.distanceTo(aim),.45,1.2);
 player.g.traverse(o=>{if(o.isMesh){o.material.transparent=opacity<1;o.material.opacity=opacity}});
 setText('#person-status',paused?'已暂停 · 点击继续散步':player.surface?.home!=null?'你 · 町屋店内':player.surface?.stairs?'你 · 坂道石阶':'你 · 自由探索');
 updatePrompt();
}
function holdPlayerDoor(){
 if(!player.active)return;
 for(const h of town.homes){const q=player.g.position.clone().sub(h.p).applyQuaternion(h.q.clone().invert());
  if(Math.abs(q.x-1.65*h.scale.x)<.65*h.scale.x+.22 && Math.abs(q.z-3.47*h.scale.z)<.22+.19*h.scale.z && art.doorStates[h.id]>.85)art.doorTargets[h.id]=1;
 }
}
function frame(now){
 requestAnimationFrame(frame);const dt=Math.min((now-lastTime)/1000||.016,.05);lastTime=now;if(!paused)simTime+=dt;
 art.doorTargets.splice(0,art.doorTargets.length,...art.doorDefaults);for(const [id,s]of manualDoors){if(s.until<simTime)manualDoors.delete(id);else art.doorTargets[id]=s.open?1:0}
 for(const p of people)animatePerson(p,paused?0:dt);holdPlayerDoor();art.update(simTime,paused?0:dt);
 if(player.active){player.update(paused?0:dt);explorerCamera(dt)}else if(follow)followCamera(dt);else controls.update();renderer.render(scene,camera);
}
requestAnimationFrame(frame);$('#loading').classList.add('done');
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
const moveKeys=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight']);
addEventListener('keydown',e=>{
 if(e.target?.closest?.('input,textarea,select,[contenteditable=true]'))return;
 if(player.active&&moveKeys.has(e.code)){e.preventDefault();player.keys.add(e.code);return}
 if(e.repeat)return;
 if(e.key==='Escape')view();if(e.key.toLowerCase()==='c')setExplore(!player.active);if(e.key.toLowerCase()==='n'&&!player.active)$('#next-person').click();
 if(e.key.toLowerCase()==='e'&&player.active){e.preventDefault();interact()}
});
addEventListener('keyup',e=>player.keys.delete(e.code));
window.__sannenDebug={scene,camera,renderer,town,people,art,events,player,setExplore,interact,setFollow,toggleDoor,view,get state(){return {follow,exploring:player.active,paused,simTime,selected}},ready:true};
