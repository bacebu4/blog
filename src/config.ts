import type { Site, SocialObjects } from "./types";

export const SITE: Site = {
  website: "https://astro-paper.pages.dev/",
  author: "Vasilii Krasikov",
  desc: "A minimal, responsive and SEO-friendly Astro blog theme.",
  title: "bacebu4",
  ogImage: "astropaper-og.jpg",
  lightAndDarkMode: true,
  postPerPage: 3,
};

export const LOCALE = ["en-EN"]; // set to [] to use the environment default

export const SOCIALS: SocialObjects = [
  {
    name: "Github",
    href: "https://github.com/bacebu4",
    linkTitle: ` ${SITE.title} on Github`,
    active: true,
  },
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/in/bacebu4/",
    linkTitle: `${SITE.title} on LinkedIn`,
    active: true,
  },
  {
    name: "Twitter",
    href: "https://twitter.com/bacebu4",
    linkTitle: `${SITE.title} on Twitter`,
    active: true,
  },
];
