<!-- Generated: 2026-03-20 | Files scanned: 3 | Token estimate: ~300 -->

# Dependencies

## External Services

| Service | Usage | Config |
|---------|-------|--------|
| GitHub | Git clone repos | Public repos only, no auth |
| Kimi (Moonshot AI) | AI summaries, skill descriptions | KIMI_API_KEY, KIMI_BASE_URL |
| DeepSeek | Fallback AI provider | DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL |

## Runtime Dependencies

| Package | Version | Why |
|---------|---------|-----|
| next | ^15.3.0 | App Router, API routes, SSR |
| react / react-dom | ^19.1.0 | UI rendering |
| react-markdown | ^10.1.0 | Markdown rendering (unused currently?) |
| rehype-sanitize | ^6.0.0 | HTML sanitization for markdown |
| shiki | ^3.4.2 | Server-side code syntax highlighting |
| gray-matter | ^4.0.3 | YAML frontmatter parsing (SKILL.md, rules) |
| yaml | ^2.7.1 | YAML config parsing (MCP, settings) |

## Dev Dependencies

| Package | Version | Why |
|---------|---------|-----|
| typescript | ^5.8.0 | Type checking |
| tailwindcss | ^4.1.0 | Utility CSS |
| @tailwindcss/postcss | ^4.1.0 | PostCSS integration |
| postcss | ^8.5.0 | CSS transform pipeline |

## System Dependencies

| Tool | Purpose |
|------|---------|
| Bun | Runtime, package manager, dev server |
| Git | Clone/pull analyzed repos |
| Node.js fs | JSON cache, symlink management |

## AI API Format

Both providers use OpenAI-compatible chat completions API:
```
POST {BASE_URL}/chat/completions
Authorization: Bearer {API_KEY}
{ model, messages: [{ role, content }], temperature, response_format }
```
