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
              Stonegate Intelligence Group is a premier investigative and intelligence consulting firm dedicated to uncovering the truth when it matters most. Founded by Monica Morgado, the firm operates at the intersection of traditional investigative tradecraft and modern analytical methodologies.
            </motion.p>
            <motion.p variants={fadeIn}>
              We serve a discerning clientele—including legal professionals, corporate executives, and private individuals—who require absolute discretion and unimpeachable accuracy. Our approach is surgical: we define the objective, map the information landscape, and execute a comprehensive collection strategy to yield actionable intelligence.
            </motion.p>
            <motion.p variants={fadeIn}>
              In an era defined by information overload and obscured facts, Stonegate Intelligence Group stands as a bulwark of clarity. We do not deal in assumptions; we deliver evidence-based solutions that stand up to the most rigorous scrutiny, whether in a boardroom or a courtroom.
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