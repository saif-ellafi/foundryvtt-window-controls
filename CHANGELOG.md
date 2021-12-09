### 1.4.0
* Enhancement: V9 Support and Internal code quality improvements (thanks to the community for the help!)
* Bugfix: Fixed a specific situation when double clicking on minimize would double minimize

### 1.3.5
* Bugfix: Small pixel position tweak in the positioning of bottom bar

### 1.3.4
* Compatibility: Make better use of space with Minimal UI

### 1.3.3
* Bugfix: Restored an accidentally deleted bugfix for minimized windows appearing below navigation context menus

### 1.3.2
* Enhancement: Color markings when persistent mode windows are already open

### 1.3.1
* Enhancement: Persistent mode windows will be brought to top on click in the bar
* Enhancement: Ironed out animations all over the module (Feedback welcome)
* Enhancement: Persistent mode windows show a minimize button when open and can toggle
* Bugfix: Fixed a bug where windows closed with ESC wouldn't remember the original position afterwards
* Bugfix: Fixed a bug where closing left side windows on the bar would move maximized windows of the right
* Bugfix: Fixed a bug with bottom located windows were not being restored correctly after minimized
* Bugfix: Fixed a bug where closed windows from the bar would not remember correctly the windows length

### 1.3.0
* Enhancement: Organized Minimize windows will auto adjust their positions when closing other windows
* Enhancement: Pinned windows will no longer minimize on `ESC`. Double Tapping `ESC` will do instead. Configurable in Settings
* Enhancement: Organized Minimize windows will be smarter when looking for an empty space in the panel
* Enhancement: Added smoother animations to Organized Minimized in any of the "Bar" modes
* Bugfix: Overflow minimized windows will no longer go to the panel positions, instead they will be minimized in place
* Bugfix: Improved overall stability by simplification of logic

### 1.2.5
* Bugfix: Fixed Bar cleanup with unsupported modules or applications
* Bugfix: Fixed persistent mode bug when opening duplicated tokens
* Localization: Thank you, @Grayhead for improving German Language and Settings configuration!

### 1.2.4
* Bugfix: Fixed journal switching between text and images also broken in 1.2.3

### 1.2.3
* Bugfix: Fixed Journal switching between text and images broken in 1.2.2
* Bugfix: Fixed persistent mode when updating names of open windows

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