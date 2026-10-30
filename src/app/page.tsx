import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { Result, ResultSkeleton } from "./result";

const EXAMPLES = ["vercel/next.js", "Kaysuto/repo-weather", "sindresorhus/awesome"];

export default function Page({ searchParams }: PageProps<"/">) {
  return (
    <div className="relative flex-1 overflow-hidden">
      {/* Halo orange très discret en haut de page. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_60%_100%_at_50%_0%,color-mix(in_oklab,var(--accent)_14%,transparent),transparent)]"
        aria-hidden
      />
      <main className="relative mx-auto w-full max-w-2xl px-4 py-16 sm:py-24">
        <header>
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 font-mono text-xs text-muted">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden />
            readme-roast
          </p>
          <h1 className="mt-6 text-4xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl">
            Ton README passe au grill.
          </h1>
          <p className="mt-4 max-w-lg text-muted text-pretty">
            Colle l&apos;URL d&apos;un dépôt GitHub public : son README est noté sur 100, avec un conseil concret pour
            chaque point perdu.
          </p>
        </header>

        <Form action="/" className="mt-8 flex flex-col gap-2 sm:flex-row">
          <label htmlFor="repo" className="sr-only">
            Dépôt GitHub
          </label>
          <input
            id="repo"
            name="repo"
            required
            autoComplete="off"
            spellCheck={false}
            placeholder="github.com/vercel/next.js"
            className="h-10 min-w-0 rounded-md border border-border bg-card px-3 font-mono text-sm outline-none transition placeholder:text-muted/60 hover:border-border-strong focus:border-accent/60 focus:ring-2 focus:ring-accent/20 sm:flex-1"
          />
          <button
            type="submit"
            className="h-10 rounded-md bg-foreground px-4 text-sm font-medium text-background transition hover:bg-foreground/85 focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:outline-none"
          >
            Griller
          </button>
        </Form>

        <p className="mt-3 text-xs text-muted">
          Exemples :{" "}
          {EXAMPLES.map((repo, i) => (
            <span key={repo}>
              {i > 0 && " · "}
              <Link href={`/?repo=${repo}`} className="font-mono transition hover:text-foreground">
                {repo}
              </Link>
            </span>
          ))}
        </p>

        <Suspense fallback={<ResultSkeleton />}>
          <Result searchParams={searchParams} />
        </Suspense>

        <footer className="mt-20 flex justify-between gap-4 border-t border-border pt-6 text-xs text-muted">
          <p>Règles fixes, sans IA : le même README obtient toujours la même note.</p>
          <a href="https://github.com/Kaysuto/readme-roast" className="shrink-0 transition hover:text-foreground">
            Code source ↗
          </a>
        </footer>
      </main>
    </div>
  );
}
