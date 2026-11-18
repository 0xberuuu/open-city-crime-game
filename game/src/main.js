// Boot and the one loop: input is read once per frame, the world advances in
// fixed 1/60 s steps, and the renderer paints what is there. The game moves
// between title, play, paused, help, wasted and busted screens.
//
// ?seed=N fixes the city and traffic. ?shot=chase|drive|foot|mission (with
// &seed=N) stages that scene instead of running the loop, paints it twice and
// sets window.__shotReady for a screenshot.

import { STEP } from './config.js';
import { createWorld, resetWorld, stepWorld, respawn, advanceDialogue } from './world.js';
import { createRenderer, VIEW } from './render.js';
import { createInput, ACTION_CONFIRM, ACTION_PAUSE, ACTION_INTERACT } from './input.js';
import {
  createMinimap, drawHud, drawTitle, drawPaused, drawHelp, drawEndScreen,
  SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_HELP, SCREEN_WASTED, SCREEN_BUSTED,
} from './hud.js';
import { stageShot } from './shots.js';
import { saveGame, loadGame, applySave, hasSave } from './save.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(seed);
const renderer = createRenderer(canvas, world.city);
world.minimap = createMinimap(world.city);
// Debug hook for automated play-testing: the smoke script reads live state.
window.__portSable = { world };
world.camera.x = Math.max(0, world.player.x - VIEW.width / 2);
world.camera.y = Math.max(0, world.player.y - VIEW.height / 2);

function announce(message) {
  status.textContent = message;
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world, scene.screen);
    drawHud(canvas.getContext('2d'), world, { width: VIEW.width, height: VIEW.height });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  const ctx = canvas.getContext('2d');
  let screen = SCREEN_TITLE;
  let helpReturn = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();
  let savedFlash = 0;
  let saveExists = hasSave();

  // Browsers require a gesture before audio: unlock on the first one.
  const unlock = () => world.audio.unlock();
  window.addEventListener('keydown', unlock, { once: false });
  window.addEventListener('pointerdown', unlock, { once: false });

  const idleInput = {
    takeActions: () => 0,
    mouse: () => ({ x: 900, y: 300 }),
    isFiring: () => false,
    axes: () => ({ x: 0, y: 0 }),
    running: () => false,
    handbrake: () => false,
  };

  function startNewGame() {
    resetWorld(world);
    world.minimap = createMinimap(world.city);
    screen = SCREEN_PLAY;
    accumulator = 0;
    announce('Playing. Follow the red marker to Odette at the garage.');
    world.audio.play('click');
  }

  function continueGame() {
    const data = loadGame();
    if (!data) return;
    resetWorld(world);
    world.minimap = createMinimap(world.city);
    applySave(world, data);
    screen = SCREEN_PLAY;
    accumulator = 0;
    announce('Continuing the story.');
    world.audio.play('click');
  }

  function endRun(kind) {
    screen = kind === 'wasted' ? SCREEN_WASTED : SCREEN_BUSTED;
    announce(kind === 'wasted' ? 'Wasted.' : 'Busted.');
  }

  window.addEventListener('keydown', (event) => {
    if (screen === SCREEN_TITLE && (event.code === 'KeyC') && saveExists) continueGame();
    else if (screen === SCREEN_TITLE && event.code === 'KeyH') {
      helpReturn = SCREEN_TITLE;
      screen = SCREEN_HELP;
    } else if (screen === SCREEN_PAUSED && event.code === 'KeyS') {
      if (saveGame(world)) savedFlash = 2;
    } else if (screen === SCREEN_PAUSED && event.code === 'KeyH') {
      helpReturn = SCREEN_PAUSED;
      screen = SCREEN_HELP;
    } else if (screen === SCREEN_PAUSED && event.code === 'KeyQ') {
      screen = SCREEN_TITLE;
      saveExists = hasSave();
    }
  });

  function frame(now) {
    requestAnimationFrame(frame);
    window.__portSable.screen = screen;
    const elapsed = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    if (savedFlash > 0) savedFlash -= elapsed;
    const actions = input.takeActions();

    if (screen === SCREEN_TITLE) {
      // Attract mode: the city lives behind the title.
      accumulator += elapsed;
      while (accumulator >= STEP) {
        stepWorld(world, idleInput, STEP);
        accumulator -= STEP;
      }
      if (actions & ACTION_CONFIRM) startNewGame();
      renderer.draw(world, screen);
      drawTitle(ctx, world, { width: VIEW.width, height: VIEW.height }, saveExists);
      return;
    }

    if (screen === SCREEN_HELP) {
      if (actions & ACTION_PAUSE) screen = helpReturn;
      renderer.draw(world, SCREEN_PLAY);
      drawHelp(ctx, { width: VIEW.width, height: VIEW.height });
      return;
    }

    if (screen === SCREEN_PAUSED) {
      if (actions & ACTION_PAUSE) screen = SCREEN_PLAY;
      renderer.draw(world, SCREEN_PLAY);
      drawHud(ctx, world, { width: VIEW.width, height: VIEW.height });
      drawPaused(ctx, world, { width: VIEW.width, height: VIEW.height }, savedFlash);
      return;
    }

    if (screen === SCREEN_WASTED || screen === SCREEN_BUSTED) {
      if (actions & ACTION_CONFIRM) {
        respawn(world);
        screen = SCREEN_PLAY;
        accumulator = 0;
      }
      renderer.draw(world, SCREEN_PLAY);
      drawEndScreen(ctx, { width: VIEW.width, height: VIEW.height }, screen === SCREEN_WASTED, world.cashLost);
      return;
    }

    // SCREEN_PLAY.
    if (actions & ACTION_PAUSE) {
      screen = SCREEN_PAUSED;
      renderer.draw(world, SCREEN_PLAY);
      drawHud(ctx, world, { width: VIEW.width, height: VIEW.height });
      drawPaused(ctx, world, { width: VIEW.width, height: VIEW.height }, savedFlash);
      return;
    }
    if (world.dialogue) {
      if (actions & (ACTION_CONFIRM | ACTION_INTERACT)) advanceDialogue(world);
      accumulator += elapsed;
      while (accumulator >= STEP) {
        stepWorld(world, idleInput, STEP);
        accumulator -= STEP;
      }
    } else {
      // One-shot actions fire once per frame, but axes, aim and firing stay
      // live for every fixed step — otherwise the game would crawl on slow
      // displays, where several steps share one frame.
      let actionsTaken = false;
      const frameInput = {
        takeActions: () => {
          if (actionsTaken) return 0;
          actionsTaken = true;
          return actions;
        },
        mouse: () => input.mouse(),
        isFiring: () => input.isFiring(),
        axes: () => input.axes(),
        running: () => input.running(),
        handbrake: () => input.handbrake(),
      };
      accumulator += elapsed;
      let guard = 0;
      while (accumulator >= STEP && guard < 8) {
        const result = stepWorld(world, frameInput, STEP);
        accumulator -= STEP;
        guard += 1;
        if (result) {
          endRun(result);
          break;
        }
      }
      if (world.saveRequested) {
        world.saveRequested = false;
        saveGame(world);
      }
    }
    renderer.draw(world, SCREEN_PLAY);
    drawHud(ctx, world, { width: VIEW.width, height: VIEW.height });
  }

  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
