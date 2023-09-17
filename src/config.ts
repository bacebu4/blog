import type { Site, SocialObjects } from "./types";

export const SITE: Site = {
  website: "https://bacebu4.com/",
  author: "Vasilii Krasikov",
  desc: "Articles on TypeScript, Software Architecture and Design",
  title: "bacebu4",
  ogImage: "og.png",
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
