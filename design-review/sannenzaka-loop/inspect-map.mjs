import fs from 'node:fs';import * as T from 'three';import {makeLoopData,closeLoop} from '../../dist/loop-map.js';import {makeDistrict,route} from '../../dist/sannen-network.js';import {createLoopSurface} from '../../dist/loop-surface.js';
const source=JSON.parse(fs.readFileSync('dist/assets/sannenzaka/map.json')),data=makeLoopData(source),town=makeDistrict(data),seam=closeLoop(town),surface=createLoopSurface(data.loop.length);
console.log({loop:data.loop,homes:town.homes.length,roads:town.roads.length,nodes:town.graph.length,seamDistance:surface.project(town.graph[seam.a].p).distanceTo(surface.project(town.graph[seam.b].p)),radius:surface.radius});
fs.writeFileSync('design-review/sannenzaka-loop/map.json',JSON.stringify(data,null,2));
