import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Stale-docs guard for the fork's contributor and agent docs.
 *
 * Upstream deleted these markdown files in #186; the fork keeps them. Each upstream
 * catch-up can move or rename code under them, so this test fails when a doc links
 * to a file that is gone, names a repo path in backticks that no longer exists, or
 * tells the reader to run a package script that `package.json` no longer defines.
 *
 * History is exempt: CHANGELOG.md, docs/archive/, and the ADRs under docs/adr/ record the
 * repo as it was when they were written.
 */
const repoRoot = fileURLToPath(new URL('../../', import.meta.url));

const ROOT_DOCS = readdirSync(repoRoot).filter((fileName) => fileName.endsWith('.md'));
const NESTED_DOC_DIRS = ['docs', '.github', path.join('src', 'schemas')];
const HISTORICAL_DOCS = new Set(['CHANGELOG.md']);
const HISTORICAL_DIRS = [path.join('docs', 'archive'), path.join('docs', 'adr')];

const nestedDocs = NESTED_DOC_DIRS.filter((dir) => existsSync(path.join(repoRoot, dir))).flatMap(
  (dir) =>
    readdirSync(path.join(repoRoot, dir), { recursive: true, encoding: 'utf8' })
      .filter((relativePath) => relativePath.endsWith('.md'))
      .map((relativePath) => path.join(dir, relativePath)),
);

const checkedDocs = [...ROOT_DOCS, ...nestedDocs].filter(
  (docPath) =>
    !(HISTORICAL_DOCS.has(docPath) || HISTORICAL_DIRS.some((dir) => docPath.startsWith(dir))),
);

/** Markdown link targets: `[text](target)`, skipping URLs, anchors, and mail links. */
const MARKDOWN_LINK = /\]\(([^)\s]+)\)/g;
const EXTERNAL_TARGET = /^(?:[a-z]+:|#)/i;
/** Backticked repo paths such as `src/api/client/ebayApiClient.ts` or `docs/logging.md`. */
const BACKTICK_PATH =
  /`((?:src|tests|mcp-apps|docs|scripts|public|\.github)\/[\w./@-]*[\w/])(?::\d+)?`/g;
/** Backticked `@/` import specifiers such as `@/utils/logger.js`, which resolve under src/. */
const ALIAS_IMPORT = /`@\/([\w./-]+?)(?:\.js)?`/g;
const ALIAS_EXTENSIONS = ['', '.ts', '.tsx'];
/** Placeholder or glob paths that name a pattern, not a file. */
const PATTERN_PATH = /[*<>{}]|\/\.\.\.|\.\.\.$/;
/** `npm run <script>`, `pnpm run <script>`, or `pnpm <script>` in prose or code blocks. */
const SCRIPT_COMMAND = /\b(?:npm run|pnpm run|pnpm)\s+([a-z][\w:-]*)/g;
/** pnpm subcommands that are not package scripts. */
const PNPM_BUILTINS = new Set([
  'add',
  'install',
  'i',
  'dlx',
  'exec',
  'remove',
  'update',
  'changeset',
  'why',
  'list',
  'store',
  'audit',
  'outdated',
  'publish',
  'setup',
]);

const packageScripts = new Set(
  Object.keys(
    (
      JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8')) as {
        scripts: Record<string, string>;
      }
    ).scripts,
  ),
);

/** Every match of a global pattern's first capture group. */
const captures = (text: string, pattern: RegExp): string[] =>
  [...text.matchAll(pattern)].map((match) => match[1]);

const findStaleReferences = (docPath: string): string[] => {
  const docText = readFileSync(path.join(repoRoot, docPath), 'utf8');
  const docDir = path.dirname(path.join(repoRoot, docPath));
  const stale: string[] = [];

  for (const target of captures(docText, MARKDOWN_LINK)) {
    const filePart = target.split('#')[0];
    if (EXTERNAL_TARGET.test(target) || filePart === '') {
      continue;
    }
    if (!existsSync(path.resolve(docDir, decodeURIComponent(filePart)))) {
      stale.push(`link ${target}`);
    }
  }

  for (const repoPath of captures(docText, BACKTICK_PATH)) {
    if (!(PATTERN_PATH.test(repoPath) || existsSync(path.join(repoRoot, repoPath)))) {
      stale.push(`path ${repoPath}`);
    }
  }

  for (const aliasPath of captures(docText, ALIAS_IMPORT)) {
    const sourcePath = path.join(repoRoot, 'src', aliasPath);
    if (!ALIAS_EXTENSIONS.some((extension) => existsSync(sourcePath + extension))) {
      stale.push(`import @/${aliasPath}`);
    }
  }

  for (const scriptName of captures(docText, SCRIPT_COMMAND)) {
    if (!(PNPM_BUILTINS.has(scriptName) || packageScripts.has(scriptName))) {
      stale.push(`script ${scriptName}`);
    }
  }

  return [...new Set(stale)];
};

describe('fork docs stay in sync with the code', () => {
  it('finds the restored docs', () => {
    expect(checkedDocs).toContain('AGENTS.md');
    expect(checkedDocs).toContain('CODE-STYLE.md');
  });

  it.each(checkedDocs)('%s references only existing files and scripts', (docPath) => {
    expect(findStaleReferences(docPath).join('\n')).toBe('');
  });
});
