export interface WaitlistLead {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  institution?: string | null;
  organizationType?: string | null;
  country?: string | null;
  role?: string | null;
  message?: string | null;
  source: string;
  createdAt: Date;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]!);
}

export function formatWaitlistNotification(lead: WaitlistLead) {
  const name = [lead.firstName, lead.lastName].filter(Boolean).join(" ").trim() || "Not provided";
  const fields = [
    ["Full name", name],
    ["Work email", lead.email],
    ["Laboratory / organization", lead.institution || "Not provided"],
    ["Organization type", lead.organizationType || "Not provided"],
    ["Country", lead.country || "Not provided"],
    ["Role", lead.role || "Not provided"],
    ["Expectations for the product", lead.message || "Not provided"],
  ];
  const details = [
    ["Date (UTC)", lead.createdAt.toISOString()],
    ["Source", lead.source === "waitlist-page" ? "QualiTracker Waitlist Page" : lead.source],
    ["Status", "New"],
    ["Submission ID", lead.id],
  ];
  const render = ([label, value]: string[]) => {
    const safeValue = escapeHtml(value);
    const content = label === "Work email"
      ? '<a href="mailto:' + escapeHtml(encodeURIComponent(value).replace(/%40/g, "@")) + '">' + safeValue + "</a>"
      : safeValue.replace(/\r?\n/g, "<br>");
    return '<p><strong>' + escapeHtml(label) + ':</strong><br>' + content + "</p>";
  };
  return {
    subject: "New QualiTracker Waitlist Submission — " + name.replace(/[\r\n\u0000-\u001f\u007f]/g, " ").slice(0, 120),
    reply_to: lead.email,
    text: "New QualiTracker Waitlist Submission\n\n" +
      fields.map(([label, value]) => label + ": " + value).join("\n\n") +
      "\n\nSubmission Details\n\n" +
      details.map(([label, value]) => label + ": " + value).join("\n"),
    html: '<div style="font-family:Arial,sans-serif;color:#1A3A4A;max-width:640px">' +
      '<h2 style="color:#025561">New QualiTracker Waitlist Submission</h2>' +
      fields.map(render).join("") + "<hr><h3>Submission Details</h3>" +
      details.map(render).join("") + "</div>",
  };
}

/** Called only after the lead is stored. The route handles failure without losing the signup. */
export async function sendWaitlistNotification(
  lead: WaitlistLead,
  env: Record<string, string | undefined> = process.env,
  fetcher: typeof fetch = fetch,
): Promise<"sent" | "not_configured"> {
  const apiKey = env.RESEND_API_KEY?.trim();
  const from = env.EMAIL_FROM?.trim();
  const to = env.WAITLIST_NOTIFICATION_EMAIL?.split(",").map((email) => email.trim()).filter(Boolean);
  if (!apiKey || !from || !to?.length) return "not_configured";

  const response = await fetcher("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json",
      "Idempotency-Key": "waitlist/" + lead.id,
    },
    body: JSON.stringify({ from, to, ...formatWaitlistNotification(lead) }),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) {
    // Do not include provider bodies, API keys, or submission contents in logs.
    throw new Error("Waitlist email provider returned HTTP " + response.status);
  }
  return "sent";
}
