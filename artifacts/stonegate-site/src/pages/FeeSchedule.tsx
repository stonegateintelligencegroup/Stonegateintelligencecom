import { motion } from 'framer-motion';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
};

function SectionNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-5 text-sm text-muted-foreground leading-relaxed italic border-l-2 border-white/10 pl-4">
      {children}
    </p>
  );
}

function FeeTable({
  heading,
  columnHeaders,
  rows,
  note,
}: {
  heading: string;
  columnHeaders: [string, string];
  rows: [string, string][];
  note?: string;
}) {
  return (
    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}>
      <h2 className="font-serif text-2xl font-bold mb-6 text-foreground border-b border-white/10 pb-4">
        {heading}
      </h2>
      <div className="bg-card border border-white/5 rounded-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03]">
              <th className="px-6 py-4 text-xs tracking-[0.2em] uppercase text-secondary font-sans font-medium">
                {columnHeaders[0]}
              </th>
              <th className="px-6 py-4 text-xs tracking-[0.2em] uppercase text-secondary font-sans font-medium text-right">
                {columnHeaders[1]}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([service, rate], i) => (
              <tr
                key={i}
                className={`hover:bg-white/[0.02] transition-colors ${i < rows.length - 1 ? 'border-b border-white/5' : ''}`}
              >
                <td className="px-6 py-5 font-medium text-foreground">{service}</td>
                <td className="px-6 py-5 text-right text-secondary font-mono tracking-wider">{rate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {note && <SectionNote>{note}</SectionNote>}
    </motion.div>
  );
}

export default function FeeSchedule() {
  return (
    <div className="w-full flex flex-col pt-20">
      {/* Header */}
      <section className="py-20 md:py-32 bg-card relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-sacred-geometry opacity-5" />
        <div className="container mx-auto px-4 md:px-8 relative z-10 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeIn} className="max-w-3xl mx-auto">
            <p className="font-sans text-xs tracking-[0.3em] text-secondary uppercase mb-6">
              Effective July 2026
            </p>
            <h1 className="font-serif text-4xl md:text-6xl font-bold tracking-wide mb-6">
              Services &amp; Fee Schedule
            </h1>
            <div className="w-16 h-1 bg-primary mx-auto mb-8" />
            <p className="text-xl text-muted-foreground leading-relaxed">
              Stonegate Intelligence Group provides investigative, due diligence, risk assessment, and intelligence
              consulting services to individuals, attorneys, and businesses. The rates below reflect our standard
              pricing; final quotes are confirmed in writing prior to engagement.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 md:px-8 max-w-5xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="space-y-16"
          >
            {/* Hourly Rates */}
            <FeeTable
              heading="Hourly Rates"
              columnHeaders={['Service', 'Rate']}
              rows={[
                ['Standard investigation / surveillance', '$125 – $160 / hr'],
                ['Due diligence / background research', '$135 – $175 / hr'],
                ['Litigation support (attorney clients)', '$150 – $200 / hr'],
                ['Risk assessment / intelligence consulting', '$175 – $225 / hr'],
                ['Digital & financial forensics', '$200 – $275 / hr'],
              ]}
              note="A 4-hour minimum applies to active field engagements (surveillance, on-site investigation). Hourly rates cover investigator time including research, interviews, travel time, and reporting."
            />

            {/* Flat-Fee Services */}
            <FeeTable
              heading="Flat-Fee Services"
              columnHeaders={['Service', 'Fee']}
              rows={[
                ['Basic background check', '$300 – $600'],
                ['Comprehensive due diligence report', '$800 – $2,500'],
                ['Pre-employment / vendor screening', '$250 – $500'],
              ]}
              note="Flat fees apply to well-defined scopes of work agreed upon in advance. Cases requiring additional depth (e.g., international records, extensive financial history) may be quoted separately."
            />

            {/* Retainers */}
            <FeeTable
              heading="Retainers"
              columnHeaders={['Structure', 'Amount']}
              rows={[
                ['Initial case retainer (billed down hourly)', '$2,000 – $5,000'],
                ['Ongoing monthly retainer (set hour block)', '$1,500 – $3,500 / mo'],
              ]}
              note="Retainers are billed down against actual hours worked at the applicable hourly rate. Once a retainer is exhausted, additional hours are billed directly or the retainer is replenished by agreement."
            />

            {/* Additional Expenses */}
            <FeeTable
              heading="Additional Expenses"
              columnHeaders={['Expense', 'Rate / Fee']}
              rows={[
                ['Mileage', '$0.76 / mile (current IRS business rate)'],
                ['Database & records searches', 'Billed at cost'],
                ['GPS tracking equipment', '$15 – $50 / day'],
                ['Court filing & document retrieval fees', 'Billed at cost'],
                ['Out-of-area travel (lodging, airfare, per diem)', 'Billed at cost, pre-approved'],
              ]}
              note="Mileage is billed at the prevailing IRS standard business mileage rate ($0.76/mile as of July 2026) for travel beyond a 20-mile radius of Sioux Falls, SD. All expense line items are itemized on invoices — nothing is bundled into the hourly rate."
            />

            {/* Closing note */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeIn}
              className="bg-white/5 p-8 border-l-4 border-primary"
            >
              <p className="text-sm text-muted-foreground leading-relaxed">
                All engagements begin with a signed service agreement outlining scope, rates, and any applicable
                retainer. Rates are subject to change and are confirmed in writing at the time of engagement.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
