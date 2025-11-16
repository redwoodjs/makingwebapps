---
title: "Email client: Send & Receive email in Cloudflare"
summary: "You'll build an email client that can receive and send emails."
date: 2025-10-26
author: "Peter Pistorius"
---

Cloudflare now lets developers both send and receive email directly from Workers.
(The ability to send email is currently in closed beta but will be publicly available soon.)

In this guide, you’ll build a simple email client that runs entirely on Cloudflare; one you can later host on your own domain.

We’ll use RedwoodSDK and Cloudflare’s developer platform to put everything together. The project takes about an hour to complete and will walk you through the fundamentals of building modern webapps using a real-world example.

## Prerequisites

Please follow the installation guide over here.

## Getting started

Let’s start by spinning up a new RedwoodSDK project.
Open your terminal and run:

```bash
pnpx create-rwsdk email
cd email
pnpm install
pnpm dev
```

That’s it! You now have a local webserver running Miniflare, Cloudflare’s development environment, think of it as a tiny version of the Cloudflare network running on your laptop.

Open your browser and access the webserver; you'll be greeted by Redwood's welcome page.

## Configuring email

We'll start off by setting up the capability in Miniflare to send and receive emails.

First off; you need to "bind" these services to your worker. Add this to the `wrangler.jsonc` file.

```jsonc
"send_email": [
    {
      "name": "EMAIL"
    }
  ]
```

Then run `pnpm generate` to update the types. You now have the ability to send and receive emails.

### Sending an email

To test sending an email edit `worker.tsx` and add the following route

```tsx
import { EmailMessage } from "cloudflare:email";
import { env } from "cloudflare:workers";

export default defineApp([
  route("/email/send", async function () {
    const to = "peter@redwoodjs.com";
    const from = "peter@redwoodjs.com";
    await env.EMAIL.send(new EmailMessage(from, to, "hello world"));
    return new Response("email sent");
  }),
]);
```

When you access `/email/send` in your browser we'll execute the "EMAIL" binding that we defined in `wrangler.jsonc` (Bindings are a key part of workerd on Cloudflare!).

You will see a message in your terminal:

```bash
[wrangler:inf] send_email binding called with the following message:
  /var/folders/33/pn86qymd0w50htvsjp93rys40000gn/T/miniflare-f9be031ff417b2e67f2ac4cf94cb1b40/files/email/33e0a255-a7df-4f40-b712-0291806ed2b3.eml
```

This should produce a temporary `.eml` file that you can read. Note, it will not actually send an email in development mode.

### Receiving an email

To receive emails add an `email` function handler to the default export in `src/worker.tsx`

```tsx
const app = defineApp([
  // ... existing routes ...
]);

export default {
  fetch: app.fetch,
  email: async function (message) {
    console.log("email received");
  },
};
```

We will create a route called `send` to emulate sending an email. This route forwards requests to Cloudflare's email handler endpoint (`/cdn-cgi/handler/email`), simulating a real world email event that usually hits your server when your worker receives an email in production.

Add this route to your `defineApp` in `src/worker.tsx`:

```tsx
route("/test", async function ({ request }) {
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
```

Now access the `test` route and watch the messages in your console.

## Storing emails in a database

RedwoodSDK includes a thin database wrapper around an amazing piece of Cloudflare technology called "Durable Objects." We are going to store our emails in this database.
First thing we need to do is create a migration, add database durable object.

We'll store our emails in a database table called "emails," the first thing we need to do is create a migration in `src/db/migrations.ts`

```tsx
import { type Migrations, db } from "rwsdk/db";

export const migrations = {
  "001_initial_schema": {
    async up(db) {
      await db.schema
        .createTable("emails")
        .addColumn("id", "text", (col) => col.primaryKey())
        .addColumn("from", "text", (col) => col.notNull())
        .addColumn("to", "text", (col) => col.notNull())
        .addColumn("subject", "text", (col) => col.notNull())
        .addColumn("message", "text", (col) => col.notNull())
        .addColumn("raw", "text", (col) => col.notNull())
        .execute();
    },

    async down(db) {
      await db.schema.dropTable("emails").ifExists().execute();
    },
  },
} satisfies Migrations;
```

Then bind this database in `wrangler.jsonc`:

```jsonc
{
  "durable_objects": {
    "bindings": [
      {
        "name": "DATABASE",
        "class_name": "DatabaseDurableObject"
      }
    ]
  },
  "migrations": [
    {
      "tag": "v1",
      "new_sqlite_classes": ["DatabaseDurableObject"]
    }
  ]
}
```

Run `pnpm generate`, then create the database in `src/db/index.ts`:

```ts
import { env } from "cloudflare:workers";
import { type Database, createDb, SqliteDurableObject } from "rwsdk/db";
import { migrations } from "@/db/migrations";

export class DatabaseDurableObject extends SqliteDurableObject {
  migrations = migrations;
}

export type Database = Database<typeof migrations>;

export const db = createDb<Database>(
  env.DATABASE,
  "emails" // unique key for this database instance
);
```

The final step is to export this database in `worker.tsx`:

```tsx
export { DatabaseDurableObject } from "@/db";
```

### Saving emails in the database

Now that we have a place where we can store the received emails we're going to parse and insert them into our table; in `src/worker.tsx`:

```tsx
import { parseMimeMessage } from "cloudflare:email";
import { db } from "@/db";

export default {
  fetch: app.fetch,
  email: async function (message) {
    const { to, from, subject } = parseMimeMessage(message.raw);
    await db.emails.insert({
      id: crypto.randomUUID(), // TODO: let's just use auto-increment.
      to,
      from,
      subject,
      message: message.raw,
      raw: message.raw,
    });
  },
};
```

Every time we receive an email it is inserted into this database.

### Showing a list of emails

We will create a Page that retrieves the emails and lists them:

```tsx src/pages/emails.tsx
import { db } from "@/db";

export async function Emails() {
  const emails = await db.emails.selectAll();
  return (
    <div>
      <h1>Inbox - {emails.length}</h1>
      <ol>
        {emails.map((e) => (
          <li>
            {e.subject} {e.from}
          </li>
        ))}
      </ol>
    </div>
  );
}
```

We will now return this as the response on a route, we'll remove the "Home" page and replace it with our Inbox component.

```tsx worker.tsx
import { Emails } from "@/app/pages/emails";

const app = defineApp([route("/", Emails)]);
```

Access the home page and see a list of your emails.

### Viewing email detail

Let's add a link to the detail page on the inbox page.

```

```

Now let's build the detail page:

```tsx
import { db } from "@/db";

export async function EmailPage({ id }) {
  const email = await db.emails.findOneOrThrow({ id });

  return (
    <div>
      <div>From: {email.from}</div>
      <div>To: {email.to}</div>
      <div>Subject: {email.subject}</div>
      <div>{email.message}</div>
    </div>
  );
}
```

Add a route

```tsx worker.tsx
import { EmailPage } from "@/app/pages/emails";

const app = defineApp([
  route("/emails/:emailID", function ({ params }) {
    return <EmailPage id={params.emailID} />;
  }),
]);
```

Let's link to this page, now clicking on this link will take us to the detail page - so we can view the details of an email.

## Sending email

Let's create a ComposeEmail component. This will be an interactive component. We'll invoke a React Server Function to send the email.
