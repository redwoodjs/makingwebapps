import { db } from "@/db";

export async function EmailPage({ id }: { id: string }) {
  const email = await db
    .selectFrom("emails")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirstOrThrow();

  return (
    <div>
      <nav>
        <a href="/">Back to Inbox</a>
      </nav>
      <div>From: {email.from}</div>
      <div>To: {email.to}</div>
      <div>Subject: {email.subject}</div>
      <div>{email.message}</div>
    </div>
  );
}
