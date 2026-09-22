// Landscape motifs inspired by Kyoto's Philosopher's Path, not surveyed geometry.
import * as T from 'three';
import {R,riverPoint,riverWalkPoint} from './town-network.js';
export function addKyoto(planet,town,treeSites){
 const mats={stone:new T.MeshStandardMaterial({color:'#a2a39a',roughness:1}),moss:new T.MeshStandardMaterial({color:'#7d9070',roughness:1}),cap:new T.MeshStandardMaterial({color:'#c9c6b6',roughness:.93}),cedar:new T.MeshStandardMaterial({color:'#725b48',roughness:.9}),cloth:new T.MeshStandardMaterial({color:'#758a82',roughness:1,side:T.DoubleSide})};
 const batches=new Map(),geo=new T.BoxGeometry(1,1,1),unit=new T.Vector3(1,1,1);
 function frame(p,f){const y=p.clone().normalize(),z=f.clone().projectOnPlane(y).normalize(),x=y.clone().cross(z);return new T.Matrix4().makeBasis(x,y,z).setPosition(p)}
 function piece(key,base,p,size){if(!batches.has(key))batches.set(key,[]);batches.get(key).push(base.clone().multiply(new T.Matrix4().makeTranslation(...p)).scale(new T.Vector3(...size)))}
 // Shallow, stone-lined channel, with staggered masonry joints and occasional moss.
 for(let i=0;i<420;i++){const t=i/420*Math.PI*2,n=riverPoint(t),f=riverPoint(t+.001).sub(n),side=n.clone().cross(f).normalize(),length=riverPoint(t+Math.PI*2/420).distanceTo(n)*R;
  for(const s of [-1,1]){const p=n.clone().multiplyScalar(R).addScaledVector(side,s*1.97).normalize().multiplyScalar(R+.03),m=frame(p,f);piece(i%7===0?'moss':'stone',m,[0,.13,0],[.40,.34,length*.94]);piece('cap',m,[0,.34,0],[.46,.10,length*.97])}
 }
 // Stone paving along the pedestrian corridor. Small offset joints avoid a tiled-grid look.
 for(let i=0;i<360;i++){const t=i/360*Math.PI*2,p=riverWalkPoint(t),f=riverWalkPoint(t+.001).sub(p),m=frame(p,f),length=riverWalkPoint(t+Math.PI*2/360).distanceTo(p);piece(i%9===0?'stone':'cap',m,[0,.012,0],[.99,.026,length*.90])}
 const cafes=town.cells.filter(c=>Math.abs(c.n.y)<.45).slice(0,4);
 for(const c of cafes){const m=new T.Matrix4().compose(c.p,c.q,unit);
  // Small imaginary tea shops, not named replicas of actual businesses.
  piece('cedar',m,[1.6,2.76,3.50],[2.15,.13,.9]);for(let j=0;j<4;j++)piece('cloth',m,[.82+j*.52,2.48,3.73],[.49,.43,.018]);
  for(let j=0;j<9;j++)piece('cedar',m,[-2.8+j*.22,.76,3.17],[.045,.66,.06]);
 }
 let markers=0;
 for(const t of [.38,2.62,4.58]){const p=riverWalkPoint(t),n=p.clone().normalize(),out=p.clone().sub(riverPoint(t).multiplyScalar(R)).projectOnPlane(n).normalize();p.addScaledVector(out,1.05).normalize().multiplyScalar(R+.02);if(treeSites.some(q=>q.distanceTo(p)<1.0)||town.cells.some(c=>c.p.distanceTo(p)<5.5))continue;const m=frame(p,out.clone().negate());piece('stone',m,[0,.58,0],[.39,1.16,.30]);piece('cap',m,[0,1.19,0],[.46,.09,.36]);markers++;
  if(typeof document!=='undefined'){const canvas=document.createElement('canvas');canvas.width=128;canvas.height=512;const ctx=canvas.getContext('2d');if(ctx?.fillText){ctx.fillStyle='#bfc0b2';ctx.fillRect(0,0,128,512);ctx.fillStyle='#4d5750';ctx.font='bold 68px serif';ctx.textAlign='center';[...'哲学の道'].forEach((c,i)=>ctx.fillText(c,64,110+i*95));const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;const label=new T.Mesh(new T.PlaneGeometry(.31,.98),new T.MeshStandardMaterial({map:texture,roughness:1}));label.matrixAutoUpdate=false;label.matrix.copy(m).multiply(new T.Matrix4().makeTranslation(0,.62,.157));planet.add(label)}}
 }
 for(const [key,list] of batches){const mesh=new T.InstancedMesh(geo,mats[key],list.length);mesh.name='Kyoto_'+key;list.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.castShadow=true;mesh.receiveShadow=true;planet.add(mesh)}
 return {stoneChannel:true,stonePath:true,imaginedTeaShops:cafes.length,pathMarkers:markers};
}
