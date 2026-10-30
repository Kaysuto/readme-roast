export type RepoRef = { owner: string; name: string };

// Mêmes contraintes que GitHub : un compte n'a ni point ni tiret bas, un dépôt peut en avoir.
const OWNER = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const NAME = /^[A-Za-z0-9._-]{1,100}$/;

/** Accepte « propriétaire/nom » ou une URL github.com (même avec /tree/main…). Renvoie null sinon. */
export function parseRepo(input: string): RepoRef | null {
  const path = input
    .trim()
    .replace(/^(?:https?:\/\/)?(?:www\.)?github\.com\//i, "")
    .replace(/[?#].*$/, "");
  const [owner, rawName] = path.split("/");
  const name = rawName?.replace(/\.git$/, "");
  if (!owner || !name || !OWNER.test(owner) || !NAME.test(name) || name === "." || name === "..") return null;
  return { owner, name };
}
