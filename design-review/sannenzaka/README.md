# Kyoto replacement

This is a separate Kyoto runtime at `dist/kyoto.html`, replacing the earlier Philosopher's Path theme. The original `dist/index.html` residential sphere is preserved.

The actual OSM street centerlines, 17 / 46 stair counts, mapped building anchors, and pagoda location define the new layout. Horizontal distances are uniformly reduced to 70%. Heights, facades, shop interiors, vegetation, and lighting are artistic reconstructions. It is not a photogrammetric or surveyed building-by-building replica.

`build_blender.py` constructs native machiya and pagoda geometry, applies six Exact Boolean facade openings, saves the `.blend`, and exports `architecture.glb`. The source has material groups and independent sliding door roots. Existing Blender residents are reused. Three.js builds the mapped paving and terrain and drives doors, pedestrians, and cameras.

`source.osm.xml.gz` is the downloaded OpenStreetMap extract, © OpenStreetMap contributors, ODbL 1.0. `extract_map.py` reproduces the distributed `map.json`. Attribution and source links are visible in the page.

`check-network.mjs` checks street and storefront connectivity. `check-runtime.mjs` runs the actual application loop using Node DOM/renderer stubs and can serialize assembled geometry for an offline composition render. `render_composition.py` renders that exact geometry and transforms in Blender. Offline renders prove geometric composition only, not production WebGL lighting or performance.

Historical milestone approvals in the parent review package are not rewritten. The current user authorized scene replacement. The generic room validator still rejects the existing pure-native project for Meshy and unavailable browser/baking/performance requirements; these are not represented as passing.

## Runtime refinement

Pedestrians slow down on stairs, wait for doors to open, keep right and reduce speed behind same-direction visitors. The third-person camera tests its interpolated position for occlusion. Four existing lanterns now cast warm local light, paving uses subtle color variation, and one unobstructed storefront apron reuses the native Blender bicycle asset. Static door matrices are not uploaded repeatedly; petals update at most 30 times per simulation second. The runtime test now exercises the real pointer handler and door raycast, rejects drags as clicks, and verifies that pause freezes instance matrices. Existing offline renders describe the previous structural review; no new browser/GPU pass is claimed.

## Free exploration

Click **自由探索** on the Kyoto page. WASD / arrow keys move relative to the camera; drag to orbit, wheel to adjust distance, and press the left mouse button (or E) near an accessible shop door. The nearby prompt offers open/close. Touch devices have a left-thumb joystick, drag-to-look and a separate interaction button. Escape or **退出探索** returns to overview; the position is kept when switching back. NPC follow remains available.

The player is a separate copy of the native Resident, with an amber jacket. `sannen-player.js` constrains swept movement to the actual street/apron/shop floor network and prevents passing through closed doors, walls, counters or the scene edge. Props contribute small collision envelopes. Doorway occupancy keeps a closing door open. Camera direction is independent of character heading; the existing ray obstruction logic also checks its interpolated position.

`check-exploration.mjs` is executed by `check-runtime.mjs`. Evidence includes actual production keyboard, pointer and touch callbacks; all eight street centerlines, both stairs in both directions, all 39 storefront approaches and open/closed crossings, far-range rejection, occupied-door safety, pause and mode transitions. Run `node --loader ./design-review/sannenzaka/test-loader.mjs design-review/sannenzaka/check-runtime.mjs` from the project root. Renderer/DOM are stubs: browser visuals, GPU performance and real device multi-touch have not been verified. Existing Blender images are historical scene evidence, not screenshots of this new interaction.

The generic runtime gate was rerun and still fails its previously disclosed Meshy-only, baking/texture-tier, historical review and browser/performance requirements. No review approvals were changed. This edit uses the user's existing runtime/publication authorization, and does not export or regenerate architecture.
