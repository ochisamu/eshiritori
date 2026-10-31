# Licenses and sources

- Game code, UI text and sound synthesis were newly written for this project. No source or media from the referenced game was copied.
- Card raster artwork: generated with the built-in `image_gen.imagegen` tool for this project. Original outputs, prompts, transformations and per-image hashes are under `content`. Provider model/seed/cost fields are recorded as unknown when not returned.
- React / React DOM: MIT, https://github.com/facebook/react
- Vite: MIT, https://github.com/vitejs/vite
- TypeScript: Apache-2.0, https://github.com/microsoft/TypeScript
- Lucide icons: ISC, https://github.com/lucide-icons/lucide
- Vitest: MIT, https://github.com/vitest-dev/vitest
- Playwright: Apache-2.0, https://github.com/microsoft/playwright
- Pillow, used only for deterministic crop/pad/format conversion: HPND, https://github.com/python-pillow/Pillow

System fonts are used; no proprietary font files are redistributed. Development tools and test browsers are not included in the playable distribution. Exact dependency versions and integrity hashes are in `package-lock.json`.

Official Nintendo documentation was consulted only to understand the source game's rules. It is not included in the distribution and does not grant permission to reuse its media. See `spec/decisions.md` for references and the intentionally different rules of this project.
