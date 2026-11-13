# Amici presentation

Independent route: `/apresentar/amici`. Priorità remains at `/apresentar/priorita`.

The Amici page reuses the existing Priorità presentation foundations and adds a
separate scene, data module and scoped appearance. It includes an interactive
Blender-derived facade, aerial and entrance views, daylight/evening lighting,
image capture, official gallery, floor plans, address and six published final
areas. No commercial inventory or unit pricing is fabricated.

Source scene: `amici_realista_v2.blend`, created in Blender 4.5.16. The web model
is exported using `tools/export-amici-web.py -- <absolute source blend path>`
from Blender's command line. The script creates a separate web scene, converts
procedural surfaces into portable textures, merges repeated geometry, reduces
foliage detail and exports Draco-compressed glTF. The source file is unchanged.
Its hash, triangle count and output size are recorded in
`public/assets/amici/model.json`. The original .blend is not a public web asset.

Reference provenance is recorded in `public/assets/amici/sources.json`. The
images are ZM marketing material, with source attribution in the interface.
Trees and the daylight environment are Poly Haven CC0 derivatives. Dimensions,
back and side elevations, and surrounding massing are approximate. The separate
leisure study is intentionally omitted from the web model: its placement has
not been confirmed. The page offers the published leisure images and plans.

Verification includes TypeScript, production build, a browser walkthrough on
desktop and 390 × 844, apartment/area readout, gallery and plan image loading,
camera presets, capture, lighting, modal Escape, and a failed-model fallback
that keeps the official gallery accessible. The browser check script accepts
a deployment origin and a local evidence output folder.

Only the Amici modules, its assets and the lazy route entry are added. Existing
Priorità and Apogeu source and assets remain unchanged.

## Eye-level walk

The current viewer uses `amici-walk-v3.glb`; the earlier facade-only export is
retained for compatibility. The export script first applies
`tools/amici-walkable-hall.py` to the in-memory source. This hollows the podium,
replaces the shallow lobby with an interpreted furnished hall, and preserves
sliding entrance leaves through `walkDoor` glTF extras. It uses the official
lobby image and ground-floor plan as visual references, with estimated dimensions.
The source .blend on disk remains unchanged. Metadata is recorded separately
in `model-walk-v3.json`.

“Passear” begins at eye level in front of the building. WASD/arrows and held
screen buttons move relative to the viewing direction; dragging looks around.
Tapping a reachable floor point or choosing “Entrar no hall” follows a path
through the shared collision footprint. The entrance opens automatically.
The visitor can walk back out, use the guided return, or leave the walk through
Escape, its close button, or any camera preset. Modals, backgrounding and lost
input focus stop movement; viewport resizing preserves the walk position.

`tests/amici-navigation.test.mjs` checks connectivity, blocked furniture/walls,
closed doors, swept movement and floor transitions. `tools/check-amici-walk.mjs`
verifies keyboard and screen-pad entry, guided entry/exit, ground clicks,
looking around, resize, modal pause, Escape and the mobile layout in a browser.
