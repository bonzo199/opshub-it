"""Render the one cookie HTML component before uploading GitHub Pages."""
from pathlib import Path
import argparse
import re
import shutil

ROOT = Path(__file__).resolve().parents[1]
MARKER = "<!-- OPSHUB_COOKIE_BANNER -->"


def build(output):
    output = Path(output).resolve()
    if output == ROOT or output in ROOT.parents or output.exists():
        raise ValueError("Output must be a new directory, outside existing source files")
    fragment = (ROOT / "_includes/cookie-banner.html").read_text(encoding="utf-8")
    if fragment.count('id="siteCookieBanner"') != 1:
        raise ValueError("Invalid shared cookie component")
    shutil.copytree(ROOT, output, ignore=shutil.ignore_patterns(
        ".git", ".github", "_includes", "scripts", "tests", "_site", ".codex_tmp", "__pycache__"))
    rendered = 0
    redirects = 0
    for path in output.rglob("*.html"):
        text = path.read_text(encoding="utf-8-sig")
        if re.search(r'<meta\s+[^>]*http-equiv=[\"\']refresh', text, re.I):
            redirects += 1
            continue
        if text.count(MARKER) != 1:
            raise ValueError("Missing or duplicate cookie include: " + str(path.relative_to(output)))
        text = text.replace(MARKER, fragment.rstrip())
        if text.count('id="siteCookieBanner"') != 1 or text.count('id="siteCookieSettingsModal"') != 1:
            raise ValueError("Duplicate cookie dialog")
        if text.count('/static/js/opshub-meta-pixel.js?v=20261121-site1') != 1 or 'opshub-test-meta-pixel.js' in text:
            raise ValueError("Missing or duplicate site-wide Meta integration")
        path.write_text(text, encoding="utf-8", newline="\n")
        rendered += 1
    print("STATIC_SITE=READY pages=" + str(rendered) + " redirects=" + str(redirects))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=ROOT / "_site")
    build(parser.parse_args().output)
