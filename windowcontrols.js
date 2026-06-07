import { registerHeaderButtons } from "./scripts/header-buttons.js";
import { registerTaskbar } from "./scripts/taskbar.js";
import { registerWrappers } from "./scripts/wrappers.js";
import { TaskbarState } from "./scripts/taskbar-state.js";

class WindowControls {

  static noLibWrapper = false;
  static externalMinimize = false;

  static minimizedStash = {};
  static cssMinimizedSize = 150;
  static cssMinimizedBottomBaseline = 70;
  static cssMinimizedTopBaseline = 0;
  static cssTopBarLeftStart = 120;
  static cssTopBarPadding = 10;
  static cssTopBarChromeGap = 6;
  static cssMinimizedBarHeight = 38;
  static cssMinimizedHeaderHeight = 30;
  static cssPersistentTaskbarHeight = 40;
  static cssTopBarPersistentLeftStart = -5;
  static cssBottomBarLeftStart = 250;

  static getPersistentTaskbarInset() {
    return Math.floor((WindowControls.cssPersistentTaskbarHeight - WindowControls.cssMinimizedHeaderHeight) / 2);
  }

  static getTaskbarTop = () => WindowControls.getPersistentTaskbarInset();

  static getTaskbarBot = () => {
    const boardHeight = $("#board").height();
    return boardHeight - WindowControls.cssPersistentTaskbarHeight + WindowControls.getPersistentTaskbarInset();
  };

  static isPersistentTaskbarSetting(setting) {
    return setting === 'persistentTop' || setting === 'persistentBottom';
  }

  static isInPersistentTaskbarPanel(app) {
    if (!WindowControls.hasRenderedElement(app)) return false;
    const el = WindowControls.$el(app)[0];
    return !!el?.closest?.('#window-controls-persistent');
  }

  static mergeAppPosition(app, position) {
    app.position = foundry.utils.mergeObject(app.position ?? {}, position);
    return app.position;
  }

  static getDocumentName(app) {
    const doc = app?.document
      ?? app?.object
      ?? app?.entity
      ?? app?.actor
      ?? app?.item
      ?? app?.journal
      ?? app?.entry;
    const name = doc?.name ?? doc?.title;
    return name ? String(name).trim() : '';
  }

  static getAppTitle(app) {
    const docName = WindowControls.getDocumentName(app);
    if (docName) return docName;
    return String(app?.title ?? app?.options?.title ?? '').trim();
  }

  /**
   * Short label for minimized tabs/headers only.
   * V2 in-sheet visuals are system-owned; this module supplies the minimize chrome label.
   */
  static getDisplayTitle(app) {
    return WindowControls.curateTitle(WindowControls.getAppTitle(app));
  }

  /**
   * Foundry frame title (app.title). Only written back to ApplicationV2 window chrome on restore.
   * Does not touch system-implemented sheet headers inside V2 content.
   */
  static getNativeWindowTitle(app) {
    return WindowControls.uncurateTitle(String(app?.title ?? ''));
  }

  static $windowTitle(app) {
    if (app.window?.title) return $(app.window.title);
    if (WindowControls.isV2(app)) return $();
    const $root = WindowControls.$el(app);
    return $root.find(".window-title, .window-header > h4").first();
  }

  static applyDisplayTitle(app) {
    const $title = WindowControls.$windowTitle(app);
    if ($title.length) $title.text(WindowControls.getDisplayTitle(app));
  }

  static debouncedReload = foundry.utils.debounce(() => window.location.reload(), 100);
  static debouncedApplyLayout = foundry.utils.debounce(() => WindowControls.applyOrganizedMinimizeSetting(), 100);
  static _barMovementListeners = new WeakMap();
  static persistentLayout = null;

  static get ApplicationV2() {
    return foundry.applications.api.ApplicationV2;
  }

  static isV2(app) {
    return WindowControls.ApplicationV2 && app instanceof WindowControls.ApplicationV2;
  }

  static $el(app) {
    const el = app?.element;
    if (!el) return $();
    return el instanceof HTMLElement ? $(el) : el;
  }

  static hasRenderedElement(app) {
    const el = app?.element;
    if (!el) return false;
    return el instanceof HTMLElement ? true : !!el.length;
  }

  static getAppId(app) {
    return app?.appId ?? app?.id;
  }

  static isMinimized(app) {
    return app?._minimized === true || app?.minimized === true;
  }

  static bringAppToTop(app) {
    if (typeof app?.bringToFront === "function") app.bringToFront();
    else if (typeof app?.bringToTop === "function") app.bringToTop();
  }

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
        const taskbarDummy = TaskbarState.getDummy(appDoc);
        if (taskbarDummy)
          WindowControls.applyPinnedMode(taskbarDummy);
        appDoc.setPosition(position);
        if (!appDoc._minimized)
          appDoc.minimize();
        setTimeout(() => {
          const dummy = TaskbarState.getDummy(appDoc);
          if (dummy) WindowControls.applyTaskbarDummyChrome(dummy, appDoc);
        }, 500);
      } else if (!stop) {
        console.warn("Window Controls: Too slow to render persisted Windows... Retrying...");
        WindowControls.persistRenderMinimizeRetry(appDoc, true, position);
      } else {
        console.warn("Window Controls: Too slow to render persisted Windows... I give up!");
        game.user.unsetFlag("window-controls", "persisted-pinned-windows");
      }
    }, 1000)
  }

  static getHotbarElement() {
    const hotbar = ui.hotbar;
    if (hotbar?.element) {
      const el = hotbar.element;
      return el instanceof HTMLElement ? el : el[0];
    }
    return document.querySelector('#hotbar') ?? document.querySelector('#ui-hotbar');
  }

  static isHotbarHidden() {
    if (game.modules.get('minimal-ui')?.active) {
      const hotbarSetting = game.settings.get('minimal-ui', 'hotbar');
      if (hotbarSetting === 'hidden' || (hotbarSetting === 'onlygm' && !game.user?.isGM))
        return true;
    }
    const el = WindowControls.getHotbarElement();
    if (!el) return false;
    const style = getComputedStyle(el);
    return style.display === 'none' || style.visibility === 'hidden' || el.getBoundingClientRect().height === 0;
  }

  static getBoardRect() {
    const board = document.querySelector('#board');
    return board?.getBoundingClientRect() ?? {left: 0, top: 0, width: 0, height: 0, bottom: 0, right: 0};
  }

  static getBottomBarBoardLeft() {
    return WindowControls.cssTopBarPadding;
  }

  static getBottomBarBodyLeft() {
    return Math.ceil(WindowControls.getBoardRect().left) + WindowControls.getBottomBarBoardLeft();
  }

  static getBottomBarMinGap() {
    return WindowControls.getBottomBarBoardLeft() + 10;
  }

  static getBottomBarLayout() {
    const boardRect = WindowControls.getBoardRect();
    const gap = WindowControls.cssTopBarChromeGap;
    const barHeight = WindowControls.cssMinimizedBarHeight;

    if (WindowControls.isHotbarHidden()) {
      return {
        barBottom: gap,
        tabTop: boardRect.height - barHeight
      };
    }

    const hotbarEl = WindowControls.getHotbarElement();
    if (hotbarEl) {
      const hotbarRect = hotbarEl.getBoundingClientRect();
      const barBottom = Math.max(gap, Math.ceil(window.innerHeight - hotbarRect.top + gap));
      const barTopViewport = hotbarRect.top - gap - barHeight;
      return {
        barBottom,
        tabTop: Math.round(barTopViewport - boardRect.top)
      };
    }

    return {
      barBottom: WindowControls.cssMinimizedBottomBaseline,
      tabTop: boardRect.height - WindowControls.cssMinimizedBottomBaseline - 41
    };
  }

  static setBarMovementLock(app, locked) {
    if (!WindowControls.hasRenderedElement(app)) return;
    if (WindowControls.getOverflowedState()) return;
    const $headers = WindowControls.$el(app).find("header, .window-header");
    if (locked) {
      $headers.removeClass("draggable");
      const elementJS = app.element instanceof HTMLElement ? app.element : app.element?.[0];
      if (!elementJS || WindowControls._barMovementListeners.has(app)) return;
      const handler = function (ev) {
        if (WindowControls.isMinimized(app))
          ev.stopImmediatePropagation();
      };
      elementJS.addEventListener('pointerdown', handler, true);
      WindowControls._barMovementListeners.set(app, {elementJS, handler});
    } else {
      $headers.addClass("draggable");
      const listener = WindowControls._barMovementListeners.get(app);
      if (listener) {
        listener.elementJS.removeEventListener('pointerdown', listener.handler, true);
        WindowControls._barMovementListeners.delete(app);
      }
    }
  }

  static toggleMovement(app) {
    WindowControls.setBarMovementLock(app, true);
  }

  static isFixedBarSetting(setting) {
    return setting === 'topBar' || setting === 'bottomBar';
  }

  static clearMinimizeBar() {
    $("#minimized-bar").hide().remove();
    const rootStyle = document.querySelector(':root').style;
    rootStyle.setProperty('--minibarw', 'unset');
    rootStyle.setProperty('--minibarbot', 'unset');
    rootStyle.setProperty('--minibartop', 'unset');
    rootStyle.setProperty('--minibarleft', 'unset');
  }

  static applyOrganizedMinimizeSetting() {
    const setting = game.settings.get('window-controls', 'organizedMinimize');
    if (WindowControls.isFixedBarSetting(setting))
      WindowControls.positionMinimizeBar();
    else
      WindowControls.clearMinimizeBar();
    WindowControls.compactStash();
    for (const entry of Object.values(WindowControls.minimizedStash)) {
      if (!entry?.app?.rendered || !WindowControls.isMinimized(entry.app)) continue;
      if (!WindowControls.isFixedBarSetting(setting))
        WindowControls.setBarMovementLock(entry.app, false);
      WindowControls.setMinimizedPosition(entry.app);
    }
    WindowControls.refreshMinimizeBar();
  }

  static organizedMinimizeSettingChanged(newValue) {
    if (newValue === 'persistentTop' || newValue === 'persistentBottom'
      || document.querySelector('#window-controls-persistent')) {
      WindowControls.debouncedReload();
      return;
    }
    WindowControls.applyOrganizedMinimizeSetting();
  }

  static positionMinimizeBar() {
    const setting = game.settings.get('window-controls', 'organizedMinimize');
    if (!WindowControls.isFixedBarSetting(setting)) {
      WindowControls.clearMinimizeBar();
      return;
    }
    const rootStyle = document.querySelector(':root').style;
    const bar = $('#minimized-bar').hide();
    const barHtml = $(`<div id="minimized-bar" class="app" style="display: none;"></div>`);
    switch (setting) {
      case 'topBar': {
        rootStyle.setProperty('--minibarbot', 'unset');
        rootStyle.setProperty('--minibartop', WindowControls.getTopPosition() + 'px');
        rootStyle.setProperty('--minibarleft', WindowControls.getTopBarLeftStart() + 'px');
        if (bar.length === 0)
          barHtml.appendTo('body');
        break;
      }
      case 'bottomBar': {
        const {barBottom} = WindowControls.getBottomBarLayout();
        rootStyle.setProperty('--minibarbot', barBottom + 'px');
        rootStyle.setProperty('--minibartop', 'unset');
        rootStyle.setProperty('--minibarleft', WindowControls.getBottomBarBodyLeft() + 'px');
        if (bar.length === 0)
          barHtml.appendTo('body');
        break;
      }
    }
  }

  static getSceneNavigationElement() {
    const navApps = [ui.nav, ui.navigation].filter(Boolean);
    for (const navApp of navApps) {
      const el = navApp.element;
      if (el instanceof HTMLElement) return el;
      if (el?.[0] instanceof HTMLElement) return el[0];
    }
    return document.querySelector("#scene-navigation") ?? document.querySelector("#navigation");
  }

  static getSceneNavigationHeight() {
    const navElement = WindowControls.getSceneNavigationElement();
    if (!navElement) return 0;
    const {offsetHeight, offsetWidth} = navElement;
    // v13+ scene navigation is vertical; its height is not a top-bar inset.
    if (offsetHeight > offsetWidth * 1.5) return 0;
    return offsetHeight;
  }

  static getTopChromeBottom() {
    const navViewed = document.querySelector('#scene-navigation-viewed');
    if (navViewed)
      return navViewed.getBoundingClientRect().bottom;
    const navigation = document.querySelector('#navigation');
    if (navigation && navigation.offsetHeight <= navigation.offsetWidth * 1.5)
      return navigation.getBoundingClientRect().bottom;
    const navHeight = WindowControls.getSceneNavigationHeight();
    if (navHeight)
      return navHeight;
    return 0;
  }

  static getTopBarLeftStart() {
    const navViewed = document.querySelector('#scene-navigation-viewed');
    if (navViewed)
      return Math.ceil(navViewed.getBoundingClientRect().right) + 10;
    const navigation = document.querySelector('#navigation');
    if (navigation && navigation.offsetHeight <= navigation.offsetWidth * 1.5)
      return navigation.offsetLeft + navigation.offsetWidth + 10;
    return WindowControls.cssTopBarLeftStart;
  }

  static getTaskbarVerticalInset() {
    return Math.floor((WindowControls.cssMinimizedBarHeight - WindowControls.cssMinimizedHeaderHeight) / 2);
  }

  static getTopPosition() {
    const minimizedSetting = game.settings.get('window-controls', 'organizedMinimize');
    if (['bottomBar', 'bottom'].includes(minimizedSetting))
      return WindowControls.getBottomBarLayout().tabTop;
    else {
      const chromeBottom = WindowControls.getTopChromeBottom();
      if (chromeBottom)
        return chromeBottom + WindowControls.cssTopBarChromeGap;
      const navHeight = WindowControls.getSceneNavigationHeight();
      if (navHeight)
        return navHeight + WindowControls.cssMinimizedTopBaseline + 20;
      return WindowControls.cssTopBarPadding;
    }
  }

  static clonePosition(position) {
    return position ? foundry.utils.deepClone(position) : null;
  }

  static getLeftPosition(app, prePosition) {
    const minimizedSetting = game.settings.get('window-controls', 'organizedMinimize');
    const minGap = ['top', 'topBar'].includes(minimizedSetting)
      ? WindowControls.getTopBarLeftStart() + 10
      : (minimizedSetting === 'persistentTop' || minimizedSetting === 'persistentBottom'
        ? WindowControls.cssTopBarPersistentLeftStart + 10
        : WindowControls.getBottomBarMinGap());
    const jumpGap = WindowControls.cssMinimizedSize + 10;
    const maxGap = WindowControls.getCurrentMaxGap();
    const savedPosition = WindowControls.clonePosition(prePosition ?? app.position);
    let targetPos;
    for (let i = minGap; i < maxGap + jumpGap; i = i + jumpGap) {
      if (WindowControls.getAppId(WindowControls.minimizedStash[i]?.app) === WindowControls.getAppId(app)) {
        if (prePosition)
          WindowControls.minimizedStash[i].oldPosition = savedPosition;
        targetPos = i;
        return targetPos;
      } else if (!targetPos && !WindowControls.minimizedStash[i]?.app.rendered) {
        WindowControls.minimizedStash[i] = {app: app, oldPosition: savedPosition};
        targetPos = i;
        return targetPos;
      }
    }
    let appI = prePosition?.left ?? app.position.left;
    while (appI in WindowControls.minimizedStash) appI += 20;
    WindowControls.minimizedStash[appI] = {app: app, oldPosition: savedPosition};
    return appI;
  }

  static getMinimizedTop(setting, app) {
    if (setting === 'persistentTop') return WindowControls.getTaskbarTop();
    if (setting === 'persistentBottom') return WindowControls.getTaskbarBot();
    const topPos = WindowControls.getTopPosition();
    if (['top', 'topBar', 'bottomBar'].includes(setting))
      return topPos + WindowControls.getTaskbarVerticalInset();
    return topPos;
  }

  static setPersistentTaskbarPosition(app, prePosition) {
    const setting = game.settings.get('window-controls', 'organizedMinimize');
    const leftPos = WindowControls.getLeftPosition(app, prePosition);
    const inPanel = WindowControls.isInPersistentTaskbarPanel(app);
    app._wcRepositioning = true;
    if (inPanel) {
      WindowControls.mergeAppPosition(app, {
        width: WindowControls.cssMinimizedSize,
        height: WindowControls.cssMinimizedHeaderHeight
      });
      WindowControls.$el(app).css({
        position: 'relative',
        top: 'auto',
        left: 'auto',
        margin: 0,
        'box-shadow': 'none'
      });
    } else {
      WindowControls.$el(app).addClass('wc-persistent-tab');
      app.setPosition({
        left: leftPos ?? app.position.left,
        top: WindowControls.getMinimizedTop(setting, app) ?? app.position.top,
        width: WindowControls.cssMinimizedSize,
        height: WindowControls.cssMinimizedHeaderHeight
      });
    }
    app._wcRepositioning = false;
    WindowControls.$el(app).css({'z-index': WindowControls.getOverflowedState() ? 10 : 1});
  }

  static setMinimizedPosition(app, prePosition) {
    const setting = game.settings.get('window-controls', 'organizedMinimize');
    const alreadyStashedWindow = WindowControls.appInStash(WindowControls.getAppId(app));
    if (!alreadyStashedWindow && WindowControls.getOverflowedState()) return;
    if (WindowControls.isPersistentTaskbarSetting(setting)) {
      WindowControls.setPersistentTaskbarPosition(app, prePosition);
      return;
    }
    const leftPos = WindowControls.getLeftPosition(app, prePosition);
    const position = {
      left: leftPos ?? app.position.left,
      top: WindowControls.getMinimizedTop(setting, app) ?? app.position.top,
      width: WindowControls.cssMinimizedSize
    };
    position.height = WindowControls.cssMinimizedHeaderHeight;
    app._wcRepositioning = true;
    app.setPosition(position);
    app._wcRepositioning = false;
    WindowControls.$el(app).css({'z-index': WindowControls.getOverflowedState() ? 10 : 1});
  }

  static applyRestoredPosition(app, position) {
    if (!position) return;
    app._wcRestoring = true;
    app.setPosition(WindowControls.clonePosition(position));
    app._wcRestoring = false;
  }

  static stashSavedPosition(app) {
    const fromStash = WindowControls.clonePosition(
      WindowControls.appInStash(WindowControls.getAppId(app))?.oldPosition
    );
    if (fromStash) return fromStash;
    return WindowControls.clonePosition(TaskbarState.getSavedPosition(app));
  }

  static setRestoredPosition(app) {
    WindowControls.applyRestoredPosition(
      app,
      WindowControls.appInStash(WindowControls.getAppId(app))?.oldPosition ?? app.position
    );
  }

  static deleteFromStash(app, keys) {
    let lastDeleted;
    keys.forEach(i => {
      const stash = WindowControls.minimizedStash[i];
      if (stash?.app && WindowControls.getAppId(stash.app) === WindowControls.getAppId(app)) {
        lastDeleted = i;
        delete WindowControls.minimizedStash[i];
      } else if (stash && lastDeleted) {
        WindowControls.minimizedStash[lastDeleted] = stash;
        if (WindowControls.isMinimized(stash.app))
          stash.app.setPosition({left: lastDeleted});
        lastDeleted = i;
        delete WindowControls.minimizedStash[i];
      }
    });
  }

  static purgeStash() {
    for (const key of WindowControls.getStashedKeys()) {
      const app = WindowControls.minimizedStash[key]?.app;
      if (!app?.rendered || !WindowControls.isMinimized(app))
        delete WindowControls.minimizedStash[key];
    }
  }

  static compactPersistentStash(entries, minGap, jumpGap) {
    const container = document.querySelector('#window-controls-persistent');
    let slot = minGap;
    for (const entry of entries) {
      WindowControls.minimizedStash[slot] = entry;
      if (container && WindowControls.isInPersistentTaskbarPanel(entry.app)) {
        const el = WindowControls.$el(entry.app)[0];
        if (el) container.appendChild(el);
        entry.app._wcRepositioning = true;
        WindowControls.mergeAppPosition(entry.app, {
          width: WindowControls.cssMinimizedSize,
          height: WindowControls.cssMinimizedHeaderHeight
        });
        entry.app._wcRepositioning = false;
        WindowControls.$el(entry.app).css({position: 'relative', top: 'auto', left: 'auto', margin: 0});
      } else {
        entry.app._wcRepositioning = true;
        entry.app.setPosition({
          ...entry.app.position,
          left: slot,
          top: WindowControls.getMinimizedTop(
            game.settings.get('window-controls', 'organizedMinimize'),
            entry.app
          ),
          width: WindowControls.cssMinimizedSize,
          height: WindowControls.cssMinimizedHeaderHeight
        });
        entry.app._wcRepositioning = false;
      }
      slot += jumpGap;
    }
  }

  static compactStash() {
    const setting = game.settings.get('window-controls', 'organizedMinimize');
    const minGap = ['top', 'topBar'].includes(setting)
      ? WindowControls.getTopBarLeftStart() + 10
      : (WindowControls.isPersistentTaskbarSetting(setting)
        ? WindowControls.cssTopBarPersistentLeftStart + 10
        : WindowControls.getBottomBarMinGap());
    const jumpGap = WindowControls.cssMinimizedSize + 10;
    const entries = WindowControls.getStashedKeys()
      .sort((a, b) => a - b)
      .map(key => WindowControls.minimizedStash[key])
      .filter(entry => entry?.app?.rendered && WindowControls.isMinimized(entry.app));
    WindowControls.minimizedStash = {};
    if (WindowControls.isPersistentTaskbarSetting(setting)) {
      WindowControls.compactPersistentStash(entries, minGap, jumpGap);
      return;
    }
    let slot = minGap;
    for (const entry of entries) {
      WindowControls.minimizedStash[slot] = entry;
      entry.app._wcRepositioning = true;
      entry.app.setPosition({...entry.app.position, left: slot});
      entry.app._wcRepositioning = false;
      slot += jumpGap;
    }
  }

  static appInStash(targetId) {
    return Object.values(WindowControls.minimizedStash).find(a => WindowControls.getAppId(a.app) === targetId)
  }

  static getMinimizeBarWidth(setting) {
    const keys = WindowControls.getStashedKeys();
    if (!keys.length) return 0;
    const maxLeft = Math.max(...keys);
    const barLeft = (setting === 'topBar' || setting === 'persistentTop')
      ? WindowControls.getTopBarLeftStart()
      : WindowControls.getBottomBarBoardLeft();
    return maxLeft - barLeft + WindowControls.cssMinimizedSize + 10;
  }

  static refreshMinimizeBar() {
    WindowControls.purgeStash();
    WindowControls.compactStash();
    const minimized = $(".window-app.minimized, .application.minimized");
    const stashSize = WindowControls.getStashedKeys().length;
    const setting = game.settings.get('window-controls', 'organizedMinimize');
    const barMode = WindowControls.isFixedBarSetting(setting);
    if (minimized.length === 0 || Object.values(WindowControls.minimizedStash).every(w => w.app.rendered === false)) {
      WindowControls.minimizedStash = {};
      WindowControls.clearMinimizeBar();
    } else if (stashSize > 0) {
      minimized.show();
      if (barMode) {
        if (stashSize === 1)
          WindowControls.positionMinimizeBar();
        const rootStyle = document.querySelector(':root').style;
        rootStyle.setProperty('--minibarw', WindowControls.getMinimizeBarWidth(setting) + 'px');
        $("#minimized-bar").show();
      } else {
        WindowControls.clearMinimizeBar();
      }
    }
  }

  static cleanupMinimizeBar(app) {
    const keys = WindowControls.getStashedKeys();
    if (keys.length)
      WindowControls.deleteFromStash(app, keys);
  }

  static setMinimizedStyle(app) {
    if (!WindowControls.hasRenderedElement(app)) return;
    const $root = WindowControls.$el(app);
    WindowControls.applyDisplayTitle(app);
    if (WindowControls.isV2(app)) {
      WindowControls.injectMinimizeControl(app);
      WindowControls.syncMinimizeControlIcon(app);
      return;
    }
    const $minimize = $root.find(".wc-minimize-control, .minimize, [data-action='minimize']");
    $minimize.empty().append(`<i class="far fa-window-restore"></i>`).show();
  }

  static setRestoredStyle(app) {
    const $root = WindowControls.$el(app);
    const $title = WindowControls.$windowTitle(app);
    if ($title.length) $title.text(WindowControls.getNativeWindowTitle(app));
    if (WindowControls.isV2(app)) {
      WindowControls.injectMinimizeControl(app);
      WindowControls.syncMinimizeControlIcon(app);
    } else {
      const $minimize = $root.find(".wc-minimize-control, .minimize, [data-action='minimize']");
      $minimize.empty().append(`<i class="far fa-window-minimize"></i>`);
    }
    if (app._pinned === true) {
      $root.find(".entry-image").hide();
      $root.find(".entry-text").hide();
      $root.find(".close, [data-action='close']").hide();
    }
  }

  static applyPinnedMode(app) {
    if (!WindowControls.hasRenderedElement(app)) return;
    const header = WindowControls.$el(app).find(".window-header");
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

  static organizedMinimize(app, settings, prePosition) {
    const barEnabled = ['topBar', 'bottomBar'].includes(settings);
    WindowControls.setMinimizedPosition(app, prePosition);
    WindowControls.setMinimizedStyle(app);
    if (barEnabled)
      WindowControls.setBarMovementLock(app, true);
    if (barEnabled)
      WindowControls.refreshMinimizeBar();
  }

  static prepareMaximizeRestore(app, settings) {
    const savedPosition = WindowControls.stashSavedPosition(app);
    if (WindowControls.isMinimized(app)) {
      if (['bottom', 'bottomBar'].includes(settings)) {
        app._wcRestoring = true;
        app.setPosition({top: 0});
        app._wcRestoring = false;
      }
      if (!WindowControls.isPersistentTaskbarSetting(settings))
        WindowControls.$el(app).css('visibility', 'hidden');
    }
    if (['topBar', 'bottomBar'].includes(settings)) {
      WindowControls.setBarMovementLock(app, false);
      WindowControls.cleanupMinimizeBar(app);
    }
    return savedPosition;
  }

  static finishMaximizeRestore(app, settings, savedPosition) {
    WindowControls.applyRestoredPosition(app, savedPosition);
    WindowControls.afterMaximizeRestore(app, settings);
    if (['topBar', 'bottomBar'].includes(settings))
      WindowControls.refreshMinimizeBar();
  }

  static organizedClose(app, settings) {
    const savedPosition = WindowControls.stashSavedPosition(app);
    WindowControls.cleanupMinimizeBar(app);
    if (!WindowControls.isMinimized(app)) return;
    WindowControls.$el(app).hide();
    if (['bottom', 'bottomBar'].includes(settings)) {
      app._wcRestoring = true;
      app.setPosition({top: 0});
      app._wcRestoring = false;
    }
    WindowControls.applyRestoredPosition(app, savedPosition);
    // ApplicationV1-only width restore hack; V2 has no defaultOptions.width.
    if (!WindowControls.isV2(app)) {
      const defaultWidth = app.constructor.defaultOptions?.width;
      if (defaultWidth != null)
        app.sheetWidth = defaultWidth;
    }
  }

  static shouldSkipHeaderControls(app) {
    return app.constructor.name === 'QuestTracker'
      || (game.modules.get('one-journal')?.active && app.constructor.name === 'JournalSheet')
      || app.constructor.name === 'ee';
  }

  static buildV1HeaderButtons(app) {
    if (WindowControls.shouldSkipHeaderControls(app)) return [];
    const newButtons = [];
    const minimizeSetting = game.settings.get('window-controls', 'minimizeButton');
    if (minimizeSetting === 'enabled') {
      newButtons.push({
        label: "",
        class: "minimize",
        icon: "far fa-window-minimize",
        onclick: () => WindowControls.handleMinimizeClick(app),
        button: true
      });
    }
    const pinnedSetting = game.settings.get('window-controls', 'pinnedButton');
    if (pinnedSetting === 'enabled') {
      const pinHandler = () => {
        WindowControls.applyPinnedMode(app);
        WindowControls.applyPinnedMode(
          Object.values(ui.windows).find(w => WindowControls.getAppId(w.targetApp) === WindowControls.getAppId(app))
        );
      };
      newButtons.push({
        label: "",
        class: "pin",
        icon: "fas fa-map-pin",
        onclick: pinHandler,
        onClick: pinHandler,
        button: true
      });
    }
    return newButtons;
  }

  static applyPersistentSetPositionConstraints(app, expectedPosition) {
    const layout = WindowControls.persistentLayout;
    if (!layout || !expectedPosition) return expectedPosition;

    if (WindowControls.isTaskbarDummy(app))
      return WindowControls.applyPersistentSetPositionConstraintsForDummy(app, expectedPosition);

    if (!WindowControls.hasRenderedElement(app)) return expectedPosition;
    const el = WindowControls.$el(app)[0];
    if (!el) return expectedPosition;

    if (layout.mode === 'top') {
      const marginMaxValue = window.innerHeight - el.offsetHeight - layout.margin;
      if (expectedPosition.top >= marginMaxValue) {
        el.style.top = `${marginMaxValue}px`;
        expectedPosition.top = marginMaxValue;
      }
      const maxHeight = $("#board").height() - 42;
      if (expectedPosition.height > maxHeight) {
        el.style.height = `${maxHeight}px`;
        expectedPosition.height = maxHeight;
      }
    } else if (layout.mode === 'bottom') {
      const marginMinValue = 42;
      if (expectedPosition.top <= marginMinValue) {
        el.style.top = `${marginMinValue}px`;
        expectedPosition.top = marginMinValue;
      }
      const maxHeight = $("#board").height() - marginMinValue;
      if (expectedPosition.height > maxHeight) {
        el.style.height = `${maxHeight}px`;
        expectedPosition.height = maxHeight;
      }
    }
    return expectedPosition;
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
      onChange: WindowControls.organizedMinimizeSettingChanged
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
        TaskbarState.getDummy(app)?.justClose();
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

    Hooks.on('closeApplicationV2', function (app) {
      WindowControls.cleanupMinimizeBar(app);
    });

    Hooks.on('closeItemSheet', function (app) {
      WindowControls.cleanupMinimizeBar(app);
    });

    Hooks.on('closeActorSheet', function (app) {
      WindowControls.cleanupMinimizeBar(app);
    });

    WindowControls.registerHeaderButtonHooks();

  }

}

registerTaskbar(WindowControls);
registerWrappers(WindowControls);
registerHeaderButtons(WindowControls);

// libWrapper.Ready fires *before* init; listener must exist before that hook runs.
Hooks.once('libWrapper.Ready', () => {
  WindowControls.registerApplicationWrappers();
});

Hooks.once('setup', () => {
  const settings = game.settings.get('window-controls', 'organizedMinimize');
  if (settings === 'persistentTop') {
    const rootStyle = document.querySelector(':root').style;
    const top = 4;
    const margin = top * 10;
    const dedHeight = 100 - top;
    WindowControls.persistentLayout = {mode: 'top', margin};
    document.body.classList.add('wc-persistent-top');
    rootStyle.setProperty('--minimizedpos', 'fixed');
    rootStyle.setProperty('--miniminh', `65vh`);
    rootStyle.setProperty('--minimaxh', `85vh`);
    rootStyle.setProperty('--minisidebaradj', `calc(100vh - ${10 + margin}px)`);
    rootStyle.setProperty('--taskbarcolor', game.settings.get('window-controls', 'taskbarColor'));
    const nonBackBody = $("body:not(.background)");
    nonBackBody.css('top', `${margin}px`);
    nonBackBody.css('height', `${dedHeight}%`);
    $("body").append('<section id="window-controls-persistent"></section>');
    $("#window-controls-persistent").css('top', '0');
    $("#window-controls-persistent").css('height', `${WindowControls.cssPersistentTaskbarHeight}px`);
  } else if (settings === 'persistentBottom') {
    const rootStyle = document.querySelector(':root').style;
    const top = -4;
    const margin = top * 10;
    const dedHeight = 100 + top;
    WindowControls.persistentLayout = {mode: 'bottom', margin};
    document.body.classList.add('wc-persistent-bottom');
    rootStyle.setProperty('--minimizedpos', 'fixed');
    rootStyle.setProperty('--miniminh', `65vh`);
    rootStyle.setProperty('--minimaxh', `85vh`);
    rootStyle.setProperty('--minisidebaradj', `calc(100vh - ${8 - margin}px)`);
    rootStyle.setProperty('--taskbarcolor', game.settings.get('window-controls', 'taskbarColor'));
    const nonBackBody = $("body:not(.background)");
    nonBackBody.css('top', `${margin}px`);
    nonBackBody.css('padding-top', `${-margin}px`);
    $("body").append('<section id="window-controls-persistent"></section>');
    $("#window-controls-persistent").css('bottom', '0');
    $("#window-controls-persistent").css('height', `${WindowControls.cssPersistentTaskbarHeight}px`);
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
    // Fallback if libWrapper.Ready already fired before our listener was attached.
    WindowControls.registerApplicationWrappers();
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

  WindowControls.positionMinimizeBar();
  $(window).on('resize.window-controls', WindowControls.debouncedApplyLayout);
  Hooks.on('collapseSidebar', WindowControls.debouncedApplyLayout);
  Hooks.on('expandSidebar', WindowControls.debouncedApplyLayout);

  const settingOrganized = game.settings.get('window-controls', 'organizedMinimize');
  if (settingOrganized === 'persistentTop' || settingOrganized === 'persistentBottom') {
    WindowControls.registerTaskbarRenderHooks();

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