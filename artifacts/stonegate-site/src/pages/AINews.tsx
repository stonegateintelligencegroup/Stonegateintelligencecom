import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { articles } from '@/data/articles';

export default function AINews() {
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } }
  };

  return (
    <div className="w-full flex flex-col pt-20">
      {/* Header */}
      <section className="py-20 md:py-32 bg-card relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-sacred-geometry opacity-5" />
        <div className="container mx-auto px-4 md:px-8 relative z-10">
          <motion.div initial="hidden" animate="visible" variants={fadeIn} className="max-w-3xl">
            <h1 className="font-serif text-4xl md:text-6xl font-bold tracking-wide mb-6">
              AI News
            </h1>
            <div className="w-16 h-1 bg-primary mb-8" />
            <p className="text-xl text-muted-foreground leading-relaxed">
              Articles on artificial intelligence and what it means for the people and businesses using it.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Articles */}
      <section className="py-20 md:py-24 bg-background">
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-3xl flex flex-col gap-6">
            {articles.map((article) => (
              <a
                key={article.href}
                href={article.href}
                className="group block border border-white/10 bg-card p-6 md:p-8 transition-colors hover:border-primary/60"
              >
                <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-3">
                  {article.date}
                </p>
                <h2 className="font-serif text-2xl md:text-3xl font-semibold text-foreground mb-4 group-hover:text-primary transition-colors">
                  {article.title}
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-6">{article.summary}</p>
                <span className="inline-flex items-center gap-2 text-sm font-medium tracking-wide uppercase text-primary">
                  Read article <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
