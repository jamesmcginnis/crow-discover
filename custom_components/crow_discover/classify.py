"""Decide what a GitHub repository holds, and whether the Marketplace can install it.

Shared by the integration (Refresh Now, Add by link) and by the nightly index builder
(index_builder/build_index.py), so both always agree. Pure Python, no Home Assistant imports.

The rules follow the Marketplace's own (homeassistant/components/marketplace/repositories):
  - integration: custom_components/<name>/manifest.json (or manifest.json in the root
    when hacs.json says content_in_root)
  - card: a .js file named after the repository (lovelace- taken off, or -bundle / .umd
    added), in the root, in dist/, or as an asset of the latest release; or the file
    hacs.json names
  - theme: a .yaml file in themes/ (or in the root with content_in_root)
A hacs.json is not needed for any of them.
"""

from __future__ import annotations

import json
from typing import Any

SCHEMA = 1

TYPES = ("integration", "card", "theme", "blueprint")
# What the Marketplace calls each type (blueprints aren't the Marketplace's)
MARKETPLACE_CATEGORY = {"integration": "integration", "card": "plugin", "theme": "theme"}

CARD_WORDS = ("card", "lovelace", "dashboard", "plugin", "frontend")
BLUEPRINT_DIRS = ("blueprints",)

# The GraphQL fields for one repository. HEAD: is the default branch.
GRAPHQL_FIELDS = """
  nameWithOwner description stargazerCount pushedAt isArchived isFork isPrivate isDisabled
  licenseInfo { spdxId }
  parent { nameWithOwner pushedAt }
  repositoryTopics(first: 20) { nodes { topic { name } } }
  latestRelease { tagName releaseAssets(first: 30) { nodes { name } } }
  root: object(expression: "HEAD:") { ... on Tree { entries { name type } } }
  cc: object(expression: "HEAD:custom_components") { ... on Tree { entries { name type object { ... on Tree { entries { name } } } } } }
  dist: object(expression: "HEAD:dist") { ... on Tree { entries { name type } } }
  themes: object(expression: "HEAD:themes") { ... on Tree { entries { name type } } }
  bp: object(expression: "HEAD:blueprints") { ... on Tree { entries { name type object { ... on Tree { entries { name type object { ... on Tree { entries { name type } } } } } } } } }
  hacs: object(expression: "HEAD:hacs.json") { ... on Blob { text } }
"""


def _names(tree: Any, kind: str | None = None) -> list[str]:
    if not tree or not isinstance(tree, dict):
        return []
    out = []
    for e in tree.get("entries") or []:
        if kind is None or (e.get("type") == kind):
            out.append(e.get("name") or "")
    return out


def normalize_graphql(node: dict[str, Any]) -> dict[str, Any]:
    """Turn a GraphQL repository node (GRAPHQL_FIELDS) into the plain shape classify() reads."""
    cc: dict[str, list[str]] = {}
    for e in ((node.get("cc") or {}).get("entries") or []):
        if e.get("type") == "tree":
            cc[e["name"]] = _names(e.get("object"))
    bp_files: list[str] = []
    for e in ((node.get("bp") or {}).get("entries") or []):
        if e.get("type") == "blob":
            bp_files.append(f"blueprints/{e['name']}")
        elif e.get("type") == "tree":
            for e2 in ((e.get("object") or {}).get("entries") or []):
                if e2.get("type") == "blob":
                    bp_files.append(f"blueprints/{e['name']}/{e2['name']}")
                elif e2.get("type") == "tree":
                    for e3 in ((e2.get("object") or {}).get("entries") or []):
                        if e3.get("type") == "blob":
                            bp_files.append(f"blueprints/{e['name']}/{e2['name']}/{e3['name']}")
    rel = node.get("latestRelease") or {}
    hacs = None
    text = (node.get("hacs") or {}).get("text")
    if text:
        try:
            hacs = json.loads(text)
            if not isinstance(hacs, dict):
                hacs = None
        except ValueError:
            hacs = None
    parent = node.get("parent") or None
    return {
        "full_name": node.get("nameWithOwner") or "",
        "description": (node.get("description") or "").strip(),
        "stars": node.get("stargazerCount") or 0,
        "pushed_at": node.get("pushedAt") or "",
        "archived": bool(node.get("isArchived")),
        "private": bool(node.get("isPrivate")) or bool(node.get("isDisabled")),
        "fork_parent": parent.get("nameWithOwner") if parent else None,
        "parent_pushed_at": parent.get("pushedAt") if parent else None,
        "is_fork": bool(node.get("isFork")),
        "licence": ((node.get("licenseInfo") or {}).get("spdxId")) or "",
        "topics": [n["topic"]["name"] for n in ((node.get("repositoryTopics") or {}).get("nodes") or []) if n.get("topic")],
        "release": rel.get("tagName") or "",
        "release_assets": [a["name"] for a in ((rel.get("releaseAssets") or {}).get("nodes") or [])],
        "root_files": _names(node.get("root"), "blob"),
        "root_dirs": _names(node.get("root"), "tree"),
        "cc": cc,
        "dist": _names(node.get("dist"), "blob"),
        "themes": _names(node.get("themes"), "blob"),
        "blueprints": bp_files,
        "hacs": hacs,
    }


def card_filenames(full_name: str, hacs: dict | None) -> list[str]:
    """The file names the Marketplace looks for (its _valid_filenames)."""
    if hacs and isinstance(hacs.get("filename"), str) and hacs["filename"]:
        return [hacs["filename"]]
    name = full_name.rsplit("/", 1)[-1]
    out = [f"{name.replace('lovelace-', '')}.js", f"{name}.js", f"{name}.umd.js", f"{name}-bundle.js"]
    return list(dict.fromkeys(out))


def _words(r: dict) -> str:
    return (" ".join(r.get("topics") or []) + " " + r["full_name"].rsplit("/", 1)[-1] + " " + (r.get("description") or "")).lower()


def classify(r: dict[str, Any]) -> dict[str, Any] | None:
    """Return the index entry for a normalised repository, or None when it isn't a Home Assistant project.

    Entry: type, compatible (the Marketplace could install it), reason (why not), path
    (what was found), ha (the minimum Home Assistant from hacs.json), blueprint (file).
    """
    if not r.get("full_name") or r.get("private"):
        return None
    hacs = r.get("hacs") or {}
    in_root = bool(hacs.get("content_in_root"))
    words = _words(r)
    root_files = r.get("root_files") or []
    found: dict[str, Any] = {}

    # Integration
    cc = r.get("cc") or {}
    cc_dirs = [d for d, files in cc.items() if "manifest.json" in files]
    if in_root and "manifest.json" in root_files and ("__init__.py" in root_files):
        found = {"type": "integration", "compatible": True, "path": "manifest.json (content_in_root)"}
    elif cc_dirs:
        # The Marketplace installs the first directory in custom_components
        first = sorted(cc.keys())[0] if cc else cc_dirs[0]
        ok = "manifest.json" in cc.get(first, [])
        found = {"type": "integration", "compatible": ok,
                 "path": f"custom_components/{first if ok else cc_dirs[0]}",
                 "reason": None if ok else "integration_first_dir"}
    elif cc:
        found = {"type": "integration", "compatible": False, "path": "custom_components/",
                 "reason": "integration_no_manifest"}

    # Card
    if not found:
        names = card_filenames(r["full_name"], hacs or None)
        dist = r.get("dist") or []
        assets = r.get("release_assets") or []
        hit = None
        if not in_root:
            for n in names:
                if n in assets:
                    hit = f"release asset {n}"
                    break
        if hit is None:
            for n in names:
                if n in root_files:
                    hit = n
                    break
                if not in_root and n in dist:
                    hit = f"dist/{n}"
                    break
        if hit:
            found = {"type": "card", "compatible": True, "path": hit}
        else:
            js = [f for f in root_files if f.endswith(".js") and not f.endswith((".config.js", ".min.js.map"))]
            js += [f"dist/{f}" for f in dist if f.endswith(".js")]
            js += [f"release asset {a}" for a in assets if a.endswith(".js")]
            card_like = any(w in words for w in CARD_WORDS)
            if js and card_like:
                found = {"type": "card", "compatible": False, "path": js[0], "reason": "card_name",
                         "expected": names[0]}

    # Theme
    if not found:
        themes = [f for f in (r.get("themes") or []) if f.endswith(".yaml")]
        if themes and not in_root:
            found = {"type": "theme", "compatible": True, "path": f"themes/{themes[0]}"}
        elif in_root and any(f.endswith(".yaml") for f in root_files) and "theme" in words:
            found = {"type": "theme", "compatible": True, "path": next(f for f in root_files if f.endswith(".yaml"))}
        elif "theme" in words and any(f.endswith(".yaml") for f in root_files):
            found = {"type": "theme", "compatible": False, "path": next(f for f in root_files if f.endswith(".yaml")),
                     "reason": "theme_folder"}

    # Blueprint
    if not found:
        bps = [f for f in (r.get("blueprints") or []) if f.endswith((".yaml", ".yml"))]
        root_yaml = [f for f in root_files if f.endswith((".yaml", ".yml"))]
        if bps:
            found = {"type": "blueprint", "compatible": False, "path": bps[0], "blueprint": bps[0]}
        elif root_yaml and "blueprint" in words:
            found = {"type": "blueprint", "compatible": False, "path": root_yaml[0], "blueprint": root_yaml[0]}

    if not found:
        return None

    if r.get("archived"):
        found["compatible"] = False
        found["reason"] = "archived"

    entry = {
        "full_name": r["full_name"],
        "description": (r.get("description") or "")[:300],
        "stars": int(r.get("stars") or 0),
        "pushed_at": r.get("pushed_at") or "",
        "archived": bool(r.get("archived")),
        "fork_of": r.get("fork_parent"),
        "licence": r.get("licence") or "",
        "release": r.get("release") or "",
        "topics": (r.get("topics") or [])[:12],
        "ha": str(hacs.get("homeassistant") or "") if hacs else "",
        "hacs_json": bool(r.get("hacs") is not None),
        "type": found["type"],
        "compatible": bool(found.get("compatible")),
        "reason": found.get("reason"),
        "path": found.get("path") or "",
    }
    if found.get("expected"):
        entry["expected"] = found["expected"]
    if found.get("blueprint"):
        entry["blueprint"] = found["blueprint"]
    return entry


def fork_counts(r: dict[str, Any]) -> bool:
    """A fork is kept only when it has moved ahead of the original:
    its own release (releases aren't copied when forking), or changes newer than the
    original's that at least one person has starred (a fresh fork's push date alone
    can look newer than the original's)."""
    if not r.get("is_fork") and not r.get("fork_parent"):
        return True
    if r.get("release"):
        return True
    pp = r.get("parent_pushed_at") or ""
    return bool(r.get("pushed_at") and pp and r["pushed_at"] > pp and int(r.get("stars") or 0) >= 1)
