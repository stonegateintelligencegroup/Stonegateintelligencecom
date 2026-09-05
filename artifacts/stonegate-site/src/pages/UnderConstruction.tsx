import { Link } from 'wouter';
import { ArrowRight, Shield, Sparkles } from 'lucide-react';

export default function UnderConstruction() {
  return (
    <div className="relative flex min-h-[calc(100vh-13rem)] items-center justify-center overflow-hidden bg-background px-6 py-24">
      <div className="absolute inset-0 bg-sacred-geometry opacity-10" />
      <div className="absolute left-1/2 top-1/2 h-[32rem] w-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <div className="mb-8 inline-flex items-center gap-2 border border-primary/30 bg-primary/5 px-4 py-2 text-xs uppercase tracking-[0.28em] text-primary">
          <Sparkles className="h-4 w-4" />
          A stronger foundation is taking shape
        </div>

        <h1 className="font-serif text-5xl font-bold tracking-wide text-foreground md:text-7xl">
          Under Construction
        </h1>
        <div className="mx-auto my-8 h-1 w-16 bg-primary" />
        <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
          Stonegate Intelligence Group is preparing an improved digital
          experience. Our commitment to confidential, evidence-based service
          remains unchanged.
        </p>

        <div className="mx-auto mt-12 grid max-w-xl gap-4 text-left sm:grid-cols-2">
          <div className="border border-white/10 bg-card/70 p-5">
            <Shield className="mb-4 h-6 w-6 text-primary" />
            <h2 className="mb-2 font-serif text-xl font-semibold text-foreground">
              Built with care
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              A secure, dependable public site is on its way.
            </p>
          </div>
          <div className="border border-white/10 bg-card/70 p-5">
            <Sparkles className="mb-4 h-6 w-6 text-secondary" />
            <h2 className="mb-2 font-serif text-xl font-semibold text-foreground">
              We are still here
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Reach out directly while the new experience is completed.
            </p>
          </div>
        </div>

        <Link
          href="/contact"
          className="mt-10 inline-flex items-center gap-3 bg-primary px-7 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Request a Consultation
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
