# drift-guard — PITFALLS.md

## 🚨 Critical Traps
- **Reddit AutoModerator**: New accounts (< 1 month) are automatically hidden/removed on r/webdev and similar subreddits. Do not launch without an aged account or moderator pre-approval.
- **Windows Bash / Claude Code Slash Commands**: Using `/plan` or `/fast` in Windows `npx @anthropic-ai/claude-code` often fails due to slash-path interpretation errors. Use numbered plain text steps instead.
- **Markdown Image Rendering on Reddit**: `![title](url)` in the post body often shows as text links rather than images. Use the Rich Text Editor's "Image Upload" feature for the main Showoff Saturday post.

## 🛠️ Minor Gotchas
- **GitHub README OG Images**: Relative paths `docs/assets/og.png` do not render in social previews. Use absolute `raw.githubusercontent.com` URLs.
- **Stitch HTML Sync**: Large HTML files can hit token limits if passed as a single block. Use CLI chunks or `drift-guard sync` to manage metadata only.
