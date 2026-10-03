import { defineAstroPaperConfig } from "./src/types/config";

export default defineAstroPaperConfig({
  site: {
    url: "https://bacebu4.com/",
    title: "bacebu4",
    description: "Articles on TypeScript, Software Design",
    author: "Vasilii Krasikov",
    profile: "https://github.com/bacebu4",
    ogImage: "og-default.png",
    lang: "en",
    timezone: "UTC",
    dir: "ltr",
  },
  posts: {
    perPage: 4,
    perIndex: 4,
  },
  features: {
    lightAndDarkMode: true,
    dynamicOgImage: true,
    showArchives: false,
    showBackButton: true,
    editPost: { enabled: false },
    search: "pagefind",
  },
  socials: [
    { name: "github", url: "https://github.com/bacebu4" },
    { name: "linkedin", url: "https://www.linkedin.com/in/bacebu4/" },
    { name: "x", url: "https://x.com/bacebu4" },
  ],
  shareLinks: [
    { name: "x", url: "https://x.com/intent/post?url=" },
    { name: "telegram", url: "https://t.me/share/url?url=" },
    { name: "mail", url: "mailto:?subject=See%20this%20post&body=" },
  ],
});
