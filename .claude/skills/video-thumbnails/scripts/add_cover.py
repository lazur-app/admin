"""Put a cover on a video's LAST SECOND so Buffer can use that frame as the thumbnail.

Buffer takes no cover image (its API rejects thumbnailUrl). It can only pick a frame by time
(assets[].video.metadata.thumbnailOffset, honoured by Instagram and TikTok). So the cover becomes
one extra second at the end, and the middle of that second is the offset.

- The cover is shown WHOLE: scaled to fit 1080x1920 and padded with its own background colour. Never cropped.
- If the video is not 9:16 (e.g. a 16:9 screen recording) it is placed full width in the middle of a
  plain white 1080x1920 frame. No blur, no crop.

Usage: python add_cover.py --video in.mp4 --cover cover.png --out out-9x16.mp4
Prints cover_offset_ms for Buffer.
"""
import argparse, json, subprocess
from pathlib import Path
from PIL import Image

a = argparse.ArgumentParser()
a.add_argument("--video", required=True); a.add_argument("--cover", required=True); a.add_argument("--out", required=True)
x = a.parse_args()

info = json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", x.video],
                                 capture_output=True, text=True, check=True).stdout)
v = next(s for s in info["streams"] if s["codec_type"] == "video")
has_audio = any(s["codec_type"] == "audio" for s in info["streams"])
dur = float(info["format"]["duration"])

# cover: fit whole, pad with the colour of its top rows
im = Image.open(x.cover).convert("RGB")
bg = im.crop((0, 0, im.width, 8)).resize((1, 1)).getpixel((0, 0))
s = min(1080 / im.width, 1920 / im.height); w, h = round(im.width * s), round(im.height * s)
fitted = Image.new("RGB", (1080, 1920), bg); fitted.paste(im.resize((w, h), Image.LANCZOS), ((1080 - w) // 2, (1920 - h) // 2))
cover = Path(x.out).with_suffix(".cover.png"); fitted.save(cover)

main = "fps=30,scale=1080:1920,setsar=1" if (v["width"], v["height"]) == (1080, 1920) else \
       "fps=30,scale=1080:-2,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:white,setsar=1"
cmd = ["ffmpeg", "-v", "error", "-y", "-i", x.video, "-loop", "1", "-framerate", "30", "-t", "1", "-i", str(cover)]
if has_audio:
    cmd += ["-f", "lavfi", "-t", "1", "-i", "anullsrc=r=48000:cl=stereo"]
    graph = (f"[0:v]{main},format=yuv420p[m];[1:v]scale=1080:1920,fps=30,setsar=1,format=yuv420p[t];"
             "[0:a]aresample=48000,aformat=channel_layouts=stereo[ma];[m][ma][t][2:a]concat=n=2:v=1:a=1[v][au]")
    maps = ["-map", "[v]", "-map", "[au]", "-c:a", "aac", "-b:a", "160k"]
else:
    graph = f"[0:v]{main},format=yuv420p[m];[1:v]scale=1080:1920,fps=30,setsar=1,format=yuv420p[t];[m][t]concat=n=2:v=1:a=0[v]"
    maps = ["-map", "[v]"]
subprocess.run(cmd + ["-filter_complex", graph, *maps, "-c:v", "libx264", "-preset", "medium", "-crf", "20",
                      "-movflags", "+faststart", x.out], check=True)
print(f"{x.out}: {dur:.2f}s + 1s cover -> cover_offset_ms {int(round((dur + 0.5) * 1000))}")
