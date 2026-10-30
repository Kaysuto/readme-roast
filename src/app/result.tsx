import { fetchRepo, type RepoData } from "@/lib/github";
import { parseRepo } from "@/lib/repo-url";
import { analyzeReadme, type Check, type Grade, type Report } from "@/lib/rules";

const GRADE_STYLE: Record<Grade, string> = {
  A: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  B: "bg-lime-500/15 text-lime-700 dark:text-lime-400",
  C: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  D: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  F: "bg-red-500/15 text-red-600 dark:text-red-400",
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
        Colle une URL du type <code className="font-mono">https://github.com/propriétaire/dépôt</code> ou simplement{" "}
        <code className="font-mono">propriétaire/dépôt</code>.
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
        <a href={result.repo.url} className="font-mono underline underline-offset-4">
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
    <section aria-labelledby="verdict" className="mt-12 overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
        <div
          className={`flex size-24 shrink-0 items-center justify-center rounded-2xl text-5xl font-bold ${GRADE_STYLE[report.grade]}`}
          aria-label={`Note ${report.grade}`}
        >
          {report.grade}
        </div>
        <div className="min-w-0 flex-1">
          <a
            href={repo.readmeUrl ?? repo.url}
            className="font-mono text-sm text-muted underline-offset-4 hover:text-foreground hover:underline"
          >
            {repo.owner}/{repo.name}
          </a>
          <p className="mt-1 text-3xl font-semibold tabular-nums">
            {report.score}
            <span className="text-lg font-normal text-muted"> / 100</span>
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-border" aria-hidden>
            <div className="h-full rounded-full bg-accent" style={{ width: `${report.score}%` }} />
          </div>
          <p id="verdict" className="mt-3 text-pretty">
            {report.verdict}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-px border-t border-border bg-border sm:grid-cols-5">
        {stats.map(([label, value]) => (
          <div key={label} className="bg-card px-4 py-3">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="font-semibold tabular-nums">{value.toLocaleString("fr-FR")}</dd>
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
  const icon = { full: "✓", partial: "~", none: "✗" }[status];
  const color = {
    full: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    partial: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    none: "bg-red-500/15 text-red-600 dark:text-red-400",
  }[status];

  return (
    <li className="flex gap-4 p-5 sm:px-8">
      <span className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-sm font-bold ${color}`} aria-hidden>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="font-semibold">{check.label}</h3>
          <span className="shrink-0 text-sm tabular-nums text-muted">
            {check.earned} / {check.max}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted">{check.detail}</p>
        {check.advice && (
          <p className="mt-3 rounded-lg bg-accent-soft px-3 py-2 text-sm text-pretty">
            <span className="font-semibold text-accent">Conseil : </span>
            {check.advice}
          </p>
        )}
      </div>
    </li>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section role="status" className="mt-12 rounded-2xl border border-border bg-card p-6 sm:p-8">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-2 text-muted text-pretty">{children}</p>
    </section>
  );
}

export function ResultSkeleton() {
  return (
    <div role="status" className="mt-12 animate-pulse rounded-2xl border border-border bg-card p-8 text-muted">
      Mise au grill du README…
    </div>
  );
}
