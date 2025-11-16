---
title: "Bindings"
summary: "Cloudflare's infrastructure as code"
date: 2025-11-16
author: "Peter Pistorius"
---

Cloudflare has this unique piece of technology called bindings. Bindings take external services and make them feel like they're running in the same environment. They allow you to access Cloudflare resources like KV, Durable Objects, R2, and D1 as if they were local JavaScript objects, even though they're running on separate infrastructure. This is made possible through [Cap'n Web](https://blog.cloudflare.com/capnweb-javascript-rpc-library/), Cloudflare's RPC protocol that enables seamless communication between local and remote services. In this example, we're going to build our own binding. We are going to use an email service called Resend and create a binding to it that matches Cloudflare's email binding. This'll be helpful if you want an actual working email client (as we built in the email client tutorial) whilst you're waiting for Cloudflare to release their service publicly.

<!-- Point to the blog where there's a bit more technical information about bindings:
- Remote bindings architecture: https://blog.cloudflare.com/connecting-to-production-the-architecture-of-remote-bindings/
- Cap'n Web (the underlying RPC technology): https://blog.cloudflare.com/capnweb-javascript-rpc-library/
-->

<!-- Is resend the best example? IDK. We can also do some sort of storage service, but I don't really feel like dealing with streams. -->
