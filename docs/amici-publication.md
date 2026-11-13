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

The current viewer uses `amici-walk-v15.glb`; the earlier facade-only export is
retained for compatibility. The export script first applies
`tools/amici-walkable-hall.py` to the in-memory source. This hollows the podium,
replaces the shallow lobby with an interpreted furnished hall, and preserves
sliding entrance leaves through `walkDoor` glTF extras. It uses the official
lobby image and ground-floor plan as visual references, with estimated dimensions.
The source .blend on disk remains unchanged. Metadata is recorded separately
in `model-walk-v6.json`.

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

## Material and planting refinement

The v4 web derivative uses finer, denser cypress sprays, fuller hanging planters,
and a less aggressive LOD for the existing Poly Haven trees. The facade geometry
and surrounding massing remain estimates based on the published frontage.
Tijolo, oak and stone surfaces use photographed diffuse, normal and roughness maps;
the CC0 source URLs are recorded in `pbr-sources.json`. Download the source maps
with `python tools/fetch-amici-pbr.py <model-bundle>/recursos/pbr` before exporting.
Temporary generated textures stay outside the public directory. The GLB embeds
its textures, using JPEG for opaque images and PNG where foliage requires alpha.

The daylight HDR now supplies the visible sky as well as reflections. The closer
sun shadow coverage, interior spot shadows and gradual exposure/ambient change on
entry improve depth without changing walk controls. Hall additions include oak,
stone, smoother upholstered furniture, coworking furniture, smaller accessories,
and curved plant leaves. The footprint includes the added coworking chairs.
The original native Blender scene is preserved; these are export-time changes.

## Approved facade V15

The V15 release uses the approved `amici_revisao_fachada_v15_02.blend` source
(SHA-256 in `public/assets/amici/model-walk-v15.json`). Export with
`tools/export-amici-v15-web.py -- <absolute source blend path>` from Blender.
The exporter preserves the rebuilt portal, lettering, doors, floor-by-floor
facade and irregular cypress sprays. Portal color conversion follows the V15
saturation, tint and lightening adjustments; the browser supplies warm entrance
lighting. Cycles indirect lighting is not baked into the interactive model.

`amici-v15-walk-adapter.py` connects the approved frontage to the existing
interpreted walkable interior, removes the duplicate old entrance and shallow
back wall, and tags the V15 doors and handles for automatic opening. The original
native scene remains unchanged. The approved Cycles image is available under
About / View model render (`render-v15.webp`); the comparison is also packaged as
`comparacao-hall-v15.webp`. No Priorita modules or assets change in this release.

Validation: TypeScript/build, navigation unit tests, browser desktop/mobile
walkthrough including automatic entry/exit and modal pause, and presentation
gallery/plan/fallback checks. The model is approximately 32.4 MB compressed and
4.4 million triangles, including the retained surrounding trees and interior.

## Interactive daylight and material review (V16)

The same V15 GLB now uses dynamic solar lighting instead of the old day/evening
switch. The Amici-only solar panel follows the Priorita interaction: time, date,
animation speed and trajectory. Morning/afternoon move the actual directional
light and shadow map; the sky and its reflection environment follow solar altitude.
Artificial facade lights become more prominent at dusk. Six warm balcony bays,
clearer glass reflections and material-specific surface adjustments restore
contrast lost during the Cycles-to-web conversion. The opening view is frontal.

The approximate NOAA calculation uses Passo Fundo (-28.26, -52.41), BRT UTC-3,
from the [IBGE municipal map](https://geoftp.ibge.gov.br/cartas_e_mapas/mapas_municipais/colecao_de_mapas_municipais/2020/RS/passo_fundo/4314100_MM.pdf).
The model orientation is provisional (35-degree visual alignment), not surveyed.
This limitation is stated in the solar panel; this is not a technical insolation
study. Priorita source and assets remain unchanged. No source Blender geometry
is edited in this release, and the approved V15 Cycles still stays available.

`tools/check-amici-solar.mjs` checks opposite morning/afternoon sun directions,
zero direct sun at night, date/season changes, animation, trajectory controls and
mobile panel fit, with screenshots. Existing presentation and walk checks cover
loading, gallery, fallback, doors, hall entry/exit, and desktop/mobile controls.
