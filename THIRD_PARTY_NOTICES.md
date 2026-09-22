# Third-party materials

The root MIT license covers original application code, modelling scripts and original
asset geometry. It does not replace licenses on third-party libraries or map data.

| Material | Location | License / attribution |
| --- | --- | --- |
| Three.js and its addons | `dist/vendor/three*.js`, `dist/vendor/addons/` except components below | MIT; see `dist/vendor/THREE-LICENSE.txt` |
| Basis Universal transcoder | `dist/vendor/addons/libs/basis/` | Apache-2.0; upstream [Basis Universal](https://github.com/BinomialLLC/basis_universal), see bundled README and `dist/vendor/APACHE-2.0.txt` |
| Draco decoder | `dist/vendor/addons/libs/draco/` | Apache-2.0; upstream [Google Draco](https://github.com/google/draco), see bundled README and `dist/vendor/APACHE-2.0.txt` |
| SculptGL notice retained from vendor distribution | `dist/vendor/addons/misc/SculptGL.LICENSE.txt` | Terms in that file |
| OpenStreetMap source and derived geographic database | `design-review/sannenzaka/source.osm.xml.gz`, `dist/assets/sannenzaka/map.json`, `design-review/sannenzaka-loop/map.json`; geographic records embedded in composition files | © OpenStreetMap contributors, ODbL 1.0 |

Map attribution: [OpenStreetMap copyright and license](https://www.openstreetmap.org/copyright).
Database license: [Open Database License 1.0](https://opendatacommons.org/licenses/odbl/1-0/).
The OSM extract and extraction script are included alongside derived map data.
The ODbL-covered geographic database is not relicensed under MIT. Preserve attribution
when displaying Kyoto scenes or their map-derived images; the original geometry is
distinct from the geographic placements. The spherical loop is an artistic rearrangement,
not a claim that those streets connect that way in real Kyoto.

Reference web pages are linked for context; their photographs and page content are not
bundled as project assets. Blender is an external authoring tool and is not distributed
in this repository. No paid Meshy assets are included.
