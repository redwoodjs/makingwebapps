import * as PostalMime from "postal-mime";
import { EmailMessage } from "cloudflare:email";
import { createMimeMessage } from "mimetext";
import { render, route } from "rwsdk/router";
import { defineApp } from "rwsdk/worker";
import { env, WorkerEntrypoint } from "cloudflare:workers";

import { Document } from "@/app/Document";
import { setCommonHeaders } from "@/app/headers";
import { EmailsPage } from "@/app/pages/emails";
import { EmailPage } from "@/app/pages/email";
import { ComposePage } from "@/app/pages/compose";

export { DatabaseDurableObject } from "@/db/do";

export type AppContext = {};

const app = defineApp([
  setCommonHeaders(),
  ({ ctx }) => {
    // setup ctx here
    ctx;
  },
  // Email test route
  route("/email/send", async function () {
    const msg = createMimeMessage();
    msg.setSender({ name: "Email Client", addr: "[email protected]" });
    msg.setRecipient("[email protected]");
    msg.setSubject("An email generated in a worker");
    msg.addMessage({
      contentType: "text/plain",
      data: "Congratulations, you just sent an email from a worker.",
    });

    const message = new EmailMessage(
      "[email protected]",
      "[email protected]",
      msg.asRaw()
    );
    await env.EMAIL.send(message);
    return Response.json({ ok: true });
  }),
  // Simulate incoming email route
  route("/simulate-incoming-email", async function ({ request }) {
    const url = new URL(request.url);
    const from = url.searchParams.get("from") || "sender@example.com";
    const to = url.searchParams.get("to") || "recipient@example.com";
    const body = await request.text();

    // Forward the request to Cloudflare's email handler endpoint
    const emailHandlerUrl = new URL("/cdn-cgi/handler/email", url.origin);
    emailHandlerUrl.searchParams.set("from", from);
    emailHandlerUrl.searchParams.set("to", to);

    const response = await fetch(emailHandlerUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
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

/**
 * This is the default worker entrypoint for the Worker.
 * It extends the WorkerEntrypoint class and implements the email and fetch handlers.
 */
export default class DefaultWorker extends WorkerEntrypoint<Env> {
  /**
   * Email handler for the Worker.
   * The `message` parameter is a ForwardableEmailMessage object
   *
   * You can call `message.reply()` to respond directly to the
   * inbound sender without additional verification steps.
   */
  async email(message: ForwardableEmailMessage) {
    // console.log("📧 Email received");
    // // Parse the inbound email
    // const parser = new PostalMime.default();
    // const rawEmail = new Response((message as any).raw);
    // const receivedEmail = await parser.parse(await rawEmail.arrayBuffer());
    // console.log("📧 Email received and parsed", receivedEmail);
    // // Extract email data for database storage
    // const to = receivedEmail.to?.[0]?.address || "";
    // const from = receivedEmail.from?.address || "";
    // const subject = receivedEmail.subject || "";
    // // Create database instance with this.env
    // //const emailDb = createDb<DB>(this.env.DATABASE, "emails");
    // // Store the email in the database
    // await (emailDb as any).emails.insert({
    //   id: crypto.randomUUID(),
    //   to,
    //   from,
    //   subject,
    //   message: receivedEmail.text || receivedEmail.html || "",
    //   raw: (message as any).raw,
    // });
  }

  /**
   * Fetch handler for the Worker.
   * Needed so that the worker can handle the request and pass it to the app.
   */
  override async fetch(request: Request) {
    return await app.fetch(request, this.env, this.ctx);
  }
}
