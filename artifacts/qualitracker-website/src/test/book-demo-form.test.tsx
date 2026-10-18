import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Router } from 'wouter';
import BookDemoPage from '@/pages/book-demo-page';

// The demo form is a *request*: it emails the team through EmailJS and the
// team confirms by replying. These tests pin that contract — including that
// the confirmation never claims the demo is booked.

function isoDaysAhead(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const pad = (v: number) => String(v).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function renderPage() {
  return render(
    <Router>
      <BookDemoPage />
    </Router>,
  );
}

async function fill(
  user: ReturnType<typeof userEvent.setup>,
  { consent = true, date = isoDaysAhead(7), backup = '' }: { consent?: boolean; date?: string; backup?: string } = {},
) {
  await user.type(screen.getByLabelText(/full name/i), 'Dr. Test');
  await user.type(screen.getByLabelText(/work email/i), 'test@example.org');
  await user.type(screen.getByLabelText(/laboratory \/ organization/i), 'Test Regional Lab');
  fireEvent.change(screen.getByLabelText(/^preferred date/i), { target: { value: date } });
  if (backup) fireEvent.change(screen.getByLabelText(/backup date/i), { target: { value: backup } });
  await user.selectOptions(screen.getByLabelText(/preferred time window/i), 'Morning (09:00–12:00)');
  if (consent) await user.click(screen.getByRole('checkbox', { name: /privacy notice/i }));
}

describe('BookDemoPage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('emails the team through EmailJS and says the demo is not booked yet', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
    renderPage();
    const user = userEvent.setup();
    const date = isoDaysAhead(7);
    await fill(user, { date, backup: isoDaysAhead(9) });
    await user.click(screen.getByRole('button', { name: /request this time/i }));

    expect(await screen.findByText(/request received/i)).toBeInTheDocument();
    expect(screen.getByText(/isn't booked yet/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.emailjs.com/api/v1.0/email/send');
    const params = JSON.parse(fetchMock.mock.calls[0][1].body).template_params;
    expect(params.expectations).toContain('DEMO REQUEST');
    expect(params.expectations).toContain('Morning (09:00–12:00)');
    expect(params.expectations).toContain('Backup date');
    expect(params.work_email).toBe('test@example.org');
    expect(params.organization).toBe('Test Regional Lab');
  });

  it('does not send anything without the privacy confirmation', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderPage();
    const user = userEvent.setup();
    await fill(user, { consent: false });
    await user.click(screen.getByRole('button', { name: /request this time/i }));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a date in the past without sending', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderPage();
    const user = userEvent.setup();
    await fill(user, { date: isoDaysAhead(-3) });
    await user.click(screen.getByRole('button', { name: /request this time/i }));
    // The date input's `min` makes the browser (and jsdom) block submit
    // before our handler runs; our own range check is the backstop.
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByText(/request received/i)).not.toBeInTheDocument();
  });

  it('shows an error (no false success) when EmailJS rejects the request', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400 }));
    renderPage();
    const user = userEvent.setup();
    await fill(user);
    await user.click(screen.getByRole('button', { name: /request this time/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/something went wrong/i);
    expect(screen.queryByText(/request received/i)).not.toBeInTheDocument();
  });
});
