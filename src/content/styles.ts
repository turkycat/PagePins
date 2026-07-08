export const PP_CSS = `
:host { all: initial; }
.pp-pill {
  position: fixed; top: 8px; right: 12px; z-index: 2147483647;
  font: 12px/1.4 -apple-system, system-ui, sans-serif;
  background: #161a22; color: #8ab4ff; border: 1px solid #2f6feb;
  border-radius: 14px; padding: 4px 10px; cursor: pointer; box-shadow: 0 3px 10px #0006;
}
.pp-bar {
  position: fixed; top: 0; left: 0; right: 0; z-index: 2147483647;
  font: 12px/1.4 -apple-system, system-ui, sans-serif;
  background: #161a22; color: #e6e6e6; border-bottom: 2px solid #2f6feb;
  display: flex; align-items: center; gap: 10px; padding: 6px 12px; flex-wrap: wrap;
  box-shadow: 0 2px 8px #0006;
}
.pp-lbl { font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: #7fd1a8; }
.pp-item { display: inline-flex; align-items: center; gap: 6px; background: #0d0d0f; border: 1px solid #333; border-radius: 6px; padding: 2px 6px; cursor: grab; }
.pp-item:active { cursor: grabbing; }
.pp-item.pp-dragover { border-color: #2f6feb; background: #1a2233; }
.pp-check { cursor: pointer; color: #4ea; border: 1.5px solid #4ade80; border-radius: 3px; width: 14px; height: 14px; display: inline-flex; align-items: center; justify-content: center; font-size: 10px; background: transparent; transition: background .15s ease; }
.pp-check:hover { background: #4ade8022; }
.pp-text { color: #e6e6e6; transition: color .2s ease, opacity .2s ease; }
.pp-item.pp-done { border-color: #2f6f4f; }
.pp-item.pp-done .pp-check { background: #4ade80; color: #0d1117; font-weight: 700; animation: pp-pop .3s ease; }
.pp-item.pp-done .pp-text { text-decoration: line-through; color: #8aa595; opacity: .75; }
@keyframes pp-pop { 0% { transform: scale(1); } 50% { transform: scale(1.45); } 100% { transform: scale(1); } }
.pp-clearall { background: #14321f; border: 1px solid #4ade80; color: #7fe0a8; border-radius: 6px; padding: 3px 10px; cursor: pointer; font: inherit; font-size: 11px; white-space: nowrap; }
.pp-clearall:hover { background: #1b4429; }
.pp-x { cursor: pointer; color: #f77; font-weight: 700; }
.pp-add { flex: 1; min-width: 160px; background: #0d0d0f; border: 1px solid #2f6feb; color: #e6e6e6; border-radius: 6px; padding: 4px 9px; font: inherit; }
.pp-collapse { margin-left: auto; cursor: pointer; color: #888; }
.pp-collapse:hover { color: #bbb; }
.pp-collapse-pin { display: inline-block; transform: rotate(-45deg); transition: transform .15s ease; }
.pp-collapse:hover .pp-collapse-pin { transform: rotate(0deg) scale(1.15); }
.pp-collapse:active .pp-collapse-pin { transform: rotate(0deg) scale(.85); }
.pp-toast { position: fixed; bottom: 16px; right: 16px; z-index: 2147483647; background: #222; color: #eee; border: 1px solid #444; border-radius: 8px; padding: 8px 12px; font: 12px -apple-system, system-ui, sans-serif; box-shadow: 0 4px 14px #0008; }
.pp-toast button { margin-left: 10px; background: none; border: none; color: #8ab4ff; cursor: pointer; font-weight: 600; font: inherit; }
.pp-overlay { position: fixed; inset: 0; z-index: 2147483647; background: #0008; display: flex; align-items: flex-start; justify-content: center; }
.pp-ovpanel { margin-top: 8vh; width: min(560px, 92vw); max-height: 80vh; overflow: auto; background: #12151c; border: 1px solid #2f6feb; border-radius: 10px; padding: 14px; font: 13px -apple-system, system-ui, sans-serif; color: #e6e6e6; box-shadow: 0 10px 40px #000a; }
.pp-ovtitle { font-size: 12px; text-transform: uppercase; letter-spacing: .05em; color: #7fd1a8; margin-bottom: 10px; }
.pp-ovempty { color: #888; }
.pp-ovrow { padding: 8px 10px; border-radius: 8px; cursor: pointer; }
.pp-ovrow:hover { background: #1c2230; }
.pp-ovrowtitle { color: #e6e6e6; }
.pp-ovmeta { color: #8a93a6; font-size: 11px; margin-top: 2px; }
`;
