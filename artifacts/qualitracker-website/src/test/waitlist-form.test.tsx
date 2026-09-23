import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Router } from 'wouter';
import WaitlistPage from '@/pages/waitlist-page';

// Covers the path the audit flagged as untested (docs/website/12_SKILL_GAP_ANALYSIS.md):
// the two lead-capture forms' success and failure states. This is the
// exact failure path verified manually in-browser during the pivot
// (submitting with no backend running) — now it's a real, repeatable test.

async function fillRequiredFields() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/full name/i), 'Dr. Test');
  await user.type(screen.getByLabelText(/work email/i), 'test@example.org');
  await user.type(screen.getByLabelText(/laboratory \/ organization/i), 'Test Lab');
  await user.type(screen.getByLabelText(/organization type/i), 'Medical laboratory');
  await user.type(screen.getByLabelText(/^country$/i), 'Kenya');
  await user.type(screen.getByLabelText(/your role/i), 'Lab director');
  await user.type(screen.getByLabelText(/expectations for the product/i), 'A simpler way to manage laboratory quality processes.');
  return user;
}

describe('WaitlistPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows a confirmation state after a successful submission', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 201, json: async () => ({ id: '1', status: 'new' }) }),
    );
    render(
      <Router>
        <WaitlistPage />
      </Router>,
    );
    const user = await fillRequiredFields();
    await user.click(screen.getByRole('button', { name: /join the waitlist/i }));

    expect(await screen.findByText(/you're on the list/i)).toBeInTheDocument();
  });

  it('shows an error message when the request fails (e.g. no backend running)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));
    render(
      <Router>
        <WaitlistPage />
      </Router>,
    );
    const user = await fillRequiredFields();
    await user.click(screen.getByRole('button', { name: /join the waitlist/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/something went wrong/i);
    });
  });
});
