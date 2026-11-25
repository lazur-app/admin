"""Generate one Lazur video cover on Gemini (Vertex AI), Vince's video-thumbnails method in Lazur's look.

Usage:
  python make_thumbnail.py --name <slug> --headline "'AI THAT LIVES' then 'BY YOUR CURSOR', with 'BY YOUR CURSOR' on the yellow highlighter swipe" \
      --subject "<what the big subject is>" --pointer "The coral arrow points at the cursor tip." \
      --ref <frame from the video.png> [--ref ...] [--n 2] [--out thumbs/]

References: the Lazur style image (references/style-founders.jpg) is always sent first; add 1-2 frames
from the video (frames without subtitles where possible) so the subject looks like the real product.
Needs GEMINI_VERTEX_API_KEY in the environment or in a .env / .env.local in this folder or any parent.
"""
import argparse, base64, json, os, re, urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
SKILL = HERE.parent
PROJECT = os.environ.get("GEMINI_VERTEX_PROJECT", "836438811130")
MODEL = os.environ.get("GEMINI_IMAGE_MODEL", "gemini-3.1-flash-image")


def env_key(name):
    if os.environ.get(name):
        return os.environ[name]
    for d in [Path.cwd(), *Path.cwd().parents, SKILL, *SKILL.parents]:
        for f in (".env.local", ".env"):
            p = d / f
            if p.is_file():
                m = re.search(rf"^{name}=\"?([^\"\r\n]+)", p.read_text(encoding="utf-8", errors="ignore"), re.M)
                if m:
                    return m.group(1).strip()
    raise SystemExit(f"{name} is not set (env or .env/.env.local).")


a = argparse.ArgumentParser()
a.add_argument("--name", required=True)
a.add_argument("--headline", required=True)
a.add_argument("--subject", required=True)
a.add_argument("--pointer", default="")
a.add_argument("--ref", action="append", default=[])
a.add_argument("--n", type=int, default=2)
a.add_argument("--out", default="thumbs")
x = a.parse_args()

base = (SKILL / "prompts" / "base.txt").read_text(encoding="utf-8").strip()
prompt = f"{base} SUBJECT: {x.subject} HEADLINE: {x.headline} {x.pointer}".strip()
refs = [SKILL / "references" / "style-founders.jpg", *map(Path, x.ref)]
parts = [{"text": prompt}]
for r in refs:
    mime = "image/png" if r.suffix.lower() == ".png" else "image/jpeg"
    parts.append({"inlineData": {"mimeType": mime, "data": base64.b64encode(r.read_bytes()).decode()}})

url = (f"https://aiplatform.googleapis.com/v1/projects/{PROJECT}/locations/global/publishers/google/models/"
       f"{MODEL}:generateContent?key={env_key('GEMINI_VERTEX_API_KEY')}")
body = {"contents": [{"role": "user", "parts": parts}],
        "generationConfig": {"responseModalities": ["TEXT", "IMAGE"], "imageConfig": {"aspectRatio": "9:16"}}}
out = Path(x.out); out.mkdir(parents=True, exist_ok=True)
for i in range(x.n):
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
    res = json.load(urllib.request.urlopen(req, timeout=300))
    imgs = [p for p in res["candidates"][0]["content"]["parts"] if "inlineData" in p]
    if not imgs:
        print("no image returned:", json.dumps(res)[:800]); continue
    f = out / f"{x.name}-{i + 1}.png"
    f.write_bytes(base64.b64decode(imgs[0]["inlineData"]["data"]))
    print(f)
