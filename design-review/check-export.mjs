import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {makeTown} from '../dist/town-network.js';
import {buildTown} from '../dist/town-scene.js';
const bytes=fs.readFileSync(new URL('../dist/assets/town-assets.glb',import.meta.url));
const data=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const bounds={};
for(const name of ['House','Bicycle','Resident','Tree','Signal','Post']){
 const root=data.scene.getObjectByName(name);assert(root,name);root.updateMatrixWorld(true);
 bounds[name]=new T.Box3().setFromObject(root).getSize(new T.Vector3()).toArray();
}
assert(Math.abs(bounds.Resident[1]-1.75)<.04);
for(const name of ['Door','Leg_L','Leg_R','Arm_L','Arm_R'])assert(data.scene.getObjectByName(name),name);
const scene=new T.Scene(),town=makeTown({theme:process.env.TOWN_THEME??'yugure'}),art=buildTown(scene,town,data.scene);assert.equal(art.doors.length,town.cells.length);art.doorTargets[0]=Math.PI/2;art.update(10,1);assert(art.doors[0].rotation.y>1.5);scene.updateMatrixWorld(true);
let meshes=0,instances=0;scene.traverse(o=>{if(!o.isMesh)return;meshes++;const a=o.geometry.attributes.position.array;assert(a.every(Number.isFinite),o.name);if(o.isInstancedMesh){instances+=o.count;assert(o.instanceMatrix.array.every(Number.isFinite),o.name)}});
const report={pass:true,bounds,meshes,instances,doors:art.doors.length,landscape:art.landscape,details:art.details,place:art.place,checks:['Actual GLTFLoader parse','Native metric bounds','Door and four limb pivots','Three.js world assembly','Finite geometry and instance transforms','Door update opens pivot'],limitation:'No browser/WebGL render or visual/performance validation in this environment'};
fs.writeFileSync(new URL(process.env.TOWN_THEME==='kyoto'?'./kyoto-export-check.json':'./export-check.json',import.meta.url),JSON.stringify(report,null,2));console.log(report);
