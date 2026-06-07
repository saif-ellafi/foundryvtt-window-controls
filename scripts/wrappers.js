import { TaskbarState } from "./taskbar-state.js";

let WindowControls;

export function registerWrappers(WC) {
  WindowControls = WC;
  Object.assign(WC, wrapperMethods);
}

const wrapperMethods = {

  lwRegister(target, handler) {
    libWrapper.register("window-controls", target, handler, "WRAPPER");
  },

  afterMinimizeBar(app, setting, prePosition) {
    WindowControls.organizedMinimize(app, setting, prePosition);
  },

  afterMaximizeRestore(app, setting) {
    WindowControls.setRestoredStyle(app);
    if (WindowControls.isPersistentTaskbarSetting(setting))
      WindowControls.showPersistentTargetApp(app);
    else
      WindowControls.$el(app).css("visibility", "");
    if (setting.includes("Bar"))
      WindowControls.setBarMovementLock(app, false);
  },

  registerMinimizeWrapper(proto) {
    WindowControls.lwRegister(`${proto}.minimize`, function (wrapped, ...args) {
      const setting = game.settings.get("window-controls", "organizedMinimize");
      if (setting === "disabled") return wrapped(...args);
      const prePosition = WindowControls.clonePosition(this.position);
      if (setting === "persistentTop" || setting === "persistentBottom") {
        if (!WindowControls.hasRenderedElement(this) || this.id === "tokenizer-control") return wrapped(...args);
        if (WindowControls.isTaskbarDummy(this)) return wrapped(...args);
        return wrapped(...args).then(async () => {
          if (!WindowControls.hasRenderedElement(this)) return;
          const taskbarDummy = await WindowControls.ensureTaskbarDummy(this, { onMinimize: true });
          if (!taskbarDummy) return;
          TaskbarState.setSavedPosition(this, WindowControls.clonePosition(prePosition));
          WindowControls.hidePersistentTargetApp(this);
          WindowControls.updatePersistentDummyTabState(taskbarDummy, true);
        });
      }
      return wrapped(...args).then(() => {
        if (!WindowControls.hasRenderedElement(this)) return;
        WindowControls.afterMinimizeBar(this, setting, prePosition);
      });
    });
  },

  registerMaximizeWrapper(proto) {
    WindowControls.lwRegister(`${proto}.maximize`, function (wrapped, ...args) {
      const setting = game.settings.get("window-controls", "organizedMinimize");
      if (setting === "disabled") return wrapped(...args);
      if (setting === "persistentTop" || setting === "persistentBottom") {
        if (WindowControls.isTaskbarDummy(this)) {
          if (!WindowControls.isTaskbarTargetMinimized(this.targetApp)) return wrapped(...args);
          // Target may be Foundry-minimized before hidePersistentTargetApp runs (dummy render).
          // Only intercept once the real window is actually hidden in the taskbar strip.
          if (!WindowControls.isTaskbarTargetHidden(this.targetApp)) return wrapped(...args);
          return this.restoreTarget();
        }
        if (this.id === "tokenizer-control") {
          return wrapped(...args).then(() => {
            if (!WindowControls.hasRenderedElement(this)) return;
            WindowControls.afterMaximizeRestore(this, setting);
          });
        }
        if (!WindowControls.hasRenderedElement(this)) return wrapped(...args);
        if (this._wcSkipPersistentMaximizeWrapper)
          delete this._wcSkipPersistentMaximizeWrapper;
        const taskbarDummy = WindowControls.findTaskbarDummy(this);
        const savedPosition = WindowControls.prepareMaximizeRestore(this, setting);
        if (WindowControls.isTaskbarTargetHidden(this))
          WindowControls.showPersistentTargetApp(this);
        return wrapped(...args).then(() => {
          WindowControls.finishMaximizeRestore(this, setting, savedPosition);
          if (taskbarDummy)
            WindowControls.updatePersistentDummyTabState(taskbarDummy, false);
        });
      }
      if (!WindowControls.hasRenderedElement(this) || !WindowControls.isMinimized(this)) return wrapped(...args);
      const savedPosition = WindowControls.prepareMaximizeRestore(this, setting);
      return wrapped(...args).then(() => {
        if (!WindowControls.hasRenderedElement(this)) return;
        WindowControls.finishMaximizeRestore(this, setting, savedPosition);
      });
    });
  },

  registerCloseWrapper(proto) {
    WindowControls.lwRegister(`${proto}.close`, function (wrapped, ...args) {
      const setting = game.settings.get("window-controls", "organizedMinimize");
      if (setting === "disabled") return wrapped(...args);
      if (!WindowControls.hasRenderedElement(this)) return wrapped(...args);
      if (setting === "persistentTop" || setting === "persistentBottom") {
        if (this.id === "tokenizer-control") return wrapped(...args);
        if (WindowControls.isMinimized(this) && !TaskbarState.getDummy(this))
          WindowControls.organizedClose(this, setting);
        return wrapped(...args).then(() => WindowControls.refreshMinimizeBar());
      }
      WindowControls.organizedClose(this, setting);
      return wrapped(...args).then(() => WindowControls.refreshMinimizeBar());
    });
  },

  registerSetPositionWrapper(proto) {
    WindowControls.lwRegister(`${proto}.setPosition`, function (wrapped, ...args) {
      if (this._wcRepositioning || this._wcRestoring) return wrapped(...args);
      const setting = game.settings.get("window-controls", "organizedMinimize");
      if (["topBar", "bottomBar"].includes(setting) && WindowControls.isMinimized(this)) {
        const stashKey = WindowControls.getStashedKeys().find(
          k => WindowControls.getAppId(WindowControls.minimizedStash[k]?.app) === WindowControls.getAppId(this)
        );
        if (stashKey != null) {
          const incoming = args[0] ?? {};
          const expectedTop = WindowControls.getMinimizedTop(setting, this);
          if (incoming.left !== stashKey || incoming.top !== expectedTop) {
            this._wcRepositioning = true;
            const result = wrapped.call(this, {
              ...this.position,
              left: stashKey,
              top: expectedTop,
              width: WindowControls.cssMinimizedSize,
              height: WindowControls.cssMinimizedHeaderHeight
            });
            this._wcRepositioning = false;
            return result;
          }
        }
      }
      const expectedPosition = wrapped(...args);
      if (WindowControls.persistentLayout && !WindowControls.isTaskbarDummyInPanel(this))
        return WindowControls.applyPersistentSetPositionConstraints(this, expectedPosition);
      return expectedPosition;
    });
  },

  registerV1HeaderWrapper() {
    WindowControls.lwRegister("Application.prototype._getHeaderButtons", function (wrapped, ...args) {
      const result = wrapped(...args);
      if (WindowControls.shouldSkipHeaderControls(this)) return result;
      if (WindowControls.isTaskbarDummy(this)) return result;
      const close = result.find(b => b.class === "close");
      if (close) close.label = "";
      return WindowControls.buildV1HeaderButtons(this).concat(result);
    });
  },

  registerApplicationWrappers() {
    if (WindowControls._wrappersRegistered) return;
    WindowControls._wrappersRegistered = true;
    const targets = ["Application.prototype"];
    if (WindowControls.ApplicationV2)
      targets.push("foundry.applications.api.ApplicationV2.prototype");
    for (const proto of targets) {
      WindowControls.registerMinimizeWrapper(proto);
      WindowControls.registerMaximizeWrapper(proto);
      WindowControls.registerCloseWrapper(proto);
      WindowControls.registerSetPositionWrapper(proto);
    }
    WindowControls.registerV1HeaderWrapper();
  },

};
