export type Article = {
  href: string;
  title: string;
  summary: string;
  date: string;
};

// Newest first. Each article is a standalone page under public/articles/.
export const articles: Article[] = [
  {
    href: '/articles/ai-2027/',
    title: 'AI Could Outsmart Its Own Creators by 2027. Are We Ready?',
    summary:
      'Researchers are predicting something extraordinary. And the most unsettling part isn’t the prediction itself. It’s how soon they think it could happen.',
    date: 'November 14, 2026',
  },
];
