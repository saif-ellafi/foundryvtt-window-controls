class WindowControls {

  static noLibWrapper = false;
  static externalMinimize = false;

  static minimizedStash = {};
  static cssMinimizedSize = 150;
  static cssMinimizedBottomHotbar = 70;
  static cssMinimizedBottomNoHotbar = 5;
  static cssTopBarLeftStart = 120;
  static cssBottomBarLeftStart = 250;

  static debouncedReload = debounce(() => window.location.reload(), 100);

  static getStashedKeys() {
    return Object.keys(WindowControls.minimizedStash).map(w => parseInt(w));
  }

  static curateId(text) {
    return text.replace(/\W/g,'_');
  }

  static curateTitle(title) {
    return title.replace("[Token] ", "~ ");
  }

  static uncurateTitle(title) {
    return title.replace("~ ", "[Token] ");
  }

  static getCurrentMaxGap() {
    const sidebarGap = WindowControls.cssMinimizedSize * 4;
    const boardSize = parseInt($("#board").css('width'));
    return boardSize - sidebarGap;
  }

  static getOverflowedState() {
    return Math.max(...WindowControls.getStashedKeys()) >= WindowControls.getCurrentMaxGap();
  }

  static toggleMovement(app) {
    const elementJS = app.element[0];
    const stashOverflowed = WindowControls.getOverflowedState();
    if (stashOverflowed) {
      if (app._canBeMoved === false) {
        app.element.find("header").addClass("draggable");
        app._canBeMoved = true;
      }
      return;
    }

    if (app._canBeMoved === undefined) {
      elementJS.addEventListener('mousemove', function(ev) {
        if (!app._canBeMoved)
          ev.stopImmediatePropagation();
      }, true)
      elementJS.addEventListener('mousedown', function(ev) {
        if (!app._canBeMoved)
          ev.stopImmediatePropagation();
      }, true)
      elementJS.addEventListener('mouseup', function(ev) {
        if (!app._canBeMoved)
          ev.stopImmediatePropagation();
      }, true)
      app.element.find("header").removeClass("draggable");
      app.element.addClass("undraggable-minimized");
      app._canBeMoved = false;
    } else if (app._canBeMoved === true) {
      app.element.find("header").removeClass("draggable");
      app.element.addClass("undraggable-minimized");
      app._canBeMoved = false;
    } else {
      app.element.find("header").addClass("draggable");
      app.element.removeClass("undraggable-minimized");
      app._canBeMoved = true;
    }
  }

  static positionMinimizeBar() {
    const rootStyle = document.querySelector(':root').style;
    const setting = game.settings.get('window-controls', 'organizedMinimize');
    const bar = $('#minimized-bar').hide();
    const barHtml = $(`<div id="minimized-bar" class="app" style="display: none;"></div>`);
    switch (setting) {
      case 'topBar':
      case 'persistentTop': {
        rootStyle.setProperty('--minibarbot', 'unset');
        rootStyle.setProperty('--minibartop', (WindowControls.getTopPosition() - 4) + 'px');
        rootStyle.setProperty('--minibarleft', WindowControls.cssTopBarLeftStart + 'px');
        if (bar.length === 0)
          barHtml.appendTo('body');
        break;
      }
      case 'bottomBar':
      case 'persistentBottom': {
        let hotbarSetting;
        if (game.modules.get('minimal-ui')?.active)
          hotbarSetting = game.settings.get('minimal-ui', 'hotbar');
        if (hotbarSetting && (hotbarSetting === 'hidden' || (hotbarSetting === 'onlygm' && !game.user?.isGM)))
          rootStyle.setProperty('--minibarbot', WindowControls.cssMinimizedBottomNoHotbar + 'px');
        else
          rootStyle.setProperty('--minibarbot', WindowControls.cssMinimizedBottomHotbar + 'px');
        rootStyle.setProperty('--minibartop', 'unset');
        rootStyle.setProperty('--minibarleft', WindowControls.cssBottomBarLeftStart + 'px');
        if (bar.length === 0)
          barHtml.appendTo('body');
        break;
      }
    }
  }

  static getTopPosition() {
    const minimizedSetting = game.settings.get('window-controls', 'organizedMinimize');
    if (['bottomBar', 'bottom', 'persistentBottom'].includes(minimizedSetting)) {
      let hotbarSetting;
      if (game.modules.get('minimal-ui')?.active)
        hotbarSetting = game.settings.get('minimal-ui', 'hotbar');
      let availableHeight = parseInt($("#board").css('height'));
      if (hotbarSetting && (hotbarSetting === 'hidden' || (hotbarSetting === 'onlygm' && !game.user?.isGM)))
        return availableHeight - WindowControls.cssMinimizedBottomNoHotbar - 42;
      else
        return availableHeight - WindowControls.cssMinimizedBottomHotbar - 42;
    } else {
      let logoSetting;
      if (game.modules.get('minimal-ui')?.active)
        logoSetting = game.settings.get('minimal-ui', 'foundryLogoSize');
      let offset = document.querySelector("#navigation").offsetHeight + 20;
      // 65px is Rough estimate for standard logo size, to not overlap
      if (logoSetting && logoSetting === 'standard')
        offset = Math.max(65, offset);
      return offset;
    }
  }

  static getLeftPosition(app) {
    const minimizedSetting = game.settings.get('window-controls', 'organizedMinimize');
    const minGap = ['top', 'topBar', 'persistentTop'].includes(minimizedSetting) ? WindowControls.cssTopBarLeftStart + 10 : WindowControls.cssBottomBarLeftStart + 10;
    const jumpGap = WindowControls.cssMinimizedSize + 10;
    const maxGap = WindowControls.getCurrentMaxGap();
    let targetPos;
    for (let i = minGap; i < maxGap + jumpGap; i = i + jumpGap) {
      if (WindowControls.minimizedStash[i]?.app.appId === app.appId) {
        WindowControls.minimizedStash[i].oldPosition = Object.assign({}, app.position);
        targetPos = i;
        return targetPos;
      } else if (!targetPos && !WindowControls.minimizedStash[i]?.app.rendered) {
        WindowControls.minimizedStash[i] = {app: app, oldPosition: Object.assign({}, app.position)};
        targetPos = i;
        return targetPos;
      }
    }
    let appI = app.position.left;
    while (appI in WindowControls.minimizedStash) appI += 20;
    WindowControls.minimizedStash[appI] = {app: app, oldPosition: Object.assign({}, app.position)};
    return appI;
  }

  static setMinimizedPosition(app) {
    const alreadyStashedWindow = Object.values(WindowControls.minimizedStash).find(m => m.app.appId === app.appId);
    if (!alreadyStashedWindow && WindowControls.getOverflowedState()) return;
    const leftPos = WindowControls.getLeftPosition(app);
    const topPos = WindowControls.getTopPosition();
    app.setPosition({
      left: leftPos ?? app.position.left,
      top: topPos ?? app.position.top,
      width: WindowControls.cssMinimizedSize
    });
  }

  static setRestoredPosition(app) {
    const minimizedStash = Object.values(WindowControls.minimizedStash);
    const matchedStash = minimizedStash.find(a => a.app.appId === app?.appId);
    app.setPosition(matchedStash?.oldPosition ?? app.position);
  }

  static deleteFromStash(app, keys) {
    let lastDeleted;
    keys.forEach(i => {
      const stash = WindowControls.minimizedStash[i];
      if (stash?.app && stash.app.appId === app.appId) {
        lastDeleted = i;
        delete WindowControls.minimizedStash[i];
      } else if (stash && lastDeleted) {
        WindowControls.minimizedStash[lastDeleted] = stash;
        stash.app.setPosition({left: lastDeleted});
        lastDeleted = i;
        delete WindowControls.minimizedStash[i];
      }
    });
  }

  static refreshMinimizeBar() {
    const minimized = $(".minimized");
    const stashSize = WindowControls.getStashedKeys().length;
    if (minimized.length === 0 || Object.values(WindowControls.minimizedStash).every(w => w.app.rendered === false)) {
      WindowControls.minimizedStash = {};
      $("#minimized-bar").hide();
    } else if (stashSize > 0) {
      if (stashSize === 1)
        WindowControls.positionMinimizeBar();
      const maxPosition = Math.max(
        ...Object.entries(WindowControls.minimizedStash)
          .filter(([_, app]) => app.app.rendered && app.app._minimized)
          .map(([pos, _]) => Number(pos))
          .concat(0)
      );
      const setting = game.settings.get('window-controls', 'organizedMinimize');
      const rootStyle = document.querySelector(':root').style;
      if (setting === 'topBar' || setting === 'persistentTop') {
        rootStyle.setProperty('--minibarw', maxPosition + 40 + 'px');
      } else
        rootStyle.setProperty('--minibarw', maxPosition - 80 + 'px');
      minimized.show();
      $("#minimized-bar").show();
    }
  }

  static cleanupMinimizeBar(app) {
    const keys = WindowControls.getStashedKeys();
    if (keys.length)
      WindowControls.deleteFromStash(app, keys);
  }

  static setMinimizedStyle(app) {
    app.element.find(".window-header > h4").text(WindowControls.curateTitle(app.title));
    app.element.find(".minimize").empty();
    app.element.find(".minimize").append(`<i class="far fa-window-restore"></i>`);
    app.element.find(".minimize").show();
  }

  static setRestoredStyle(app) {
    app.element.find(".window-header > h4").text(WindowControls.uncurateTitle(app.title));
    app.element.find(".minimize").empty();
    app.element.find(".minimize").append(`<i class="far fa-window-minimize"></i>`);
  }

  static applyPinnedMode(app) {
    if (!app?.element) return;
    const header = app.element.find(".window-header");
    if (header.hasClass('minimized-pinned')) {
      delete app._pinned;
      header.removeClass('minimized-pinned');
      app.element.find(".window-header")
        .append($(`<a class="header-button close"><i class="fas fa-times"></i></a>`)
          .click(async function () {
            await app.close()
          }));
    } else {
      app._pinned = true;
      header.addClass('minimized-pinned');
      app.element.find(".close").remove();
    }
  }

  static reapplyMaximize(app, h, w) {
    app.setPosition({
      width: w - (ui.sidebar._collapsed ? 50 : 325),
      height: h - 15,
      left: 10,
      top: 3
    });
  }

  static maximizeWindow(app) {
    if (app._maximized) {
      app.setPosition(app._maximized);
      app.element
        .find(".fa-window-restore")
        .removeClass('fa-window-restore')
        .addClass('fa-window-maximize');
      delete app._maximized;
    } else {
      const board = $("#board");
      const availableHeight = parseInt(board.css('height'));
      const availableWidth = parseInt(board.css('width'));
      app._maximized = {};
      Object.assign(app._maximized, app.position);
      WindowControls.reapplyMaximize(app, availableHeight, availableWidth);
      WindowControls.reapplyMaximize(app, availableHeight, availableWidth);
      app.element
        .find(".fa-window-maximize")
        .removeClass('fa-window-maximize')
        .addClass('fa-window-restore');
    }
  }

  static async renderDummyPanelApp(app) {
    if (WindowControls.getOverflowedState()) return;
    const matchingWindow = Object.values(ui.windows).find(w => w.targetApp?.id === app.id);
    // Update any name changes and prevent from opening new tabs
    if (matchingWindow) {
      matchingWindow.options.title = WindowControls.curateTitle(app.title);
      matchingWindow.render();
      return;
    }
    const taskbarApp = new WindowControlsPersistentDummy(app);
    await taskbarApp._render(true);
    WindowControls.toggleMovement(taskbarApp);
    await taskbarApp.minimize();
    WindowControls.setMinimizedPosition(taskbarApp);
    WindowControls.setMinimizedStyle(taskbarApp);
    WindowControls.refreshMinimizeBar();
    taskbarApp.element.css('visibility', 'visible')
  }

  static initSettings() {
    game.settings.register('window-controls', 'organizedMinimize', {
      name: game.i18n.localize("WindowControls.OrganizedMinimizeName"),
      hint: game.i18n.localize("WindowControls.OrganizedMinimizeHint"),
      scope: 'world',
      config: true,
      type: String,
      choices: {
        "top": game.i18n.localize("WindowControls.OrganizedMinimizeTop"),
        "bottom": game.i18n.localize("WindowControls.OrganizedMinimizeBottom"),
        "topBar": game.i18n.localize("WindowControls.OrganizedMinimizeTopBar"),
        "bottomBar": game.i18n.localize("WindowControls.OrganizedMinimizeBottomBar"),
        "persistentTop": game.i18n.localize("WindowControls.OrganizedPersistentTop"),
        "persistentBottom": game.i18n.localize("WindowControls.OrganizedPersistentBottom"),
        "disabled": game.i18n.localize("WindowControls.Disabled")
      },
      default: "topBar",
      onChange: WindowControls.debouncedReload
    });
    game.settings.register('window-controls', 'minimizeButton', {
      name: game.i18n.localize("WindowControls.MinimizeButtonName"),
      hint: game.i18n.localize("WindowControls.MinimizeButtonHint"),
      scope: 'world',
      config: true,
      type: String,
      choices: {
        "enabled": game.i18n.localize("WindowControls.Enabled"),
        "disabled": game.i18n.localize("WindowControls.Disabled")
      },
      default: "enabled",
      onChange: WindowControls.debouncedReload
    });
    game.settings.register('window-controls', 'pinnedButton', {
      name: game.i18n.localize("WindowControls.PinnedButtonName"),
      hint: game.i18n.localize("WindowControls.PinnedButtonHint"),
      scope: 'world',
      config: true,
      type: String,
      choices: {
        "enabled": game.i18n.localize("WindowControls.Enabled"),
        "disabled": game.i18n.localize("WindowControls.Disabled")
      },
      default: "enabled",
      onChange: WindowControls.debouncedReload
    });
    game.settings.register('window-controls', 'maximizeButton', {
      name: game.i18n.localize("WindowControls.MaximizeButtonName"),
      hint: game.i18n.localize("WindowControls.MaximizeButtonHint"),
      scope: 'world',
      config: true,
      type: String,
      choices: {
        "enabled": game.i18n.localize("WindowControls.Enabled"),
        "disabled": game.i18n.localize("WindowControls.Disabled")
      },
      default: "disabled",
      onChange: WindowControls.debouncedReload
    });
    game.settings.register('window-controls', 'pinnedDoubleTapping', {
      name: game.i18n.localize("WindowControls.PinnedDoubleTappingName"),
      hint: game.i18n.localize("WindowControls.PinnedDoubleTappingHint"),
      scope: 'world',
      config: true,
      type: Boolean,
      default: true
    });
  }

  static initHooks() {

    Hooks.once('ready', async function () {

      const settingOrganized = game.settings.get('window-controls', 'organizedMinimize');
      libWrapper.register('window-controls', 'KeyboardManager.prototype._onEscape', async function (wrapped, ...args) {
        let [_, up, modifiers] = args;
        if (up || modifiers.hasFocus) return wrapped(...args);
        const pinnedWindows = Object.values(ui.windows).filter(w => w._pinned);
        if (!pinnedWindows.length)
          WindowControls.minimizedStash = {}; // Flush minimized stash
        pinnedWindows.forEach(function (w) {
          // Temporarily coating close() of pinned windows during escape calls
          w.closeBkp = w.close;
          if (w._pinned_marked || game.settings.get('window-controls', 'pinnedDoubleTapping') === false) {
            w.close = async function() {
              if (!this._minimized) await this.minimize();
            };
          } else {
            w.close = function() {};
            w._pinned_marked = true;
            setTimeout(() => {delete w._pinned_marked}, 2000)
          }
        });
        const result = await wrapped(...args);
        pinnedWindows.forEach(w => {
          // uncoating close() back
          w.close = w.closeBkp;
          delete w.closeBkp;
        });
        return result;
      }, 'WRAPPER');

      if (settingOrganized === 'persistentTop' || settingOrganized === 'persistentBottom') {
        const supportedWindowTypes = ['ActorSheet', 'ItemSheet', 'JournalSheet', 'SidebarTab', 'StaticViewer', 'Compendium'];
        libWrapper.register('window-controls', 'Application.prototype.minimize', async function (wrapped, ...args) {
          const alreadyPersistedWindow = Object.values(ui.windows).find(w => w.targetApp?.appId === this.appId);
          if (alreadyPersistedWindow &&
            (supportedWindowTypes.includes(this.constructor.name) || supportedWindowTypes.includes(this.options.baseApplication))) {
            const targetHtml = this.element;
            targetHtml.css('visibility', 'hidden');
          }
          return await wrapped(...args);
        }, 'WRAPPER');
        libWrapper.register('window-controls', 'Application.prototype.maximize', async function (wrapped, ...args) {
          if (supportedWindowTypes.includes(this.constructor.name) || supportedWindowTypes.includes(this.options.baseApplication)) {
            const targetHtml = this.element;
            targetHtml.css('visibility', '');
          }
          return await wrapped(...args);
        }, 'WRAPPER');
      } else if (settingOrganized !== 'disabled') {
        libWrapper.register('window-controls', 'Application.prototype.minimize', async function (wrapped, ...args) {
          const targetHtml = this.element;
          targetHtml.css('visibility', 'hidden');
          const result = await wrapped(...args);
          if (['topBar', 'bottomBar'].includes(settingOrganized)) {
            WindowControls.toggleMovement(this);
          }
          WindowControls.setMinimizedPosition(this);
          WindowControls.setMinimizedStyle(this);
          WindowControls.refreshMinimizeBar();
          targetHtml.css('visibility', '');
          return result;
        }, 'WRAPPER');

        libWrapper.register('window-controls', 'Application.prototype.maximize', async function (wrapped, ...args) {
          const targetHtml = this.element;
          targetHtml.css('visibility', 'hidden');
          const result = await wrapped(...args);
          if (['topBar', 'bottomBar'].includes(settingOrganized)) {
            WindowControls.toggleMovement(this);
          }
          WindowControls.setRestoredPosition(this);
          WindowControls.refreshMinimizeBar();
          WindowControls.setRestoredStyle(this);
          targetHtml.css('visibility', '');
          return result;
        }, 'WRAPPER');

        libWrapper.register('window-controls', 'Application.prototype.close', async function (wrapped, ...args) {
          const targetHtml = this.element;
          if (this._minimized) {
            targetHtml.css('visibility', 'hidden');
            WindowControls.setRestoredPosition(this);
            // For some reason, setPosition() does not work at this stage. Manually override for now until we figure it out.
            this.sheetWidth = this.constructor.defaultOptions.width;
            this.sheetHeight = this.constructor.defaultOptions.height;
          }
          const result = await wrapped(...args);
          WindowControls.refreshMinimizeBar();
          targetHtml.css('visibility', '');
          return result;
        }, 'WRAPPER');
      }

      libWrapper.register('window-controls', 'Application.prototype._getHeaderButtons', function (wrapped, ...args) {
        let result = wrapped(...args);
        const close = result.find(b => b.class === 'close');
        close.label = '';
        const newButtons = [];
        const minimizeSetting = game.settings.get('window-controls', 'minimizeButton');
        if (minimizeSetting === 'enabled') {
          const minimizeButton = {
            label: "",
            class: "minimize",
            icon: "far fa-window-minimize",
            onclick: async function() {
              if (this._minimized)
                await this.maximize();
              else
                await this.minimize();
            }.bind(this)
          };
          newButtons.push(minimizeButton)
        }
        const maximizeSetting = game.settings.get('window-controls', 'maximizeButton');
        if (maximizeSetting === 'enabled' && this.options.resizable) {
          const maximizeButton = {
            label: "",
            class: "maximize",
            icon: this._maximized ? "far fa-window-restore" : "far fa-window-maximize",
            onclick: () => {
              WindowControls.maximizeWindow(this)
            }
          }
          newButtons.push(maximizeButton)
        }
        const pinnedSetting = game.settings.get('window-controls', 'pinnedButton');
        if (pinnedSetting === 'enabled') {
          const pinButton = {
            label: "",
            class: "pin",
            icon: "fas fa-map-pin",
            onclick: () => {
              WindowControls.applyPinnedMode(this);
              WindowControls.applyPinnedMode(
                Object.values(ui.windows).find(w => w.targetApp?.appId === this.appId)
              );
            }
          }
          newButtons.push(pinButton)
        }
        return newButtons.concat(result)
      }, 'WRAPPER');

    });

    Hooks.on('closeSidebarTab', function (app) {
      WindowControls.cleanupMinimizeBar(app);
    });

    Hooks.on('closeApplication', function (app) {
      WindowControls.cleanupMinimizeBar(app);
    });

    Hooks.on('closeItemSheet', function (app) {
      WindowControls.cleanupMinimizeBar(app);
    });

    Hooks.on('closeActorSheet', function (app) {
      WindowControls.cleanupMinimizeBar(app);
    });

  }

}

Hooks.once('init', () => {
  if (!game.modules.get('lib-wrapper')?.active) {
    WindowControls.noLibWrapper = true;
  }
  if (game.modules.get('minimize-button')?.active) {
    WindowControls.externalMinimize = true;
  }

  if (!(WindowControls.noLibWrapper || WindowControls.externalMinimize)) {
    WindowControls.initSettings();
    WindowControls.initHooks();
  }
});

Hooks.once('ready', () => {

  if (WindowControls.noLibWrapper && game.user.isGM)
    ui.notifications.error("Window Controls: Disabled Minimize Feature because 'lib-wrapper' module is not active.");

  if (WindowControls.externalMinimize && game.user.isGM)
    ui.notifications.error("Window Controls: Disabled Minimize Feature because 'Minimize Button' module is active and is not compatible.");

  const rootStyle = document.querySelector(':root').style;
  if (game.modules.get('minimal-ui')?.active) {
    rootStyle.setProperty('--wcbordercolor', game.settings.get('minimal-ui', 'borderColor'));
    rootStyle.setProperty('--wcshadowcolor', game.settings.get('minimal-ui', 'shadowColor'));
    rootStyle.setProperty('--wcshadowstrength', game.settings.get('minimal-ui', 'shadowStrength') + 'px');
  } else {
    rootStyle.setProperty('--wcbordercolor', '#ff640080');
  }

  // Special treatment for journals when swap modes - reapply pinned after swap
  if (game.settings.get('window-controls', 'pinnedButton') === 'enabled') {
    Hooks.on('renderJournalSheet', function (app) {
      if (app._pinned === true && !app.element.find('header').hasClass('minimized-pinned')) {
        WindowControls.applyPinnedMode(app);
        setTimeout(() => { // Sometimes swapping takes time. Give time for Persistent companion to re-render
          const companion = Object.values(ui.windows).find(w => w.targetApp?.appId === app.appId);
          if (!companion?._pinned)
            WindowControls.applyPinnedMode(companion);
        }, 1000);
      };
    });
  }

  const settingOrganized = game.settings.get('window-controls', 'organizedMinimize');
  if (settingOrganized === 'persistentBottom' || settingOrganized === 'persistentTop') {

    Hooks.on('renderActorSheet', function (app) {
      WindowControls.renderDummyPanelApp(app);
    });
    Hooks.on('renderItemSheet', function (app) {
      WindowControls.renderDummyPanelApp(app);
    });
    Hooks.on('renderJournalSheet', function (app) {
      WindowControls.renderDummyPanelApp(app);
    });
    Hooks.on('renderSidebarTab', function (app) {
      if (app._original) // Avoids launching ghost applications on internal hooks
        WindowControls.renderDummyPanelApp(app);
    });
    Hooks.on('renderStaticViewer', function (app) {
      WindowControls.renderDummyPanelApp(app);
    });
    Hooks.on('renderCompendium', function (app) {
      WindowControls.renderDummyPanelApp(app);
    });
  }

})

class WindowControlsPersistentDummy extends Application {
  constructor(targetApp) {
    super({
      title: targetApp.title,
      width: 0,
      height: 0,
      minimizable: true,
      id: `dummy-${WindowControls.curateId(targetApp.title)}-${targetApp.appId}`
    });
    this.targetApp = targetApp;
    var oldClose = this.targetApp.close;
    var thisMagic = this;
    this.targetApp.close = async function () {
      await thisMagic.justClose();
      await oldClose.apply(this);
    }
  }

  static get defaultOptions() {
    return mergeObject(Dialog.defaultOptions, {
      classes: ['hidden-placeholder'],
      resizable: false
    });
  }

  async maximize() {
    if (this.targetApp._minimized) {
      await this.targetApp.maximize();
    }
    this.targetApp.bringToTop();
  }

  async justClose() {
    await super.close();
    // Hack for Journal mode swapping, since it is reopened, we need to wait a bit before refreshing the bar
    // ToDo: some day we need a proper containing flex bar and delete these hacks once and for all!
    if (this.targetApp._sheetMode)
      setTimeout(() => {WindowControls.refreshMinimizeBar()}, 1000)
    else
      WindowControls.refreshMinimizeBar()
  }

  async close() {
    await this.targetApp.close();
    await super.close();
  }
}
