import { ArrowRight, LifeBuoy } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";

/** A content section of a policy page. `body` = paragraphs, `list` = bullet points. */
export type LegalSection = { heading: string; body?: string[]; list?: string[] };

/** Shared branded header for every legal / info page. */
export function LegalHero({
  eyebrow,
  title,
  subtitle,
  updated,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  updated?: string;
}) {
  return (
    <header className="relative isolate overflow-hidden border-b border-line bg-surface">
      <div className="pointer-events-none absolute -top-24 end-0 -z-0 h-72 w-72 rounded-full bg-accent/10 blur-3xl" aria-hidden />
      <div className="relative mx-auto w-full max-w-[1120px] px-4 py-12 sm:px-6 md:py-16 lg:px-8">
        <p className="text-sm font-bold uppercase tracking-wide text-accent">{eyebrow}</p>
        <h1 className="mt-2 text-balance text-3xl font-bold tracking-tight text-ink md:text-4xl lg:text-5xl">{title}</h1>
        {subtitle ? (
          <p className="mt-4 max-w-2xl text-pretty text-base leading-8 text-muted md:text-lg">{subtitle}</p>
        ) : null}
        {updated ? (
          <span className="mt-6 inline-flex items-center gap-1.5 rounded-pill border border-line bg-elevated px-3 py-1 text-xs font-semibold text-muted">
            {updated}
          </span>
        ) : null}
      </div>
    </header>
  );
}

const sectionId = (i: number) => `section-${i + 1}`;

/**
 * Policy article: a sticky "on this page" table of contents (desktop) beside the
 * numbered sections, with a "still need help" call-to-action at the end.
 */
export function LegalArticle({
  sections,
  onThisPage,
  help,
  extra,
}: {
  sections: LegalSection[];
  onThisPage: string;
  help: { title: string; body: string; cta: string };
  /** Optional content rendered after the sections, before the help banner. */
  extra?: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 py-10 sm:px-6 md:py-12 lg:grid lg:grid-cols-[220px_1fr] lg:gap-12 lg:px-8">
      <aside className="hidden lg:block">
        <nav className="sticky top-24" aria-label={onThisPage}>
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-faint">{onThisPage}</p>
          <ul className="space-y-2.5 border-s border-line ps-4 text-sm">
            {sections.map((s, i) => (
              <li key={i}>
                <a href={`#${sectionId(i)}`} className="block text-muted transition-colors hover:text-accent">
                  {s.heading}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <div className="min-w-0">
        <div className="space-y-10">
          {sections.map((s, i) => (
            <section key={i} id={sectionId(i)} className="scroll-mt-24">
              <h2 className="text-xl font-bold tracking-tight text-ink md:text-2xl">{s.heading}</h2>
              {s.body?.map((p, j) => (
                <p key={j} className="mt-3 text-base leading-8 text-muted">
                  {p}
                </p>
              ))}
              {s.list ? (
                <ul className="mt-3 list-disc space-y-2 ps-5 text-base leading-7 text-muted marker:text-accent/70">
                  {s.list.map((it, j) => (
                    <li key={j}>{it}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        {extra ? <div className="mt-10">{extra}</div> : null}

        <HelpCTA title={help.title} body={help.body} cta={help.cta} />
      </div>
    </div>
  );
}

/** "Still need help → Contact support" banner reused at the foot of policy pages. */
export function HelpCTA({ title, body, cta }: { title: string; body: string; cta: string }) {
  return (
    <aside className="mt-12 overflow-hidden rounded-card border border-accent/20 bg-accent-soft p-5 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-ink">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-muted">{body}</p>
        </div>
        <Link href="/support" className="btn-primary shrink-0 !px-5 !py-2.5 text-sm">
          <LifeBuoy className="h-4 w-4" aria-hidden />
          {cta}
        </Link>
      </div>
    </aside>
  );
}

/** Card linking to one policy document — used on the /legal hub. */
export function DocCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex h-full flex-col rounded-card border border-line bg-surface p-5 shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-accent/40 hover:shadow-elevated"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/15 text-accent">{icon}</span>
        <ArrowRight className="rtl-flip mt-1 h-5 w-5 text-faint transition-colors group-hover:text-accent" aria-hidden />
      </div>
      <h2 className="mt-4 text-base font-bold text-ink">{title}</h2>
      <p className="mt-1.5 flex-1 text-sm leading-6 text-muted">{description}</p>
    </Link>
  );
}
