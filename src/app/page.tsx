import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { Result, ResultSkeleton } from "./result";

const EXAMPLES = ["vercel/next.js", "Kaysuto/repo-weather", "sindresorhus/awesome"];

export default function Page({ searchParams }: PageProps<"/">) {
  return (
    <div className="bg-dots flex-1">
      <main className="mx-auto w-full max-w-3xl px-4 py-16 sm:py-24">
        <header className="text-center">
          <p className="label">README Roast</p>
          <h1 className="mt-5 text-4xl font-semibold tracking-[-0.038em] text-balance sm:text-6xl">
            Ton README passe au{" "}
            <span className="relative inline-block text-accent-text">
              grill
              <span className="absolute inset-x-0 -bottom-1 h-1.5 rounded-full bg-accent/40" aria-hidden />
            </span>
            .
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted text-pretty">
            Colle l&apos;URL d&apos;un dépôt GitHub public : son README est noté sur 100, avec un conseil concret pour
            chaque point perdu.
          </p>
        </header>

        <Form action="/" className="mx-auto mt-10 flex max-w-2xl flex-col gap-2 sm:flex-row">
          <label htmlFor="repo" className="sr-only">
            Dépôt GitHub
          </label>
          <input
            id="repo"
            name="repo"
            required
            autoComplete="off"
            spellCheck={false}
            placeholder="https://github.com/vercel/next.js"
            className="h-11 min-w-0 rounded-lg border border-border bg-card px-4 font-mono text-sm outline-none transition placeholder:text-muted/70 focus:border-accent focus:ring-3 focus:ring-accent/25 sm:flex-1"
          />
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 font-medium text-primary-foreground transition hover:opacity-90 focus-visible:ring-3 focus-visible:ring-accent/40 focus-visible:outline-none"
          >
            Griller
            <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
              <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </Form>

        <p className="mt-4 text-center text-sm text-muted">
          Essaie avec{" "}
          {EXAMPLES.map((repo, i) => (
            <span key={repo}>
              {i > 0 && (i === EXAMPLES.length - 1 ? " ou " : ", ")}
              <Link
                href={`/?repo=${repo}`}
                className="font-mono text-foreground underline decoration-border underline-offset-4 transition hover:decoration-accent"
              >
                {repo}
              </Link>
            </span>
          ))}
          .
        </p>

        <Suspense fallback={<ResultSkeleton />}>
          <Result searchParams={searchParams} />
        </Suspense>

        <footer className="mt-20 flex flex-col items-center gap-2 border-t border-border pt-8 text-center text-sm text-muted">
          <p>Règles fixes, sans IA : le même README obtient toujours la même note.</p>
          <p className="label">
            <a href="https://github.com/Kaysuto/readme-roast" className="transition hover:text-foreground">
              Code source
            </a>
            <span aria-hidden> · </span>
            <a href="https://kaysuto.fr" className="transition hover:text-foreground">
              Kimiya
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}
