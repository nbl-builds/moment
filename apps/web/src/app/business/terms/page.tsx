import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/portal/logo";
import { businessRoutes } from "@/config/site";
import { createServerApi } from "@/lib/api/server";
import styles from "./terms.module.css";

export const metadata: Metadata = { title: "Terms & Conditions" };

/** Latest published Terms & Conditions (legal_documents, markdown). */
export default async function TermsPage() {
  const api = await createServerApi();
  const { data } = await api.db
    .from("legal_documents")
    .select("title, body, version, published_at")
    .eq("type", "terms")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href={businessRoutes.welcome} aria-label="Moment business home">
          <Logo tone="dark" />
        </Link>
      </header>
      <main className={styles.main}>
        <h1 className={styles.title}>{data?.title ?? "Terms & Conditions"}</h1>
        {data ? (
          <article className={styles.body}>
            {data.body.split(/\n{2,}/).map((block, i) => {
              const heading = /^#{1,6}\s+(.*)$/.exec(block.trim());
              return heading ? <h2 key={i}>{heading[1]}</h2> : <p key={i}>{block.replace(/^[-*]\s+/gm, "• ")}</p>;
            })}
          </article>
        ) : (
          <p className={styles.body}>The terms are not available right now. Please try again later.</p>
        )}
      </main>
    </div>
  );
}
