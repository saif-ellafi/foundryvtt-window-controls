### 1.7.1
* Bugfix: Top Taskbar mode corrected an issue in calculation of unsupported windows minimization
* Bugfix: Top Taskbar mode limited height of minimum height for settings

### 1.7.0
* Enhancement: New Organized Minimize Mode "Taskbar Top" fixes a taskbar on top of all canvas for minimized windows (Check screenshot!)
* Deprecation: Persistent modes now deprecated in favor of Tasbkar mode. Earlier persistent mode did not give the experience I hoped for.

Feedback is welcome and consider a ko-fi!

### 1.6.3
* Compatibility: Forien's Quest Log V9+

### 1.6.2
* Enhancement: Adjust Top bar positioning alongside Minimal UI Logo and Navigation settings

### 1.6.1
* Bugfix: Fixed a specific bug when restoring loaded windows that cannot be opened again
* Bugfix: Rolled back some risky decisions in favor of compatibility over functionality

### 1.6.0
* Enhancement: Persistent Window mode will now work universally (Can detect module apps like Fate Utilities, Inline WebViewer, FXMaster, etc.)
* Enhancement: Persistent Mode of Windows will now minimize "non-important" windows into the bar as well, as opposed to leave them floating
* Compatibility: PopOut! support improved
* Default: Setting Persisted TopBar mode is now the default (Risky in terms of compatibility, but I give my vote of confidence!)
* Default: Setting remember pinned windows is now set by default (I like it and use it!)

### 1.5.3
* Bugfix: Fixed a bug where some modules might trigger some ghost windows that trick Window Controls and thus throwing an error (Thank you Casanova for helping find it)

### 1.5.2
* Bugfix: Fixed a bug when combining persisted mode and remember pinned windows, where closing them would not be remembered

### 1.5.1
* Enhancement: Remember Pinned Windows will now also remember position and size of windows (at the time of getting pinned)
* Enhancement: Remember Pinned Windows will start minimized
* Bugfix: Fixed wrong rounded corners in pinned windows
* Bugfix: Fixed pinned mode not setting up correctly in persisted loaded windows
* Bugfix: Fixed a certain situation where minimizing windows would not work after unpinning them
* Compatibility: Inline WebViewer window application now counts for persisted bar mode

### 1.5.0
* Enhancement: New Feature (experimental, disabled by default) remembers the pinned windows for next sessions!
* Compatibility: GM Screen entries should no longer spawn persistent window tabs
* Bugfix: Fixed a specific situation when unpinning and closing very fast caused in a minimize because of double clicking recognition

### 1.4.1
* Enhancement: Added Roll Tables to supported window types for Persistent Mode
* Bugfix: Minor style adjustments for the horizontal bar

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
