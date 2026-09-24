"""Verify the current scene package, including transitive JS imports and local URLs."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import re, json
ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'
manifest = json.loads((ROOT / 'scene-manifest.json').read_text(encoding='utf-8'))
checked = set()
errors = []
def visit(path):
    path = path.resolve()
    if not path.is_relative_to(DIST.resolve()):
        errors.append(f'Outside dist: {path}'); return
    if path.is_dir(): path = path / 'index.html'
    if path in checked: return
    checked.add(path)
    if not path.is_file():
        errors.append(f'Missing: {path.relative_to(ROOT)}'); return
    if path.suffix not in ('.js', '.html', '.css'): return
    source = path.read_text(encoding='utf-8')
    def relative(value):
        parts = urlsplit(value)
        if parts.scheme or parts.netloc or value.startswith('#'): return
        target = unquote(parts.path)
        visit(DIST / target.lstrip('/') if target.startswith('/') else path.parent / target)
    if path.suffix == '.html':
        class Links(HTMLParser):
            def handle_starttag(self, tag, attrs):
                for key, value in attrs:
                    if key in ('href', 'src') and value: relative(value)
        Links().feed(source)
    for spec in re.findall(r"(?m)(?:^\s*(?:import|export)\s+(?:[^;\"']*?\bfrom\s*)?|\bimport\s*\(\s*)[\"']([^\"']+)[\"']", source):
        if spec == 'three': visit(DIST / 'vendor/three.module.js')
        elif spec.startswith('three/addons/'): visit(DIST / 'vendor/addons' / spec[13:])
        elif spec.startswith('.'): relative(spec)
        elif ':' not in spec: errors.append(f'Unmapped module {spec} in {path.name}')
    for url in re.findall(r"(?:fetch|loadAsync)\(\s*[\"']([^\"']+)[\"']", source):
        if url.startswith('.'): visit(DIST / url)
    if path.suffix == '.css':
        for url in re.findall(r"url\(\s*[\"']?([^\"')]+)", source): relative(url)
for entry in manifest['entries']: visit(DIST / entry)
assert not errors, '\n'.join(errors)
print(json.dumps({'branch':manifest['branch'], 'entries':manifest['entries'], 'checkedResources':len(checked), 'pass':True}, ensure_ascii=False))
