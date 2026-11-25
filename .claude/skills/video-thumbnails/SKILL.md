---
name: video-thumbnails
description: Make the cover thumbnail for a Lazur video (Reels, TikTok, Shorts) and put it on the video's last second so Buffer uses it as the cover. Always starts by asking the user what the thumbnail should say. Generated on Gemini (GEMINI_VERTEX_API_KEY) in Lazur's look with Vince's click rules. Use whenever a video needs a cover or thumbnail, and always before posting a video with the buffer-posting skill.
---

# Video thumbnails (Lazur)

Same method as Vince's approved SRCo `video-thumbnails` skill (Nov 13, 2026), swapped to Lazur's look. First Lazur cover: `examples/approved-ai-by-your-cursor.jpg` (Veer approved, Nov 25, 2026).

## Step 1: ask first

Before generating anything, ask the user:

> **What do you want the thumbnail to say for this video?**

Use their words for the headline (2 to 4 words is best). If they say "you pick", suggest 2 options from what the video shows and let them choose. Never generate without this answer.

## The look (fixed)

- Art: the hand-drawn style of `references/style-founders.jpg` (clean dark outlines, flat soft colours, warm off-white paper #FFFDFB), Lazur purple #6B4BFC as the main colour.
- One huge subject close to the viewer, about a third of the frame.
- Headline: heavy condensed sans like Anton, near-black #1C1917, one accent word or phrase on a yellow #FFD400 highlighter swipe.
- One coral-red #EF5350 hand-drawn arrow or circle on the key detail.
- No logos, brand names, watermarks or readable UI text (a Wikipedia logo got a cover rejected).
- Words say what the video shows. Never a promise the video doesn't keep.

## Make one

1. Grab 1 or 2 frames from the video for reference (no subtitles if possible):
   `ffmpeg -ss <sec> -i video.mp4 -frames:v 1 frame.png`
2. Generate 2 options:
   ```
   python scripts/make_thumbnail.py --name <slug> \
     --headline "'AI THAT LIVES' then 'BY YOUR CURSOR', with 'BY YOUR CURSOR' on the yellow highlighter swipe." \
     --subject "A huge purple mouse cursor in the foreground drawing a coral-red sketch on a laptop screen." \
     --pointer "The coral arrow points at the cursor tip." --ref frame.png --n 2 --out thumbs/
   ```
   Key: `GEMINI_VERTEX_API_KEY` (env, or `.env` / `.env.local` in any parent folder). Model `gemini-3.1-flash-image` on the Vertex **global** endpoint (other regions 404 for image models).
3. Check every option at full size: spelling of the headline, no logos or readable UI text, headline not too close to the top. Show the user the options and let them pick. If one fails, regenerate with a targeted change and say what you changed.
4. Put the picked cover on the video's last second:
   ```
   python scripts/add_cover.py --video video.mp4 --cover thumbs/<slug>-1.png --out <slug>-9x16.mp4
   ```
   It prints `cover_offset_ms`. The cover is shown **whole** (fitted and padded, never cropped). A video that isn't 9:16 is placed full width on a plain **white** 1080x1920 frame (no blur, no crop).
5. Hand `<slug>-9x16.mp4` and `cover_offset_ms` to the buffer-posting skill. Buffer's `thumbnailOffset` = `cover_offset_ms` on Instagram and TikTok. Facebook, X and LinkedIn pick their own frame.

## Burned-in captions

If the source video has captions burned into the picture and they cover the content, crop the video just above them, then re-caption in the white space under the video: transcribe locally with faster-whisper (`medium.en` is cached on Veer's Windows machine; run with `uv run --with faster-whisper`, pass audio as a numpy array because its built-in decoder breaks), fix names (Lazur, Vaidik, Veer, Ayush), and burn an ASS subtitle file placed below the video. Veer wants captions kept, just not over the video.
