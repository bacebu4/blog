import { getCollection } from "astro:content";
import { getPostLocale, getPostSlug, getPostUrl } from "@/utils/getPostPaths";
import { getSortedPosts } from "@/utils/getSortedPosts";

/** Static paths for the post pages of one locale, see `PostDetails.astro`. */
export async function getPostStaticPaths(locale: string) {
  const posts = await getCollection("posts");
  const sortedPosts = getSortedPosts(posts, locale);
  const toAdjacent = (index: number) => {
    const post = sortedPosts[index];
    return post
      ? { id: post.id, title: post.data.title, filePath: post.filePath }
      : null;
  };

  return sortedPosts.map((post, index) => {
    const slug = getPostSlug(post.id, post.filePath);
    // The same slug in another locale is a translation of this post
    const translated = posts.find(
      other =>
        !other.data.draft &&
        getPostLocale(other.filePath) !== locale &&
        getPostSlug(other.id, other.filePath) === slug
    );
    const translationLocale = translated && getPostLocale(translated.filePath);

    return {
      params: { slug },
      props: {
        post,
        // sortedPosts is newest-first, so "older" (prev) is a higher index
        // and "newer" (next) is a lower index.
        prevPost: toAdjacent(index + 1),
        nextPost: toAdjacent(index - 1),
        translation:
          translated && translationLocale
            ? {
                locale: translationLocale,
                url: getPostUrl(
                  translated.id,
                  translated.filePath,
                  translationLocale
                ),
              }
            : null,
      },
    };
  });
}
