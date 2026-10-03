# AGENTS.md

Personal blog built with [AstroPaper](https://github.com/satnaing/astro-paper) (Astro + Tailwind).

## Commands

- `npm run dev`: start the dev server.
- `npm run build`: type check, build to `dist/`, and build the Pagefind search index.
- `npm run lint`, `npm run format`: ESLint and Prettier.

## Layout

- Posts: `src/content/posts/<slug>.md`. The frontmatter schema is in `src/content.config.ts`.
- Images for posts: `cdn/`.
- Markdown plugins (TOC, callouts, math with KaTeX): `astro.config.ts`.
- UI strings per locale: `src/i18n/lang/<locale>.ts`.

## Translations

English is the default locale. Russian (`ru`) is the second locale.

1. Put the translated post in `src/content/posts/ru/` with the same file name as the English post.
2. The post is served at `/ru/posts/<slug>/` with the Russian UI. Posts with the same slug link to each other ("Read in English" / "Читать на русском").
3. Keep the tag names in English, so the tags match the English posts.
4. For images with text, make a translated copy named `cdn/<file>-ru.<ext>` and link it from the Russian post.

English lists (home, posts, tags, RSS) show only English posts. Other `/ru/...` URLs redirect to the English page (`fallback` in `astro.config.ts`).

To add a locale: add `src/i18n/lang/<locale>.ts`, add the locale to `i18n.locales` and `fallback` in `astro.config.ts`, add `src/pages/<locale>/posts/[...slug]/index.astro` (copy the `ru` one), and add the Day.js locale import in `src/components/Datetime.astro`.

## Images and other heavy files

Do not serve images or other heavy files from our own server. Every heavy file we host adds bandwidth and load to the server, and that is a risk for us. Put them in `cdn/` and link them from GitHub instead.

1. Put the file in `cdn/`. Name it after the post slug, for example `cdn/<slug>.png` or `cdn/<slug>-1.png`.
2. Link it by its GitHub raw URL: `https://github.com/bacebu4/blog/blob/master/cdn/<file>?raw=true`.
3. Use this URL in the post body (`![alt text](<url>)`) and in the `ogImage` frontmatter field.

The link works only after the file is pushed to `master`. Until then, the image does not show locally.

Do not put post images in `public/` or `src/assets/`.

### OG image

Every post sets `ogImage` to a PNG in `cdn/`. If the post has no custom image, use the image that the build generates from the title:

1. Run `npm run build` with no `ogImage` in the post frontmatter.
2. Copy `dist/posts/<slug>/index.png` to `cdn/<slug>.png`. For a Russian post, copy `dist/posts/ru/<slug>/index.png` to `cdn/<slug>-ru.png`.
3. Set `ogImage: https://github.com/bacebu4/blog/blob/master/cdn/<slug>.png?raw=true` in the frontmatter.

### SVG diagrams

GitHub serves `.svg` files from `cdn/` as `image/svg+xml`, so `<img>` renders them. Diagrams with a white background are fine. In the dark theme, `src/styles/typography.css` inverts the lightness of SVG images in posts and keeps their hues.
