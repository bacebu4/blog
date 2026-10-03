import type { UIStrings } from "../types";

export default {
  nav: {
    home: "Главная",
    posts: "Статьи",
    tags: "Теги",
    about: "Обо мне",
    archives: "Архив",
    search: "Поиск",
  },
  post: {
    publishedAt: "Опубликовано",
    updatedAt: "Обновлено",
    sharePostIntro: "Поделиться:",
    sharePostOn: "Поделиться в {{platform}}",
    sharePostViaEmail: "Отправить по почте",
    tagLabel: "Теги",
    backToTop: "Наверх",
    goBack: "Назад",
    editPage: "Редактировать",
    previousPost: "Предыдущая статья",
    nextPost: "Следующая статья",
    readInLanguage: "Читать на русском",
  },
  pagination: {
    prev: "Назад",
    next: "Вперёд",
    page: "Страница",
  },
  home: {
    socialLinks: "Соцсети",
    featured: "Избранное",
    recentPosts: "Последние статьи",
    allPosts: "Все статьи",
  },
  footer: {
    copyright: "Copyright",
    allRightsReserved: "Все права защищены.",
  },
  pages: {
    tagTitle: "Тег",
    tagDesc: "Все статьи с тегом",

    tagsTitle: "Теги",
    tagsDesc: "Все теги статей.",

    postsTitle: "Статьи",
    postsDesc: "Все мои статьи.",

    archivesTitle: "Архив",
    archivesDesc: "Все статьи в архиве.",

    searchTitle: "Поиск",
    searchDesc: "Поиск по статьям ...",
  },
  a11y: {
    skipToContent: "Перейти к содержимому",
    openMenu: "Открыть меню",
    closeMenu: "Закрыть меню",
    toggleTheme: "Сменить тему",
    searchPlaceholder: "Искать статьи...",
    noResults: "Ничего не найдено",
    goToPreviousPage: "Предыдущая страница",
    goToNextPage: "Следующая страница",
  },
  notFound: {
    title: "404 Не найдено",
    message: "Страница не найдена",
    goHome: "На главную",
  },
} satisfies UIStrings;
