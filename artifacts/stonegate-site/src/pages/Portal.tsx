import { motion } from 'framer-motion';
import { Lock, KeyRound } from 'lucide-react';

export default function Portal() {
  const fadeIn = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: "easeOut" as const } }
  };

  return (
    <div className="w-full flex-1 flex flex-col pt-20">
      <section className="flex-1 flex items-center justify-center py-24 bg-background relative overflow-hidden min-h-[70vh]">
        <div className="absolute inset-0 bg-sacred-geometry opacity-5" />
        
        <div className="container mx-auto px-4 relative z-10 flex justify-center">
          <motion.div 
            initial="hidden" 
            animate="visible" 
            variants={fadeIn}
            className="w-full max-w-md bg-card border border-white/10 p-10 md:p-12 shadow-2xl text-center relative"
          >
            {/* Top decorative element */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-background rounded-full border border-white/10 flex items-center justify-center">
              <Lock className="w-6 h-6 text-secondary" />
            </div>

            <div className="mt-6 mb-8">
              <h1 className="font-serif text-3xl font-bold tracking-wide mb-4">
                Stonegate Client Portal
              </h1>
              <div className="w-12 h-px bg-primary mx-auto mb-6" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                Existing clients will have secure access to case updates, documents, reports, and communication through the Stonegate Intelligence Client Portal.
              </p>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <KeyRound className="w-4 h-4 text-muted-foreground" />
                </div>
                <input 
                  type="text" 
                  disabled
                  placeholder="Client ID or Email" 
                  className="w-full bg-background border border-white/10 pl-11 pr-4 py-3 text-sm text-muted-foreground opacity-50 cursor-not-allowed"
                />
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                </div>
                <input 
                  type="password" 
                  disabled
                  placeholder="Password" 
                  className="w-full bg-background border border-white/10 pl-11 pr-4 py-3 text-sm text-muted-foreground opacity-50 cursor-not-allowed"
                />
              </div>
              
              <button 
                disabled 
                className="w-full bg-primary/50 text-primary-foreground/50 px-8 py-4 uppercase tracking-widest text-sm font-semibold cursor-not-allowed mt-4 border border-primary/20"
              >
                Client Login (Coming Soon)
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-white/5">
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
                <Lock className="w-3 h-3" /> End-to-end encrypted connection
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}