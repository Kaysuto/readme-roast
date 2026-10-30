// Règles fixes, sans IA : le même README donne toujours la même note.

export type Check = {
  id: string;
  label: string;
  earned: number;
  max: number;
  detail: string;
  advice: string | null;
};

export type Grade = "A" | "B" | "C" | "D" | "F";

export type Report = {
  score: number;
  grade: Grade;
  verdict: string;
  checks: Check[];
  stats: { words: number; sections: number; codeBlocks: number; screenshots: number; badges: number };
};

type Heading = { level: number; title: string };
type Section = Heading & { code: number; visuals: number };

const BADGE = /shields\.io|badgen\.net|badge\.fury|forthebadge|codecov\.io|coveralls\.io|badge\.svg|\/badges?\/|[?&]badge|badge=/i;
const INSTALL_COMMAND =
  /\b(npm (i|install|add)|yarn add|pnpm (add|install|i)|bun (add|install)|pip3? install|pipx install|poetry add|brew install|cargo (install|add)|go (install|get)|gem install|composer require|dotnet add|apt(-get)? install|docker (run|pull|compose)|git clone|npx )/i;

const TOPIC = {
  install: /install|getting started|get started|quick ?start|setup|set up|demarrage|prise en main|prerequis|requirements|prerequisites/,
  usage: /usage|utilisation|utiliser|example|exemple|how to use|demo|commands?|commandes?|\bcli\b|api reference|reference/,
  license: /licen[cs]e/,
  contributing: /contribu/,
  toc: /table of contents|^contents$|sommaire|table des matieres|^toc$/,
};

/** Minuscules sans accents, pour comparer les titres de section en français comme en anglais. */
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N} ]+/gu, " ")
    .trim();

/** Texte lisible d'une ligne : sans images, balises HTML ni syntaxe de lien. */
const plain = (line: string) =>
  line
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[*_`>#|-]/g, " ")
    .trim();

function visualsOf(line: string) {
  const urls = [
    ...[...line.matchAll(/!\[[^\]]*\]\(\s*<?([^)\s>]+)/g)].map((m) => m[1]),
    ...[...line.matchAll(/<(?:img|source|video)\b[^>]*\bsrc=["']([^"']+)/gi)].map((m) => m[1]),
  ];
  // GitHub affiche une image ou une vidéo pour un lien de pièce jointe seul sur sa ligne.
  if (/^\s*https:\/\/github\.com\/user-attachments\/assets\/\S+\s*$/.test(line)) urls.push(line.trim());
  const badges = urls.filter((url) => BADGE.test(url)).length;
  return { badges, screenshots: urls.length - badges };
}

function parse(markdown: string) {
  const lines = markdown.replace(/\r\n?/g, "\n").replace(/<!--[\s\S]*?-->/g, "").split("\n");
  const sections: Section[] = [{ level: 0, title: "", code: 0, visuals: 0 }];
  const text: string[] = [];
  const code: { lang: string; content: string }[] = [];
  let fence: { marker: string; lang: string; content: string[] } | null = null;
  let badges = 0;
  let screenshots = 0;

  const current = () => sections[sections.length - 1];
  const addHeading = (level: number, title: string) => {
    const clean = plain(title);
    if (clean) sections.push({ level, title: clean, code: 0, visuals: 0 });
  };

  for (const line of lines) {
    const fenceMatch = line.match(/^\s{0,3}(`{3,}|~{3,})\s*([^\s`]*)/);
    if (fence) {
      if (fenceMatch && fenceMatch[1][0] === fence.marker[0] && fenceMatch[1].length >= fence.marker.length && !fenceMatch[2]) {
        code.push({ lang: fence.lang, content: fence.content.join("\n") });
        fence = null;
      } else {
        fence.content.push(line);
      }
      continue;
    }
    if (fenceMatch) {
      fence = { marker: fenceMatch[1], lang: fenceMatch[2], content: [] };
      current().code++;
      continue;
    }

    const atx = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
    const setext = line.match(/^\s{0,3}(=+|-+)\s*$/);
    const previous = text.at(-1);
    if (atx) addHeading(atx[1].length, atx[2]);
    else if (setext && previous && plain(previous) && !/^\s*([-*+]|\d+\.)\s/.test(previous) && !/^\s{0,3}#/.test(previous)) {
      text.pop();
      addHeading(setext[1][0] === "=" ? 1 : 2, previous);
      continue;
    }
    for (const html of line.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)) addHeading(Number(html[1]), html[2]);

    const found = visualsOf(line);
    badges += found.badges;
    screenshots += found.screenshots;
    current().visuals += found.screenshots;
    if (!atx) text.push(line);
  }
  // Un bloc de code jamais refermé compte quand même.
  if (fence) code.push({ lang: fence.lang, content: fence.content.join("\n") });

  return { sections, text, code, badges, screenshots };
}

type Parsed = ReturnType<typeof parse>;

/** La section et ses sous-sections, jusqu'au prochain titre de même niveau ou plus haut. */
function scope(sections: Section[], index: number) {
  const level = sections[index].level;
  let end = index + 1;
  while (end < sections.length && sections[end].level > level) end++;
  return sections.slice(index, end);
}

function findSection(parsed: Parsed, topic: RegExp) {
  const index = parsed.sections.findIndex((s, i) => i > 0 && topic.test(normalize(s.title)));
  if (index < 0) return null;
  const inScope = scope(parsed.sections, index);
  return {
    title: parsed.sections[index].title,
    code: inScope.reduce((n, s) => n + s.code, 0),
    visuals: inScope.reduce((n, s) => n + s.visuals, 0),
  };
}

const check = (id: string, label: string, max: number, earned: number, detail: string, advice: string) => ({
  id,
  label,
  max,
  earned,
  detail,
  advice: earned < max ? advice : null,
});

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`;

const VERDICTS: Record<Grade, string> = {
  A: "Rien à griller : ce README est déjà bien cuit.",
  B: "Bien doré, il manque juste quelques épices.",
  C: "Mi-cuit : l'essentiel est là, mais le lecteur doit encore deviner.",
  D: "Un peu cramé : un nouveau venu va galérer.",
  F: "Carbonisé : ce README a besoin d'une seconde vie.",
};

export function gradeOf(score: number): Grade {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

export function analyzeReadme(markdown: string, repo: { license: string | null }): Report {
  const parsed = parse(markdown);
  const headings = parsed.sections.slice(1);
  const words = parsed.text.map(plain).join(" ").split(/\s+/).filter((w) => /\p{L}/u.test(w)).length;
  const h2 = headings.filter((h) => h.level === 2).length;
  const install = findSection(parsed, TOPIC.install);
  const usage = findSection(parsed, TOPIC.usage);
  const licenseSection = findSection(parsed, TOPIC.license);
  const contributing = findSection(parsed, TOPIC.contributing) ?? (/contributing\.md/i.test(markdown) ? { title: "CONTRIBUTING.md" } : null);
  const toc = findSection(parsed, TOPIC.toc) ?? ((markdown.match(/\]\(#[^)]+\)/g)?.length ?? 0) >= 5 ? { title: "liens internes" } : null);
  const intro = parsed.text.slice(0, 40).some((line) => plain(line).length >= 50 && /\p{L}{3,} \p{L}{2,}/u.test(plain(line)));
  const installCommand = parsed.code.some((block) => INSTALL_COMMAND.test(block.content));
  const withLang = parsed.code.filter((block) => block.lang).length;
  let skipped = 0;
  headings.forEach((h, i) => {
    if (i > 0 && h.level > headings[i - 1].level + 1) skipped++;
  });

  const checks: Check[] = [
    check(
      "title",
      "Titre",
      5,
      headings.some((h) => h.level === 1) ? 5 : headings.length ? 2 : 0,
      headings.some((h) => h.level === 1) ? "Un titre principal est présent." : "Aucun titre de niveau 1.",
      "Commence par « # Nom du projet » : c'est la première chose qu'on lit.",
    ),
    check(
      "intro",
      "Description",
      10,
      intro ? 10 : 0,
      intro ? "Une phrase d'introduction explique le projet." : "Pas de phrase d'introduction en haut du README.",
      "Sous le titre, écris une ou deux phrases : ce que fait le projet, pour qui, et pourquoi il existe.",
    ),
    check(
      "install",
      "Installation",
      15,
      install ? (install.code > 0 ? 15 : 9) : installCommand ? 4 : 0,
      install
        ? `Section « ${install.title} »${install.code ? " avec des commandes" : " sans bloc de code"}.`
        : installCommand
          ? "Une commande d'installation traîne dans le README, sans section dédiée."
          : "Aucune section d'installation.",
      install
        ? "Ajoute les commandes exactes dans un bloc de code (```bash), pour qu'on puisse les copier telles quelles."
        : "Ajoute une section « ## Installation » avec les prérequis et les commandes à copier (```bash).",
    ),
    check(
      "usage",
      "Utilisation",
      15,
      usage ? (usage.code + usage.visuals > 0 ? 15 : 9) : 0,
      usage
        ? `Section « ${usage.title} »${usage.code + usage.visuals ? " avec des exemples" : " sans exemple"}.`
        : "Aucune section qui montre comment s'en servir.",
      usage
        ? "Illustre la section d'utilisation par un exemple concret : une commande, un extrait de code ou une capture."
        : "Ajoute une section « ## Utilisation » avec un exemple minimal qui marche du premier coup.",
    ),
    check(
      "code",
      "Blocs de code",
      5,
      parsed.code.length ? Math.round((5 * withLang) / parsed.code.length) : 0,
      parsed.code.length ? `${plural(parsed.code.length, "bloc")} de code, ${withLang} avec un langage.` : "Aucun bloc de code.",
      parsed.code.length
        ? `Précise le langage de chaque bloc (\`\`\`bash, \`\`\`js…) : ${plural(parsed.code.length - withLang, "bloc")} n'en ont pas, donc pas de coloration.`
        : "Montre au moins une commande ou un extrait de code dans un bloc ```.",
    ),
    check(
      "visuals",
      "Captures",
      10,
      parsed.screenshots > 0 ? 10 : 0,
      parsed.screenshots ? `${plural(parsed.screenshots, "image")} hors badges.` : "Aucune capture, image ni GIF.",
      "Ajoute une capture d'écran ou un GIF du projet en action : on comprend en deux secondes ce qu'un paragraphe met une minute à dire.",
    ),
    check(
      "license",
      "Licence",
      10,
      (licenseSection ? 5 : 0) + (repo.license ? 5 : 0),
      [
        repo.license ? `Licence ${repo.license} détectée par GitHub.` : "Aucun fichier LICENSE reconnu par GitHub.",
        licenseSection ? "Section licence dans le README." : "Pas de section licence dans le README.",
      ].join(" "),
      repo.license
        ? "Termine le README par une section « ## Licence » qui renvoie vers le fichier LICENSE."
        : "Ajoute un fichier LICENSE (MIT, Apache-2.0…) : sans licence, personne n'a légalement le droit de réutiliser ton code.",
    ),
    check(
      "badges",
      "Badges",
      5,
      parsed.badges > 0 ? 5 : 0,
      parsed.badges ? `${plural(parsed.badges, "badge")}.` : "Aucun badge.",
      "Ajoute quelques badges sous le titre (CI, version, licence) : ils montrent d'un coup d'œil que le projet est vivant.",
    ),
    check(
      "contributing",
      "Contribution",
      5,
      contributing ? 5 : 0,
      contributing ? `Contribution expliquée (« ${contributing.title} »).` : "Rien sur la façon de contribuer.",
      "Ajoute une courte section « ## Contribuer » : comment lancer les tests, proposer une PR, signaler un bug.",
    ),
    check(
      "structure",
      "Structure",
      10,
      (h2 >= 3 ? 6 : h2 > 0 ? 3 : 0) + (headings.length && !skipped ? 4 : 0),
      `${plural(h2, "section")} de niveau 2${skipped ? `, ${plural(skipped, "saut")} de niveau de titre` : ""}.`,
      h2 < 3
        ? "Découpe le README en au moins trois sections « ## » (installation, utilisation, licence…)."
        : "Ne saute pas de niveau de titre (pas de « #### » directement sous un « ## ») : la table des matières de GitHub en dépend.",
    ),
    check(
      "length",
      "Longueur",
      5,
      words < 80 ? 0 : words < 150 ? 2 : words <= 5000 ? 5 : 3,
      `${plural(words, "mot")} hors code.`,
      words < 150
        ? "Le README est trop court pour qu'un inconnu comprenne et lance le projet : vise au moins 150 mots."
        : "Le README est très long : déplace les détails dans un dossier docs/ ou un wiki, et garde l'essentiel ici.",
    ),
    check(
      "toc",
      "Sommaire",
      5,
      words <= 1500 || toc ? 5 : 0,
      words <= 1500 ? "README assez court pour se passer de sommaire." : toc ? "Un sommaire aide à naviguer." : "README long sans sommaire.",
      "Au-delà de 1 500 mots, ajoute un sommaire avec des liens vers les sections (- [Installation](#installation)).",
    ),
  ];

  const score = checks.reduce((total, c) => total + c.earned, 0);
  const grade = gradeOf(score);
  return {
    score,
    grade,
    verdict: VERDICTS[grade],
    checks,
    stats: { words, sections: h2, codeBlocks: parsed.code.length, screenshots: parsed.screenshots, badges: parsed.badges },
  };
}
