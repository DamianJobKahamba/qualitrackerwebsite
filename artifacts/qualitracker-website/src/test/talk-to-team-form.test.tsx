import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Router } from 'wouter';
import TalkToTeamPage from '@/pages/talk-to-team-page';

// Regression test for the audit's CRITICAL finding (docs/website/21_*): this
// form used to POST to /api/leads, which does not exist on the static host
// (HTTP 405 in production), so every submission silently failed. It must
// now go through EmailJS — and must never touch /api/leads again.

function renderPage() {
  return render(
    <Router>
      <TalkToTeamPage />
    </Router>,
  );
}

async function fill(user: ReturnType<typeof userEvent.setup>, { consent }: { consent: boolean }) {
  await user.type(screen.getByLabelText(/full name/i), 'Dr. Test');
  await user.type(screen.getByLabelText(/work email/i), 'test@example.org');
  await user.selectOptions(screen.getByLabelText(/what's this about/i), 'General inquiry');
  await user.type(screen.getByLabelText(/^message \(optional\)/i), 'Hello team');
  if (consent) await user.click(screen.getByRole('checkbox', { name: /privacy notice/i }));
}

describe('TalkToTeamPage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends through EmailJS (not /api/leads) and shows confirmation', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
    renderPage();
    const user = userEvent.setup();
    await fill(user, { consent: true });
    await user.click(screen.getByRole('button', { name: /send message/i }));

    expect(await screen.findByText(/message received/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.emailjs.com/api/v1.0/email/send');
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.template_params.expectations).toContain('Inquiry: General inquiry');
    expect(body.template_params.expectations).toContain('Hello team');
  });

  it('does not send anything without the privacy confirmation', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderPage();
    const user = userEvent.setup();
    await fill(user, { consent: false });
    await user.click(screen.getByRole('button', { name: /send message/i }));

    // The checkbox is `required`, so the browser blocks submit; if it ever
    // stops being required, our own check still must stop the request.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows an error (no false success) when EmailJS rejects the request', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400 }));
    renderPage();
    const user = userEvent.setup();
    await fill(user, { consent: true });
    await user.click(screen.getByRole('button', { name: /send message/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/something went wrong/i);
    expect(screen.queryByText(/message received/i)).not.toBeInTheDocument();
  });
});
