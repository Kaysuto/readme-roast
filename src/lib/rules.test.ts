import assert from "node:assert/strict";
import { test } from "node:test";
import { analyzeReadme, gradeOf } from "./rules.ts";

const GOOD = `# Super Projet

[![CI](https://github.com/me/super/actions/workflows/ci.yml/badge.svg)](https://github.com/me/super/actions)
[![npm](https://img.shields.io/npm/v/super)](https://npmjs.com/super)

Super Projet transforme tes fichiers Markdown en jolies pages web, sans configuration et en une seule commande.

![Capture de l'interface](docs/screenshot.png)

## Installation

\`\`\`bash
npm install super-projet
\`\`\`

## Utilisation

\`\`\`js
import { build } from "super-projet";
await build("docs/");
\`\`\`

### Options

Toutes les options sont facultatives : le dossier de sortie, le thème et la langue ont des valeurs par défaut raisonnables.

## Contribuer

Les PR sont bienvenues. Lance \`npm test\` avant d'en proposer une, et décris le problème résolu dans la description.

## Licence

MIT, voir le fichier LICENSE. Le projet est maintenu sur mon temps libre, donc les réponses peuvent prendre quelques jours.
Merci à toutes les personnes qui ont signalé des bugs et proposé des améliorations depuis la première version publique.
`;

const byId = (report: ReturnType<typeof analyzeReadme>) => Object.fromEntries(report.checks.map((c) => [c.id, c]));

test("un README complet obtient tous les points sauf la longueur", () => {
  const report = analyzeReadme(GOOD, { license: "MIT" });
  const checks = byId(report);
  for (const id of ["title", "intro", "install", "usage", "code", "visuals", "license", "badges", "contributing", "structure", "toc"]) {
    assert.equal(checks[id].earned, checks[id].max, id);
    assert.equal(checks[id].advice, null, id);
  }
  assert.equal(report.stats.badges, 2);
  assert.equal(report.stats.screenshots, 1);
  assert.equal(report.stats.codeBlocks, 2);
  assert.equal(report.stats.sections, 4);
  assert.equal(report.checks.reduce((n, c) => n + c.max, 0), 100);
});

test("un README vide est carbonisé, avec un conseil pour chaque règle ratée", () => {
  const report = analyzeReadme("", { license: null });
  assert.equal(report.score, 5); // seul le sommaire, inutile pour un texte court
  assert.equal(report.grade, "F");
  assert.ok(report.checks.filter((c) => c.earned < c.max).every((c) => c.advice));
});

test("les titres dans un bloc de code ne comptent pas", () => {
  const report = analyzeReadme("# Projet\n\n```md\n## Installation\n## Licence\n```\n", { license: null });
  const checks = byId(report);
  assert.equal(checks.install.earned, 0);
  assert.equal(checks.license.earned, 0);
  assert.equal(report.stats.sections, 0);
});

test("titres HTML et soulignés, sections en anglais et code dans une sous-section", () => {
  const md = `<h1 align="center">Project</h1>

Getting Started
---------------

### Install

\`\`\`sh
pip install project
\`\`\`

## Usage

Run it.

## License

MIT
`;
  const checks = byId(analyzeReadme(md, { license: null }));
  assert.equal(checks.title.earned, 5);
  assert.equal(checks.install.earned, 15, "code dans la sous-section ### Install");
  assert.equal(checks.usage.earned, 9, "section sans exemple");
  assert.equal(checks.license.earned, 5, "section sans fichier LICENSE");
});

test("badges et captures sont distingués, pièces jointes GitHub comprises", () => {
  const md = `# P

<img src="https://img.shields.io/badge/a-b-green">
<img src="assets/demo.gif" width="400">
https://github.com/user-attachments/assets/1234-abcd
`;
  const report = analyzeReadme(md, { license: null });
  assert.equal(report.stats.badges, 1);
  assert.equal(report.stats.screenshots, 2);
});

test("commande d'installation hors section, blocs sans langage et sauts de niveau", () => {
  const md = "# P\n\n## Démarrage rapide\n\nTexte.\n\n#### Détail\n\n```\nnpm i p\n```\n\n```\nfoo\n```\n";
  const checks = byId(analyzeReadme(md, { license: null }));
  assert.equal(checks.install.earned, 15, "« Démarrage rapide » reconnu, accents compris");
  assert.equal(checks.code.earned, 0);
  assert.match(checks.code.advice ?? "", /2 blocs n'en ont pas/);
  assert.match(checks.structure.detail, /1 saut/);
  const loose = byId(analyzeReadme("# P\n\n```bash\nnpm install p\n```\n", { license: null }));
  assert.equal(loose.install.earned, 4);
});

test("un long README sans sommaire perd les points du sommaire", () => {
  const long = `# P\n\n${"Une phrase assez longue pour remplir le README. ".repeat(200)}\n`;
  assert.equal(byId(analyzeReadme(long, { license: null })).toc.earned, 0);
  const withToc = `${long}\n## Sommaire\n\n- [A](#a)\n`;
  assert.equal(byId(analyzeReadme(withToc, { license: null })).toc.earned, 5);
});

test("barème des notes", () => {
  assert.deepEqual([100, 90, 89, 75, 60, 59, 40, 39, 0].map(gradeOf), ["A", "A", "B", "B", "C", "D", "D", "F", "F"]);
});
