// Keyboard and mouse input. Held keys give movement and steering; one-shot
// presses (interact, pause, weapon switch, dialogue advance) are queued as bit
// flags and taken once by the loop, so a press between frames is never lost
// and never counted twice. The mouse aims and fires.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_INTERACT = 4;
export const ACTION_WEAPON = 8;
export const ACTION_HANDBRAKE = 16;

const FORWARD = new Set(['KeyW', 'ArrowUp']);
const BACK = new Set(['KeyS', 'ArrowDown']);
const LEFT = new Set(['KeyA', 'ArrowLeft']);
const RIGHT = new Set(['KeyD', 'ArrowRight']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const INTERACT = new Set(['KeyE', 'KeyF']);
const WEAPON = new Set(['KeyQ', 'Tab', 'Digit1', 'Digit2', 'Digit3']);
const RUN = new Set(['ShiftLeft', 'ShiftRight']);

export function createInput(canvas) {
  const held = new Set();
  let actions = 0;
  let mouseX = 0;
  let mouseY = 0;
  let firing = false;

  window.addEventListener('keydown', (event) => {
    if (FORWARD.has(event.code) || BACK.has(event.code) || LEFT.has(event.code) || RIGHT.has(event.code) || RUN.has(event.code)) {
      held.add(event.code);
    } else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (INTERACT.has(event.code)) {
      if (!event.repeat) actions |= ACTION_INTERACT;
    } else if (WEAPON.has(event.code)) {
      if (!event.repeat) actions |= ACTION_WEAPON;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
  });
  window.addEventListener('blur', () => {
    held.clear();
    firing = false;
  });
  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = (event.clientX - rect.left) * (canvas.width / rect.width);
    mouseY = (event.clientY - rect.top) * (canvas.height / rect.height);
  });
  canvas.addEventListener('pointerdown', (event) => {
    if (event.button === 0) firing = true;
    actions |= ACTION_CONFIRM;
  });
  window.addEventListener('pointerup', (event) => {
    if (event.button === 0) firing = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  function has(set) {
    for (const code of set) if (held.has(code)) return true;
    return false;
  }

  return {
    /** -1/0/1 strafe and -1/0/1 forward, in screen space. */
    axes() {
      return { x: (has(RIGHT) ? 1 : 0) - (has(LEFT) ? 1 : 0), y: (has(BACK) ? 1 : 0) - (has(FORWARD) ? 1 : 0) };
    },
    running() {
      return has(RUN);
    },
    handbrake() {
      return has(CONFIRM);
    },
    mouse() {
      return { x: mouseX, y: mouseY };
    },
    isFiring() {
      return firing;
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
