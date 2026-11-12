# SHIORI Project Structure

Cấu trúc thư mục Monorepo thực tế của **SHIORI AD CLEANER**:

```
shiori-ad-cleaner/
├── apps/
│   ├── extension/             # WebExtension (MV3 background & content scripts)
│   └── dashboard/             # Local Dashboard UI
├── engines/
│   ├── intelligence/          # Network, DOM, Behavior, Media & Decision Engine
│   ├── web-ad/                # Banner, Popup, Native, Iframe, Cosmetic
│   ├── youtube/               # YouTube UI & Video Playback Observer
│   ├── redirect/              # Redirect Guard & Multi-hop protection
│   ├── privacy/               # Tracker & Fingerprint shielding
│   └── rules/                 # Declarative Rule Engine & Trie Matcher
├── shared/                    # Types, Interfaces, Zod Schemas, Utilities (@shiori/shared)
├── rules/                     # Declarative Rule definitions (network, cosmetic, youtube)
├── docs/                      # Standard Documentation Suite
└── tests/                     # Browser E2E & Integration tests
```
