import { motion } from 'framer-motion';
import { Shield, Briefcase, Scale } from 'lucide-react';
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
      title: "For Businesses",
      icon: Briefcase,
      desc: "Business intelligence, loss-analysis, and investigative research focused on determining where money is being lost, why it is happening, and what the evidence supports.",
      items: [
        "Inventory shrinkage investigation",
        "Root-cause analysis of financial and operational losses",
        "Profit & loss, cash flow, and financial statement analysis",
        "Profitability and margin analysis",
        "Expense and cost anomaly identification",
        "Inventory, purchasing, waste, and operational loss analysis",
        "Internal process and control assessment",
        "Pattern and trend analysis",
        "Evidence-based operational investigations",
        "Loss-prevention and process-improvement recommendations"
      ]
    },
    {
      title: "For Attorneys",
      icon: Scale,
      desc: "Investigative research and fact development supporting counsel through documented facts, record analysis, identified inconsistencies, and investigative intelligence.",
      items: [
        "Investigative fact development",
        "Financial and business-record analysis",
        "Litigation-support research",
        "Document and information review",
        "Chronology and timeline development",
        "Discrepancy and anomaly identification",
        "Corporate and business intelligence research",
        "Background and subject research",
        "Open-source intelligence research",
        "Asset and financial research",
        "Investigative lead development",
        "Fact verification"
      ]
    },
    {
      title: "For Insurance Professionals",
      icon: Shield,
      desc: "Claims investigation, loss-analysis, and financial research helping claims professionals understand what happened, why the loss occurred, what documentation supports, and the potential exposure.",
      items: [
        "Claims-related investigative research",
        "Loss-cause investigation",
        "Loss and damage investigation",
        "Financial-loss analysis",
        "Business interruption research",
        "P&L and cash-flow analysis",
        "Inventory loss and shrinkage analysis",
        "Documentation and record verification",
        "Timeline and chronology development",
        "Anomaly and inconsistency identification",
        "Open-source intelligence research",
        "Background and subject research",
        "Claim-related fact development",
        "Identification of issues requiring additional investigation"
      ]
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
              Every question deserves an answer grounded in evidence.
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
                <p className="text-muted-foreground leading-relaxed mb-8">{service.desc}</p>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  {service.items.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="text-primary mt-1">◆</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
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