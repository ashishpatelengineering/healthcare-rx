import PageHeader from '../components/PageHeader'

const MODULES = [
  {
    title: 'Executive Overview',
    desc: 'A concise summary of network-wide performance, covering every stage of the prescription lifecycle: how many prescriptions were written, how quickly they were fulfilled, and what financial results were generated. Designed for leadership briefings and cross-functional review.',
    accent: '',
  },
  {
    title: 'Prescription Volume',
    desc: 'Month-by-month trends tracking how many prescriptions were written and filled, how quickly they were dispensed, and the split between new prescriptions and refills. Growth in refill volume reflects patient retention and medication adherence; growth in new prescriptions signals expanding demand or increased referral activity.',
    accent: 'green',
  },
  {
    title: 'Fulfillment Performance',
    desc: 'A detailed view of how prescriptions resolve across every dispensing channel, broken down into three outcomes: fulfilled on the same day, fulfilled on a later day, or not fulfilled at all. Tracks both the proportion and absolute count of each outcome over time, making it possible to distinguish between a slowdown in dispensing speed and a genuine failure to fill.',
    accent: 'orange',
  },
  {
    title: 'Hospital Scorecard',
    desc: 'Side-by-side performance data for every facility in the network, covering prescription demand, fill rates, dispensing speed, unfulfilled exposure, and financial contribution. Enables peer comparison across sites, supports targeted improvement planning, and helps pinpoint channel-specific bottlenecks at the facility level.',
    accent: 'indigo',
  },
  {
    title: 'Financial Performance',
    desc: 'Monthly revenue, cost, and gross margin broken down by fulfillment channel. Shows which channels generate the most profit, how margins are moving over time, and where cost growth may be outpacing revenue.',
    accent: 'navy',
  },
  {
    title: 'Drug Performance',
    desc: 'Prescription volume, revenue, and margin analysed by therapeutic category and individual drug. Highlights the formulary segments that contribute most to financial performance, and surfaces drugs with high revenue but low margins that may benefit from a pricing review or portfolio reassessment.',
    accent: 'teal',
  },
  {
    title: 'Regional Performance',
    desc: 'Operational and financial performance broken down by geographic region, including fill rates, dispensing turnaround, revenue, and margin. Highlights where outcomes differ significantly across the network, helping leadership make informed decisions about where to direct resources and investment.',
    accent: 'rose',
  },
]

export default function About() {
  return (
    <div>
      <PageHeader
        title="Healthcare Rx"
        subtitle="Enterprise Prescription Intelligence · Powered by Snowflake"
      />

      {/* Intro */}
      <div className="card" style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7 }}>
          <strong>Healthcare Rx</strong> is a business intelligence platform built for healthcare operations, finance, and executive
          leadership. It provides a single, consistent view of prescription activity across the entire facility network, from the
          moment a prescription is written to its fulfillment outcome and financial result.
        </p>
        <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7, marginTop: 12 }}>
          All data is sourced from a structured Snowflake data warehouse, giving every team — whether reviewing operational
          performance or preparing leadership reports — access to the same consistent and verified numbers.
        </p>
      </div>

      {/* Platform Modules */}
      <div className="section-title" style={{ marginBottom: 12 }}>Platform Modules</div>
      <div className="about-grid" style={{ marginBottom: 20 }}>
        {MODULES.map(m => (
          <div key={m.title} className={`about-module ${m.accent}`}>
            <div className="about-module-title">{m.title}</div>
            <div className="about-module-desc">{m.desc}</div>
          </div>
        ))}
      </div>

      {/* Fulfillment Outcome Definitions */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="section-title" style={{ marginBottom: 10 }}>Fulfillment Outcome Definitions</div>
        <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16, lineHeight: 1.6 }}>
          Every prescription in the platform is assigned to one of three outcomes. These categories are used consistently
          across all pages, always in the same colours:
        </p>
        <div className="outcome-pills">
          <div className="outcome-pill green">
            <div className="outcome-dot green" />
            <span><strong>Same Day Fulfilled</strong> — Dispensed on the same calendar day as prescribed.</span>
          </div>
          <div className="outcome-pill orange">
            <div className="outcome-dot orange" />
            <span><strong>Subsequent Days Fulfilled</strong> — Dispensed after one or more days.</span>
          </div>
          <div className="outcome-pill red">
            <div className="outcome-dot red" />
            <span><strong>Unfulfilled</strong> — Not yet dispensed or abandoned.</span>
          </div>
        </div>
      </div>

      {/* Data Architecture */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="section-title" style={{ marginBottom: 10 }}>Data Architecture</div>
        <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7, marginBottom: 16 }}>
          The platform is built on a three-layer Snowflake schema within <strong>ANALYTICS_DB</strong>:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            {
              num: '01', label: 'Raw Layer', accent: 'var(--text-3)',
              desc: 'Prescription, hospital, drug, and channel data in its original form, preserved without transformation for full traceability back to source.',
            },
            {
              num: '02', label: 'Intermediate Layer', accent: 'var(--primary)',
              desc: 'Cleaned, standardised, and enriched models that apply business logic and align dimensions across datasets.',
            },
            {
              num: '03', label: 'Analytics Layer', accent: 'var(--green)',
              desc: 'Purpose-built views designed for reporting, pre-aggregated where appropriate to keep queries fast and consistent.',
            },
          ].map(({ num, label, accent, desc }) => (
            <div key={num} style={{
              padding: '14px 18px',
              background: 'var(--bg)',
              borderRadius: 6,
              borderLeft: `3px solid ${accent}`,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>
                {num}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.6 }}>{desc}</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7, marginTop: 16 }}>
          Every chart and metric in the platform draws exclusively from the analytics layer, ensuring that all modules share
          the same definitions and figures are calculated the same way across every page.
        </p>
      </div>

      {/* Access & Support */}
      <div className="chart-row">
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="section-title" style={{ marginBottom: 8 }}>Access & Governance</div>
          <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
            Database credentials are stored securely and scoped to a read-only Snowflake role.
            The platform does not write or modify any data.
          </p>
        </div>
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="section-title" style={{ marginBottom: 8 }}>Support</div>
          <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
            For questions about data accuracy, access permissions, or feature requests, please reach out to
            the Analytics Engineering team.
          </p>
        </div>
      </div>
    </div>
  )
}
