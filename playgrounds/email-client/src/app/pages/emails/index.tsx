import { db } from "@/db";

export async function EmailsPage() {
  const emails = await db.selectFrom("emails").selectAll().execute();
  return (
    <div>
      <h1>Inbox - {emails.length}</h1>
      <nav>
        <a href="/compose">Compose Email</a>
      </nav>
      <ol>
        {emails.map((e) => (
          <li key={e.id}>
            <a href={`/emails/${e.id}`}>
              {e.subject} - {e.from}
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}
