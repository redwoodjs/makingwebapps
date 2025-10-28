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

## Prerequistes

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

Open your browser and access the webserver; you'll be greated by Redwood's

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

Then run `pnpm generate` to update the types. You now have the ability to send and receive emails;

### Sending an email

To test sending an email edit `worker.tsx` and add the following route

```tsx
import { EmailMessage } from "cloudflare:email";

export default defineApp([
  route("/email/send", function () {
    const to = "peter@redwoodjs.com";
    const from = "peter@redwoodjs.com";
    await env.EMAIL.send(to, from, "hello world");
    return new Respone("email sent");
  }),
]);
```

When you access `/email/send` in your browser we'll execute the "EMAIL" binding that we defined in `wrangler.jsonc` (Bindings are a key part of workerd on Cloudflare!).

You will see a message in your terminal:

```
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

Test this using the following script, this will simulate a real world email event that usually hits your server when your worker receives an email in production.

```
curl --request POST 'http://localhost:8787/cdn-cgi/handler/email' \
  --url-query 'from=sender@example.com' \
  --url-query 'to=recipient@example.com' \
  --header 'Content-Type: application/json' \
  --data-raw 'Received: from smtp.example.com (127.0.0.1)
        by cloudflare-email.com (unknown) id 4fwwffRXOpyR
        for <recipient@example.com>; Tue, 27 Aug 2024 15:50:20 +0000
From: "John" <sender@example.com>
Reply-To: sender@example.com
To: recipient@example.com
Subject: Testing Email Workers Local Dev
Content-Type: text/html; charset="windows-1252"
X-Mailer: Curl
Date: Tue, 27 Aug 2024 08:49:44 -0700
Message-ID: <6114391943504294873000@ZSH-GHOSTTY>

Hi there'
```

## Storing emails in a database

RedwoodSDK includes a thin database wrapper around an amazing piece of Cloudflare technology called "Durable Objects." We are going to store our emails in this database.
First thing we need to do is create a migration, add database durable object.

We'll store our emails in a database table called "emails," the first thing we need to do is create a migration in `src/db/migrations.ts`

```tsx
import { type Migrations } from "rwsdk/db";

export const migrations = {
  "001_initial_schema": {
    async up(db) {
      await db.schema
        .createTable("emails")
        .addColumn("id", "text", (col) => col.primaryKey())
        .addColumn("from", "text", (col) => col.notNull())
        .addColumn("to", "integer", (col) => col.notNull())
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
        "name": "APP_DURABLE_OBJECT",
        "class_name": "AppDurableObject"
      }
    ]
  },
  "migrations": [
    {
      "tag": "v1",
      "new_sqlite_classes": ["AppDurableObject"]
    }
  ]
}
```

Run `pnpm generate`, then create the database in `src/db/index.ts

```ts
import { env } from "cloudflare:workers";
import { type Database, createDb } from "rwsdk/db";
import { migrations } from "@/db/migrations";

export class DatabaseDurableObject extends SqliteDurableObject {
  migrations = migrations;
}

export type AppDatabase = Database<typeof migrations>;

export const db = createDb<AppDatabase>(
  env.APP_DURABLE_OBJECT,
  "emails" // unique key for this database instance
);
```

The final step is to export this database:

```tsx
import { db, DatabaseDurableObject } from "@/db";
export { DatabaseDurableObject };
```

### Saving emails in the database

Now that we have a place where we can store the receveived emails we're going to parse and insert them into our table; in src `worker.tsx`

```tsx
export default {
  fetch: app.fetch,
  email: async function (raw) {
    const { to, from, subject } = parseMimeMessage(message);
    await db.emails.insert({
      to,
      from,
      subject,
      raw,
    });
  },
};
```

Every time we receive an email it is inserted into this database.

### Showing a list of emails

We will create a Page that retrieves the emails and lists them:

```tsx src/pages/emails.tsx
import { db } from "@app/db"

export async function Emails() {
    const emails = await db.emails.selectAll()
    return (<div>
    <h1>Inbox - ${emails.length}</h1>
    <ol>
        {email.map(e => <li> {date} {subject} {sender}</li>)}
    <ol><div>)
}
```

We will now return this as the response on a route, we'll remove the "Home" page and replace it with our Inbox component.

```worker.tsx

import { Emails } from "@/app/pages/emails.tsx"

const app = defineApp([
    route('/', Inbox),
])
```

Access the home page and see a list of your emails.

### Viewing email detail

Let's add a link to the deail page on the inbox page.

```

```

Now let's build the detail page:

```tsx
export async function EmailPage({ id }) {
  const email = await db.emails.finyOneOrThrow();

  return (
    <div>
      <div>Email a</div>
      <div>Email a</div>
      <div>Email a</div>
      <div>Email a</div>
      <div>Email a</div>
    </div>
  );
}
```

Add a route

```worker.tsx
const app = defineApp([
    route('/emails/:emailID', function({ params}) {
        return <Email id={params.emailID}>
    })
])
```

Let's link to this page, now clicking on this link will take us to the detail page - so we can view the details of an emial.

## Sending email

Let's create a ComposeEmail component. This will be an interactive component. We'll invoke a React Server Function to send the email.
