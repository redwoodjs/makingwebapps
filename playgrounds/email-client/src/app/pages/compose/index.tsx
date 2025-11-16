"use client";

import { useState } from "react";
import { sendEmail } from "./actions";

export function ComposePage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSending(true);
    setResult(null);

    try {
      const response = await sendEmail({ from, to, subject, message });
      setResult(response);
      // Reset form on success
      if (response.success) {
        setFrom("");
        setTo("");
        setSubject("");
        setMessage("");
      }
    } catch (error) {
      setResult({ success: false });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div>
      <h1>Compose Email</h1>
      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          maxWidth: "600px",
        }}
      >
        <div>
          <label htmlFor="from">From:</label>
          <input
            id="from"
            type="email"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            required
            disabled={isSending}
          />
        </div>
        <div>
          <label htmlFor="to">To:</label>
          <input
            id="to"
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            required
            disabled={isSending}
          />
        </div>
        <div>
          <label htmlFor="subject">Subject:</label>
          <input
            id="subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            disabled={isSending}
          />
        </div>
        <div>
          <label htmlFor="message">Message:</label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            disabled={isSending}
            rows={10}
          />
        </div>
        <button type="submit" disabled={isSending}>
          {isSending ? "Sending..." : "Send Email"}
        </button>
        {result && (
          <div style={{ color: result.success ? "green" : "red" }}>
            {result.success
              ? "Email sent successfully!"
              : "Failed to send email"}
          </div>
        )}
      </form>
    </div>
  );
}

