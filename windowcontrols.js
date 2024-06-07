class WindowControls {

  static noLibWrapper = false;
  static externalMinimize = false;

  static minimizedStash = {};
  static cssMinimizedSize = 150;
  static cssMinimizedBottomBaseline = 70;
  static cssMinimizedTopBaseline = 0;
  static cssTopBarLeftStart = 120;
  static cssTopBarPersistentLeftStart = -5;
  static cssBottomBarLeftStart = 250;

  static getTaskbarTop = () => 2;
  static getTaskbarBot = () => $("#board").height() - 40;

  static debouncedReload = debounce(() => window.location.reload(), 100);

  static getStashedKeys() {
    return Object.keys(WindowControls.minimizedStash).map(w => parseInt(w));
  }

  static minimizeAll() {
    for (const w of Object.values(ui.windows)) {
      const ctr = w.constructor.name;
      if (w._minimized === true || w._pinned === true || ctr === 'DestinyTracker' || ctr === 'ee')
        continue;
      if ( // Do not minimize Dialogs
        !(ctr.includes('Config') ||
          ctr === 'RollTableConfig' ||
          ctr.includes('Dialog') ||
          ctr === 'FilePicker')
      ) w.minimize();
      if (game.modules.get('gm-screen')?.active && $(".gm-screen-app").hasClass('expanded'))
        $(".gm-screen-button").click();
    }
  }

  static curateId(text) {
    return text.replace(/\W/g, '_');
  }

  static curateTitle(title) {
    return title.replace("[Token] ", "~ ").replace("Table Configuration: ", "");
  }

  static uncurateTitle(title) {
    return title.replace("~ ", "[Token] ");
  }

  static getCurrentMaxGap() {
    const setting = game.settings.get('window-controls', 'organizedMinimize');
    const sidebarGap = WindowControls.cssMinimizedSize * (setting === 'persistentTop' || setting === 'persistentBottom' ? 3 : 4);
    const boardSize = parseInt($("#board").css('width'));
    return boardSize - sidebarGap;
  }

  static getOverflowedState() {
    return Math.max(...WindowControls.getStashedKeys()) >= WindowControls.getCurrentMaxGap();
  }

  static persistPinned(app) {
    const currentPersisted = game.user.getFlag("window-controls", "persisted-pinned-windows") ?? [];
    if (app.document?.id) {
      if (!currentPersisted.find(p => p.docId === app.document.id)) {
        currentPersisted.push({docId: app.document.id, docName: app.document.documentName, position: app.position});
        game.user.setFlag("window-controls", "persisted-pinned-windows", currentPersisted);
      }
    } else if (app.tabName) {
      if (!currentPersisted.find(p => p.docId === app.tabName)) {
        currentPersisted.push({docId: app.tabName, docName: 'SidebarTab', position: app.position});
        game.user.setFlag("window-controls", "persisted-pinned-windows", currentPersisted);
      }
    }
  }

  static unpersistPinned(app) {
    const filtered = game.user.getFlag("window-controls", "persisted-pinned-windows")?.filter(a => (a.docId !== app.document?.id && a.docId !== app.tabName)) ?? [];
    game.user.setFlag("window-controls", "persisted-pinned-windows", filtered);
  }

  static async persistRender(persisted, collection) {
    if (ui.PDFoundry && game.journal.get(persisted.docId)?.data.flags.pdfoundry) {
      const pdf = game.journal.get(persisted.docId);
      ui.PDFoundry.openPDFByName(
        pdf.name,
        {entity: pdf}
      ).then(pf => pf.minimize());
    } else if (collection.contents) {
      const appDoc = collection.contents.find(d => d.id === persisted.docId).sheet;
      appDoc.render(true);
      WindowControls.persistRenderMinimizeRetry(appDoc, false, persisted.position)
    } else if (collection.tabs) {
      const tab = collection.tabs[persisted.docId];
      tab.renderPopout();
      WindowControls.persistRenderMinimizeRetry(tab._popout, false, persisted.position)
    }
  }

  static persistRenderMinimizeRetry(appDoc, stop, position) {
    setTimeout(() => {
      if (appDoc?.rendered) {
        WindowControls.applyPinnedMode(appDoc);
        if (appDoc._sourceDummyPanelApp)
          WindowControls.applyPinnedMode(appDoc._sourceDummyPanelApp);
        appDoc.setPosition(position);
        if (!appDoc._minimized)
          appDoc.minimize();
        setTimeout(() => WindowControls.setMinimizedStyle(appDoc._sourceDummyPanelApp), 500);
      } else if (!stop) {
        console.warn("Window Controls: Too slow to render persisted Windows... Retrying...");
        WindowControls.persistRenderMinimizeRetry(appDoc, true, position);
      } else {
        console.warn("Window Controls: Too slow to render persisted Windows... I give up!");
        game.user.unsetFlag("window-controls", "persisted-pinned-windows");
      }
    }, 1000)
  }

  static toggleMovement(app) {
    const elementJS = app.element[0];
    const stashOverflowed = WindowControls.getOverflowedState();
    if (stashOverflowed) {
      return;
    }

    elementJS.addEventListener('pointerdown', function (ev) {
      if (app._minimized)
        ev.stopImmediatePropagation();
    }, true)

  }

  static positionMinimizeBar() {
    const setting = game.settings.get('window-controls', 'organizedMinimize');
    if (!['topBar', 'bottomBar'].includes(setting))
      return;
    const rootStyle = document.querySelector(':root').style;
    const bar = $('#minimized-bar').hide();
    const barHtml = $(`<div id="minimized-bar" class="app" style="display: none;"></div>`);
    switch (setting) {
      case 'topBar': {
        rootStyle.setProperty('--minibarbot', 'unset');
        rootStyle.setProperty('--minibartop', (WindowControls.getTopPosition() - 4) + 'px');
        rootStyle.setProperty('--minibarleft', WindowControls.cssTopBarLeftStart + 'px');
        if (bar.length === 0)
          barHtml.appendTo('body');
        break;
      }
      case 'bottomBar': {
        let hotbarSetting;
        if (game.modules.get('minimal-ui')?.active)
          hotbarSetting = game.settings.get('minimal-ui', 'hotbar');
        if (hotbarSetting === 'hidden' || (hotbarSetting === 'onlygm' && !game.user?.isGM))
          rootStyle.setProperty('--minibarbot', WindowControls.cssMinimizedBottomBaseline - 65 + 'px');
        else
          rootStyle.setProperty('--minibarbot', WindowControls.cssMinimizedBottomBaseline + 'px');
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
    if (['bottomBar', 'bottom'].includes(minimizedSetting)) {
      let hotbarSetting;
      if (game.modules.get('minimal-ui')?.active)
        hotbarSetting = game.settings.get('minimal-ui', 'hotbar');
      let availableHeight = $("#board").height();
      if (hotbarSetting && (hotbarSetting === 'hidden' || (hotbarSetting === 'onlygm' && !game.user?.isGM)))
        return availableHeight - WindowControls.cssMinimizedBottomBaseline + 65 - 41;
      else
        return availableHeight - WindowControls.cssMinimizedBottomBaseline - 41;
    } else {
      let sceneNavigationSetting;
      let logoSetting;
      if (game.modules.get('minimal-ui')?.active) {
        sceneNavigationSetting = game.settings.get('minimal-ui', 'sceneNavigation');
        logoSetting = game.settings.get('minimal-ui', 'foundryLogoSize');
      }
      let offset;
      if (logoSetting === 'hidden' && sceneNavigationSetting === 'hidden')
        offset = WindowControls.cssMinimizedTopBaseline + 6;
      else
        offset = document.querySelector("#navigation").offsetHeight + WindowControls.cssMinimizedTopBaseline + 20;
      return offset;
    }
  }

  static getLeftPosition(app) {
    const minimizedSetting = game.settings.get('window-controls', 'organizedMinimize');
    const minGap = ['top', 'topBar'].includes(minimizedSetting) ? WindowControls.cssTopBarLeftStart + 10 : (minimizedSetting === 'persistentTop' || minimizedSetting === 'persistentBottom' ? WindowControls.cssTopBarPersistentLeftStart + 10 : WindowControls.cssBottomBarLeftStart + 10);
    const jumpGap = WindowControls.cssMinimizedSize + 10;
    const maxGap = WindowControls.getCurrentMaxGap();
    let targetPos;
    for (let i = minGap; i < maxGap + jumpGap; i = i + jumpGap) {
      if (WindowControls.minimizedStash[i]?.app.appId === app?.appId) {
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
    const setting = game.settings.get('window-controls', 'organizedMinimize');
    const alreadyStashedWindow = WindowControls.appInStash(app?.appId);
    if (!alreadyStashedWindow && WindowControls.getOverflowedState()) return;
    const leftPos = WindowControls.getLeftPosition(app);
    const topPos = WindowControls.getTopPosition();
    app.setPosition({
      left: leftPos ?? app.position.left,
      top: setting === 'persistentTop' ? WindowControls.getTaskbarTop() : setting === 'persistentBottom' ? WindowControls.getTaskbarBot() : (topPos ?? app.position.top),
      width: WindowControls.cssMinimizedSize
    });
    app.element.css({'z-index': WindowControls.getOverflowedState() ? 10 : 1});
  }

  static setRestoredPosition(app) {
    app.setPosition(WindowControls.appInStash(app?.appId)?.oldPosition ?? app.position);
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
        if (stash.app._minimized)
          stash.app.setPosition({left: lastDeleted});
        lastDeleted = i;
        delete WindowControls.minimizedStash[i];
      }
    });
  }

  static appInStash(targetId) {
    return Object.values(WindowControls.minimizedStash).find(a => a.app?.appId === targetId)
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
        rootStyle.setProperty('--minibarw', maxPosition - 90 + 'px');
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
    if (!app?.element) return;
    app.element.find(".window-header > h4").text(WindowControls.curateTitle(app.title));
    app.element.find(".minimize").empty();
    app.element.find(".minimize").append(`<i class="far fa-window-restore"></i>`);
    app.element.find(".minimize").show();
  }

  static setRestoredStyle(app) {
    app.element.find(".window-header > h4").text(WindowControls.uncurateTitle(app.title));
    app.element.find(".minimize").empty();
    app.element.find(".minimize").append(`<i class="far fa-window-minimize"></i>`);
    if (app._pinned === true) {
      app.element.find(".entry-image").hide();
      app.element.find(".entry-text").hide();
      app.element.find(".close").hide();
    }
  }

  static applyPinnedMode(app) {
    if (!app?.element) return;
    const header = app.element.find(".window-header");
    if (!header.hasClass('minimized-pinned')) {
      header.addClass('minimized-pinned');
      app._pinned = true;
      app._closeBkp = app.close;
      if (game.settings.get('window-controls', 'pinnedDoubleTapping') === false) {
        app.close = async function () {
          if (!this._minimized) await this.minimize();
        };
      } else {
        app.close = async function () {
          if (this._minimized)
            return;
          if (app._pinned_marked) {
            delete app._pinned_marked;
            this.minimize();
          } else {
            app._pinned_marked = true;
            setTimeout(() => {
              delete app._pinned_marked
            }, 2000) // Give 2 seconds to attempt to close again
          }
        };
      }
      header.find(".close").hide();
      header.find(".entry-image").hide(); // Disallow switching journal modes - it is the safest approach to avoid dealing with close()
      header.find(".entry-text").hide();
      if (game.settings.get('window-controls', 'rememberPinnedWindows') && app.targetApp === undefined) {
        WindowControls.persistPinned(app);
      }
    } else if (app._pinned) {
      delete app._pinned;
      header.removeClass('minimized-pinned');
      app.close = app._closeBkp;
      delete app._closeBkp;
      // Dirty hack to prevent very fast minimization (messes up windows size)
      var _bkpMinimize = app.minimize;
      app.minimize = function () {};
      setTimeout(() => {
        app.minimize = _bkpMinimize;
      }, 200)
      header.find(".entry-image").show();
      header.find(".entry-text").show();
      header.find(".close").show();
      if (game.settings.get('window-controls', 'rememberPinnedWindows') && app.targetApp === undefined)
        WindowControls.unpersistPinned(app);
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
    if (game.modules.get("gm-screen")?.active && app.cellId?.includes("gm-screen"))
      return;
    if (WindowControls.getOverflowedState()) return;
    const matchingWindow = Object.values(ui.windows).find(w => w.targetApp?.id === app.id);
    // Update any name changes and prevent from opening new tabs
    if (matchingWindow) {
      matchingWindow.options.title = WindowControls.curateTitle(app.title);
      matchingWindow.render();
      return;
    }
    const taskbarApp = new WindowControlsPersistentDummy(app);
    app._sourceDummyPanelApp = taskbarApp;
    await taskbarApp._render(true);
    WindowControls.toggleMovement(taskbarApp);
    await taskbarApp.minimize();
    WindowControls.setMinimizedPosition(taskbarApp);
    WindowControls.setMinimizedStyle(taskbarApp);
    taskbarApp.element
      .find(".fa-window-restore")
      .removeClass('fa-window-restore')
      .addClass('fa-window-minimize');
    taskbarApp.element
      .find("header")
      .removeClass("draggable");
    if (game.modules.get('minimal-ui')?.active) {
      taskbarApp.element.css('background-color', game.settings.get('minimal-ui', 'shadowColor'));
    } else {
      taskbarApp.element.css('background-color', '#ff640080');
    }
    taskbarApp.element.find('header').click(function () {
      if (taskbarApp.targetApp._minimized) {
        taskbarApp.targetApp.maximize();
        WindowControls.setRestoredStyle(taskbarApp);
      }
      taskbarApp.targetApp.bringToTop();
    })
    taskbarApp.element.css('visibility', 'visible')
  }

  static organizedMinimize(app, settings) {
    const barEnabled = ['topBar', 'bottomBar'].includes(settings);
    if (barEnabled)
      WindowControls.toggleMovement(app);
    WindowControls.setMinimizedPosition(app);
    WindowControls.setMinimizedStyle(app);
    if (barEnabled)
      WindowControls.refreshMinimizeBar();
  }

  static organizedRestore(app, settings) {
    if (this._minimized) {
      if (['bottom', 'bottomBar'].includes(settings))
        this.setPosition({top: 0});
      this.element.css('visibility', 'hidden');
    }
    const barEnabled = ['topBar', 'bottomBar'].includes(settings);
    if (barEnabled)
      WindowControls.toggleMovement(app);
    WindowControls.setRestoredPosition(app);
    if (barEnabled)
      WindowControls.refreshMinimizeBar();
  }

  static organizedClose(app, settings) {
    if (this._minimized) {
      this.element.hide();
      if (['bottom', 'bottomBar'].includes(settings))
        this.setPosition({top: 0});
      // If minimized, remember the maximized state position
      WindowControls.setRestoredPosition(app);
      // ToDo: For some reason, setPosition() does not restore width at this point. Investigate.
      app.sheetWidth = app.constructor.defaultOptions.width;
    }
  }

  static initSettings() {
    game.settings.register('window-controls', 'organizedMinimize', {
      name: game.i18n.localize("WindowControls.OrganizedMinimizeName"),
      hint: game.i18n.localize("WindowControls.OrganizedMinimizeHint"),
      scope: 'client',
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
    game.settings.register('window-controls', 'clickOutsideMinimize', {
      name: game.i18n.localize("WindowControls.ClickOutsideMinimizeName"),
      hint: game.i18n.localize("WindowControls.ClickOutsideMinimizeHint"),
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
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
    game.settings.register('window-controls', 'rememberPinnedWindows', {
      name: game.i18n.localize("WindowControls.RememberPinnedName"),
      hint: game.i18n.localize("WindowControls.RememberPinnedHint"),
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
      onChange: () => {
        game.user.unsetFlag("window-controls", "persisted-pinned-windows")
      }
    });
    game.settings.register('window-controls', 'taskbarColor', {
      name: game.i18n.localize("WindowControls.TaskbarColorName"),
      hint: game.i18n.localize("WindowControls.TaskbarColorHint"),
      scope: 'world',
      config: true,
      type: String,
      default: "#0000",
      onChange: (newValue) => {
        const rootStyle = document.querySelector(':root').style;
        rootStyle.setProperty('--taskbarcolor', newValue);
      }
    });
  }

  static initHooks() {

    Hooks.once('ready', async function () {

      const settingOrganized = game.settings.get('window-controls', 'organizedMinimize');

      if (settingOrganized === 'persistentTop' || settingOrganized === 'persistentBottom') {
        libWrapper.register('window-controls', 'Application.prototype.minimize', function (wrapped, ...args) {
          if (!this.element?.length || this.id === 'tokenizer-control') return wrapped(...args);
          const alreadyPersistedWindow = Object.values(ui.windows).find(w => w.targetApp?.appId === this.appId);
          if (alreadyPersistedWindow) {
            alreadyPersistedWindow.element
              .find(".fa-window-minimize")
              .removeClass('fa-window-minimize')
              .addClass('fa-window-restore');
            alreadyPersistedWindow.element.css('background-color', '');
            this.element.css('visibility', 'hidden');
            return wrapped(...args);
          } else {
            return wrapped(...args).then(() => {
              WindowControls.organizedMinimize(this, settingOrganized);
            })
          }
        }, 'WRAPPER');
        libWrapper.register('window-controls', 'Application.prototype.maximize', function (wrapped, ...args) {
          if (this._sourceDummyPanelApp || this.id === 'tokenizer-control') {
            return wrapped(...args).then(() => {
              if (!this.element?.length) return;
              WindowControls.setRestoredStyle(this);
              this.element.css('visibility', '');
            })
          } else {
            if (!this.element?.length) return wrapped(...args);
            WindowControls.organizedRestore(this, settingOrganized);
            return wrapped(...args).then(() => {
              WindowControls.setRestoredStyle(this);
              this.element.css('visibility', '');
            });
          }
        }, 'WRAPPER');
        libWrapper.register('window-controls', 'Application.prototype.close', function (wrapped, ...args) {
          if (!this.element?.length || this.id === 'tokenizer-control') return wrapped(...args);
          if (this._minimized && !this._sourceDummyPanelApp) {
            WindowControls.organizedClose(this, settingOrganized);
          }
          return wrapped(...args).then(() => {
            WindowControls.refreshMinimizeBar();
          });
        }, 'WRAPPER');
      } else if (settingOrganized !== 'disabled') {
        libWrapper.register('window-controls', 'Application.prototype.minimize', function (wrapped, ...args) {
          return wrapped(...args).then(() => {
            if (!this.element?.length) return;
            WindowControls.organizedMinimize(this, settingOrganized);
            const stashOverflowed = WindowControls.getOverflowedState();
            if (settingOrganized.includes('Bar') && (!stashOverflowed || WindowControls.appInStash(this.appId)))
              this.element.find("header").removeClass("draggable");
          })
        }, 'WRAPPER');

        libWrapper.register('window-controls', 'Application.prototype.maximize', function (wrapped, ...args) {
          if (!this.element?.length || !this._minimized) return wrapped(...args);
          WindowControls.organizedRestore(this, settingOrganized);
          return wrapped(...args).then(() => {
            WindowControls.setRestoredStyle(this);
            this.element.css('visibility', '');
            if (settingOrganized.includes('Bar'))
              this.element.find("header").addClass("draggable");
          });
        }, 'WRAPPER');

        libWrapper.register('window-controls', 'Application.prototype.close', function (wrapped, ...args) {
          if (!this.element?.length) return wrapped(...args);
          WindowControls.organizedClose(this, settingOrganized);
          return wrapped(...args).then(() => {
            WindowControls.refreshMinimizeBar();
          });
        }, 'WRAPPER');
      }

      libWrapper.register('window-controls', 'Application.prototype._getHeaderButtons', function (wrapped, ...args) {
        let result = wrapped(...args);
        if (this.constructor.name === 'QuestTracker' || (game.modules.get('one-journal')?.active && this.constructor.name === 'JournalSheet') || this.constructor.name === 'ee') // yes, ee is Simple Calendar
          return result;
        const close = result.find(b => b.class === 'close');
        close.label = '';
        const newButtons = [];
        const minimizeSetting = game.settings.get('window-controls', 'minimizeButton');
        // Exception for Forien Quest Log - Is there any way of identifying such kind of windows?
        if (minimizeSetting === 'enabled') {
          const minimizeButton = {
            label: "",
            class: "minimize",
            icon: "far fa-window-minimize",
            onclick: function () {
              if (this._minimized)
                this.maximize(true); // 'clicked' hack for V11 - to not minimize dummy windows on render
              else {
                this.minimize();
                //* Dirty hack to prevent "double minimize" after rapidly double-clicking on the minimize button
                var _bkpMinimize = this.minimize;
                this.minimize = () => {};
                setTimeout(() => {
                  this.minimize = _bkpMinimize;
                }, 200)
              }
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

      if (game.settings.get('window-controls', 'rememberPinnedWindows')) {
        try {
          game.user.getFlag("window-controls", "persisted-pinned-windows")?.forEach(persisted => {
            switch (persisted.docName) {
              case "Actor": {
                WindowControls.persistRender(persisted, game.actors);
                break
              }
              case "Item": {
                WindowControls.persistRender(persisted, game.items);
                break
              }
              case "JournalEntry": {
                WindowControls.persistRender(persisted, game.journal);
                break
              }
              case "RollTable": {
                WindowControls.persistRender(persisted, game.tables);
                break
              }
              case "SidebarTab": {
                WindowControls.persistRender(persisted, ui.sidebar);
                break
              }
            }
          })
        } catch (error) {
          console.warn("Window Controls: Failed to load persisted pinned windows.\n" + error);
          game.user.unsetFlag("window-controls", "persisted-pinned-windows");
        }
      }

      Hooks.on('PopOut:popout', function (app) {
        app._sourceDummyPanelApp?.justClose();
        WindowControls.refreshMinimizeBar();
      });

      if (game.settings.get('window-controls', 'clickOutsideMinimize')) {
        $("#board").click(() => {
          if (canvas.tokens.controlled.length)
            return;
          WindowControls.minimizeAll();
        });
      }

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

Hooks.once('setup', () => {
  const settings = game.settings.get('window-controls', 'organizedMinimize');
  if (settings === 'persistentTop') {
    const rootStyle = document.querySelector(':root').style;
    const top = 4;
    const margin = top * 10;
    const dedHeight = 100 - top;
    rootStyle.setProperty('--minimizedpos', 'fixed');
    rootStyle.setProperty('--miniminh', `65vh`);
    rootStyle.setProperty('--minimaxh', `85vh`);
    rootStyle.setProperty('--minisidebaradj', `calc(100vh - ${10 + margin}px)`);
    rootStyle.setProperty('--taskbarcolor', game.settings.get('window-controls', 'taskbarColor'));
    const nonBackBody = $("body:not(.background)");
    nonBackBody.css('top', `${margin}px`);
    nonBackBody.css('height', `${dedHeight}%`);
    $("body").append('<section id="window-controls-persistent"></section>');
    $("#window-controls-persistent").css('top', '-40px');
    $("#window-controls-persistent").css('height', '40px');
    libWrapper.register('window-controls', 'Application.prototype.setPosition', function (wrapped, ...args) {
      const expectedPosition = wrapped(...args);
      if (this.constructor.name !== 'WindowControlsPersistentDummy') {
        if (!expectedPosition || !this.element.length)
          return expectedPosition;
        const el = this.element[0];
        const marginMaxValue = window.innerHeight - el.offsetHeight - margin;
        if (expectedPosition.top >= marginMaxValue) {
          el.style.top = marginMaxValue+'px';
          expectedPosition.top = marginMaxValue;
        }
        const maxHeight = $("#board").height() - 42;
        if (expectedPosition.height > maxHeight) {
          el.style.height = maxHeight+'px';
          expectedPosition.height = maxHeight;
        }
      }
      return expectedPosition;
    }, 'WRAPPER');
  } else if (settings === 'persistentBottom') {
    const rootStyle = document.querySelector(':root').style;
    const top = -4;
    const margin = top * 10;
    const dedHeight = 100 + top;
    rootStyle.setProperty('--minimizedpos', 'fixed');
    rootStyle.setProperty('--miniminh', `65vh`);
    rootStyle.setProperty('--minimaxh', `85vh`);
    rootStyle.setProperty('--minisidebaradj', `calc(100vh - ${8 - margin}px)`);
    rootStyle.setProperty('--taskbarcolor', game.settings.get('window-controls', 'taskbarColor'));
    const nonBackBody = $("body:not(.background)");
    nonBackBody.css('top', `${margin}px`);
    nonBackBody.css('padding-top', `${-margin}px`);
    $("body").append('<section id="window-controls-persistent"></section>');
    $("#window-controls-persistent").css('bottom', '-40px');
    $("#window-controls-persistent").css('height', '40px');
    libWrapper.register('window-controls', 'Application.prototype.setPosition', function (wrapped, ...args) {
      const expectedPosition = wrapped(...args);
      if (this.constructor.name === 'WindowControlsPersistentDummy') {
        setTimeout(() => {
          const botPos = WindowControls.getTaskbarBot();
          if (this.position.top != botPos)
            this.setPosition({top: botPos});
        }, 500);
      } else {
        if (!expectedPosition || !this.element.length)
          return expectedPosition;
        const el = this.element[0];
        const marginMinValue = 42;
        if (expectedPosition.top <= marginMinValue) {
          el.style.top = marginMinValue+'px';
          expectedPosition.top = marginMinValue;
        }
        const maxHeight = $("#board").height() - marginMinValue;
        if (expectedPosition.height > maxHeight) {
          el.style.height = maxHeight+'px';
          expectedPosition.height = maxHeight;
        }
      }
      return expectedPosition;
    }, 'WRAPPER');
  }
})

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
    rootStyle.setProperty('--wcbordercolor', '#ff71003b');
  }

  const settingOrganized = game.settings.get('window-controls', 'organizedMinimize');
  if (settingOrganized === 'persistentTop' || settingOrganized === 'persistentBottom') {
    Hooks.on('renderSidebarTab', function (app) {
      if (app._original) // Avoids launching ghost applications on internal hooks
        WindowControls.renderDummyPanelApp(app);
    });
    Hooks.on('renderCompendium', function (app) {
      WindowControls.renderDummyPanelApp(app);
    });
    Hooks.on('renderJournalSheet', function (app) {
      if (!(game.modules.get('one-journal')?.active || app.enhancedjournal))
        WindowControls.renderDummyPanelApp(app);
    });
    Hooks.on('renderRollTableConfig', function (app) {
      WindowControls.renderDummyPanelApp(app);
    });
    Hooks.on('renderActorSheet', function (app) {
      WindowControls.renderDummyPanelApp(app);
    });
    Hooks.on('renderItemSheet', function (app) {
      WindowControls.renderDummyPanelApp(app);
    });
    Hooks.on('activateControls', function(app) {
      if (app.constructor.name === 'EnhancedJournal')
        WindowControls.renderDummyPanelApp(app);
    });
    Hooks.on('renderInlineViewer', function(app) { // Inline Web Viewer
      WindowControls.renderDummyPanelApp(app);
    });
    Hooks.on('renderee', function(app) { // yes, ee is Simple Calendar
      WindowControls.renderDummyPanelApp(app);
    });
    Hooks.on('renderQuestLog', function(app) { // Quest Log
      WindowControls.renderDummyPanelApp(app);
    });
    Hooks.on('renderQuestPreview', function(app) { // Quest Log
      WindowControls.renderDummyPanelApp(app);
    });
    Hooks.on('renderSoundBoardApplication', function(app) { // Soundboard
      WindowControls.renderDummyPanelApp(app);
    });
    Hooks.on('renderStaticViewer', function(app) { // PDFoundry
      WindowControls.renderDummyPanelApp(app);
    });
    Hooks.on('renderFillableViewer', function(app) { // PDFoundry
      WindowControls.renderDummyPanelApp(app);
    });

    // ugly, but works. correct the offsets on drop, and camera view
    if (settingOrganized === 'persistentTop') {
      Hooks.on('dropCanvasData', function(canvas, data) {
        data.y = data.y -= 40;
      });
      Hooks.on('renderCameraViews', function() {
        $("#camera-views").css("top", "0px");
        $("div#camera-views.camera-position-left, div#camera-views.camera-position-right").css("min-height", "96.5vh");
      })
    } else {
      Hooks.on('dropCanvasData', function(canvas, data) {
        data.y = data.y += 40;
      });
      Hooks.on('renderCameraViews', function() {
        $("#camera-views").css("top", "0px");
        $("div#camera-views.camera-position-left, div#camera-views.camera-position-right").css("min-height", "96.5vh");
      })
    }

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
    const oldClose = this.targetApp.close;
    const thisMagic = this;
    this.targetApp.close = async function () {
      await thisMagic.justClose();
      await oldClose.apply(this);
    }
  }

  _injectHTML(html) {
    $('#window-controls-persistent').append(html);
    this._element = html;
    html.hide().fadeIn(200);
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(Dialog.defaultOptions, {
      classes: ['hidden-placeholder'],
      resizable: false
    });
  }

  async maximize(clicked) {
    if (this.targetApp._minimized) {
      await this.targetApp.maximize();
      this.element
        .find(".fa-window-restore")
        .removeClass('fa-window-restore')
        .addClass('fa-window-minimize');
      if (game.modules.get('minimal-ui')?.active) {
        this.element.css('background-color', game.settings.get('minimal-ui', 'shadowColor'));
      } else {
        this.element.css('background-color', '#ff640080');
      };
      this.targetApp.bringToTop();
    } else if (clicked) {  // Hack for V11 - to not minimize dummy windows on render
      await this.targetApp.minimize();
      this.element
        .find(".fa-window-minimize")
        .removeClass('fa-window-minimize')
        .addClass('fa-window-restore');
      return
    }
  }

  async justClose() {
    await super.close();
    WindowControls.refreshMinimizeBar()
  }

  async close() {
    await this.targetApp.close();
    await super.close();
  }
}