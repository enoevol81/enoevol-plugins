"""Custom icon loader for a Blender add-on — manual fallback when the icon-forge MCP
isn't available. (The MCP `install_icon_set` writes an equivalent file automatically.)

Paste into your add-on package as icon_forge_icons.py. Put your PNGs in an `icons/` folder
next to it. Fill ICON_FILES (id -> filename). Call register_icons() from your add-on's
register() and unregister_icons() from unregister(). Reference an icon in a layout with
icon_value=get_icon("APP_ICON").
"""
import os
import bpy
import bpy.utils.previews

# id -> filename inside the icons/ folder (use your 32px or @256 masters)
ICON_FILES = {
    # "PANEL_PROJECT": "panel_project.png",
    # "SEAM_MARK":     "seam_mark.png",
}

_pcoll = None
_ICON_DIR = os.path.join(os.path.dirname(__file__), "icons")


def register_icons():
    global _pcoll
    _pcoll = bpy.utils.previews.new()
    for icon_id, filename in ICON_FILES.items():
        path = os.path.join(_ICON_DIR, filename)
        if os.path.exists(path):
            _pcoll.load(icon_id, path, 'IMAGE')
        else:
            print(f"[icon-forge] missing: {path}")


def unregister_icons():
    global _pcoll
    if _pcoll is not None:
        bpy.utils.previews.remove(_pcoll)
        _pcoll = None


def get_icon(icon_id: str) -> int:
    """Return icon_id int for use as icon_value=... in layouts.

    Returns 0 (Blender's "no icon") instead of raising if the id is unknown or
    register_icons() hasn't run — a missing icon shouldn't crash the whole panel draw.
    """
    if _pcoll is None:
        return 0
    preview = _pcoll.get(icon_id)
    if preview is None:
        print(f"[icon-forge] unknown icon id: {icon_id}")
        return 0
    return preview.icon_id


# --- usage in a Panel/Operator layout ---
# layout.operator("mytool.project_panels",
#                 text="Project Panels",
#                 icon_value=get_icon("PANEL_PROJECT"))
