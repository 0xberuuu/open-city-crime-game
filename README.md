# Port Sable — An Open-World Crime Story

[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/c/gta6-01)
[![Rank](https://make.fun/badge/gta6-01/0xberuuu/open-city-crime-game/rank.svg)](https://make.fun/c/gta6-01)
[![Reward](https://make.fun/badge/gta6-01/0xberuuu/open-city-crime-game/reward.svg)](https://make.fun/c/gta6-01)

An entry for the [gta6-01 "Make GTA 6" competition](https://make.fun/c/gta6-01): a
2D top-down open-world crime game in the spirit of the early GTA games, written
in vanilla JavaScript on one canvas — no libraries, no network requests, all
sound synthesized with WebAudio.

Cass Voss is back in Port Sable after two years away. The docks belong to Silas
Crowe now, and the city is paying his toll. Work with Odette Marlow at Marlow's
Garage, run five story missions, and take the city back — or just steal a fast
car and see how many stars you can outrun.

## The city

Port Sable is a seeded 3200×3200 grid city with four districts: downtown towers
with helipads in the north-centre, a park with ponds and paths in the west, a
sandy beach and sea along the south edge, and a working harbor with warehouses,
crates and piers on the east edge. Every building, tree and crate is collision;
traffic follows the street grid; the sea blocks movement except on the piers.

## Systems

- **Driving** — arcade handling with drift, handbrake slides, damage, smoke,
  burning fuses and explosions; six vehicle types from the Alba Sedan to the
  police Interceptor.
- **Traffic and pedestrians** — grid-following traffic that keeps its gap and
  honks when stuck; pedestrians who stroll the sidewalks and flee gunfire.
- **Wanted system** — 0–5 stars from crimes (carjacking, shootings, running
  over pedestrians). Police cruisers pursue and ram; foot officers close in and
  arrest. Break line of sight and the heat fades.
- **Combat** — fists, pistol and SMG with mouse aim; enemy gunmen who seek,
  strafe and shoot on line of sight; pickups for health, armor, ammo and cash.
- **Story** — five missions with typewriter dialogue: a reunion and a lookout
  run, a steal-and-deliver, a 75-second timed getaway, a dock clearance, and a
  boss finale against Silas Crowe himself.
- **Carjacking** — any car is yours; occupied ones cost you heat.
- **HUD** — live minimap with blips, wanted stars, health and armor, cash,
  weapon and ammo, speedometer, objective tracker with an off-screen marker
  arrow, mission banners, and title / pause / help / wasted / busted screens.
- **Save** — autosaves after every mission and on pause, in localStorage.
- **Presentation** — pre-rendered ground, depth-sorted drawing, buildings that
  turn translucent when the player stands behind them, warm afternoon light
  with a vignette, and animated sea shimmer.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Walk, or drive when in a car |
| Mouse | Aim |
| Left click | Fire the current weapon |
| E | Get in / out of a car, talk, pick up |
| Q or 1–3 | Switch weapon (fists, pistol, SMG) |
| Shift | Sprint on foot |
| Space | Handbrake |
| Esc / P | Pause |

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. `?seed=N` fixes the city
and traffic; `?shot=chase|drive|foot|mission&seed=N` stages a screenshot scene.

## Layout

- `game/index.html` — the page and canvas.
- `game/src/` — one job per file: `config`, `random`, `input`, `audio`,
  `city`, `vehicles`, `player`, `traffic`, `effects`, `combat`, `police`,
  `missions`, `save`, `hud`, `render`, `world`, `shots`, `main`.
- `screenshots/` — four real renders of the game running.
- `main.ts` — copies `game/` and `screenshots/` to the output directory and
  writes `dossier.json` for the judge.

## License

MIT — see [LICENSE](LICENSE).
