import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { Shield, Lock, Search, Scale, FileText, ArrowRight } from 'lucide-react';
import logo from '@assets/IMG_2051_1784854999049.jpeg';

export default function Home() {
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" as const } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  return (
    <div className="w-full flex flex-col">
      {/* Hero Section */}
      <section className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden bg-background">
        <div className="absolute inset-0 bg-sacred-geometry opacity-5" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background z-0" />
        
        <div className="container mx-auto px-4 relative z-10 flex flex-col items-center text-center mt-[-10vh]">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut" as const }}
            className="w-32 h-32 md:w-48 md:h-48 mb-10 rounded-full overflow-hidden border-2 border-white/10 shadow-2xl shadow-primary/20"
          >
            <img src={logo} alt="Stonegate Intelligence Group" className="w-full h-full object-cover" />
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="font-serif text-4xl md:text-6xl lg:text-7xl font-bold tracking-wide text-foreground max-w-4xl leading-tight mb-8"
          >
            Every question deserves an answer grounded in evidence.
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="font-sans text-lg md:text-xl text-muted-foreground max-w-3xl leading-relaxed mb-12"
          >
            Stonegate Intelligence Group provides confidential investigative services, intelligence gathering, and analytical solutions designed to uncover facts, clarify uncertainty, and support informed decisions.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.9 }}
            className="flex flex-col sm:flex-row gap-6 w-full sm:w-auto"
          >
            <Link 
              href="/contact" 
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 uppercase tracking-widest text-sm font-semibold transition-all shadow-[0_0_20px_rgba(220,20,60,0.3)] hover:shadow-[0_0_30px_rgba(220,20,60,0.5)] border border-primary text-center"
            >
              Request a Confidential Consultation
            </Link>
            <Link 
              href="/services" 
              className="bg-transparent hover:bg-white/5 text-foreground border border-white/20 px-8 py-4 uppercase tracking-widest text-sm font-semibold transition-all text-center"
            >
              Learn Our Services
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Who We Are */}
      <section className="py-24 md:py-32 bg-card relative z-10 border-t border-white/5">
        <div className="container mx-auto px-4 md:px-8">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeIn}
            className="max-w-4xl mx-auto text-center"
          >
            <h2 className="font-sans text-sm tracking-[0.3em] text-secondary uppercase mb-6">Who We Are</h2>
            <div className="w-12 h-px bg-primary mx-auto mb-10" />
            <p className="font-serif text-2xl md:text-3xl leading-relaxed text-foreground">
              Stonegate Intelligence Group is a professional investigative and intelligence services firm founded by Monica Morgado. We work with attorneys, individuals, and corporations to uncover facts, conduct due diligence, and deliver evidence-based intelligence.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Why Choose Stonegate */}
      <section className="py-24 md:py-32 bg-background relative z-10">
        <div className="container mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <h2 className="font-sans text-sm tracking-[0.3em] text-secondary uppercase mb-6">Why Choose Stonegate</h2>
            <div className="w-12 h-px bg-primary mx-auto" />
          </div>

          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8"
          >
            {[
              { icon: Lock, title: "Confidentiality", desc: "Absolute discretion in every engagement. Your privacy is our highest priority." },
              { icon: Shield, title: "Integrity", desc: "Unwavering ethical standards. We operate strictly within legal and professional bounds." },
              { icon: Search, title: "Accuracy", desc: "Meticulous attention to detail. We deliver facts, not conjecture." },
              { icon: Scale, title: "Professionalism", desc: "Seasoned expertise brought to every case, interaction, and final report." },
              { icon: FileText, title: "Evidence-Based", desc: "Actionable intelligence grounded in verifiable, documented evidence." }
            ].map((feature, i) => (
              <motion.div 
                key={i} 
                variants={fadeIn}
                className="bg-card p-8 border border-white/5 hover:border-primary/30 transition-colors group"
              >
                <feature.icon className="w-8 h-8 text-secondary mb-6 group-hover:text-primary transition-colors" />
                <h3 className="font-serif text-xl font-bold mb-4">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Mission Statement */}
      <section className="py-32 bg-black relative z-10 overflow-hidden border-t border-white/5">
        <div className="absolute inset-0 bg-sacred-geometry opacity-10" />
        <div className="container mx-auto px-4 md:px-8 relative z-10">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="max-w-4xl mx-auto text-center"
          >
            <h2 className="font-serif text-3xl md:text-5xl font-bold mb-8">Our Mission</h2>
            <p className="font-sans text-lg md:text-xl text-muted-foreground leading-relaxed">
              To provide unparalleled investigative and intelligence services that empower our clients to make informed decisions. We bridge the gap between uncertainty and clarity through relentless research, analytical rigor, and an uncompromising commitment to the truth.
            </p>
            <div className="mt-12">
              <Link href="/about" className="inline-flex items-center gap-2 text-primary hover:text-white transition-colors uppercase tracking-widest text-sm font-semibold">
                Read More About Us <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}