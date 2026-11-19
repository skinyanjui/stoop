import type { FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { copyText } from '../utils/format';

const CONTACT_CHANNELS = [
  { label: 'General & Listing Support', email: 'support@stoopsales.com' },
  { label: 'Privacy, Safety & DMCA', email: 'legal@stoopsales.com' },
  { label: 'Local Sponsor Ads', email: 'partners@stoopsales.com' },
] as const;

const CONTACT_TOPICS = [
  'General support',
  'Report an inaccurate or unsafe listing',
  'Privacy & account data deletion',
  'Copyright / legal takedown',
  'Local sponsor advertising',
] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function recipientForTopic(topic: string): string {
  const lower = topic.toLowerCase();
  if (lower.includes('sponsor')) return 'partners@stoopsales.com';
  if (lower.includes('report') || lower.includes('privacy') || lower.includes('legal')) {
    return 'legal@stoopsales.com';
  }
  return 'support@stoopsales.com';
}

export function LegalContactForm({
  contactSeed,
}: {
  contactSeed?: { topic?: string; message?: string } | null;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState(contactSeed?.topic || 'General support');
  const [msg, setMsg] = useState(contactSeed?.message || '');
  const [sent, setSent] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [formErr, setFormErr] = useState<string | null>(null);
  const [invalidFields, setInvalidFields] = useState<{
    name?: boolean;
    email?: boolean;
    msg?: boolean;
  }>({});
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!contactSeed) return;
    if (contactSeed.topic) setTopic(contactSeed.topic);
    if (contactSeed.message) setMsg(contactSeed.message);
    setSent(false);
    setCopyState('idle');
    setFormErr(null);
    setInvalidFields({});
  }, [contactSeed]);

  const submitContact = (e: FormEvent) => {
    e.preventDefault();
    const badName = !name.trim();
    const badEmail = !EMAIL_RE.test(email.trim());
    const badMsg = !msg.trim();
    if (badName || badEmail || badMsg) {
      setInvalidFields({ name: badName, email: badEmail, msg: badMsg });
      setFormErr('Please enter your name, a valid email address, and a message.');
      const firstId = badName ? 'c-name' : badEmail ? 'c-email' : 'c-msg';
      document.getElementById(firstId)?.focus();
      return;
    }
    setInvalidFields({});
    setFormErr(null);
    setCopyState('idle');
    setSent(true);
  };

  const recipient = recipientForTopic(topic);
  const emailBody = `From: ${name.trim()} (${email.trim()})\n\n${msg.trim()}`;

  const copyDraft = async () => {
    const ok = await copyText(
      `To: ${recipient}\nSubject: [Stoop] ${topic}\n\n${emailBody}`,
    );
    setCopyState(ok ? 'copied' : 'failed');
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopyState('idle'), 2200);
  };

  return (
    <div className="legal-prose">
      <p className="legal-updated">Support, Safety Reports &amp; Legal Inquiries</p>
      <p>
        Need help with a listing, want to report an inaccurate pin, prohibited item,
        or DMCA copyright concern, request account deletion, or inquire about local
        sponsorship? Contact the appropriate team below—inquiries are typically
        answered within 1–2 business days.
      </p>
      <div className="contact-cards">
        {CONTACT_CHANNELS.map((c) => (
          <div key={c.email} className="contact-card">
            <span className="contact-lbl">{c.label}</span>
            <a href={`mailto:${c.email}`}>{c.email}</a>
          </div>
        ))}
      </div>
      <p>
        <strong>What to include:</strong> For listing reports or DMCA notices,
        please include the exact sale title, street address (or shared link), and a
        brief description of the issue so our team can locate and review it quickly.
      </p>

      {sent ? (
        <div className="demo-note flex flex-col items-start gap-2" role="status">
          <span>
            Thanks, {name.trim()}! Your &ldquo;{topic}&rdquo; draft is ready to send
            to <strong>{recipient}</strong>. Open it in your email app or copy the
            message below.
          </span>
          <div className="flex flex-wrap gap-3">
            <a
              className="link"
              href={`mailto:${recipient}?subject=${encodeURIComponent(`[Stoop] ${topic}`)}&body=${encodeURIComponent(
                emailBody,
              )}`}
            >
              Open in email app
            </a>
            <button type="button" className="link" onClick={copyDraft} aria-live="polite">
              {copyState === 'copied'
                ? 'Copied!'
                : copyState === 'failed'
                  ? 'Copy failed'
                  : 'Copy message'}
            </button>
            <button
              type="button"
              className="link"
              onClick={() => {
                setSent(false);
                setCopyState('idle');
              }}
            >
              Edit message
            </button>
          </div>
        </div>
      ) : (
        <form className="contact-form" onSubmit={submitContact} noValidate>
          <div className="row">
            <div className="field">
              <label htmlFor="c-name">Name</label>
              <input
                id="c-name"
                className="input"
                aria-invalid={invalidFields.name ? 'true' : undefined}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (invalidFields.name) setInvalidFields((p) => ({ ...p, name: false }));
                  if (formErr) setFormErr(null);
                }}
                placeholder="Alex Morgan"
                maxLength={80}
              />
            </div>
            <div className="field">
              <label htmlFor="c-email">Email</label>
              <input
                id="c-email"
                type="email"
                className="input"
                aria-invalid={invalidFields.email ? 'true' : undefined}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (invalidFields.email) setInvalidFields((p) => ({ ...p, email: false }));
                  if (formErr) setFormErr(null);
                }}
                placeholder="you@example.com"
                maxLength={120}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="c-topic">Topic</label>
            <select
              id="c-topic"
              className="input"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            >
              {CONTACT_TOPICS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="c-msg">Message</label>
            <textarea
              id="c-msg"
              className="input"
              aria-invalid={invalidFields.msg ? 'true' : undefined}
              value={msg}
              onChange={(e) => {
                setMsg(e.target.value);
                if (invalidFields.msg) setInvalidFields((p) => ({ ...p, msg: false }));
                if (formErr) setFormErr(null);
              }}
              placeholder="Include listing title, street address, or how we can help…"
              maxLength={1000}
            />
          </div>
          {formErr && (
            <div className="error" role="alert">
              {formErr}
            </div>
          )}
          <button type="submit" className="btn btn-primary self-start">
            Prepare message
          </button>
        </form>
      )}
    </div>
  );
}
