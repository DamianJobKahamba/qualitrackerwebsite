import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Router } from 'wouter';

import LandingPage from '@/pages/landing-page';
import ProductPage from '@/pages/product-page';
import SolutionsPage from '@/pages/solutions-page';
import DocsPage from '@/pages/docs-page';
import CompanyPage from '@/pages/company-page';
import SecurityPage from '@/pages/security-page';
import WaitlistPage from '@/pages/waitlist-page';
import TalkToTeamPage from '@/pages/talk-to-team-page';
import PrivacyPage from '@/pages/privacy-page';
import NotFound from '@/pages/not-found';

// One smoke test per route: renders without throwing, and shows the nav
// (proof PageShell mounted) plus a heading unique to that page. Not a
// design/behaviour test — just the thing that was missing entirely before
// this pass (see docs/website/12_SKILL_GAP_ANALYSIS.md).
const PAGES: Array<{ name: string; Component: () => React.JSX.Element; heading: RegExp }> = [
  { name: 'Home', Component: LandingPage, heading: /quality that works for every lab/i },
  { name: 'Product', Component: ProductPage, heading: /the platform, module by module/i },
  { name: 'Solutions', Component: SolutionsPage, heading: /built for quality-intensive laboratory work/i },
  { name: 'Docs', Component: DocsPage, heading: /introduction/i },
  { name: 'Company', Component: CompanyPage, heading: /built in east africa, for east africa/i },
  { name: 'Security', Component: SecurityPage, heading: /your lab's data never leaves its own boundary/i },
  { name: 'Waitlist', Component: WaitlistPage, heading: /join the waitlist\./i },
  { name: 'Talk to the team', Component: TalkToTeamPage, heading: /talk to the team\./i },
  { name: 'Privacy', Component: PrivacyPage, heading: /privacy notice\./i },
  { name: 'Not found', Component: NotFound, heading: /page not found/i },
];

describe('page smoke tests', () => {
  for (const { name, Component, heading } of PAGES) {
    it(`${name} renders its heading and the site nav`, () => {
      render(
        <Router>
          <Component />
        </Router>,
      );
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
      expect(screen.getByLabelText('QualiTracker home')).toBeInTheDocument();
    });
  }
});
