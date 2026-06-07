# Window Controls — Behavioral Invariants

These rules govern all layout modes. Future changes should preserve them unless deliberately revising behavior.

## Layout modes

| Key | Label | Minimized UI |
|-----|-------|----------------|
| `top` / `bottom` | Floating | Floating header tabs on canvas |
| `topBar` / `bottomBar` | Docked bar | Locked bar; tabs only when minimized |
| `persistentTop` / `persistentBottom` | Taskbar | Permanent strip; open + minimized windows as tabs |

## Taskbar eligibility

**Proactive tab creation** (`isTrackableTaskbarWindow`) — strict, on render:

- Skip core UI singletons, embedded sidebar tabs, dialogs, frameless apps
- Track document-backed sheets (`DocumentSheetV2` / `document`)
- Track sidebar **popouts** only (`isPopout === true`)
- Require title + framed minimizable window

**User minimize** (`canMinimizeToTaskbar`) — permissive:

- Any framed minimizable window with a title that passes the skip list

## Taskbar state model

Each tracked target may have a **dummy tab** (ApplicationV2 proxy) linked via `TaskbarState`:

- `hidden` — real app has `wc-persistent-target-hidden` (CSS hide, not necessarily Foundry-minimized)
- `savedPosition` — restore position stashed on minimize
- Dummy lives in `#window-controls-persistent`

Never hide the real app without a linked dummy tab.

## Window titles

| State | Title source |
|-------|----------------|
| Open / maximized | Foundry native (`app.title` on frame chrome only for V2) |
| Minimized tab/header | `getDisplayTitle()` — document name, then `curateTitle()` |

Do not rewrite in-sheet system headers on V2 document sheets.

## Pinned windows

- Pinned `close()` minimizes when the window is open; does not destroy the sheet.
- Close button is hidden while pinned; header tint (`minimized-pinned`) shows state.
- Pin control is hidden while minimized.
- Remember-pinned persistence uses sheet identity:
  - `prototype` — sidebar actor template
  - `linked-actor` — linked singleton (world actor id)
  - `token-instance` — unlinked map token (`Token:<tokenId>` + `sceneId`)

Template, linked, and unlinked token sheets are separate instances and must not dedupe each other.

## Settings (v2.0)

| Key | Scope | Default |
|-----|-------|---------|
| `organizedMinimize` | client | `topBar` (Docked Bar Top) |
| `minimizeButton` | world | enabled |
| `pinnedButton` | world | enabled |
| `rememberPinnedWindows` | world | false |
| `taskbarColor` | world | transparent |

Setting changes refresh open window chrome without a full reload where possible.

## Taskbar interactions

| Action | Behavior |
|--------|----------|
| Single-click header | Focus open window (`bringToFront`) |
| Double-click header | Toggle minimize ↔ restore on **target** |
| Single-click minimize/restore icon | Same toggle (one tap) |

Dummy tabs use `minimizable: false` to avoid competing with Foundry native double-click.

## libWrapper

- Always call `wrapped()` in wrappers unless intentionally bypassing (documented).
- Register both `Application.prototype` and `ApplicationV2.prototype` where applicable.

## V1 / V2

- Real apps may be V1 or V2; taskbar dummies are **always ApplicationV2**.
- Use `WindowControls.isV2(app)`, `WindowControls.$el(app)`, and `WindowControls.isTaskbarDummy(app)` — never `constructor.name` for dummies.
