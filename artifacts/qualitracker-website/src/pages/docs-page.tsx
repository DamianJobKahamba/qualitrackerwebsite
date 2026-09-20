import { useState } from 'react';
import { Link } from 'wouter';
import { PageShell } from '@/components/site/page-shell';
import { StatusBadge } from '@/components/site/status-badge';
import { Button } from '@/components/site/button';
import { useDocumentMeta } from '@/lib/use-document-meta';

interface DocLeaf {
  id: string;
  label: string;
}
interface DocGroup {
  label: string;
  items: DocLeaf[];
}

// The full documentation IA the product is being built toward. Only
// getting-started/introduction has real content today — everything else
// renders an honest "Coming soon" state rather than fabricated depth.
// See docs/website/08_PIVOT_ADDENDUM.md for why this is scoped this way.
const DOC_GROUPS: DocGroup[] = [
  { label: 'Getting started', items: [
    { id: 'introduction', label: 'Introduction' },
    { id: 'quickstart', label: 'Quickstart' },
    { id: 'platform-overview', label: 'Platform overview' },
    { id: 'core-concepts', label: 'Core concepts' },
  ] },
  { label: 'QualiTracker QMS', items: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'documents', label: 'Documents' },
    { id: 'sops', label: 'SOPs' },
    { id: 'capa', label: 'CAPA' },
    { id: 'non-conformances', label: 'Non-conformances' },
    { id: 'audits', label: 'Audits' },
    { id: 'equipment', label: 'Equipment' },
    { id: 'calibration', label: 'Calibration' },
    { id: 'personnel', label: 'Personnel' },
    { id: 'training', label: 'Training' },
    { id: 'risk', label: 'Risk' },
    { id: 'reports', label: 'Reports' },
  ] },
  { label: 'AI & RAG', items: [
    { id: 'ai-overview', label: 'Overview' },
    { id: 'knowledge-retrieval', label: 'Knowledge retrieval' },
    { id: 'sources', label: 'Sources' },
    { id: 'permissions', label: 'Permissions' },
    { id: 'traceability', label: 'Traceability' },
    { id: 'human-verification', label: 'Human verification' },
  ] },
  { label: 'Integrations', items: [
    { id: 'integrations-overview', label: 'Overview' },
    { id: 'api', label: 'API' },
    { id: 'webhooks', label: 'Webhooks' },
    { id: 'external-systems', label: 'External systems' },
  ] },
  { label: 'MCP', items: [
    { id: 'mcp-introduction', label: 'Introduction' },
    { id: 'mcp-connecting', label: 'Connecting QualiTracker' },
    { id: 'mcp-server-setup', label: 'MCP server setup' },
    { id: 'mcp-authentication', label: 'Authentication' },
    { id: 'mcp-tools', label: 'Tools' },
    { id: 'mcp-resources', label: 'Resources' },
    { id: 'mcp-permissions', label: 'Permissions' },
    { id: 'mcp-examples', label: 'Examples' },
    { id: 'mcp-troubleshooting', label: 'Troubleshooting' },
  ] },
  { label: 'Reference', items: [
    { id: 'api-reference', label: 'API reference' },
    { id: 'security', label: 'Security' },
    { id: 'compliance', label: 'Compliance' },
    { id: 'changelog', label: 'Changelog' },
    { id: 'support', label: 'Support' },
  ] },
];

const ALL_ITEMS = DOC_GROUPS.flatMap((g) => g.items.map((i) => ({ ...i, group: g.label })));

function IntroductionContent() {
  return (
    <div className="qt-reveal max-w-[640px]">
      <StatusBadge status="early-access" />
      <h1 className="font-brand mt-4 text-3xl font-bold" style={{ color: 'var(--qt-near-black)' }}>Introduction</h1>
      <p className="mt-4 text-sm leading-7" style={{ color: 'var(--qt-body-grey)' }}>
        QualiTracker is a digital quality-management system for laboratories, made of two connected parts:
      </p>
      <ul className="mt-4 space-y-3">
        <li className="text-sm leading-6" style={{ color: 'var(--qt-body-grey)' }}>
          <strong style={{ color: 'var(--qt-near-black)' }}>The QMS Module</strong> — a versioned document and record repository: SOPs, policies, quality records, and audit logs, kept in one governed, searchable place.
        </li>
        <li className="text-sm leading-6" style={{ color: 'var(--qt-body-grey)' }}>
          <strong style={{ color: 'var(--qt-near-black)' }}>QualiBOT</strong> — a conversational AI assistant grounded in your lab's own uploaded documents. It answers in plain language, cites its source, and says so plainly when it can't find one — see <Link href="/product#ai-rag" style={{ color: 'var(--qt-deep-teal)' }}>how it works</Link>.
        </li>
      </ul>
      <p className="mt-4 text-sm leading-7" style={{ color: 'var(--qt-body-grey)' }}>
        The rest of this documentation — quickstart steps, the full QMS module reference, API and MCP integration guides — is being written alongside the product itself. Sections not yet ready are marked clearly rather than left to look finished before they are.
      </p>
      <div className="mt-6">
        <Button href="/talk-to-team" variant="secondary">Ask the team a question</Button>
      </div>
    </div>
  );
}

function ComingSoon({ label, group }: { label: string; group: string }) {
  return (
    <div className="qt-reveal max-w-[520px]">
      <p className="qt-technical-label">{group}</p>
      <h1 className="font-brand mt-2 text-2xl font-bold" style={{ color: 'var(--qt-near-black)' }}>{label}</h1>
      <div className="mt-4"><StatusBadge status="coming-soon" /></div>
      <p className="mt-4 text-sm leading-6" style={{ color: 'var(--qt-body-grey)' }}>
        This section isn't written yet. QualiTracker's documentation is being built alongside the product — this page will have real content once that part of the platform is ready to document.
      </p>
    </div>
  );
}

function DocsPage() {
  useDocumentMeta('Docs — QualiTracker', 'QualiTracker documentation: platform overview, QMS modules, AI & RAG, integrations, and MCP.', '/docs');
  const [active, setActive] = useState('introduction');
  const activeItem = ALL_ITEMS.find((i) => i.id === active);

  return (
    <PageShell>
      <div className="mx-auto max-w-[1280px] px-5 py-10 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
          <aside className="lg:sticky lg:top-20 lg:self-start">
            {DOC_GROUPS.map((group) => (
              <div key={group.label} className="mb-6">
                <p className="qt-technical-label mb-2">{group.label}</p>
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActive(item.id)}
                    className="qt-button qt-focus block w-full rounded-md px-2 py-1.5 text-left text-[13px]"
                    style={{
                      background: active === item.id ? 'var(--qt-teal-tint)' : 'transparent',
                      color: active === item.id ? 'var(--qt-deep-teal)' : 'var(--qt-near-black)',
                      fontWeight: active === item.id ? 600 : 400,
                    }}
                    data-testid={`link-docs-${item.id}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ))}
          </aside>
          <div>
            {active === 'introduction' ? (
              <IntroductionContent />
            ) : (
              <ComingSoon label={activeItem?.label ?? ''} group={activeItem?.group ?? ''} />
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}

export default DocsPage;
