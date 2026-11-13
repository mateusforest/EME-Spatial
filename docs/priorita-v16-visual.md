# Priorità v16 — site prominence and photographic foliage

- Opening and reset views fit projected parcel/area vertices, with desktop and portrait safe areas. Zoom-out is capped at 112% of the overview distance.
- Removed the unreferenced outer ring of 96 trees and distant spherical groves. Outside grass is muted; lawn detail stays inside the existing parcel/area mask. No parcel geometry changed.
- Rebuilt a CC0 Poly Haven tree in Blender 4.5.14. Photographic leaf cards preserve atlas UVs; two LODs are instanced across 66 placements. Asset is about 1.97 MB including textures. Near 15,784 triangles; far 5,926. Existing shrub/furniture library remains.
- Explicit depth writes fix foliage being overwritten after switching from blended GLTF materials to cutout foliage. Warm daylight and leaf albedo/transmission are tuned without postprocessing passes.
- Mobile retains 1x resolution, 1024 shadow map, shorter near-tree distance and no grass tufts. Desktop uses larger budgets.

Validation: TypeScript and production build pass. Camera tests verify full footprint visibility and over 90% use of the limiting safe-view dimension at desktop/portrait sizes. Asset test checks two LODs, embedded images, UV attributes and payload/triangle budgets. Existing navigation, anchoring, daylight and contact-light tests pass. Browser inspected at desktop and 390×844; no console errors. Mobile-sized walking view recorded 751,726 rendered triangles (including shadow passes), 29 draw calls on this workstation. This is not a physical-phone FPS benchmark.

The surroundings, terrain and landscaping are illustrative. Visuals remain real-time WebGL, not a claim of matching offline reference renders.
