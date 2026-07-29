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
      <section className="relative bg-black min-h-screen flex flex-col items-center justify-start pt-20">
        <motion.img
          src={logo}
          alt="Stonegate Intelligence Group"
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.4, ease: "easeOut" as const }}
          className="w-full max-h-[68vh] object-contain object-top"
        />
        <div className="flex flex-col items-center gap-3 mt-4">
          <div className="w-16 h-px bg-primary" />
          <p className="font-sans text-white text-sm tracking-[0.15em] uppercase whitespace-nowrap">
            Intelligence &nbsp;·&nbsp; Insight &nbsp;·&nbsp; Impact
          </p>
          <div className="w-16 h-px bg-primary" />
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
              Stonegate Intelligence Group provides confidential research, intelligence, and analytical services focused on fact development, risk assessment, and decision support for businesses, legal professionals, and private clients.
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
              Our mission is to deliver reliable intelligence, research, and analytical services that empower clients to make informed decisions. We are committed to developing objective facts, providing clear insight, and maintaining the highest standards of discretion, integrity, and professional excellence.
            </p>
            <div className="mt-12">
              <Link href="/about" className="inline-flex items-center gap-2 text-primary hover:text-white transition-colors uppercase tracking-widest text-sm font-semibold">
                Read More About Us <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Request Our Services CTA */}
      <section className="py-24 bg-card relative z-10 border-t border-white/5">
        <div className="container mx-auto px-4 md:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="max-w-2xl mx-auto text-center"
          >
            <h2 className="font-sans text-sm tracking-[0.3em] text-secondary uppercase mb-6">Get Started</h2>
            <div className="w-12 h-px bg-primary mx-auto mb-10" />
            <h3 className="font-serif text-3xl md:text-4xl font-bold mb-6">Request Our Services</h3>
            <p className="font-sans text-muted-foreground leading-relaxed mb-12">
              Ready to move forward? Contact us today to discuss your matter confidentially. All inquiries are handled with complete discretion.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
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
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}