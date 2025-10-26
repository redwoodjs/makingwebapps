---
title: "Email client: Send & Receive email in Cloudflare"
summary: "You'll build an email client that can receive and send emails."
date: 2025-10-26
author: "Peter Pistorius"
---

Cloudflare now has the ability to send and receive email. (Sending email is in beta). In this field guide you'll build a simple email client; you can self-host it and run it on your own domain.

We'll build this using RedwoodSDK and Cloudflare. It should not take more than an hour. The goal here is to teach you the fundementals of building webapps with a real world example.

## Prerequistes

Please follow the installation guide over here.

## Getting started

```
pnpx create-rwsdk email
pnpm install
pnpm dev
```

You now have a local webserver running Cloudflare's local development environment called "Miniflare." Accessing the page and port should show you the RedwoodSDK getting started page.

## Sending & Receiving email

We'll start off by setting up the ability in Miniflare to send and receive email. We'll test this by creating two routes that initialize this functionality.

First off; you need to "bind" these services to your worker. This is done by editing the `wrangler.jsonc` file.

```
///
```

You now have the ability to send and receive emails; run `pnpm generate` to update the types; and we'll add two routes to test this functionality.

Edit `worker.tsx`

```
const app = defineApp([

    route('/test/send', function() {
        await env.EMAIL.send("subject", "message", "address")
        return new Respone('Email sent; check /tmp/email directory')
    }),
])

export default app
```

When you access `/test/send` in your browser we'll execute the "EMAIL" binding that we defined in wrangler.jsonc (Bindings are a key part of workerd on Cloudflare).

This should produce a .eml file in the `tmp/email` directory.

## Receiving email

The binding we added earlier allows this worker to receive emails as a fetch request; in order to do that we need to associate a pre-determine `email` key as a part of the default export.

```worker.tsx

export default {
    fetch: app.fetch, // our default redwood app.
    email: function({ ctx }) {
        // this is where we receive emails
        console.log(ctx.email)

    },
}
```

How do we test this? I don't know!

### Saving emails in the database

RedwoodSDK includes a thin database wrapper around an amazing piece of Cloudflare technology called "Durable Objects." We are going to store our emails in this database.
First thing we need to do is create a migration, add database durable object.

```
// add migration
```

Now we have a place where we can store the receveived emails;

```
await db.emails.insert()
```

Every time we receive an email it is inserted into this database.

### Showing a list of emails

We will create a React Server component that retrieves the emails and lists them:

```src/pages/Inbox
import { db } from "@app/db"
export async function Inbox() {
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

import { Inbox } from "@/app/pages/Inbox.tsx"

const app = defineApp([
    route('/', Inbox),
])
```

Access the home page and see a list of your emails.

### Viewing email detail

Let's add a link to the deail page on the inbox page.

```

```

Now let's build the detail page.

```export async function EmailPage({ id }) {
    const email = await db.emails.finyOneOrThrow()
}

```

Now add a route

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
