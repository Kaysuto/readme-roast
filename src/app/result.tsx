import { fetchRepo, type RepoData } from "@/lib/github";
import { parseRepo } from "@/lib/repo-url";
import { analyzeReadme, type Check, type Grade, type Report } from "@/lib/rules";

const GRADE_STYLE: Record<Grade, string> = {
  A: "bg-success/15 text-success",
  B: "bg-success/10 text-success",
  C: "bg-accent/20 text-accent-text",
  D: "bg-corail/15 text-corail",
  F: "bg-destructive/15 text-destructive",
};

const ERRORS = {
  not_found: ["Dépôt introuvable", "Vérifie l'adresse : le dépôt n'existe pas, ou il est privé."],
  rate_limited: ["Trop de grillades", "La limite de l'API GitHub est atteinte pour l'instant. Réessaie dans quelques minutes."],
  unavailable: ["GitHub ne répond pas", "L'API GitHub n'a pas pu être jointe. Réessaie dans un instant."],
} as const;

export async function Result({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const { repo: raw } = await searchParams;
  const input = typeof raw === "string" ? raw.trim() : "";
  if (!input) return null;

  const ref = parseRepo(input);
  if (!ref) {
    return (
      <Notice title="Adresse non reconnue">
        Colle une URL du type <code className="font-mono text-foreground">https://github.com/propriétaire/dépôt</code> ou
        simplement <code className="font-mono text-foreground">propriétaire/dépôt</code>.
      </Notice>
    );
  }

  const result = await fetchRepo(ref.owner, ref.name);
  if (!result.ok) {
    const [title, text] = ERRORS[result.error];
    return <Notice title={title}>{text}</Notice>;
  }
  if (!result.repo.readme) {
    return (
      <Notice title="Pas de README à griller">
        <a href={result.repo.url} className="font-mono text-foreground underline underline-offset-4">
          {result.repo.owner}/{result.repo.name}
        </a>{" "}
        n&apos;a pas de README. C&apos;est la première chose qu&apos;un visiteur cherche : commence par un titre, une phrase
        qui explique le projet et les commandes pour l&apos;installer.
      </Notice>
    );
  }

  return <ReportView repo={result.repo} report={analyzeReadme(result.repo.readme, result.repo)} />;
}

function ReportView({ repo, report }: { repo: RepoData; report: Report }) {
  // Les règles ratées d'abord, celles qui coûtent le plus en tête.
  const checks = [...report.checks].sort((a, b) => b.max - b.earned - (a.max - a.earned));
  const stats = [
    ["mots", report.stats.words],
    ["sections", report.stats.sections],
    ["blocs de code", report.stats.codeBlocks],
    ["captures", report.stats.screenshots],
    ["badges", report.stats.badges],
  ] as const;

  return (
    <section aria-labelledby="verdict" className="mt-14 overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
        <div
          className={`flex size-24 shrink-0 items-center justify-center rounded-lg text-5xl font-semibold tracking-tight ${GRADE_STYLE[report.grade]}`}
          aria-label={`Note ${report.grade}`}
        >
          {report.grade}
        </div>
        <div className="min-w-0 flex-1">
          <a href={repo.readmeUrl ?? repo.url} className="label transition hover:text-foreground">
            {repo.owner}/{repo.name}
          </a>
          <p className="mt-2 text-4xl font-semibold tracking-tight tabular-nums">
            {report.score}
            <span className="text-lg font-normal text-muted"> / 100</span>
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface" aria-hidden>
            <div className="h-full rounded-full bg-accent" style={{ width: `${report.score}%` }} />
          </div>
          <p id="verdict" className="mt-3 text-muted text-pretty">
            {report.verdict}
          </p>
        </div>
      </div>

      {/* Trois cases par ligne sur mobile : les deux dernières s'élargissent au lieu de laisser un trou. */}
      <dl className="flex flex-wrap gap-px border-t border-border bg-border">
        {stats.map(([label, value]) => (
          <div key={label} className="flex flex-1 basis-[30%] flex-col-reverse items-center gap-1 bg-card px-3 py-5 text-center sm:basis-0">
            <dt className="label text-[0.65rem]">{label}</dt>
            <dd className="text-2xl font-semibold tabular-nums">{value.toLocaleString("fr-FR")}</dd>
          </div>
        ))}
      </dl>

      <ul className="divide-y divide-border border-t border-border">
        {checks.map((check) => (
          <CheckRow key={check.id} check={check} />
        ))}
      </ul>
    </section>
  );
}

function CheckRow({ check }: { check: Check }) {
  const status = check.earned === check.max ? "full" : check.earned > 0 ? "partial" : "none";
  const dot = { full: "bg-success", partial: "bg-accent", none: "bg-corail" }[status];
  const label = { full: "Réussi", partial: "Partiel", none: "Raté" }[status];

  return (
    <li className="flex gap-4 p-5 sm:px-8">
      <span className={`mt-2 size-2 shrink-0 rounded-full ${dot}`} role="img" aria-label={label} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="font-semibold">{check.label}</h3>
          <span className="shrink-0 font-mono text-sm tabular-nums text-muted">
            {check.earned}/{check.max}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted">{check.detail}</p>
        {check.advice && (
          <div className="mt-3 rounded-lg border border-border bg-surface/60 px-4 py-3">
            <p className="label text-[0.65rem] text-accent-text">Conseil</p>
            <p className="mt-1 text-sm text-pretty">{check.advice}</p>
          </div>
        )}
      </div>
    </li>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section role="status" className="mt-14 rounded-xl border border-border bg-card p-6 sm:p-8">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-2 text-muted text-pretty">{children}</p>
    </section>
  );
}

export function ResultSkeleton() {
  return (
    <div role="status" className="mt-14 rounded-xl border border-border bg-card p-8 text-center">
      <p className="label animate-pulse">Mise au grill du README…</p>
    </div>
  );
}
