import { fetchRepo, type RepoData } from "@/lib/github";
import { parseRepo } from "@/lib/repo-url";
import { analyzeReadme, type Check, type Grade, type Report } from "@/lib/rules";

const GRADE_COLOR: Record<Grade, string> = {
  A: "text-success border-success/30 bg-success/10",
  B: "text-success border-success/30 bg-success/10",
  C: "text-warning border-warning/30 bg-warning/10",
  D: "text-accent border-accent/30 bg-accent/10",
  F: "text-danger border-danger/30 bg-danger/10",
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
    ["Mots", report.stats.words],
    ["Sections", report.stats.sections],
    ["Blocs de code", report.stats.codeBlocks],
    ["Captures", report.stats.screenshots],
    ["Badges", report.stats.badges],
  ] as const;

  return (
    <section aria-labelledby="verdict" className="mt-12 rounded-lg border border-border bg-card">
      <div className="p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <a
            href={repo.readmeUrl ?? repo.url}
            className="truncate font-mono text-sm text-muted transition hover:text-foreground"
          >
            {repo.owner}/{repo.name} ↗
          </a>
          <span
            className={`shrink-0 rounded-md border px-2 py-0.5 font-mono text-xs font-medium ${GRADE_COLOR[report.grade]}`}
          >
            Note {report.grade}
          </span>
        </div>
        <p className="mt-4 text-6xl font-semibold tracking-[-0.05em] tabular-nums">
          {report.score}
          <span className="ml-1 text-xl font-normal tracking-normal text-muted">/100</span>
        </p>
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-surface" aria-hidden>
          <div className="h-full rounded-full bg-accent" style={{ width: `${report.score}%` }} />
        </div>
        <p id="verdict" className="mt-4 text-sm text-muted text-pretty">
          {report.verdict}
        </p>
      </div>

      <dl className="grid grid-cols-3 gap-px border-y border-border bg-border sm:grid-cols-5">
        {stats.map(([label, value]) => (
          <div key={label} className="bg-card px-4 py-3 max-sm:last:col-span-2">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="mt-0.5 font-mono text-lg tabular-nums">{value.toLocaleString("fr-FR")}</dd>
          </div>
        ))}
      </dl>

      <ul className="divide-y divide-border">
        {checks.map((check) => (
          <CheckRow key={check.id} check={check} />
        ))}
      </ul>
    </section>
  );
}

function CheckRow({ check }: { check: Check }) {
  const ratio = check.earned / check.max;
  const color = ratio === 1 ? "bg-success" : ratio > 0 ? "bg-warning" : "bg-danger";

  return (
    <li className="px-5 py-4 sm:px-6">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-sm font-medium">{check.label}</h3>
        <span className="shrink-0 font-mono text-xs tabular-nums text-muted">
          <span className="text-foreground">{check.earned}</span>/{check.max}
        </span>
      </div>
      <div className="mt-2 h-0.5 overflow-hidden rounded-full bg-surface" aria-hidden>
        <div className={`h-full ${color}`} style={{ width: `${Math.max(ratio * 100, 0)}%` }} />
      </div>
      <p className="mt-2 text-sm text-muted">{check.detail}</p>
      {check.advice && (
        <p className="mt-3 border-l-2 border-accent pl-3 text-sm text-pretty">
          {check.advice}
        </p>
      )}
    </li>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section role="status" className="mt-12 rounded-lg border border-border bg-card p-5 sm:p-6">
      <h2 className="text-sm font-medium">{title}</h2>
      <p className="mt-2 text-sm text-muted text-pretty">{children}</p>
    </section>
  );
}

export function ResultSkeleton() {
  return (
    <div role="status" className="mt-12 rounded-lg border border-border bg-card p-6">
      <p className="font-mono text-sm text-muted">
        <span className="mr-2 inline-block size-1.5 animate-pulse rounded-full bg-accent align-middle" aria-hidden />
        Analyse du README…
      </p>
    </div>
  );
}
