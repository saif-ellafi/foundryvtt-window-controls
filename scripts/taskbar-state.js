import { WC_TASKBAR_DUMMY } from "./symbols.js";

/**
 * Links a real application to its taskbar dummy tab and stashed restore data.
 * @see docs/INVARIANTS.md
 */
export class TaskbarState {
  static #byTarget = new WeakMap();
  static #byDummy = new WeakMap();

  static isDummy(app) {
    return app?.[WC_TASKBAR_DUMMY] === true;
  }

  static markDummy(dummy) {
    dummy[WC_TASKBAR_DUMMY] = true;
  }

  static link(target, dummy) {
    if (!target || !dummy) return;
    TaskbarState.markDummy(dummy);
    dummy.targetApp = target;
    const state = TaskbarState.#byTarget.get(target) ?? { savedPosition: null, toggling: false };
    state.dummy = dummy;
    TaskbarState.#byTarget.set(target, state);
    TaskbarState.#byDummy.set(dummy, state);
    target._sourceDummyPanelApp = dummy;
  }

  static get(target) {
    return target ? TaskbarState.#byTarget.get(target) : undefined;
  }

  static getDummy(target) {
    return TaskbarState.get(target)?.dummy
      ?? target?._sourceDummyPanelApp
      ?? null;
  }

  static setSavedPosition(target, position) {
    const state = TaskbarState.get(target);
    if (state) state.savedPosition = position;
  }

  static getSavedPosition(target) {
    const state = TaskbarState.get(target);
    return state?.savedPosition ?? null;
  }

  static isToggling(dummy) {
    return TaskbarState.#byDummy.get(dummy)?.toggling === true;
  }

  static setToggling(dummy, value) {
    const state = TaskbarState.#byDummy.get(dummy);
    if (state) state.toggling = value;
  }
}
