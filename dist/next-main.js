// Native Blender assets with Three.js sphere layout and interactive residents.
import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {makeTown,route,R} from './town-network.js';
import {buildTown} from './town-scene.js';
const $=s=>document.querySelector(s),scene=new T.Scene(),town=makeTown({theme:document.body.dataset?.scene??"yugure"});
const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.18;$('#world').appendChild(renderer.domElement);
const bg=document.createElement('canvas');bg.width=4;bg.height=512;const ctx=bg.getContext('2d'),gradient=ctx.createLinearGradient(0,0,0,512);gradient.addColorStop(0,'#797d89');gradient.addColorStop(.55,'#bdabb0');gradient.addColorStop(1,'#f2d6b6');ctx.fillStyle=gradient;ctx.fillRect(0,0,4,512);const background=new T.CanvasTexture(bg);background.colorSpace=T.SRGBColorSpace;scene.background=background;
scene.add(new T.HemisphereLight('#fff0d9','#a5b799',2.2));const sun=new T.DirectionalLight('#ffd5a3',3.1);sun.position.set(-70,85,50);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-65,right:65,top:65,bottom:-65,near:1,far:250});sun.shadow.normalBias=.045;scene.add(sun);const fill=new T.DirectionalLight('#bac5f6',1.3);fill.position.set(50,-30,-30);scene.add(fill);
const camera=new T.PerspectiveCamera(38,innerWidth/innerHeight,.08,800);const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.enablePan=false;controls.autoRotate=true;controls.autoRotateSpeed=.25;controls.minDistance=70;controls.maxDistance=300;
let follow=false,selected=0,paused=false,simTime=0,lastTime=0;const up=new T.Vector3(0,1,0),forward=new T.Vector3(0,0,1),raycaster=new T.Raycaster(),mouse=new T.Vector2(),manualDoors=new Map();
function home(){follow=false;document.body.classList.remove('following');$('#follow').setAttribute('aria-pressed','false');controls.enabled=true;controls.target.set(0,0,0);camera.up.copy(up);const distance=innerWidth<700?250:195;camera.position.set(.8,.55,1).normalize().multiplyScalar(distance);camera.lookAt(0,0,0);controls.update();$('#instructions').textContent='拖动旋转 · 滚轮缩放 · 点击门扇开关';}
home();
const data=await new GLTFLoader().loadAsync('./assets/town-assets.glb');const art=buildTown(scene,town,data.scene),people=[],events={arrivals:0,departures:0};
for(let i=0;i<24;i++){
 const g=data.scene.getObjectByName('Resident').clone(true);g.name='Resident_'+i;g.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.transparent=true;if(/Jacket/.test(o.material.name))o.material.color.set(['#6f969d','#cb9874','#9c9bb4','#a6ad7a','#b47a70'][i%5]);o.castShadow=true;o.receiveShadow=true}});scene.add(g);
 const from=town.cells[i*7%town.cells.length],to=town.cells[(i*7+13)%town.cells.length],path=route(town.graph,town.theme==='kyoto'&&i>=16?town.riverWalk[(i-16)*20]:from.inside,to.inside),index=i%3?Math.min(2+i%5,path.length-2):0;
 const p={g,path,index,u:0,from:from.id,to:to.id,speed:.95+(i%7)*.06,wait:0,phase:i*1.8,moving:true,limbs:['Leg_L','Leg_R','Arm_L','Arm_R'].map(n=>g.getObjectByName(n)),f:new T.Vector3(0,0,1),alpha:1};people.push(p);
}
function setFollow(value){if(value&&!people[selected].g.visible)selected=Math.max(0,people.findIndex(p=>p.g.visible));follow=value;document.body.classList.toggle('following',value);$('#follow').setAttribute('aria-pressed',String(value));controls.enabled=!value;if(value){$('#instructions').textContent='跟随居民行走 · 拖动观察 · 换一位居民';camera.up.copy(people[selected].g.position).normalize()}else home()}
$('#follow').onclick=()=>setFollow(!follow);$('#next-person').onclick=()=>{for(let i=1;i<=people.length;i++){const next=(selected+i)%people.length;if(people[next].g.visible){selected=next;break}}lookYaw=0;if(!follow)setFollow(true)};$('#home').onclick=home;
$('#rotate').onclick=()=>{controls.autoRotate=!controls.autoRotate;$('#rotate').setAttribute('aria-pressed',String(controls.autoRotate))};$('#pause').onclick=()=>{paused=!paused;$('#pause').setAttribute('aria-pressed',String(paused));$('#pause').textContent=paused?'▶ 继续动画':'Ⅱ 暂停动画'};
let down=null,lookYaw=0;renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,lastX:e.clientX,dragged:false};if(follow)renderer.domElement.setPointerCapture(e.pointerId)});
renderer.domElement.addEventListener('pointermove',e=>{if(down){if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)down.dragged=true;if(follow){lookYaw+=(e.clientX-down.lastX)*.007;down.lastX=e.clientX}}});
renderer.domElement.addEventListener('pointerup',e=>{if(!down)return;const moved=down.dragged||Math.hypot(e.clientX-down.x,e.clientY-down.y)>6;down=null;if(moved)return;mouse.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);raycaster.setFromCamera(mouse,camera);const hits=raycaster.intersectObjects(art.planet.children,true).filter(h=>h.object.name!=='Falling_sakura'&&(!h.object.material?.transparent||h.object.material.opacity>.5));if(hits.length){let d=hits[0].object;while(d&&!art.doors.includes(d))d=d.parent;const id=art.doors.indexOf(d);if(id>=0)manualDoors.set(id,{open:art.doors[id].rotation.y<.6,until:simTime+8})}});
renderer.domElement.addEventListener('pointercancel',()=>{down=null});
function animatePerson(p,dt){
 if(p.wait>0){p.wait-=dt;p.g.visible=false;p.moving=false;if(p.wait<=0){p.from=p.to;p.to=(p.from+7+Math.floor(Math.random()*35))%town.cells.length;p.path=route(town.graph,town.cells[p.from].inside,town.cells[p.to].inside);p.index=0;p.u=0;p.g.visible=true;events.departures++}else return}
 let a=town.graph[p.path[p.index]],b=town.graph[p.path[p.index+1]],link=a.links.find(l=>l.to===b.id);p.moving=true;
 if(link.kind==='crossing'&&p.u<.015&&(simTime+link.junction*1.3)%18<9)p.moving=false;
 if(p.moving)p.u+=dt*p.speed/link.length;
 if(p.u>=1){p.u=(p.u-1)*link.length;p.index++;if(p.index>=p.path.length-1){p.wait=6+Math.random()*15;p.g.visible=false;p.moving=false;events.arrivals++;return}a=town.graph[p.path[p.index]];b=town.graph[p.path[p.index+1]];link=a.links.find(l=>l.to===b.id);p.u=Math.min(p.u/link.length,.999)}
 const pos=a.p.clone().lerp(b.p,p.u),radius=T.MathUtils.lerp(a.p.length(),b.p.length(),p.u);if(link.kind!=='door')pos.normalize().multiplyScalar(radius);
 const n=pos.clone().normalize(),f=b.p.clone().sub(a.p).projectOnPlane(n).normalize();if(f.lengthSq()>.1)p.f.lerp(f,1-Math.exp(-dt*6)).normalize();const right=new T.Vector3().crossVectors(n,p.f).normalize(),flat=new T.Vector3().crossVectors(right,n).normalize();p.g.position.copy(pos);p.g.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(right,n,flat));
 if(link.kind==='door')art.doorTargets[link.junction]=Math.PI/2;
 for(const id of [p.from,p.to]){if(pos.distanceTo(town.graph[town.cells[id].door].p)<2.1)art.doorTargets[id]=Math.PI/2}
 p.walkPhase=(p.walkPhase??p.phase)+(p.moving?dt*p.speed*6.4:0);const swing=p.moving?Math.sin(p.walkPhase)*.34:0;p.limbs.forEach((limb,i)=>{if(limb){limb.rotation.x=swing*(i%2?-1:1)*(i>1?-.7:1)}});
}
function followCamera(dt){
 const p=people[selected];if(!p.g.visible){const visible=people.findIndex(x=>x.g.visible);if(visible>=0)selected=visible;return}
 const n=p.g.position.clone().normalize(),f=p.f.clone().applyAxisAngle(n,lookYaw),target=p.g.position.clone().addScaledVector(n,1.25),desired=p.g.position.clone().addScaledVector(f,-4.2).addScaledVector(n,2.15);
 // Clamp the camera against the nearest residence shell, including while crossing a doorway.
 for(const c of town.cells){if(c.p.distanceTo(target)>14)continue;const inv=c.q.clone().invert(),a=target.clone().sub(c.p).applyQuaternion(inv),b=desired.clone().sub(c.p).applyQuaternion(inv),delta=b.clone().sub(a);let tHit=1;
  for(const axis of ['x','z'])for(const side of [-1,1]){const wall=side*(axis==='x'?3.32:3.22);if(Math.abs(delta[axis])<1e-6)continue;const t=(wall-a[axis])/delta[axis];if(t<=.02||t>=tHit)continue;const q=a.clone().addScaledVector(delta,t),other=axis==='x'?'z':'x';if(Math.abs(q[other])<(axis==='x'?3.23:3.33)&&q.y>.3&&q.y<5.9)tHit=Math.max(.03,t-.05)}
  if(tHit<1)desired.copy(target).lerp(desired,tHit);
 }
 if(desired.length()<R+.4)desired.normalize().multiplyScalar(R+.4);if(camera.position.distanceTo(desired)>10){const cameraRadius=camera.position.length(),current=camera.position.clone().normalize(),target=desired.clone().normalize(),rotation=new T.Quaternion().setFromUnitVectors(current,target),step=new T.Quaternion().slerp(rotation,1-Math.exp(-dt*7));camera.position.copy(current.applyQuaternion(step)).multiplyScalar(T.MathUtils.lerp(cameraRadius,desired.length(),1-Math.exp(-dt*7)))}else camera.position.lerp(desired,1-Math.exp(-dt*6));if(camera.position.length()<R+.45)camera.position.normalize().multiplyScalar(R+.45);camera.up.lerp(n,1-Math.exp(-dt*8)).normalize();camera.lookAt(target);
 $('#person-status').textContent=`居民 ${selected+1} · ${p.moving?'正在散步':'等待通行'}`;
}
function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-lastTime)/1000||.016,.05);lastTime=now;if(!paused)simTime+=dt;
 art.doorTargets.fill(0);for(const [id,state] of manualDoors){if(state.until<simTime)manualDoors.delete(id);else art.doorTargets[id]=state.open?Math.PI/2:0}
 for(const p of people)animatePerson(p,paused?0:dt);art.update(simTime,dt);if(follow)followCamera(dt);else controls.update();renderer.render(scene,camera);
}
requestAnimationFrame(frame);$('#loading').classList.add('done');
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
addEventListener('keydown',e=>{if(e.key==='Escape')home();if(e.key.toLowerCase()==='c')setFollow(!follow);if(e.key.toLowerCase()==='n')$('#next-person').click()});
window.__townDebug={scene,camera,renderer,town,people,art,events,setFollow,get state(){return {follow,paused,simTime,selected}},ready:true};
