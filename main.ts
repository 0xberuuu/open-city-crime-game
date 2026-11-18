// Port Sable — An Open-World Crime Story: the hand-in program for the
// make.fun gta6-01 bounty (Node 22, standard library only). The game itself
// is this directory's game/ folder: plain static files a desktop browser
// loads offline, game/index.html plus its ES modules, no library and no
// network request — a seeded grid city with traffic, pedestrians, police,
// five story missions, combat and a full HUD, drawn on one canvas with
// synthesized WebAudio sound, its source split one job per file in game/src.
//
// Build output layout: this program copies game/ and screenshots/ from
// beside this file into the output directory (/output in the grader, or
// $MAKEFUN_OUTPUT_DIR anywhere else), then writes dossier.json there with
// the vendored make.fun library. The dossier embeds the game's sources
// whole — index.html first, then the scripts in load order, then the rest
// by path — capped at 160 KiB of source text, alongside the screenshots,
// so the judge reads the shipped game exactly as it plays.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

// Handoff note for the gta6-01 submission: this entrypoint is the only
// program the grader runs — it assembles /output from the repository as
// committed, and the dossier it writes is the judge's copy of Port Sable.
// The game was re-verified end to end under this recording: fresh README,
// fresh screenshots, and two identical dossier runs.
console.log('gta6-01 entrypoint: Port Sable handed in — dossier written to', out);
