import { cacheLife } from "next/cache";

export type RepoData = {
  owner: string;
  name: string;
  url: string;
  description: string | null;
  stars: number;
  license: string | null;
  readme: string | null;
  readmeUrl: string | null;
};

export type FetchResult = { ok: true; repo: RepoData } | { ok: false; error: "not_found" | "rate_limited" | "unavailable" };

function headers(): HeadersInit {
  const token = process.env.GITHUB_TOKEN;
  return {
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
    "user-agent": "readme-roast",
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
}

function failure(res: Response): FetchResult {
  if (res.status === 404) return { ok: false, error: "not_found" };
  if (res.status === 429 || (res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0")) {
    return { ok: false, error: "rate_limited" };
  }
  return { ok: false, error: "unavailable" };
}

/** Métadonnées et README d'un dépôt public. Un succès reste en cache une heure, une erreur quelques secondes à quelques minutes. */
export async function fetchRepo(owner: string, name: string): Promise<FetchResult> {
  "use cache";
  const result = await load(owner, name);
  if (result.ok) cacheLife("hours");
  else if (result.error === "not_found") cacheLife("minutes");
  else cacheLife("seconds");
  return result;
}

async function load(owner: string, name: string): Promise<FetchResult> {
  const base = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
  try {
    const repoRes = await fetch(base, { headers: headers() });
    if (!repoRes.ok) return failure(repoRes);
    const repo = await repoRes.json();

    const readmeRes = await fetch(`${base}/readme`, { headers: headers() });
    let readme: string | null = null;
    let readmeUrl: string | null = null;
    if (readmeRes.ok) {
      const file = await readmeRes.json();
      readme = Buffer.from(file.content ?? "", "base64").toString("utf8");
      readmeUrl = file.html_url ?? null;
    } else if (readmeRes.status !== 404) {
      return failure(readmeRes);
    }

    return {
      ok: true,
      repo: {
        owner: repo.owner.login,
        name: repo.name,
        url: repo.html_url,
        description: repo.description,
        stars: repo.stargazers_count,
        license: repo.license?.spdx_id && repo.license.spdx_id !== "NOASSERTION" ? repo.license.spdx_id : null,
        readme,
        readmeUrl,
      },
    };
  } catch {
    return { ok: false, error: "unavailable" };
  }
}
