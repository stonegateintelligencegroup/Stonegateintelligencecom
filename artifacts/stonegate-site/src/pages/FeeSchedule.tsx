import { motion } from 'framer-motion';

export default function FeeSchedule() {
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } }
  };

  return (
    <div className="w-full flex flex-col pt-20">
      {/* Header */}
      <section className="py-20 md:py-32 bg-card relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-sacred-geometry opacity-5" />
        <div className="container mx-auto px-4 md:px-8 relative z-10 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeIn} className="max-w-3xl mx-auto">
            <h1 className="font-serif text-4xl md:text-6xl font-bold tracking-wide mb-6">
              Services & Fee Schedule
            </h1>
            <div className="w-16 h-1 bg-primary mx-auto mb-8" />
            <p className="text-xl text-muted-foreground leading-relaxed">
              Transparent, professional fee structures for our intelligence services.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 md:px-8 max-w-5xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="mb-16">
            <p className="text-lg text-muted-foreground leading-relaxed">
              Stonegate Intelligence Group operates on a straightforward fee schedule. Depending on the nature and complexity of the engagement, services may be billed hourly, as a flat fee, or under a retainer agreement. All final quotes and statements of work are confirmed in writing prior to the commencement of any engagement.
            </p>
          </motion.div>

          {/* Tables */}
          <div className="space-y-16">
            {/* Hourly Services */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}>
              <h2 className="font-serif text-2xl font-bold mb-6 text-foreground border-b border-white/10 pb-4">Hourly Services</h2>
              <div className="bg-card border border-white/5 rounded-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <tbody>
                    <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="p-6 font-medium">Principal Investigator</td>
                      <td className="p-6 text-right text-secondary font-mono tracking-wider">$250 / hr</td>
                    </tr>
                    <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="p-6 font-medium">Senior Investigator</td>
                      <td className="p-6 text-right text-secondary font-mono tracking-wider">$195 / hr</td>
                    </tr>
                    <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="p-6 font-medium">Analyst / Researcher</td>
                      <td className="p-6 text-right text-secondary font-mono tracking-wider">$150 / hr</td>
                    </tr>
                    <tr className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-6 font-medium">Legal Support Specialist</td>
                      <td className="p-6 text-right text-secondary font-mono tracking-wider">$125 / hr</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </motion.div>

            {/* Flat Fee Services */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}>
              <h2 className="font-serif text-2xl font-bold mb-6 text-foreground border-b border-white/10 pb-4">Flat Fee Services</h2>
              <div className="bg-card border border-white/5 rounded-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <tbody>
                    <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="p-6 font-medium">Comprehensive Background Investigation</td>
                      <td className="p-6 text-right text-secondary font-mono tracking-wider">$1,500</td>
                    </tr>
                    <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="p-6 font-medium">Corporate Due Diligence Report</td>
                      <td className="p-6 text-right text-secondary font-mono tracking-wider">$3,500</td>
                    </tr>
                    <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="p-6 font-medium">Digital Footprint Analysis</td>
                      <td className="p-6 text-right text-secondary font-mono tracking-wider">$1,200</td>
                    </tr>
                    <tr className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-6 font-medium">Asset Locate Investigation</td>
                      <td className="p-6 text-right text-secondary font-mono tracking-wider">$2,000</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </motion.div>

            {/* Retainer Services */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}>
              <h2 className="font-serif text-2xl font-bold mb-6 text-foreground border-b border-white/10 pb-4">Retainer Services</h2>
              <div className="bg-card border border-white/5 rounded-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <tbody>
                    <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="p-6 font-medium">Corporate Advisory Retainer</td>
                      <td className="p-6 text-right text-secondary font-mono tracking-wider">$5,000 / mo</td>
                    </tr>
                    <tr className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-6 font-medium">Legal Support Retainer</td>
                      <td className="p-6 text-right text-secondary font-mono tracking-wider">$3,500 / mo</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </motion.div>

            {/* Additional Expenses */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}>
              <h2 className="font-serif text-2xl font-bold mb-6 text-foreground border-b border-white/10 pb-4">Additional Expenses</h2>
              <div className="bg-card border border-white/5 rounded-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <tbody>
                    <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="p-6 text-muted-foreground">Mileage</td>
                      <td className="p-6 text-right font-mono text-sm">$0.65 / mile</td>
                    </tr>
                    <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="p-6 text-muted-foreground">Database Access Fees</td>
                      <td className="p-6 text-right font-mono text-sm">Billed at cost</td>
                    </tr>
                    <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="p-6 text-muted-foreground">Specialized Equipment Rental</td>
                      <td className="p-6 text-right font-mono text-sm">Billed per engagement</td>
                    </tr>
                    <tr className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-6 text-muted-foreground">Travel & Lodging</td>
                      <td className="p-6 text-right font-mono text-sm">Billed at cost</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </motion.div>

            {/* Notes */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="bg-white/5 p-8 border-l-4 border-primary">
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold mt-0.5">•</span>
                  <span>A 4-hour minimum applies to all field engagements and surveillance operations.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold mt-0.5">•</span>
                  <span>Final quotes, estimated hours, and specific deliverables are confirmed in writing prior to engagement.</span>
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}