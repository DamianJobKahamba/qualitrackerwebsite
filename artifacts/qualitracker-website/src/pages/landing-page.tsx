import { ClipboardCheck, FileCheck2, FlaskConical, Network, Search } from 'lucide-react';
import { PageShell } from '@/components/site/page-shell';
import { SectionHeader } from '@/components/site/section-header';
import { Button } from '@/components/site/button';
import { StatusBadge } from '@/components/site/status-badge';
import { AccreditationReadinessWidget } from '@/components/product/accreditation-readiness-widget';
import { AskQualiTrackerDemo } from '@/components/product/ask-qualitracker-demo';
import { RagPipelineScroll } from '@/components/product/rag-pipeline-scroll';
import { AccreditationVisionSection } from '@/components/site/accreditation-vision';
import { QualityCommandCenter } from '@/components/product/quality-command-center';
import { QualityIntelligenceGraph } from '@/components/product/quality-intelligence-graph';
import { LifecycleTimeline } from '@/components/product/lifecycle-timeline';
import { ComparisonTable } from '@/components/site/comparison-table';
import { useDocumentMeta, useStructuredData } from '@/lib/use-document-meta';
import { SOFTWARE_APPLICATION_SCHEMA } from '@/lib/structured-data';
import { Reveal } from '@/components/site/reveal';
import { motion, useReducedMotion } from 'framer-motion';

const REALITY_ITEMS = [
  { icon: <Search size={20} />, title: 'Find the record', copy: 'Search quality documents, actions, and evidence from one place.' },
  { icon: <Network size={20} />, title: 'See the trail', copy: 'Know what changed, who reviewed it, and what still needs attention.' },
  { icon: <ClipboardCheck size={20} />, title: 'Close the loop', copy: 'Turn findings into assigned, visible actions with a clear next step.' },
  { icon: <FlaskConical size={20} />, title: 'Keep the context', copy: "Make your lab's own SOPs the source of truth for everyday questions." },
];

// Real Django model STATUS_CHOICES from the QMS repository (documents/models.py) —
// not an idealized or invented lifecycle.
const DOCUMENT_STAGES = [
  { label: 'Draft', detail: 'A new SOP or policy starts here — editable, not yet in force.' },
  { label: 'Pending Collaboration', detail: 'Open for co-author input before it moves to formal review.' },
  { label: 'Under Review', detail: "A reviewer checks it against the standard it's meant to satisfy." },
  { label: 'Under Approval', detail: 'A final approver signs off before the document takes effect.' },
  { label: 'Approved', detail: 'In force — version-locked, and citable as evidence from this point on.', branch: 'Rejected sends it back to Draft, with the review history kept.' },
];

// Real Django model STATUS_CHOICES from non_conformance/models.py — including
// the actual two-stage independent review, not the simplified version most
// QMS marketing copy assumes.
const CAPA_STAGES = [
  { label: 'Registered', detail: 'A finding is logged with a unique, auto-generated NC number and classified Major or Minor.' },
  { label: 'Pending Review 1', detail: 'Waiting on the first reviewer.' },
  { label: 'Review 1 Complete', detail: 'First reviewer has signed off.' },
  { label: 'Pending Review 2', detail: 'A second, independent reviewer checks the first review — not a rubber stamp.' },
  { label: 'Review 2 Complete', detail: 'Independent sign-off recorded.' },
  { label: 'Pending Closure', detail: 'Corrective action taken; waiting on final closure sign-off.' },
  { label: 'Closed', detail: 'Resolved, with the full two-reviewer trail preserved.', branch: 'Declined at review 2 returns it for further work, not silently dropped.' },
];

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};
const staggerItem = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.2, 0, 0.2, 1] as const } },
};

function RealitySequence() {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className="grid gap-0 sm:grid-cols-2 lg:grid-cols-4"
      variants={reduceMotion ? undefined : staggerContainer}
      initial={reduceMotion ? undefined : 'hidden'}
      whileInView={reduceMotion ? undefined : 'show'}
      viewport={{ once: true, margin: '-80px' }}
    >
      {REALITY_ITEMS.map((item, i) => (
        <motion.div
          key={item.title}
          variants={reduceMotion ? undefined : staggerItem}
          className="border-t-2 py-5 pr-6"
          style={{ borderColor: 'var(--qt-quality-gold)' }}
          data-testid={`step-reality-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
        >
          <div className="flex items-center gap-2">
            <span className="font-mono-ui text-[11px]" style={{ color: 'var(--qt-body-grey)' }}>{String(i + 1).padStart(2, '0')}</span>
            <span style={{ color: 'var(--qt-deep-teal)' }}>{item.icon}</span>
          </div>
          <h3 className="font-brand mt-3 text-base font-bold" style={{ color: 'var(--qt-near-black)' }}>{item.title}</h3>
          <p className="mt-2 text-xs leading-5" style={{ color: 'var(--qt-body-grey)' }}>{item.copy}</p>
        </motion.div>
      ))}
    </motion.div>
  );
}

function LandingPage() {
  useDocumentMeta(
    'QualiTracker — Quality that works for every lab',
    "QualiTracker is a digital quality-management system for laboratories, with an AI assistant grounded in your lab's own documents.",
    '/',
  );
  useStructuredData(SOFTWARE_APPLICATION_SCHEMA);
  return (
    <PageShell>
      {/* Hero */}
      <section className="relative overflow-hidden pb-16 pt-16 lg:pt-20 qt-texture-grid" style={{ backgroundColor: 'var(--qt-dark-navy)' }}>
        <div className="mx-auto max-w-[1280px] px-5 lg:px-8">
          {/* The headline gets its own full-width row so it can command the
              viewport the way the brand kit's upper type range calls for —
              splitting it with the widget (as before) capped how large it
              could go before crowding. */}
          <Reveal>
            <p className="qt-eyebrow qt-eyebrow-light">Standards-aware · ISO 15189 · WHO LQMS · SLIPTA</p>
            <h1 className="font-brand mt-5 max-w-[960px] text-[clamp(3.5rem,9vw,8rem)] font-bold leading-[0.94] tracking-[-.03em]" style={{ color: '#FFFFFF' }}>
              Quality that <span style={{ color: 'var(--qt-quality-gold)' }}>works</span> for every lab.
            </h1>
          </Reveal>
          <div className="mt-10 grid items-center gap-14 lg:grid-cols-[1.05fr_.95fr] lg:gap-10">
            <Reveal delay={0.08}>
              <p className="max-w-[420px] text-[15px] leading-7" style={{ color: 'var(--qt-mint-light)' }}>
                Document control, corrective actions, and an AI assistant that only answers from your lab's own records — with the source shown, or a plain "not found" instead of a guess.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Button href="/waitlist" variant="gold" data-testid="button-hero-waitlist">Join the waitlist</Button>
                <Button href="/talk-to-team" variant="reversed" data-testid="button-hero-talk">Talk to the team</Button>
              </div>
              <div className="mt-8 flex items-center gap-2">
                <StatusBadge status="early-access" />
                <span className="text-xs" style={{ color: 'var(--qt-light-teal)' }}>Building toward launch with a small first group of laboratories.</span>
              </div>
            </Reveal>
            <Reveal delay={0.15}>
              <AccreditationReadinessWidget />
            </Reveal>
          </div>
        </div>
      </section>

      {/* Thesis */}
      <section className="py-20 lg:py-24" style={{ background: 'var(--qt-clinical-white)' }}>
        <div className="mx-auto max-w-[1280px] px-5 lg:px-8">
          <Reveal>
            <SectionHeader eyebrow="The reality" title="Your quality system already exists. It's just hiding." />
            <p className="mt-5 max-w-[480px] text-sm leading-6" style={{ color: 'var(--qt-body-grey)' }}>
              In a shared drive. In a WhatsApp thread. In a folder only one person knows how to find. QualiTracker gives the work a home your whole lab can trust.
            </p>
          </Reveal>
          <div className="mt-10">
            <RealitySequence />
          </div>
        </div>
      </section>

      {/* Comparison — every QualiTracker cell restates a fact already
          established elsewhere on this page/site; "generic QMS" cells are
          deliberately hedged, never a specific competitor claim. */}
      <section className="py-20 lg:py-24" style={{ background: 'var(--qt-lab-grey)' }}>
        <div className="mx-auto max-w-[1280px] px-5 lg:px-8">
          <SectionHeader eyebrow="Why it's different" title="Not a bigger binder. A different kind of system." />
          <div className="mt-10">
            <ComparisonTable />
          </div>
        </div>
      </section>

      {/* Product proof: the real dashboard shape */}
      <section className="py-20 lg:py-24" style={{ background: 'var(--qt-lab-grey)' }}>
        <div className="mx-auto max-w-[1280px] px-5 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-center lg:gap-16">
            <Reveal>
              <SectionHeader eyebrow="See it, not just read about it" title="This is what your dashboard actually looks like." />
              <p className="mt-5 max-w-[380px] text-sm leading-6" style={{ color: 'var(--qt-body-grey)' }}>
                Your labs, departments, roles, and people — scoped to who you are and where you work, the moment you log in.
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <QualityCommandCenter />
            </Reveal>
          </div>
        </div>
      </section>

      {/* Quality Intelligence Graph — the product thesis, shown not told */}
      <section className="py-20 lg:py-24" style={{ background: 'var(--qt-clinical-white)' }}>
        <div className="mx-auto max-w-[1280px] px-5 lg:px-8">
          <Reveal>
            <SectionHeader eyebrow="The quality intelligence graph" title="Quality management isn't a pile of disconnected documents. It's a connected system." />
            <p className="mt-5 max-w-[620px] text-sm leading-6" style={{ color: 'var(--qt-body-grey)' }}>
              A standard implies a document. A document describes a process. A process produces evidence. Evidence is what an audit checks — and what a finding, a non-conformance, or a CAPA all trace back to. Hover a node to follow the connection.
            </p>
          </Reveal>
          <Reveal delay={0.1} className="mt-10 max-w-[720px]">
            <QualityIntelligenceGraph />
          </Reveal>
          <Reveal delay={0.15} className="mt-6">
            <Button href="/product#quality-intelligence" variant="secondary" arrow="arrow">Explore the full system</Button>
          </Reveal>
        </div>
      </section>

      {/* Two-layer system */}
      <section className="py-20 lg:py-24" style={{ background: 'var(--qt-lab-grey)' }}>
        <div className="mx-auto max-w-[1280px] px-5 lg:px-8">
          <SectionHeader eyebrow="The system" title="Two connected layers, one system of record." />
          <Reveal className="mt-10 grid gap-5 lg:grid-cols-2">
            <div className="qt-card-dark p-8">
              <StatusBadge status="early-access" />
              <div className="mt-5 flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: 'var(--qt-quality-gold)', color: 'var(--qt-dark-navy)' }}>
                <FileCheck2 size={21} />
              </div>
              <h3 className="font-brand mt-5 text-2xl font-bold" style={{ color: '#FFFFFF' }}>QMS Module</h3>
              <p className="mt-3 max-w-[380px] text-sm leading-6" style={{ color: 'var(--qt-mint-light)' }}>
                A versioned document and record repository — SOPs, policies, quality records, and audit logs — for lab directors, quality managers, and accreditors.
              </p>
            </div>
            <div className="qt-card p-8">
              <StatusBadge status="preview" />
              <div className="mt-5 flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: 'var(--qt-teal-tint)', color: 'var(--qt-deep-teal)' }}>
                <FlaskConical size={19} />
              </div>
              <h3 className="font-brand mt-5 text-2xl font-bold" style={{ color: 'var(--qt-near-black)' }}>QualiBOT</h3>
              <p className="mt-3 max-w-[380px] text-sm leading-6" style={{ color: 'var(--qt-body-grey)' }}>
                A conversational assistant grounded in your lab's own uploaded documents, for frontline technologists asking everyday questions in plain language — in English or Swahili.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Document & Evidence Intelligence */}
      <section className="py-20 lg:py-24" style={{ background: 'var(--qt-clinical-white)' }}>
        <div className="mx-auto max-w-[1280px] px-5 lg:px-8">
          <Reveal>
            <SectionHeader eyebrow="Document & evidence intelligence" title="Every document moves through the same real workflow." />
            <p className="mt-5 max-w-[560px] text-sm leading-6" style={{ color: 'var(--qt-body-grey)' }}>
              No status is invented for this page — these are the actual states a controlled document moves through, end to end.
            </p>
          </Reveal>
          <Reveal delay={0.1} className="mt-10 max-w-[720px]">
            <LifecycleTimeline stages={DOCUMENT_STAGES} />
          </Reveal>
        </div>
      </section>

      {/* CAPA / Non-Conformance lifecycle */}
      <section className="py-20 lg:py-24" style={{ background: 'var(--qt-lab-grey)' }}>
        <div className="mx-auto max-w-[1280px] px-5 lg:px-8">
          <Reveal>
            <SectionHeader eyebrow="Corrective action lifecycle" title="Two independent reviewers, not one rubber stamp." />
            <p className="mt-5 max-w-[560px] text-sm leading-6" style={{ color: 'var(--qt-body-grey)' }}>
              Every finding is classified Major or Minor, auto-numbered, and closed only after two separate people have signed off — the same rigor an accreditor expects.
            </p>
          </Reveal>
          <Reveal delay={0.1} className="mt-10 max-w-[720px]">
            {/* Teal, not gold — gold is reserved for the hero and waitlist/
                talk-to-team CTAs only, per the brand kit's own rule. */}
            <LifecycleTimeline stages={CAPA_STAGES} />
          </Reveal>
        </div>
      </section>

      {/* AI & RAG */}
      <section id="ai-rag" className="py-20 lg:py-24" style={{ background: 'var(--qt-clinical-white)' }}>
        <div className="mx-auto max-w-[1280px] px-5 lg:px-8">
          <SectionHeader eyebrow="Ask the record" title="An assistant that knows when it doesn't know." />
          <p className="mt-5 max-w-[560px] text-sm leading-6" style={{ color: 'var(--qt-body-grey)' }}>
            Ask in plain language. Get an answer grounded in your lab's own records, with the source beside it — and if there's no relevant record, QualiTracker says so rather than guessing.
          </p>
          <Reveal className="mt-10 mx-auto max-w-[560px]">
            <AskQualiTrackerDemo />
          </Reveal>
        </div>
      </section>

      {/* Signature moment: how that answer actually got built */}
      <section className="py-20 lg:py-24" style={{ background: 'var(--qt-lab-grey)' }}>
        <div className="mx-auto max-w-[1280px] px-5 lg:px-8">
          <Reveal>
            <p className="qt-eyebrow">Keep scrolling</p>
            <h2 className="font-brand mt-2.5 max-w-[560px] font-bold leading-[1.1] tracking-[-.02em]" style={{ color: 'var(--qt-near-black)', fontSize: 'clamp(1.75rem, 3.4vw, 2.5rem)' }}>
              That answer above didn't come from nowhere. Here's the path it walked.
            </h2>
          </Reveal>
          <div className="mt-10 max-w-[620px]">
            <RagPipelineScroll />
          </div>
        </div>
      </section>

      <AccreditationVisionSection />

      {/* Final CTA */}
      <section className="py-20 lg:py-24 qt-texture-grid" style={{ backgroundColor: 'var(--qt-dark-navy)' }}>
        <Reveal className="mx-auto max-w-[1280px] px-5 text-center lg:px-8">
          <SectionHeader align="center" light eyebrow="Start the conversation" title="Let's make quality easier to see." />
          <p className="mx-auto mt-5 max-w-[440px] text-sm leading-6" style={{ color: 'var(--qt-mint-light)' }}>
            We're building toward launch with a small first group of laboratories. Join the waitlist, or talk to the team if you're evaluating for an institution or partnership.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button href="/waitlist" variant="gold">Join the waitlist</Button>
            <Button href="/talk-to-team" variant="reversed">Talk to the team</Button>
            <Button href="/book-demo" variant="reversed">Book a demo</Button>
          </div>
        </Reveal>
      </section>
    </PageShell>
  );
}

export default LandingPage;
