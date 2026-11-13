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
