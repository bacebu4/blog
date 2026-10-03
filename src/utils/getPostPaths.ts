import { getRelativeLocaleUrl } from "astro:i18n";
import { BLOG_PATH } from "@/content.config";
import { slugifyStr } from "./slugify";
import config from "@/config";
import { locales } from "@/i18n";

/**
 * Returns the post locale: the first folder under `BLOG_PATH` when it is a
 * non-default locale (e.g. `posts/ru/my-post.md`), otherwise the site locale.
 */
export function getPostLocale(filePath: string | undefined): string {
  const first = filePath?.replace(BLOG_PATH, "").split("/").find(Boolean);
  return first && first !== config.site.lang && locales.includes(first)
    ? first
    : config.site.lang;
}

function getPostPathSegments(filePath: string | undefined): string[] {
  const locale = getPostLocale(filePath);
  return (
    filePath
      ?.replace(BLOG_PATH, "")
      .split("/")
      .filter(path => path !== "")
      .filter((path, i) => !(i === 0 && path === locale))
      .filter(path => !path.startsWith("_"))
      .slice(0, -1)
      .map(segment => slugifyStr(segment)) ?? []
  );
}

function getIdSlug(id: string): string {
  const postId = id.split("/");
  return postId.length > 0 ? String(postId[postId.length - 1]) : id;
}

function getPostSlugPath(id: string, filePath: string | undefined): string {
  const pathSegments = getPostPathSegments(filePath);
  const slug = getIdSlug(id);
  return pathSegments.length > 0
    ? [...pathSegments, slug].join("/")
    : String(slug);
}

/**
 * Returns the slug-only path for use as a route param in `getStaticPaths`.
 * No base prefix, no locale — Astro handles those at a higher level.
 * e.g. `/examples/my-post`
 */
export function getPostSlug(id: string, filePath: string | undefined): string {
  return `/${getPostSlugPath(id, filePath)}`;
}

/**
 * Returns the route param of the generated OG image. Posts of a non-default
 * locale get the locale prefix, so their path differs from the translation.
 * e.g. `/my-post` or `/ru/my-post`
 */
export function getPostOgSlug(
  id: string,
  filePath: string | undefined
): string {
  const locale = getPostLocale(filePath);
  const slug = getPostSlug(id, filePath);
  return locale === config.site.lang ? slug : `/${locale}${slug}`;
}

/**
 * Returns a fully navigable URL for use in `<a href>` and RSS links.
 * Applies both locale routing and the configured Astro base via
 * `getRelativeLocaleUrl`.
 * e.g. `/posts/my-post` or `/en/posts/my-post`
 */
export function getPostUrl(
  id: string,
  filePath: string | undefined,
  locale: string | undefined = config.site.lang
): string {
  return getRelativeLocaleUrl(locale, `posts/${getPostSlugPath(id, filePath)}`);
}
