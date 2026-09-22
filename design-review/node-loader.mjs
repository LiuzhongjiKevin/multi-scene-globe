import {pathToFileURL} from 'node:url';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../dist');
export async function resolve(specifier,context,nextResolve){
 if(specifier==='three')return {url:pathToFileURL(root+'/vendor/three.module.js').href,shortCircuit:true};
 if(specifier.startsWith('three/addons/'))return {url:pathToFileURL(root+'/vendor/addons/'+specifier.slice(13)).href,shortCircuit:true};
 return nextResolve(specifier,context);
}
