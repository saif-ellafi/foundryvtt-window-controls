# Manual Regression Checklist

Run after each significant change. Foundry **14.363**, lib-wrapper active.

## Setup

- [ ] Copy/build module to Data folder
- [ ] Full reload when switching **to/from Taskbar** mode
- [ ] Test as GM with at least one actor sheet open

## Organized (top / bottom)

- [ ] Minimize actor sheet — tab appears, correct **display title** (document name)
- [ ] Restore — returns to **pre-minimize position and size**
- [ ] Native framed title unchanged when open

## Fixed bar (topBar / bottomBar)

- [ ] Minimized tabs locked in bar; bar width follows tab count
- [ ] Bottom bar respects hotbar position
- [ ] Restore position/size correct

## Taskbar (persistentTop / persistentBottom)

- [ ] Open actor sheet — tab appears in taskbar while open
- [ ] Minimize — real window hides; tab remains
- [ ] **Icon** single-click — restore
- [ ] **Header** double-click — restore (no flash/disappear on V2)
- [ ] Minimize again via icon or double-click
- [ ] Single-click header on open tab — brings to front only
- [ ] Close real window — taskbar tab removed
- [ ] **Launch** — no ghost tabs (Scene Directory, Combat, Dice So Nice, etc.)

## V1 vs V2 targets

- [ ] V2 actor sheet — full taskbar flow above
- [ ] V1 module window (if available) — minimize/restore via icon

## Sidebar popout

- [ ] Pop out Actors directory — taskbar tab only for popout, not embedded sidebar

## Pin (upcoming — smoke test if enabled)

- [ ] Pin colors header; close blocked per setting
- [ ] Remember pinned windows across reload (if enabled)

## Layout switch

- [ ] Organized → Bar — no reload required
- [ ] Any → Taskbar — reload prompt/behavior acceptable

## Console

- [ ] No errors on minimize/restore cycle
