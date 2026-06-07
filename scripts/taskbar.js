import { TaskbarState } from "./taskbar-state.js";
import { registerPersistentDummy, WindowControlsPersistentDummy } from "./persistent-dummy.js";

let WindowControls;

export function registerTaskbar(WC) {
  WindowControls = WC;
  registerPersistentDummy(WC);
  Object.assign(WC, taskbarMethods);
}

const taskbarMethods = {

  get AbstractSidebarTab() {
    return foundry.applications?.sidebar?.AbstractSidebarTab;
  },

  get DocumentSheetV2() {
    return foundry.applications?.api?.DocumentSheetV2;
  },

  get DialogV2() {
    return foundry.applications?.api?.DialogV2;
  },

  isSidebarTab(app) {
    const Tab = WindowControls.AbstractSidebarTab;
    if (Tab && app instanceof Tab) return true;
    return !!(app?.tabName && (app.collection != null || app.documentCollection != null));
  },

  isSidebarPopout(app) {
    if ("isPopout" in (app ?? {})) return app.isPopout === true;
    return WindowControls.isLegacyPopout(app);
  },

  isEmbeddedSidebarTab(app) {
    return WindowControls.isSidebarTab(app) && !WindowControls.isSidebarPopout(app);
  },

  isLegacyPopout(app) {
    const options = app?.options ?? {};
    if (options.popOut === true || app.popOut === true) return true;
    if (options.window?.popOut === true) return true;
    return false;
  },

  isCoreUiSingleton(app) {
    if (!app || !ui) return false;
    const singletons = [
      ui.hotbar, ui.chat, ui.players, ui.controls, ui.nav, ui.notifications,
      ui.pause, ui.webrtc, ui.hud, ui.sidebar, ui.combat, ui.sceneControls
    ].filter(Boolean);
    if (singletons.some(s => s === app)) return true;
    if (ui.sidebar?.tabs) {
      for (const tab of Object.values(ui.sidebar.tabs))
        if (tab === app) return true;
    }
    return false;
  },

  isDocumentBackedWindow(app) {
    const DocSheet = WindowControls.DocumentSheetV2;
    if (DocSheet && app instanceof DocSheet) return true;
    if (app.document?.documentName) return true;
    if (!WindowControls.isV2(app) && (app.object || app.entity)) return true;
    return false;
  },

  isTransientApplication(app) {
    const DialogV2 = WindowControls.DialogV2;
    if (DialogV2 && app instanceof DialogV2) return true;
    if (typeof Dialog !== "undefined" && app instanceof Dialog) return true;
    const FilePicker = foundry.applications?.apps?.FilePicker;
    if (FilePicker && app instanceof FilePicker) return true;
    return false;
  },

  shouldSkipTaskbarDummy(app) {
    if (!app) return true;
    if (WindowControls.shouldSkipHeaderControls(app)) return true;
    if (WindowControls.isTaskbarDummy(app)) return true;
    if (WindowControls.isCoreUiSingleton(app)) return true;
    if (WindowControls.isEmbeddedSidebarTab(app)) return true;
    if (WindowControls.isTransientApplication(app)) return true;
    if (WindowControls.isV2(app) && app.hasFrame === false) return true;
    return false;
  },

  isUserFacingPopout(app) {
    if (WindowControls.isSidebarTab(app)) return WindowControls.isSidebarPopout(app);
    return WindowControls.isLegacyPopout(app);
  },

  syncTaskbarDummyTitle(dummy, targetApp) {
    const title = WindowControls.getDisplayTitle(targetApp);
    // ApplicationV2 options are frozen; update title via window chrome / DOM only.
    if (dummy.window?.title instanceof HTMLElement)
      dummy.window.title.textContent = title;
    if (WindowControls.hasRenderedElement(dummy))
      WindowControls.applyDisplayTitle(dummy);
  },

  ensureTaskbarToggleIcon(dummy) {
    const $root = WindowControls.$el(dummy);
    const $header = $root.find(".window-header, header");
    let $toggle = $header.find(".wc-taskbar-toggle");
    if (!$toggle.length) {
      $toggle = $(`<button type="button" class="wc-taskbar-toggle header-control icon" aria-label="Toggle"><i class="far fa-window-minimize"></i></button>`);
      const $close = $header.find('[data-action="close"], a.close, button.close').first();
      if ($close.length) $close[0].before($toggle[0]);
      else $header.append($toggle);
      $toggle.on("click.window-controls", ev => {
        ev.preventDefault();
        ev.stopPropagation();
        WindowControls.toggleTaskbarTarget(dummy);
        ev.currentTarget.blur();
      });
    }
    return $toggle;
  },

  applyTaskbarDummyChrome(dummy, targetApp) {
    if (!WindowControls.hasRenderedElement(dummy)) return;
    const $root = WindowControls.$el(dummy);
    const targetMinimized = WindowControls.isTaskbarTargetMinimized(targetApp);

    $root.addClass("minimized").removeClass("hidden-placeholder");
    $root.css({
      position: "relative",
      top: "auto",
      left: "auto",
      width: `${WindowControls.cssMinimizedSize}px`,
      height: `${WindowControls.cssMinimizedHeaderHeight}px`,
      maxHeight: `${WindowControls.cssMinimizedHeaderHeight}px`,
      minHeight: `${WindowControls.cssMinimizedHeaderHeight}px`,
      margin: 0,
      visibility: "visible",
      overflow: "hidden",
      boxShadow: "none"
    });

    const header = $root.find("header, .window-header")[0];
    if (header) {
      let sibling = header.nextElementSibling;
      while (sibling) {
        sibling.style.display = "none";
        sibling = sibling.nextElementSibling;
      }
    }
    $root.find(".window-content, .window-resize-handle, [data-application-part]").hide();

    $root.find(".window-header, header").removeClass("draggable");

    WindowControls.syncTaskbarDummyTitle(dummy, targetApp);
    WindowControls.ensureTaskbarToggleIcon(dummy);
    if (targetApp._pinned)
      WindowControls.setPinnedState(dummy, true);
    else
      WindowControls.refreshPinnedChrome(dummy);
    WindowControls.updatePersistentDummyTabState(dummy, targetMinimized);
    WindowControls.toggleMovement(dummy);
  },

  findTaskbarDummy(targetApp) {
    const targetId = WindowControls.getAppId(targetApp);
    if (targetId == null) return null;
    const linked = TaskbarState.getDummy(targetApp);
    if (linked?.targetApp && WindowControls.getAppId(linked.targetApp) === targetId)
      return linked;
    return Object.values(ui.windows).find(w =>
      WindowControls.isTaskbarDummy(w)
      && WindowControls.getAppId(w.targetApp) === targetId
    ) ?? null;
  },

  isFramedMinimizableWindow(app) {
    const options = app?.options ?? {};
    const windowOpts = options.window ?? {};
    const minimizable = options.minimizable ?? windowOpts.minimizable;
    if (minimizable === false) return false;
    if (WindowControls.isV2(app)) {
      if (app.hasFrame === false) return false;
      if (windowOpts.positioned === false) return false;
      return true;
    }
    return options.minimizable !== false;
  },

  isTrackableTaskbarWindow(app) {
    if (!app || WindowControls.shouldSkipTaskbarDummy(app)) return false;
    if (TaskbarState.getDummy(app)?.rendered) return false;
    if (!WindowControls.getAppTitle(app)) return false;
    if (!WindowControls.isFramedMinimizableWindow(app)) return false;
    if (WindowControls.isDocumentBackedWindow(app)) return true;
    if (WindowControls.isSidebarTab(app)) return WindowControls.isSidebarPopout(app);
    if (app.tabName && !WindowControls.isV2(app)) return WindowControls.isUserFacingPopout(app);
    return false;
  },

  purgeInvalidTaskbarDummies() {
    if (!document.querySelector("#window-controls-persistent")) return;
    for (const dummy of Object.values(ui.windows)) {
      if (!WindowControls.isTaskbarDummy(dummy)) continue;
      const target = dummy.targetApp;
      const keep = target?.rendered
        && WindowControls.getAppTitle(target)
        && (WindowControls.isTrackableTaskbarWindow(target) || WindowControls.isMinimized(target));
      if (!keep)
        dummy.close({ force: true }).catch(() => dummy.justClose?.());
    }
  },

  canMinimizeToTaskbar(app) {
    if (!app || WindowControls.shouldSkipTaskbarDummy(app)) return false;
    if (!WindowControls.getAppTitle(app)) return false;
    return WindowControls.isFramedMinimizableWindow(app);
  },

  async ensureTaskbarDummy(app, { onMinimize = false } = {}) {
    const existing = TaskbarState.getDummy(app);
    if (existing?.rendered) {
      TaskbarState.link(app, existing);
      WindowControls.syncTaskbarDummyTitle(existing, app);
      return existing;
    }
    const allowed = onMinimize
      ? WindowControls.canMinimizeToTaskbar(app)
      : WindowControls.isTrackableTaskbarWindow(app);
    if (!allowed) return null;
    await WindowControls.renderDummyPanelApp(app, { force: onMinimize });
    return TaskbarState.getDummy(app);
  },

  isTaskbarDummyInPanel(app) {
    return WindowControls.isTaskbarDummy(app)
      && WindowControls.isInPersistentTaskbarPanel(app);
  },

  hidePersistentTargetApp(app) {
    if (!WindowControls.hasRenderedElement(app)) return;
    WindowControls.$el(app)
      .addClass("wc-persistent-target-hidden")
      .css({ visibility: "hidden", "pointer-events": "none" });
  },

  showPersistentTargetApp(app) {
    if (!WindowControls.hasRenderedElement(app)) return;
    WindowControls.$el(app)
      .removeClass("wc-persistent-target-hidden")
      .css({ visibility: "", "pointer-events": "" });
  },

  updatePersistentDummyTabState(dummy, targetMinimized) {
    if (!dummy || !WindowControls.hasRenderedElement(dummy)) return;
    const $dummy = WindowControls.$el(dummy);
    const $icon = $dummy.find(".wc-taskbar-toggle i, .fa-window-minimize, .fa-window-restore");
    WindowControls.ensureTaskbarToggleIcon(dummy);
    if (targetMinimized) {
      $icon.removeClass("fa-window-minimize").addClass("fa-window-restore");
      $dummy.css("background-color", "");
    } else {
      $icon.removeClass("fa-window-restore").addClass("fa-window-minimize");
      if (game.modules.get("minimal-ui")?.active)
        $dummy.css("background-color", game.settings.get("minimal-ui", "shadowColor"));
      else
        $dummy.css("background-color", "#ff640080");
    }
    $dummy.find(".wc-taskbar-toggle")[0]?.blur();
  },

  isTaskbarTargetHidden(app) {
    if (!WindowControls.hasRenderedElement(app)) return false;
    return WindowControls.$el(app).hasClass("wc-persistent-target-hidden");
  },

  isTaskbarTargetMinimized(app) {
    return WindowControls.isMinimized(app) || WindowControls.isTaskbarTargetHidden(app);
  },

  unbindTaskbarDummyCapture(taskbarApp) {
    for (const { el, fn } of taskbarApp._wcCaptureHandlers ?? [])
      el.removeEventListener("dblclick", fn, true);
    taskbarApp._wcCaptureHandlers = [];
  },

  async toggleTaskbarTarget(taskbarApp) {
    if (TaskbarState.isToggling(taskbarApp)) return;
    const target = taskbarApp?.targetApp;
    if (!target) return;
    const restoring = WindowControls.isTaskbarTargetMinimized(target);
    TaskbarState.setToggling(taskbarApp, true);
    try {
      if (restoring)
        await taskbarApp.restoreTarget();
      else
        await target.minimize();
    } finally {
      TaskbarState.setToggling(taskbarApp, false);
    }
  },

  bindTaskbarDummyInteractions(taskbarApp) {
    const $root = WindowControls.$el(taskbarApp);
    if (!$root.length) return;
    $root.off(".window-controls");
    WindowControls.unbindTaskbarDummyCapture(taskbarApp);

    const $header = $root.find(".window-header, header");
    $header.on("click.window-controls", ev => {
      if ($(ev.target).closest("a, button, [data-action]").length) return;
      if (!WindowControls.isTaskbarTargetMinimized(taskbarApp.targetApp))
        WindowControls.bringAppToTop(taskbarApp.targetApp);
    });

    const rootEl = $root[0];
    if (rootEl) {
      const fn = ev => {
        if (!$(ev.target).closest(".window-header, header").length) return;
        if ($(ev.target).closest("a, button, [data-action]").length) return;
        ev.preventDefault();
        ev.stopPropagation();
        ev.stopImmediatePropagation();
        WindowControls.toggleTaskbarTarget(taskbarApp);
      };
      rootEl.addEventListener("dblclick", fn, true);
      taskbarApp._wcCaptureHandlers = [{ el: rootEl, fn }];
    }
  },

  async renderDummyPanelApp(app, { force = false } = {}) {
    if (!game.ready) return;
    if (!document.querySelector("#window-controls-persistent")) return;
    if (game.modules.get("gm-screen")?.active && app.cellId?.includes("gm-screen")) return;
    if (WindowControls.getOverflowedState()) return;
    if (!force && !WindowControls.isTrackableTaskbarWindow(app)) return;
    if (!WindowControls.getAppTitle(app)) return;

    const existingDummy = TaskbarState.getDummy(app);
    if (existingDummy?.rendered) {
      TaskbarState.link(app, existingDummy);
      WindowControls.syncTaskbarDummyTitle(existingDummy, app);
      await existingDummy.render();
      WindowControls.applyTaskbarDummyChrome(existingDummy, app);
      WindowControls.bindTaskbarDummyInteractions(existingDummy);
      if (WindowControls.isMinimized(app)) {
        TaskbarState.setSavedPosition(app, WindowControls.clonePosition(app.position));
        WindowControls.hidePersistentTargetApp(app);
        WindowControls.updatePersistentDummyTabState(existingDummy, true);
      }
      return;
    }

    const taskbarApp = new WindowControlsPersistentDummy(app);
    TaskbarState.link(app, taskbarApp);
    await taskbarApp.render({ force: true });
    WindowControls.applyTaskbarDummyChrome(taskbarApp, app);
    WindowControls.bindTaskbarDummyInteractions(taskbarApp);
  },

  registerTaskbarRenderHooks() {
    const tryTaskbarDummy = app => {
      if (!game.ready) return;
      if (WindowControls.isTrackableTaskbarWindow(app))
        WindowControls.renderDummyPanelApp(app);
    };

    const trackable = app => WindowControls.isTrackableTaskbarWindow(app);
    const hooks = [
      { hook: "renderSidebarTab", filter: app => WindowControls.isSidebarPopout(app) },
      { hook: "renderApplicationV2", filter: trackable },
      { hook: "renderActorSheet", filter: trackable },
      { hook: "renderItemSheet", filter: trackable },
      { hook: "renderCompendium", filter: trackable },
      { hook: "renderRollTableConfig", filter: trackable },
      { hook: "renderJournalSheet", filter: app => {
        if (game.modules.get("one-journal")?.active || app.enhancedjournal) return false;
        return trackable(app);
      }},
      { hook: "activateControls", filter: app => app.constructor.name === "EnhancedJournal" },
      { hook: "renderInlineViewer", filter: trackable },
      { hook: "renderee", filter: trackable },
      { hook: "renderQuestLog", filter: trackable },
      { hook: "renderQuestPreview", filter: trackable },
      { hook: "renderSoundBoardApplication", filter: trackable },
      { hook: "renderStaticViewer", filter: trackable },
      { hook: "renderFillableViewer", filter: trackable },
    ];

    for (const { hook, filter } of hooks) {
      Hooks.on(hook, function (app) {
        if (filter(app)) tryTaskbarDummy(app);
      });
    }

    setTimeout(() => WindowControls.purgeInvalidTaskbarDummies(), 500);
  },

  applyPersistentSetPositionConstraintsForDummy(app, expectedPosition) {
    const layout = WindowControls.persistentLayout;
    if (!layout || !expectedPosition || !WindowControls.isTaskbarDummy(app)) return expectedPosition;
    if (layout.mode === "bottom" && !WindowControls.isTaskbarDummyInPanel(app)) {
      setTimeout(() => {
        if (!WindowControls.hasRenderedElement(app)) return;
        const botPos = WindowControls.getTaskbarBot();
        if (app.position?.top != botPos) {
          app._wcRepositioning = true;
          app.setPosition({ top: botPos });
          app._wcRepositioning = false;
        }
      }, 500);
    }
    return expectedPosition;
  },

};
