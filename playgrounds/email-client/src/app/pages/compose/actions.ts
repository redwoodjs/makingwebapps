"use server";

import { EmailMessage } from "cloudflare:email";
import { createMimeMessage } from "mimetext";
import { env } from "cloudflare:workers";

export async function sendEmail({
  from,
  to,
  subject,
  message,
}: {
  from: string;
  to: string;
  subject: string;
  message: string;
}) {
  // Create a MIME message with proper formatting
  const msg = createMimeMessage();
  msg.setSender({ addr: from });
  msg.setRecipient(to);
  msg.setSubject(subject);
  msg.addMessage({
    contentType: "text/plain",
    data: message,
  });

  // Create EmailMessage with raw MIME content
  const emailMessage = new EmailMessage(from, to, msg.asRaw());
  await env.EMAIL.send(emailMessage);
  return { success: true };
}
