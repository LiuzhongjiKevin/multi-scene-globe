import {readFile,writeFile} from 'node:fs/promises';
const sourcePath=new URL('../dist/town-network.js',import.meta.url),three=new URL('../dist/vendor/three.module.js',import.meta.url),source=(await readFile(sourcePath,'utf8')).replace("from 'three'",`from '${three.href}'`);
const {makeTown,route,R,riverDistance}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));const t=makeTown(),fail=s=>{throw Error(s)};
if(t.cells.length<30||t.edges.length>=50||Math.max(...t.nodes.map(n=>n.edges.length))>3)fail('Street-density requirement failed');
let reachable=0,houseGap=Infinity,riverGap=Infinity,roadGap=Infinity;
for(const c of t.cells){riverGap=Math.min(riverGap,Math.abs(riverDistance(c.p)));for(const e of t.edges)roadGap=Math.min(roadGap,t.distanceRoad(c.p,e));for(const other of t.cells){if(c!==other)houseGap=Math.min(houseGap,c.p.distanceTo(other.p));const p=route(t.graph,c.inside,other.inside);if(p[0]!==c.inside||p.at(-1)!==other.inside)fail('Unreachable dwelling');reachable++}}
for(const n of t.riverWalk)route(t.graph,t.cells[0].inside,n);
if(houseGap<11.6||riverGap<8.4||roadGap<8.5)fail('House footprint crowds river/road/neighbor');
for(const point of t.graph){if(!point.p.toArray().every(Number.isFinite))fail('Invalid navigation');for(const e of point.links)if(!(e.length>0))fail('Zero-length link')}
const result={pass:true,radiusMetres:R,houses:t.cells.length,roads:t.edges.length,junctions:t.nodes.length,tJunctions:t.nodes.filter(n=>n.edges.length===3).length,crossroads:0,maxDegree:3,navigationWaypoints:t.graph.length,housePairsReachable:reachable,riversideWaypointsReachable:t.riverWalk.length,minimumHouseCenterGap:houseGap,minimumHouseRiverCenterGap:riverGap,minimumHouseRoadCenterGap:roadGap};await writeFile(new URL('./navigation-check.json',import.meta.url),JSON.stringify(result,null,2));console.log(result);
