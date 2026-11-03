#!/usr/bin/env python3
"""Create a deterministic, allowlisted runtime package. Never copy WordPress data."""

from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path, PurePosixPath
import json
import os
import re
import subprocess
import zipfile

APP = Path(__file__).resolve().parents[1]
PLUGIN = APP.parent
ROOT = PLUGIN.parents[2]
THEME = PLUGIN.parent.parent / "themes" / "microsite-shell"
OUTPUT = ROOT / "dist" / "staging"
FILES: dict[str, bytes] = {}


def add_file(source: Path, destination: str):
    if source.is_symlink() or not source.is_file():
        raise RuntimeError(f"Expected an ordinary runtime file: {source.name}")
    if destination in FILES:
        raise RuntimeError(f"Duplicate archive entry: {destination}")
    FILES[destination] = source.read_bytes()


def add_tree(source: Path, destination: str, extensions: set[str] | None = None):
    if not source.is_dir():
        raise RuntimeError(f"Missing runtime directory: {source.name}")
    for path in sorted(source.rglob("*")):
        if path.is_file() and (extensions is None or path.suffix in extensions):
            add_file(path, f"{destination}/{path.relative_to(source).as_posix()}")


def git(*arguments: str) -> str:
    try:
        result = subprocess.run(["git", *arguments], cwd=ROOT, text=True, capture_output=True)
    except FileNotFoundError:
        return ""
    return result.stdout.strip() if result.returncode == 0 else ""


def validate_manifest():
    manifest_file = APP / "dist" / ".vite" / "manifest.json"
    manifest = json.loads(manifest_file.read_text())
    for entry in ["src/main.tsx", "src/public.tsx", "src/rsvp-manage.tsx", "src/preview-frame.tsx"]:
        if entry not in manifest or not manifest[entry].get("isEntry"):
            raise RuntimeError(f"Missing production entry: {entry}")
    for chunk in manifest.values():
        for key in ["imports", "dynamicImports"]:
            for dependency in chunk.get(key, []):
                if dependency not in manifest:
                    raise RuntimeError(f"Missing manifest dependency: {dependency}")
        for asset in [chunk["file"], *chunk.get("css", []), *chunk.get("assets", [])]:
            relative = PurePosixPath(asset)
            if relative.is_absolute() or ".." in relative.parts or not (APP / "dist" / asset).is_file():
                raise RuntimeError(f"Missing or unsafe production asset: {asset}")
    forbidden = [b"celebrations.local", b"/Users/", b"/@vite/client", b"/@react-refresh", b"http://127.0.0.1:5173"]
    for path in (APP / "dist").rglob("*"):
        if path.is_file() and path.suffix in {".js", ".css", ".json"}:
            content = path.read_bytes()
            if any(marker in content for marker in forbidden):
                raise RuntimeError(f"Local/development dependency in production asset: {path.name}")


def licenses():
    lock = json.loads((APP / "package-lock.json").read_text())
    inventory = []
    for directory, info in sorted(lock["packages"].items()):
        if not directory or info.get("dev") or info.get("devOptional"):
            continue
        package = APP / directory
        metadata = json.loads((package / "package.json").read_text())
        name = metadata["name"]
        target = "wp-content/plugins/microsite-core/licenses/npm/" + name.replace("/", "__")
        inventory.append({"name": name, "version": metadata["version"], "license": metadata.get("license", "See upstream notice")})
        notices = [path for path in package.iterdir()
                   if path.is_file() and re.match(r"^(licen[cs]e|copying|notice)(\.|$)", path.name, re.I)]
        for notice in notices:
            add_file(notice, f"{target}/{notice.name}")
        if name == "gsap":
            # GSAP ships its terms link and copyright in README/source headers.
            add_file(package / "README.md", f"{target}/README.md")
            source = (package / "gsap-core.js").read_text()
            header = re.search(r"/\*[\s\S]*?\*/", source)
            if header:
                FILES[f"{target}/NOTICE.txt"] = (header[0] + "\n").encode()
    FILES["wp-content/plugins/microsite-core/licenses/npm-dependencies.json"] = (json.dumps(inventory, indent=2, sort_keys=True) + "\n").encode()
    fonts = APP / "src" / "renderers" / "birthday-celebration" / "fonts"
    for name in ["cormorantgaramond-OFL.txt", "manrope-OFL.txt"]:
        add_file(fonts / name, f"wp-content/plugins/microsite-core/licenses/fonts/{name}")
    add_file(ROOT / "docs" / "THIRD-PARTY-ASSETS.md", "wp-content/plugins/microsite-core/licenses/THIRD-PARTY-ASSETS.md")
    add_file(APP / "src/assets/birthday-celebration/README.md", "wp-content/plugins/microsite-core/licenses/ASSET-PROVENANCE.md")


def main():
    validate_manifest()
    prefix = "wp-content/plugins/microsite-core"
    add_file(PLUGIN / "microsite-core.php", f"{prefix}/microsite-core.php")
    add_tree(PLUGIN / "includes", f"{prefix}/includes", {".php"})
    add_tree(PLUGIN / "templates", f"{prefix}/templates", {".php", ".css"})
    add_tree(PLUGIN / "contracts", f"{prefix}/contracts", {".json"})
    add_tree(PLUGIN / "assets", f"{prefix}/assets", {".png", ".webp", ".svg"})
    add_tree(APP / "dist", f"{prefix}/app/dist")
    add_tree(THEME, "wp-content/themes/microsite-shell", {".php", ".css", ".txt"})
    licenses()
    add_file(ROOT / "docs" / "STAGING.md", "docs/STAGING.md")
    add_file(ROOT / "docs" / "STAGING-AUDIT.md", "docs/STAGING-AUDIT.md")
    add_file(APP / "scripts" / "staging-preflight.php", "tools/staging-preflight.php")

    version = json.loads((APP / "package.json").read_text())["version"]
    commit = git("rev-parse", "HEAD") or "unavailable"
    epoch = int(os.environ.get("SOURCE_DATE_EPOCH") or git("show", "-s", "--format=%ct", "HEAD") or "315532800")
    source_hash = sha256()
    for path, content in sorted(FILES.items()):
        source_hash.update(path.encode() + b"\0" + content)
    metadata = {
        "version": version, "commit": commit, "dirty": bool(git("status", "--porcelain")) if commit != "unavailable" else None,
        "contentSha256": source_hash.hexdigest(),
        "sourceDateEpoch": epoch,
        "wordpress": ">=6.6 (audited with 7.1.4)", "php": ">=8.2 (audited with 8.4.27)",
        "runtimeNodeRequired": False, "runtimeComposerRequired": False,
        "rsvpSchemaVersion": "1", "permissionsVersion": "2",
    }
    FILES["BUILD.json"] = (json.dumps(metadata, indent=2, sort_keys=True) + "\n").encode()
    FILES["SHA256SUMS"] = "".join(f"{sha256(content).hexdigest()}  {path}\n" for path, content in sorted(FILES.items())).encode()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    archive = OUTPUT / f"microsite-staging-{version}-{commit[:12]}.zip"
    stamp = datetime.fromtimestamp(max(315532800, epoch), timezone.utc).timetuple()[:6]
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as package:
        for name, content in sorted(FILES.items()):
            info = zipfile.ZipInfo(name, stamp)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            package.writestr(info, content, compresslevel=9)
    with zipfile.ZipFile(archive) as package:
        if package.testzip() is not None:
            raise RuntimeError("Archive checksum validation failed")
        for name in package.namelist():
            parts = PurePosixPath(name).parts
            if any(part in {"node_modules", "vendor", "tests", "test-results", "uploads", "wp-admin", "wp-includes", "src"} for part in parts):
                raise RuntimeError(f"Forbidden archive entry: {name}")
            if any(part.startswith(".env") for part in parts) or name.endswith(("wp-config.php", ".sql", ".webm", ".map")):
                raise RuntimeError(f"Sensitive/development archive entry: {name}")
    digest = sha256(archive.read_bytes()).hexdigest()
    archive.with_suffix(".zip.sha256").write_text(f"{digest}  {archive.name}\n")
    print(f"Package: {archive.relative_to(ROOT)}")
    print(f"Files: {len(FILES)}; SHA-256: {digest}")


if __name__ == "__main__":
    main()
