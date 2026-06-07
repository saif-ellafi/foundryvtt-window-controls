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
      if ($close.length)
        $close[0].before(btn);
      else
        $header[0].appendChild(btn);
      $btn = $(btn);
    }

    WindowControls.syncMinimizeControlIcon(app);
  },

  registerHeaderButtonHooks() {
    const onRender = app => WindowControls.injectMinimizeControl(app);

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
