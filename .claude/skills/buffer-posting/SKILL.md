---
name: buffer-posting
description: Post a video (or image/text) to Lazur's social channels through Buffer. Use whenever the user asks to post, publish, share or put something on social media, TikTok, Facebook, X, LinkedIn or Instagram. Every post goes out on BOTH Buffer keys (FACEBOOK_AND_TIKTOK_BUFFER_KEY and X_LINKEDIN_INSTAGRAM_BUFFER_KEY) with the exact same caption, tags and title unless the user asks for something different per platform.
---

# Buffer posting

Lazur posts to social media through Buffer. There are **two Buffer keys**, and a post always goes to **both**.

## The two keys

Both live in the `.env` / `.env.local` of every Lazur folder. Read them from there by these exact names. Never print them, never commit them, never ask the user to paste them into chat.

| Env name | Posts to |
|---|---|
| `FACEBOOK_AND_TIKTOK_BUFFER_KEY` | Facebook, TikTok |
| `X_LINKEDIN_INSTAGRAM_BUFFER_KEY` | X, LinkedIn, Instagram |

If either key is missing from the env, stop and tell the user which name is missing. Do not post to only one side without the user saying so.

## The rule

When the user asks to post a video:

1. **Thumbnail first.** Before anything else ask: "Do you want a thumbnail on this video?" If the video doesn't already end on its cover, run the **video-thumbnails** skill (it asks what the thumbnail should say, generates it, and puts it on the video's last second). Use the `cover_offset_ms` it prints as `thumbnailOffset`. Only skip if the user says no thumbnail.
2. It goes out on **both keys**, to **every channel** each key can see. One post per channel (5 channels = 5 posts, the same video once on each platform).
3. **Same caption, same hashtags, same title everywhere**, unless the user asks for different captions, tags or titles for a platform.
4. Before sending, show the user the exact file, caption, hashtags, title, time and the list of channels it will go to. Post or schedule only after a clear yes.
5. After posting, give the user a table: platform, status, link.

Caption pattern Veer used on Nov 25, 2026 (when he asked for per-platform captions): Instagram and TikTok say "please find my link in the bio" (caption links aren't clickable there); Facebook, X and LinkedIn put `lazur.app` on its own line instead (clickable there), no "link in bio". Hashtags on every platform. All lowercase, no em dashes.

A 16:9 video goes to every platform as 9:16: the full video in the middle of a plain white frame (no blur, no crop). `video-thumbnails/scripts/add_cover.py` does this.

## How to post (Buffer GraphQL API)

Endpoint: `POST https://api.buffer.com` with headers `Authorization: Bearer <key>` and `Content-Type: application/json`. Do every step below once per key.

**1. Find the channels for this key**

```graphql
{ account { organizations { id } } }
```
then
```graphql
query($o: OrganizationId!) { channels(input: { organizationId: $o }) { id name service } }
```

(Asking for `organizations { channels }` in one go is refused with FORBIDDEN; use the two queries.) Use every channel returned. Do not hard-code channel ids, they come from the key. On Nov 25, 2026 the keys saw: FACEBOOK_AND_TIKTOK = TikTok heylazur + Facebook Lazur; X_LINKEDIN_INSTAGRAM = X heylazur + LinkedIn lazur-app + Instagram heylazur.

**2. The video must be at a public URL.** Buffer downloads it from the URL, it does not take an upload. If the file is local, upload it somewhere public first (Lazur's R2 bucket via `scripts/content/lib/r2.mjs` in the website repo if R2 keys are set; on Nov 25, 2026 there were none locally and the video went to the servicerobotco public Vercel Blob store with `MEDIA_REPO_BLOB_TOKEN`) and check the URL opens without login (HTTP 200, `video/mp4`).

**3. Create one post per channel**

```graphql
mutation($input: CreatePostInput!) {
  createPost(input: $input) {
    ... on PostActionSuccess { post { id status } }
    ... on MutationError { message }
  }
}
```

`input`:

```json
{
  "channelId": "<channel id>",
  "text": "<caption + hashtags>",
  "mode": "shareNow",
  "schedulingType": "automatic",
  "assets": [{ "video": { "url": "<public mp4 url>" } }],
  "metadata": { }
}
```

Use `"mode": "customScheduled"` plus `"dueAt": "<ISO time in UTC>"` only if the user asks to schedule (Veer is in IST: 5pm IST = `11:30:00.000Z`).

Cover frame: on Instagram and TikTok add `"metadata": { "thumbnailOffset": <cover_offset_ms> }` inside the video asset: `"assets": [{ "video": { "url": "...", "metadata": { "thumbnailOffset": 100800 } } }]`.

Per-platform `metadata` (only the one matching the channel's `service`):

| service | metadata |
|---|---|
| tiktok | `{ "tiktok": { "title": "<title>" } }` |
| instagram | `{ "instagram": { "type": "reel", "shouldShareToFeed": true } }` |
| facebook | `{ "facebook": { "type": "reel" } }` |
| linkedin, twitter (X) | none |

**4. Check it went out.** Poll `post(input: { id: "<post id>" }) { status externalLink }` until status is `sent` (Instagram and TikTok sit on `sending` for about a minute). The `externalLink` is the live link for the table.

## Do not

- **Never set `isAiGenerated`** on any platform. The label cannot be removed after posting.
- Never send `thumbnailUrl`, the API rejects it. To pick a cover frame use `assets[].video.metadata.thumbnailOffset` (milliseconds into the video). Only Instagram and TikTok honour it.
- Never post without showing the user the exact caption and getting a yes.
- Never post to one key only unless the user asked for that.

## Video shape

If the user gives both a 9:16 and a 1:1 version: the 1:1 goes to LinkedIn and X, the 9:16 goes to TikTok, Instagram and Facebook. If there is only one file, it goes everywhere.
