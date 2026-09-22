"""Bundle the exact runtime into a self-contained, offline review HTML."""
from pathlib import Path
import re,json,base64,posixpath
root=Path(__file__).resolve().parents[1];dist=root/'dist';seen={}
def key(p):return 'yugure:'+p
pattern=re.compile(r'''((?:from\s*|import\s*\(\s*|import\s*)["'])([^"']+)(["'])''')
def visit(p):
 if p in seen:return
 seen[p]=''
 src=(dist/p).read_text()
 if p=='next-main.js':src=src.replace('./assets/town-assets.glb','data:model/gltf-binary;base64,'+base64.b64encode((dist/'assets/town-assets.glb').read_bytes()).decode())
 def change(m):
  s=m[2]
  if s=='three':target='vendor/three.module.js'
  elif s.startswith('three/addons/'):target='vendor/addons/'+s[13:]
  elif s.startswith('.'):target=posixpath.normpath(posixpath.join(posixpath.dirname(p),s))
  else:return m[0]
  visit(target);return m[1]+key(target)+m[3]
 seen[p]=pattern.sub(change,src)
visit('next-main.js')
imports={key(p):'data:text/javascript;base64,'+base64.b64encode(s.encode()).decode() for p,s in seen.items()}
html=(dist/'index.html').read_text();html=html.replace('<link rel="stylesheet" href="style.css">','<style>'+(dist/'style.css').read_text()+'</style>');html=re.sub(r'<script type="importmap">.*?</script>','<script type="importmap">'+json.dumps({'imports':imports})+'</script>',html);html=html.replace("import('./next-main.js')","import('yugure:next-main.js')").replace('href="./"','href="#"')
out=root/'design-review'/'yugure-interactive-preview.html';out.write_text(html);print(json.dumps({'file':str(out),'bytes':out.stat().st_size,'modules':len(seen),'offline':True}))
