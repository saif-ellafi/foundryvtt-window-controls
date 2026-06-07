import { TaskbarState } from "./taskbar-state.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

let WindowControls;

/**
 * ApplicationV2 taskbar tab proxying a real V1 or V2 window.
 */
export class WindowControlsPersistentDummy extends HandlebarsApplicationMixin(ApplicationV2) {

  static DEFAULT_OPTIONS = {
    classes: ["wc-persistent-tab", "hidden-placeholder"],
    tag: "div",
    window: {
      frame: true,
      positioned: false,
      resizable: false,
      minimizable: false,
    },
    position: {
      width: 150,
      height: 30,
    },
  };

  static PARTS = {
    main: { template: "modules/window-controls/templates/empty.hbs" },
  };

  constructor(targetApp) {
    const title = WindowControls.getDisplayTitle(targetApp);
    const uniqueId = `dummy-${WindowControls.curateId(title)}-${WindowControls.getAppId(targetApp)}`;
    super({
      uniqueId,
      window: {
        title,
        closable: WindowControls.shouldShowCloseControl(targetApp),
      },
    });
    this.targetApp = targetApp;
    TaskbarState.link(targetApp, this);

    const oldClose = this.targetApp.close;
    const dummy = this;
    this.targetApp.close = async function (...args) {
      await dummy.justClose();
      return oldClose.apply(this, args);
    };
  }

  _insertElement(element) {
    const panel = document.querySelector("#window-controls-persistent");
    if (panel) {
      panel.appendChild(element);
      return element;
    }
    return super._insertElement(element);
  }

  async restoreTarget() {
    const target = this.targetApp;
    if (!target || !WindowControls.isTaskbarTargetMinimized(target)) return;
    target._wcSkipPersistentMaximizeWrapper = true;
    try {
      await target.maximize();
    } finally {
      delete target._wcSkipPersistentMaximizeWrapper;
    }
    WindowControls.updatePersistentDummyTabState(this, false);
    WindowControls.bringAppToTop(target);
  }

  async justClose() {
    await super.close();
    WindowControls.refreshMinimizeBar();
  }

  async close() {
    await this.targetApp.close();
    await super.close();
  }
}

export function registerPersistentDummy(WC) {
  WindowControls = WC;
  WC.PersistentDummy = WindowControlsPersistentDummy;
  WC.isTaskbarDummy = TaskbarState.isDummy;
  WC.TaskbarState = TaskbarState;
}
