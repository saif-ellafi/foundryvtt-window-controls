### 1.2.2
* Bugfix: Improved stability after ugly code cleanup

### 1.2.1
* Bugfix: Fixed an issue caused by Windows with non-letter characters in Persistent BAR mode to disappear

### 1.2.0
* Enhancement: When using Organized Minimize with BAR, minimized or persisted Windows CANNOT be moved (Unless overflowed).This will prevent accidental moves. If undesired, use modes without a BAR. This was very requested by the community :-)

### 1.1.8
* Localization: Thank you @Grayhead for adding German language to Window Controls!

### 1.1.7
* Bugfix: Fixed missing language localizations of previous build

### 1.1.6
* Bugfix: Fixed ghost tabs appearing when changing scenes in persistent mode setting

### 1.1.5
* Bugfix: Fixed a situation where the persistent mode bar would not disappear after closing last open window

### 1.1.4
* Bugfix: Tweaked some race condition parameters for better stability

### 1.1.3
* Bugfix: Fixed pinned handouts not staying pinned after changing from text to image

### 1.1.2
* Enhancement: Replaced [Token] from minimized Windows to shorten header titles
* Enhancement: Window Pin button enabled by default because I think it is cool
* Bugfix: Fixed a bug preventing the bar from disappearing in some situations
* Bugfix: Fixed a bug where windows would not correctly restore to their proper size
* Bugfix: Fixed a bug where pressing Escape to all Windows did not clean the interface properly
* Bugfix: Fixed a bug where closing minimized windows threw an error in some situations
* Bugfix: Reduced code redundancies

### 1.1.1
* Bugfix: Fixed context menu priority in Scene right click when top bar is used (Thanks @Grayhead)
* Bugfix: Improved compatibility between pinned windows and windows that might close themselves (i.e. image-text journals) (Thanks @Grayhead)

### 1.1.0
* Feature: New Persistent Bar mode where open windows are also visible in the Panel (Experimental!!!)

### 1.0.2
* Bugfix: Fixed windows restoring to a wrong size when exceeding taskbar width

### 1.0.1
* Compatibility: Changing multiple settings now works fine with 0.8.3+

### 1.0.0
* Initial Release