import PostalMime from "postal-mime";
import { render, route } from "rwsdk/router";
import { defineApp } from "rwsdk/worker";
import { WorkerEntrypoint } from "cloudflare:workers";

import { Document } from "@/app/Document";
import { setCommonHeaders } from "@/app/headers";
import { EmailsPage } from "@/app/pages/emails";
import { EmailPage } from "@/app/pages/email";
import { ComposePage } from "@/app/pages/compose";

import { db } from "@/db";

export { DatabaseDurableObject } from "@/db";

export type AppContext = {};

const app = defineApp([
  setCommonHeaders(),
  ({ ctx }) => {
    // setup ctx here
    ctx;
  },

  // Simulate incoming email route
  route("/test", async function ({ request }) {
    const url = new URL(request.url);
    const from = url.searchParams.get("from") || "sender@example.com";
    const to = url.searchParams.get("to") || "recipient@example.com";

    // Construct raw email body
    const emailBody = `Received: from smtp.example.com (127.0.0.1)
        by cloudflare-email.com (unknown) id 4fwwffRXOpyR
        for <${to}>; Tue, 27 Aug 2024 15:50:20 +0000
From: "John" <${from}>
Reply-To: ${from}
To: ${to}
Subject: Testing Email Workers Local Dev
Content-Type: text/html; charset="windows-1252"
X-Mailer: Curl
Date: Tue, 27 Aug 2024 08:49:44 -0700
Message-ID: <6114391943504294873000@ZSH-GHOSTTY>

Hi there`;

    // Forward the request to Cloudflare's email handler endpoint
    const emailHandlerUrl = new URL("/cdn-cgi/handler/email", url.origin);
    emailHandlerUrl.searchParams.set("from", from);
    emailHandlerUrl.searchParams.set("to", to);

    const response = await fetch(emailHandlerUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: emailBody,
    });

    return response;
  }),
  render(Document, [
    route("/", EmailsPage),
    route("/emails/:emailID", function ({ params }) {
      return <EmailPage id={params.emailID} />;
    }),
    route("/compose", ComposePage),
  ]),
]);

export default class DefaultWorker extends WorkerEntrypoint<Env> {
  async email(message: ForwardableEmailMessage) {
    console.log("📧 Email received");
    // Parse the inbound email
    const parser = new PostalMime();
    // Convert ReadableStream to ArrayBuffer
    const rawEmailBuffer = await new Response(message.raw).arrayBuffer();
    const receivedEmail = await parser.parse(rawEmailBuffer);
    console.log("📧 Email received and parsed", receivedEmail);
    // Extract email data for database storage
    const to = receivedEmail.to?.[0]?.address || "";
    const from = receivedEmail.from?.address || "";
    const subject = receivedEmail.subject || "";

    // Convert raw email to text for database storage
    const rawEmailText = new TextDecoder().decode(rawEmailBuffer);

    db.insertInto("emails")
      .values({
        id: crypto.randomUUID(),
        to,
        from,
        subject,
        message: receivedEmail.text || receivedEmail.html || "",
        raw: rawEmailText,
      })
      .execute();

    return Response.json({ ok: true });
  }

  override async fetch(request: Request) {
    return await app.fetch(request, this.env, this.ctx);
  }
}
