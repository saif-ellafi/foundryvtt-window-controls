import { TaskbarState } from "./taskbar-state.js";

let WindowControls;

export function registerHeaderButtons(WC) {
  WindowControls = WC;
  Object.assign(WC, headerButtonMethods);
}

const headerButtonMethods = {

  shouldInjectInlineMinimize(app) {
    if (!app || WindowControls.shouldSkipHeaderControls(app)) return false;
    if (WindowControls.isTaskbarDummy?.(app)) return false;
    if (!WindowControls.isV2(app)) return false;
    if (game.settings.get("window-controls", "minimizeButton") !== "enabled") return false;
    if (!WindowControls.hasRenderedElement(app)) return false;
    return WindowControls.isFramedMinimizableWindow(app);
  },

  handleMinimizeClick(app) {
    if (WindowControls.isMinimized(app))
      app.maximize(true);
    else {
      app.minimize();
      const bkp = app.minimize;
      app.minimize = () => {};
      setTimeout(() => {
        app.minimize = bkp;
      }, 200);
    }
  },

  syncMinimizeControlIcon(app) {
    if (!WindowControls.hasRenderedElement(app)) return;
    const minimized = WindowControls.isMinimized(app);
    const $icon = WindowControls.$el(app).find(".wc-minimize-control i");
    if (!$icon.length) return;
    $icon.removeClass("fa-window-minimize fa-window-restore")
      .addClass(minimized ? "fa-window-restore" : "fa-window-minimize");
    const $btn = $icon.closest(".wc-minimize-control");
    const tip = game.i18n.localize(minimized
      ? "WindowControls.RestoreControl"
      : "WindowControls.MinimizeControl");
    $btn.attr("data-tooltip", tip).attr("aria-label", tip);
    $btn[0]?.blur();
  },

  injectMinimizeControl(app) {
    if (!WindowControls.shouldInjectInlineMinimize(app)) return;

    const $root = WindowControls.$el(app);
    const $header = $root.find("header, .window-header");
    if (!$header.length) return;

    const $close = $header.find('[data-action="close"], a.close, button.close').first();
    const $before = $header.find(".wc-pin-control, a.pin, button.pin").first();
    let $btn = $header.find(".wc-minimize-control");

    if (!$btn.length) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "header-control wc-minimize-control icon";
      const tip = game.i18n.localize("WindowControls.MinimizeControl");
      btn.dataset.tooltip = tip;
      btn.setAttribute("aria-label", tip);
      btn.innerHTML = '<i class="far fa-window-minimize"></i>';
      btn.addEventListener("click", ev => {
        ev.preventDefault();
        ev.stopPropagation();
        WindowControls.handleMinimizeClick(app);
        ev.currentTarget.blur();
      });
      if ($before.length)
        $before[0].before(btn);
      else if ($close.length)
        $close[0].before(btn);
      else
        $header[0].appendChild(btn);
      $btn = $(btn);
    }

    WindowControls.syncMinimizeControlIcon(app);
  },

  shouldShowPinControl(app) {
    if (!app || WindowControls.shouldSkipHeaderControls(app)) return false;
    if (WindowControls.isTaskbarDummy?.(app)) return false;
    if (game.settings.get("window-controls", "pinnedButton") !== "enabled") return false;
    if (!WindowControls.hasRenderedElement(app)) return false;
    if (WindowControls.isMinimized(app)) return false;
    if (!WindowControls.isFramedMinimizableWindow(app)) return false;
    return WindowControls.shouldShowCloseControl(app);
  },

  shouldInjectInlinePin(app) {
    if (!WindowControls.isV2(app)) return false;
    return WindowControls.shouldShowPinControl(app);
  },

  handlePinClick(app) {
    const pinned = !app._pinned;
    const sync = [app];
    const dummy = TaskbarState.getDummy(app);
    if (dummy) sync.push(dummy);
    else if (app.targetApp) sync.push(app.targetApp);
    for (const target of sync)
      WindowControls.setPinnedState(target, pinned);
  },

  syncPinControlState(app) {
    if (!WindowControls.hasRenderedElement(app)) return;
    const $btn = WindowControls.$el(app).find(".wc-pin-control");
    if (!$btn.length) return;
    const pinned = app._pinned === true;
    $btn.toggleClass("wc-pinned", pinned);
    const tip = game.i18n.localize(pinned
      ? "WindowControls.UnpinControl"
      : "WindowControls.PinControl");
    $btn.attr("data-tooltip", tip).attr("aria-label", tip);
    $btn[0]?.blur();
  },

  injectPinControl(app) {
    if (!WindowControls.shouldShowPinControl(app)) {
      WindowControls.removePinControl(app);
      return;
    }

    const $root = WindowControls.$el(app);
    const $header = $root.find("header, .window-header");
    if (!$header.length) return;

    const $close = $header.find('[data-action="close"], a.close, button.close').first();
    const $after = $header.find(".wc-minimize-control, .wc-taskbar-toggle, a.minimize, button.minimize").last();
    let $btn = $header.find(".wc-pin-control");

    if (!$btn.length) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "header-control wc-pin-control icon";
      const tip = game.i18n.localize("WindowControls.PinControl");
      btn.dataset.tooltip = tip;
      btn.setAttribute("aria-label", tip);
      btn.innerHTML = '<i class="fas fa-map-pin"></i>';
      btn.addEventListener("click", ev => {
        ev.preventDefault();
        ev.stopPropagation();
        WindowControls.handlePinClick(app);
        ev.currentTarget.blur();
      });
      if ($after.length)
        $after[0].after(btn);
      else if ($close.length)
        $close[0].before(btn);
      else
        $header[0].appendChild(btn);
      $btn = $(btn);
    }

    WindowControls.syncPinControlState(app);
  },

  removeMinimizeControl(app) {
    if (!WindowControls.hasRenderedElement(app)) return;
    WindowControls.$el(app).find(".wc-minimize-control").remove();
  },

  removePinControl(app) {
    if (!WindowControls.hasRenderedElement(app)) return;
    WindowControls.$el(app).find(".wc-pin-control, a.pin, button.pin").remove();
  },

  injectV1MinimizeControl(app) {
    if (!WindowControls.hasRenderedElement(app) || WindowControls.isV2(app)) return;
    if (!WindowControls.isFramedMinimizableWindow(app)) return;
    const $header = WindowControls.$el(app).find(".window-header");
    if (!$header.length || $header.find(".minimize").length) return;
    const $close = $header.find(".close").first();
    const $before = $header.find(".pin").first();
    const $btn = $(`<a class="header-button minimize"></a>`);
    $btn.append('<i class="far fa-window-minimize"></i>');
    $btn.on("click", ev => {
      ev.preventDefault();
      WindowControls.handleMinimizeClick(app);
    });
    if ($before.length) $before.before($btn);
    else if ($close.length) $close.before($btn);
    else $header.append($btn);
  },

  injectV1PinControl(app) {
    if (!WindowControls.hasRenderedElement(app) || WindowControls.isV2(app)) return;
    if (!WindowControls.shouldShowPinControl(app)) {
      WindowControls.removePinControl(app);
      return;
    }
    const $header = WindowControls.$el(app).find(".window-header");
    if (!$header.length || $header.find(".pin").length) return;
    const $close = $header.find(".close").first();
    const $after = $header.find(".minimize").last();
    const $btn = $(`<a class="header-button pin"></a>`);
    $btn.append('<i class="fas fa-map-pin"></i>');
    $btn.on("click", ev => {
      ev.preventDefault();
      WindowControls.handlePinClick(app);
    });
    if ($after.length) $after.after($btn);
    else if ($close.length) $close.before($btn);
    else $header.append($btn);
  },

  refreshAllHeaderControls({ minimizeEnabled, pinEnabled } = {}) {
    if (minimizeEnabled === undefined)
      minimizeEnabled = game.settings.get("window-controls", "minimizeButton") === "enabled";
    if (pinEnabled === undefined)
      pinEnabled = game.settings.get("window-controls", "pinnedButton") === "enabled";

    for (const app of WindowControls.getRenderedApplications()) {
      if (!WindowControls.hasRenderedElement(app)) continue;
      if (WindowControls.shouldSkipHeaderControls(app)) continue;

      if (WindowControls.isTaskbarDummy?.(app)) {
        WindowControls.removePinControl(app);
        WindowControls.refreshPinnedChrome(app);
        continue;
      }

      if (WindowControls.isV2(app)) {
        if (minimizeEnabled) {
          WindowControls.removeMinimizeControl(app);
          WindowControls.injectMinimizeControl(app);
        } else {
          WindowControls.removeMinimizeControl(app);
        }
        if (pinEnabled) {
          WindowControls.removePinControl(app);
          WindowControls.injectPinControl(app);
        } else {
          WindowControls.removePinControl(app);
        }
      } else {
        WindowControls.removePinControl(app);
        WindowControls.$el(app).find(".minimize").remove();
        if (minimizeEnabled) WindowControls.injectV1MinimizeControl(app);
        if (pinEnabled) WindowControls.injectV1PinControl(app);
      }

      WindowControls.refreshPinnedChrome(app);
    }
  },

  registerHeaderButtonHooks() {
    const syncHeaderControls = app => {
      if (!WindowControls.shouldShowCloseControl(app) && app._pinned)
        WindowControls.setPinnedState(app, false);
      WindowControls.injectMinimizeControl(app);
      WindowControls.injectPinControl(app);
      WindowControls.refreshPinnedChrome(app);
      const dummy = TaskbarState.getDummy(app);
      if (dummy?.rendered && app._pinned)
        WindowControls.setPinnedState(dummy, true);
      if (app.targetApp?._pinned && !app._pinned)
        WindowControls.setPinnedState(app, true);
    };

    const onRender = app => {
      syncHeaderControls(app);
      queueMicrotask(() => syncHeaderControls(app));
    };

    Hooks.on("renderApplicationV2", onRender);

    if (WindowControls.ApplicationV2) {
      Hooks.on("getHeaderControlsApplicationV2", (app, controls) => {
        if (!WindowControls.isV2(app)) return;
        for (let i = controls.length - 1; i >= 0; i--) {
          const c = controls[i];
          if (["minimize", "maximize", "pin", "wcMinimize", "wcMaximize", "wcPin"].includes(c.action)
            || c.class === "minimize" || c.class === "maximize" || c.class === "pin")
            controls.splice(i, 1);
        }
      });
    }
  },

};
