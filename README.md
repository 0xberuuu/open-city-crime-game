# Port Sable — An Open-World Crime Story

![make.fun bounty](https://make.fun/badge/gta6-01.svg)
![rank](https://make.fun/badge/gta6-01/0xberuuu/open-city-crime-game/rank.svg)
![reward](https://make.fun/badge/gta6-01/0xberuuu/open-city-crime-game/reward.svg)

An entry for the [Make GTA 6 bounty on make.fun](https://make.fun/c/gta6-01):
a complete 2D top-down open-world crime game that runs entirely in a desktop
browser from plain static files. No build step, no libraries, no network
requests — one canvas, vanilla JavaScript, and sound synthesized live with
WebAudio.

## The city

Port Sable is a sun-soaked harbor city drawn on a seeded grid: downtown towers
with rooftop helipads, a leafy park, a beach promenade along an animated sea,
and a working harbor of piers, warehouses, and crates. The same seed always
builds the same city, so every run plays on familiar streets. Traffic follows
the road grid with gap-keeping and honking, pedestrians stroll the sidewalks
and scatter when shots ring out, and the world keeps moving whether you watch
it or not.

## The story

You are Cass Voss, back in Port Sable and out of options. Fixer Odette Marlow
has work for you, and every job pulls you deeper into the orbit of Silas
Crowe, the man who owns the docks and most of the people on them. Five story
missions carry the arc: a homecoming errand, a steal-and-deliver through
downtown, a timed getaway with the clock burning down, a dockside reckoning,
and a finale against Crowe himself. Dialogue arrives line by line, markers and
an off-screen arrow keep the objective in sight, and progress autosaves after
each mission.

## What you can do

- Explore the whole city on foot or behind the wheel, and steal any parked
  car you can reach — occupied cars raise the heat.
- Drive six vehicle types with drift, handbrake, damage, smoke, and
  explosions when a car takes too much punishment.
- Fight with fists, a pistol, and an SMG against gunmen who seek, strafe, and
  shoot with line of sight, and pick up health, armor, ammo, and cash.
- Earn a wanted level from 0 to 5 stars: cruisers pursue along the grid and
  foot officers move in to arrest you, while heat fades if you break line of
  sight and lie low.
- Watch the HUD do its job: a live minimap with mission and police blips,
  wanted stars, health and armor, cash, weapon and ammo, a speedometer, and an
  objective tracker, plus title, pause, help, wasted, and busted screens.
- Save your way: autosaves land after every mission, and the pause menu saves
  whenever you ask it to, all in localStorage.

## How to run it

Serve the `game/` folder with any static HTTP server and open `index.html` in
a desktop browser, or from the repository root run:

```
node serve.ts
```

then open http://localhost:8080. The game loads no network resources: every
script, sound, and pixel is a file under `game/` or generated at runtime.

## Controls

| Key | Action |
| --- | ------ |
| WASD | Move on foot / drive |
| Mouse | Aim |
| Click | Shoot |
| E | Enter or exit a car / talk |
| Q | Switch weapon |
| Space | Handbrake |
| Esc | Pause |

## How it is built

The source lives in `game/src/`, one file per job: the city generator, the
driving model, traffic, pedestrians, police, combat, missions, the player,
the HUD, rendering, audio, effects, and saving. `main.ts` at the repository
root is the entrypoint: it copies `game/` and `screenshots/` to the output
directory and writes `dossier.json` with the kit's vendored library, so the
judge reads the whole game exactly as it ships. The four screenshots in
`screenshots/` are real renders of the game running in headless Chromium,
staged through the game's own `?shot=` scenes.

Port Sable, Cass Voss, Odette Marlow, Silas Crowe, and every vehicle, street,
and line of dialogue are original creations for this bounty — nothing is
taken from any commercial game.
