import type { CollectionEntry } from "astro:content";
import { postFilter } from "./postFilter";
import { getPostLocale } from "./getPostPaths";
import config from "@/config";

/**
 * Returns posts that are eligible to be shown to users, sorted by “last updated”
 * descending (uses `modDatetime` when present, otherwise `pubDatetime`).
 *
 * Note: filtering respects drafts and scheduled posts via `postFilter()`,
 * and keeps only posts in `locale`.
 */
export function getSortedPosts(
  posts: CollectionEntry<"posts">[],
  locale: string = config.site.lang
) {
  return posts
    .filter(postFilter)
    .filter(post => getPostLocale(post.filePath) === locale)
    .sort(
      (a, b) =>
        Math.floor(
          new Date(b.data.modDatetime ?? b.data.pubDatetime).getTime() / 1000
        ) -
        Math.floor(
          new Date(a.data.modDatetime ?? a.data.pubDatetime).getTime() / 1000
        )
    );
}
