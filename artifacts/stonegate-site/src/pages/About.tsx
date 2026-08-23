import { motion } from 'framer-motion';

export default function About() {
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  return (
    <div className="w-full flex flex-col pt-20">
      {/* Header */}
      <section className="py-20 md:py-32 bg-card relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-sacred-geometry opacity-5" />
        <div className="container mx-auto px-4 md:px-8 relative z-10">
          <motion.div initial="hidden" animate="visible" variants={fadeIn} className="max-w-3xl">
            <h1 className="font-serif text-4xl md:text-6xl font-bold tracking-wide mb-6">
              About Stonegate Intelligence Group
            </h1>
            <div className="w-16 h-1 bg-primary mb-8" />
            <p className="text-xl text-muted-foreground leading-relaxed">
              Clarity in the face of uncertainty. Power through evidence.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Approach */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 md:px-8">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="max-w-4xl space-y-8 font-serif text-xl leading-loose text-foreground"
          >
            <motion.p variants={fadeIn}>
              Stonegate Intelligence Group is an intelligence, research, and consulting firm providing confidential intelligence, due diligence, and analytical services. We combine established investigative practices with modern research methodologies to deliver objective, reliable information that supports informed decision making.
            </motion.p>
            <motion.p variants={fadeIn}>
              Our approach begins with a clear understanding of each client's objectives. We apply disciplined research, structured information collection, and objective analysis to develop accurate, defensible findings tailored to the unique requirements of every engagement.
            </motion.p>
            <motion.p variants={fadeIn}>
              In an environment where information is abundant but reliable intelligence is often difficult to obtain, Stonegate Intelligence Group delivers clarity through disciplined research and objective analysis. We are committed to providing evidence based findings that withstand careful review and support confident, well informed decisions.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Our Team */}
      <section className="py-24 bg-background border-t border-white/5">
        <div className="container mx-auto px-4 md:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="mb-16"
          >
            <h2 className="font-sans text-sm tracking-[0.3em] text-secondary uppercase mb-6">Our Team</h2>
            <div className="w-12 h-px bg-primary mb-10" />
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="max-w-4xl space-y-8 font-serif text-xl leading-loose text-foreground"
          >
            <motion.p variants={fadeIn}>
              Our team brings a diverse background in investigative services, legal support, corporate security, surveillance analysis, and intelligence research.
            </motion.p>
            <motion.p variants={fadeIn}>
              Our experience includes corporate fraud and loss prevention operations involving the review and analysis of extensive video evidence, incident documentation, data research, and risk identification across multi-location environments.
            </motion.p>
            <motion.p variants={fadeIn}>
              By combining investigative knowledge, legal awareness, analytical research, and technology driven intelligence methods, Stonegate Intelligence Group approaches each matter with discretion, professionalism, and a commitment to accurate, evidence-based findings.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 bg-card border-t border-white/5">
        <div className="container mx-auto px-4 md:px-8">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="mb-16"
          >
            <h2 className="font-sans text-sm tracking-[0.3em] text-secondary uppercase mb-6">Our Core Values</h2>
            <div className="w-12 h-px bg-primary" />
          </motion.div>

          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 gap-12"
          >
            {[
              {
                title: "Confidentiality",
                desc: "We recognize that our clients entrust us with highly sensitive matters. Discretion is woven into the fabric of our operations. From the initial consultation to the final report, your privacy is protected by strict operational security protocols."
              },
              {
                title: "Integrity",
                desc: "Our reputation is our most valuable asset. We conduct every investigation ethically, legally, and transparently with our clients. We refuse engagements that compromise our moral compass or violate legal statutes."
              },
              {
                title: "Accuracy",
                desc: "In the intelligence field, near-right is wrong. We employ rigorous verification processes to ensure every piece of information we provide is factual, contextualized, and reliable."
              },
              {
                title: "Professionalism",
                desc: "We bring a standard of excellence to every aspect of our work. Our communications are clear, our reports are meticulously documented, and our conduct reflects the gravity of the matters we handle."
              },
              {
                title: "Evidence-Based Intelligence",
                desc: "We do not trade in rumors or conjecture. Every conclusion we present is supported by documented evidence, providing you with a solid foundation for legal proceedings, business decisions, or personal peace of mind."
              }
            ].map((value, i) => (
              <motion.div key={i} variants={fadeIn} className="flex flex-col">
                <h3 className="font-serif text-2xl text-primary font-bold mb-4">{value.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{value.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    </div>
  );
}