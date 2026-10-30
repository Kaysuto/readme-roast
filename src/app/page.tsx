import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { Result, ResultSkeleton } from "./result";

const EXAMPLES = ["vercel/next.js", "Kaysuto/repo-weather", "sindresorhus/awesome"];

export default function Page({ searchParams }: PageProps<"/">) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:py-20">
      <header>
        <p className="text-sm font-semibold uppercase tracking-widest text-accent">README Roast</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Ton README passe au grill.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted text-pretty">
          Colle l&apos;URL d&apos;un dépôt GitHub public : son README est noté sur 100, avec des conseils concrets pour
          chaque point perdu.
        </p>
      </header>

      <Form action="/" className="mt-10 flex flex-col gap-2 sm:flex-row">
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
          className="h-12 min-w-0 rounded-xl sm:flex-1 border border-border bg-card px-4 font-mono text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15"
        />
        <button
          type="submit"
          className="h-12 rounded-xl bg-accent px-6 font-semibold text-white transition hover:brightness-110 focus-visible:ring-4 focus-visible:ring-accent/30 focus-visible:outline-none"
        >
          Griller
        </button>
      </Form>

      <p className="mt-3 text-sm text-muted">
        Essaie avec{" "}
        {EXAMPLES.map((repo, i) => (
          <span key={repo}>
            {i > 0 && (i === EXAMPLES.length - 1 ? " ou " : ", ")}
            <Link href={`/?repo=${repo}`} className="font-mono text-foreground underline decoration-border underline-offset-4 hover:decoration-accent">
              {repo}
            </Link>
          </span>
        ))}
        .
      </p>

      <Suspense fallback={<ResultSkeleton />}>
        <Result searchParams={searchParams} />
      </Suspense>

      <footer className="mt-16 border-t border-border pt-6 text-sm text-muted">
        Règles fixes, sans IA : le même README obtient toujours la même note.{" "}
        <a href="https://github.com/Kaysuto/readme-roast" className="underline underline-offset-4 hover:text-foreground">
          Code source
        </a>
      </footer>
    </main>
  );
}
