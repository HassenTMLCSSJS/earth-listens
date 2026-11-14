# Earth Listens models

Procedural stand-ins live in `src/modules/models/registry.ts`. Zain replaces `file: null` with a GLB and points `Component` at the loaded model. `StandIn` stays as the fallback. Props are `playing`, `intensity`, `focused`, `reducedMotion`.

| id           | placement | layer         | status   |
| ------------ | --------- | ------------- | -------- |
| inst_oud     | overlay   | temperature   | stand-in |
| inst_kamanja | overlay   | forest        | stand-in |
| inst_ney     | overlay   | precipitation | stand-in |
| inst_darbuka | overlay   | wildfire      | stand-in |
| inst_riq     | overlay   | lightning     | stand-in |
| inst_qanun   | overlay   | sea_ice       | stand-in |
| inst_chimes  | overlay   | air_quality   | stand-in |
| inst_bowl    | overlay   | co2           | stand-in |
| note_field   | globe     |               | stand-in |
| jukebox_ring | globe     |               | stand-in |
| music_box    | overlay   |               | stand-in |
| satellite    | globe     | events        | stand-in |
| headphones   | overlay   |               | stand-in |
| sada         | overlay   |               | stand-in |
| cairo_marker | globe     |               | stand-in |
| layer_icon   | overlay   |               | stand-in |
| focus_ring   | overlay   |               | stand-in |
| stage_disc   | overlay   |               | stand-in |

The intro timeline is `startIntro({ locale, mode })` in `src/modules/intro/timeline.ts`. Scenes are DOM placeholders until the cinematic scenes land. The globe controller is `src/modules/globe/controller.ts`.
