import { motion } from 'framer-motion';
import { Shield, Search, FileSearch, HardDrive, Briefcase, Scale, Target } from 'lucide-react';
import { Link } from 'wouter';
import { useCookieConsent } from '@/context/CookieConsentContext';
import { trackEvent } from '@/lib/analytics';

export default function Services() {
  const { status: consentStatus } = useCookieConsent();
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const services = [
    {
      title: "Private Investigations",
      icon: Search,
      desc: "Discreet, thorough, and highly professional investigative services tailored to individuals facing complex personal or legal challenges. We uncover hidden truths, locate individuals, and gather actionable intelligence."
    },
    {
      title: "Background Research",
      icon: Target,
      desc: "Comprehensive vetting of individuals prior to critical personal or professional decisions. We go beyond basic database checks to uncover historical patterns, undisclosed liabilities, and character insights."
    },
    {
      title: "Due Diligence",
      icon: FileSearch,
      desc: "Deep-dive analysis into corporate entities, potential partners, or investment targets. We identify financial, legal, and reputational risks before they become liabilities."
    },
    {
      title: "Evidence Collection & Documentation",
      icon: Shield,
      desc: "Meticulous gathering and preservation of physical, documentary, and digital evidence. We ensure chain of custody is maintained so our findings withstand legal scrutiny."
    },
    {
      title: "Digital Research",
      icon: HardDrive,
      desc: "Advanced open-source intelligence (OSINT) gathering and digital footprint analysis. We navigate the deep web, social media ecosystems, and public records to build comprehensive digital profiles."
    },
    {
      title: "Corporate Intelligence",
      icon: Briefcase,
      desc: "Strategic information gathering for business continuity and competitive advantage. Includes internal investigations, intellectual property protection, and executive vetting."
    },
    {
      title: "Legal Support Services",
      icon: Scale,
      desc: "Dedicated support for attorneys and law firms. From witness locating and interviewing to asset tracing and litigation intelligence, we build the factual foundation for your legal strategy."
    }
  ];

  return (
    <div className="w-full flex flex-col pt-20">
      {/* Header */}
      <section className="py-20 md:py-32 bg-card relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-sacred-geometry opacity-5" />
        <div className="container mx-auto px-4 md:px-8 relative z-10 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeIn} className="max-w-3xl mx-auto">
            <h1 className="font-serif text-4xl md:text-6xl font-bold tracking-wide mb-6">
              Our Services
            </h1>
            <div className="w-16 h-1 bg-primary mx-auto mb-8" />
            <p className="text-xl text-muted-foreground leading-relaxed">
              Targeted methodologies to resolve complex inquiries.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 md:px-8">
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {services.map((service, i) => (
              <motion.div 
                key={i} 
                variants={fadeIn}
                className="bg-card p-8 md:p-10 border border-white/5 hover:border-primary/50 transition-all duration-300 group flex flex-col"
                onClick={() => {
                  if (consentStatus === 'accepted') {
                    trackEvent('service_card_click', { service_name: service.title });
                  }
                }}
              >
                <div className="mb-6 inline-flex items-center justify-center w-14 h-14 bg-background border border-white/10 rounded-full group-hover:border-primary/50 transition-colors">
                  <service.icon className="w-6 h-6 text-secondary group-hover:text-primary transition-colors" />
                </div>
                <h3 className="font-serif text-2xl font-bold mb-4">{service.title}</h3>
                <p className="text-muted-foreground leading-relaxed flex-1">{service.desc}</p>
              </motion.div>
            ))}
          </motion.div>
          
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="mt-20 text-center"
          >
            <p className="text-muted-foreground mb-8">
              Every engagement is customized to the specific needs of the client.
            </p>
            <Link 
              href="/contact" 
              className="inline-block bg-white text-black hover:bg-gray-200 px-8 py-4 uppercase tracking-widest text-sm font-semibold transition-colors"
            >
              Discuss Your Case
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}