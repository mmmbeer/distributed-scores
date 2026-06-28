VBall Scorekeeper

Upload all files to:
https://vball.fairway3games.com/

Main page:
- /index.html or / opens a custom modal:
  - Viewer is the default/read-only mode
  - Scorekeeper allows score changes

Separate viewer page:
- /viewer.html

Fixes in this version:
- Clicking '+ Game Won' only increments games won.
- It does not increment the side's point score.
- index.html now supports both viewer and scorekeeper mode.
- index.html still live-syncs remote updates.

Polling speed:
- Viewer page active tab: every 250ms
- Index page active tab: every 300ms
- Background tabs: every 1000ms

Make sure /data is writable by PHP if your host does not allow PHP to create it automatically.
