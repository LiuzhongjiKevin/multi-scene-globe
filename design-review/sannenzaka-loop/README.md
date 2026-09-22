# Kyoto spherical loop

This is an additive scene at `/kyoto-loop.html`. The original `/kyoto.html` and residential sphere are byte-for-byte unchanged. The new page links back to both; no existing page was edited to add navigation.

## Scope and provenance

The same eight OSM-derived street sections are rearranged into a periodic street strip: west Sannenzaka, Sannenzaka stairs, connector and east Kiyomizuzaka form a closed route. Ninenzaka stays a branch. The geographic endpoints are folded together artistically, not represented as a real Kyoto connection. 121 existing mapped building anchors are retained after clearance checks; 24 shops admit people. Native Blender house, pagoda, resident and bicycle meshes are reused without modification.

`loop-map.js` derives the new layout from the original map at load time. `loop-scene.js` assembles only this variant and clips terrain to one periodic domain, omitting seam end caps. `loop-surface.js` places the scene along a wavy spherical band with latitude and radius variation, not a perfect circular strip. Plain soil backing/support is scenery underside, not additional geographic map. Vegetation remains in the street district footprint.

`loop-main.js` and `loop-player.js` are isolated runtime entry points. Physics remains in the metric street strip. Player movement wraps x at the seam; NPC routing uses an explicit seam edge and never interpolates through the entire strip. Render transforms, camera direction and camera up are converted to local spherical coordinates. Moving doors preserve unbent cached instance transforms, so one changed door cannot bend unaffected instances a second time.

## Controls

Drag to orbit, scroll to zoom. Click **自由探索** for WASD/arrow movement, drag-to-look, and nearby left-click or E door interaction. Phones have a joystick and separate interaction button. The NPC follow mode remains available. Escape or **退出探索** returns to overview.

## Verification

Run `node --loader ./design-review/sannenzaka-loop/test-loader.mjs design-review/sannenzaka-loop/check-runtime.mjs` from the project root. Reports include the actual production input callbacks, all eight street centerlines, both stair flights, 24 open/closed shop crossings, a full loop traversal, both seam directions, NPC seam transitions, player/camera continuity and independent bent door updates. `preserved-files.json` records hashes of all old production files.

With `EXPORT_RENDER=1`, the harness serializes the actual assembled meshes, matrices and cameras into `composition.json`. `render_composition.py` imports those into Blender for front/back structural renders and saves `district-composition.blend`. These are offline Blender views; they do not prove browser/WebGL lighting or GPU performance. The historical generic room gate still has unmet Meshy-only, baking and browser requirements, and no review approval was changed.
