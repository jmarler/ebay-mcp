# Contributing to eBay API MCP Server

First off, thank you for considering contributing to the eBay API MCP Server! 🎉

This document provides guidelines for contributing to this project. Following these guidelines helps communicate that you respect the time of the developers managing and developing this open source project. In return, they should reciprocate that respect in addressing your issue, assessing changes, and helping you finalize your pull requests.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [What We're Looking For](#what-were-looking-for)
- [How to Contribute](#how-to-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Enhancements](#suggesting-enhancements)
  - [Your First Code Contribution](#your-first-code-contribution)
  - [Pull Requests](#pull-requests)
- [Development Setup](#development-setup)
- [Style Guidelines](#style-guidelines)
  - [Git Commit Messages](#git-commit-messages)
  - [TypeScript Style Guide](#typescript-style-guide)
  - [Documentation Style Guide](#documentation-style-guide)
- [Testing Guidelines](#testing-guidelines)
- [Releases](#releases)
- [This Fork (marlermedia)](#this-fork-marlermedia)
- [Community](#community)

## Code of Conduct

This project and everyone participating in it is governed by our commitment to providing a welcoming and inclusive environment. By participating, you are expected to uphold professional standards of communication and collaboration. Please report unacceptable behavior to the project maintainers.

## What We're Looking For

There are many ways to contribute to the eBay API MCP Server:

- 🐛 **Bug fixes** - Find and fix bugs in the codebase
- ✨ **New features** - Implement new eBay API tools or MCP capabilities
- 📝 **Documentation** - Improve README, guides, code comments, or examples
- 🧪 **Tests** - Add or improve test coverage
- 🎨 **Code quality** - Refactor code, improve performance, or enhance type safety
- 🌐 **Translations** - Help internationalize documentation
- 💡 **Ideas** - Suggest new features or improvements
- 📦 **Dependencies** - Update or optimize dependencies

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check the [existing issues](https://github.com/YosefHayim/ebay-mcp/issues) to avoid duplicates.

When you create a bug report, please include as many details as possible:

**Use the bug report template** when creating a new issue. The template helps you provide all the necessary information.

A good bug report should include:

- **Clear title** - A concise description of the issue
- **Environment details** - OS, Node.js version, package version
- **Steps to reproduce** - Numbered steps to recreate the bug
- **Expected behavior** - What you expected to happen
- **Actual behavior** - What actually happened
- **Logs/Screenshots** - Any relevant error messages or screenshots
- **Configuration** - Your `.env` file (with secrets redacted) or `mcp-setup.json`

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

**Use the feature request template** when creating a new issue.

Include these details:

- **Clear title** - A concise description of the enhancement
- **Use case** - Why this enhancement would be useful
- **Detailed description** - Step-by-step description of the suggested enhancement
- **Alternatives** - Any alternative solutions you've considered
- **Additional context** - Screenshots, mockups, or examples

### Your First Code Contribution

Unsure where to begin? Look for issues labeled:

- `good first issue` - Issues suitable for newcomers
- `help wanted` - Issues where we'd appreciate community help
- `documentation` - Documentation improvements
- `bug` - Confirmed bugs that need fixing

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Make your changes** following our style guidelines
3. **Add tests** for any new functionality
4. **Ensure checks pass** - Run `pnpm verify` (Biome CI, both typechecks, tests, build)
5. **Update documentation** - Update README or related docs when behavior changes
6. **Follow commit conventions** - Use [Conventional Commits](https://www.conventionalcommits.org/), especially for the PR title
7. **Submit a pull request** using our PR template

**Pull Request Process:**

1. Give the PR a Conventional Commit title - PRs are squash-merged, and the title becomes the commit on `main` and the release name (see [Releases](#releases))
2. Ensure CI passes, including coverage thresholds
3. Update documentation to reflect any API changes
4. The PR will be merged once it receives approval from a maintainer

## Development Setup

### Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** 10.14.0 (pinned in `package.json` `packageManager`; npm also works for running scripts)
- **Git**
- **eBay Developer Account** (for API credentials)

### Initial Setup

1. **Fork and clone** the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/ebay-mcp.git
   cd ebay-mcp
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Set up environment** (see README.md for detailed instructions):
   ```bash
   cp .env.example .env
   # Edit .env with your eBay credentials
   ```

4. **Build the project** (TypeScript plus the MCP Apps UI bundles):
   ```bash
   pnpm build
   ```

5. **Run tests**:
   ```bash
   pnpm test
   ```

### Development Workflow

```bash
# Start development server (STDIO mode)
pnpm dev

# Start development server (HTTP mode with OAuth)
pnpm exec tsx src/serverHttp.ts

# Run unit tests in watch mode
pnpm exec vitest

# Run the hermetic integration suite
pnpm test:integration

# Check code quality (both typechecks + Biome on src/ and mcp-apps/)
pnpm check

# Full pre-PR gate (Biome CI, typechecks, tests, build)
pnpm verify

# Auto-fix lint and formatting
pnpm fix

# Download eBay OpenAPI specs, regenerate types, and report endpoint coverage
pnpm sync
```

### Project Structure

```
src/
├── index.ts              # STDIO entry point
├── serverHttp.ts         # HTTP entry point
├── api/                  # eBay API implementations
│   ├── client/           # REST client (ebayApiClient.ts), Trading client, rate limits
│   ├── ebaySellerApi.ts  # EbaySellerApi facade
│   └── [domain]/         # API categories (account-management, listing-management, ...)
├── auth/                 # OAuth & token management
├── config/               # Environment, OAuth scopes, tool families
├── mcp/                  # Runtime, tool gating, HTTP transport, MCP Apps bridge
├── tools/                # MCP tool definitions (defineTool, categories/)
├── types/                # TypeScript types & enums
├── schemas/              # Zod validation schemas
├── scripts/              # setup, sync, diagnose, skills, MCP Apps build
├── skills/               # Agent skill installer
└── utils/                # Shared utilities

mcp-apps/                 # MCP Apps UI views (built to build/ui/*.html)

tests/
├── unit/                 # Unit tests
├── integration/          # Integration tests
└── helpers/              # Test utilities
```

## Style Guidelines

### Git Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat:` - A new feature
- `fix:` - A bug fix
- `docs:` - Documentation only changes
- `style:` - Code style changes (formatting, missing semicolons, etc.)
- `refactor:` - Code change that neither fixes a bug nor adds a feature
- `perf:` - Performance improvements
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks (dependencies, build, etc.)
- `ci:` - CI/CD changes

**Examples:**
```
feat(inventory): add bulk update inventory items tool
fix(auth): handle token refresh race condition
docs(readme): update OAuth setup instructions
test(marketing): add campaign status validation tests
chore(deps): update @modelcontextprotocol/sdk to 1.21.1
```

### TypeScript Style Guide

- **Use TypeScript strict mode** - All code must compile with strict checks enabled
- **Prefer types over interfaces** - Use `type` for most type definitions
- **Use native enums** - Import from `@/types/ebayEnums.js` when available
- **Include JSDoc comments** - Document complex functions and types
- **Use path aliases** - Import using `@/` prefix
- **Include file extensions** - Use `.js` extension in imports (ES modules)
- **Validate inputs** - Use Zod schemas for all external inputs (see `src/schemas/README.md`)
- **Name things for what they hold** - No generic names (`data`, `result`, `response`, `item`, `e`/`err`, single letters); files are named after their main export

**Code Example:**
```typescript
import { z } from 'zod';
import { MarketplaceId } from '@/types/ebayEnums.js';

/**
 * Get inventory item by SKU
 * @param sku - The seller-defined SKU
 * @returns The inventory item details
 */
async getInventoryItem(sku: string): Promise<unknown> {
  const { sku: validSku } = getInventoryItemSchema.parse({ sku });
  return this.client.get(`/sell/inventory/v1/inventory_item/${validSku}`);
}

const getInventoryItemSchema = z.object({
  sku: z.string().min(1).describe('The seller-defined SKU'),
});
```

### Documentation Style Guide

- **Use clear, concise language** - Avoid jargon when possible
- **Include code examples** - Show usage with real examples
- **Keep README updated** - Reflect all major changes in README.md
- **Locale READMEs** - `README.md` (English) is the source of truth for product claims (tool families, decommissions, version notes). Update locale files (`README.*.md`) when those claims change, or add a short note that English leads until translation catches up.
- **No CHANGELOG edits** - Release notes are generated from commits; `CHANGELOG.md` is historical
- **Use Markdown** - Follow GitHub-flavored Markdown conventions
- **Include links** - Link to relevant documentation and resources

## Testing Guidelines

### Test Coverage Requirements

`pnpm test:coverage` enforces the thresholds in `vitest.config.ts`:

- **Function coverage**: 90%+
- **Line / statement coverage**: 75%+
- **Branch coverage**: 65%+

### Writing Tests

- **Unit tests** - Test individual functions and classes in isolation
- **Integration tests** - Test end-to-end MCP server functionality
- **Use descriptive names** - Test names should clearly describe what is being tested
- **Mock external dependencies** - Use `nock` for HTTP mocks
- **Test edge cases** - Include tests for error conditions and boundary cases

**Test Example:**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InventoryApi } from '@/api/listing-management/inventory.js';

describe('InventoryApi', () => {
  let inventoryApi: InventoryApi;
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    mockClient = createMockClient();
    inventoryApi = new InventoryApi(mockClient);
  });

  describe('getInventoryItem', () => {
    it('should fetch inventory item by SKU', async () => {
      const sku = 'TEST-SKU-123';
      const mockItem = { sku, condition: 'NEW' };

      mockClient.get.mockResolvedValue(mockItem);

      const inventoryItem = await inventoryApi.getInventoryItem(sku);

      expect(inventoryItem).toEqual(mockItem);
      expect(mockClient.get).toHaveBeenCalledWith(
        `/sell/inventory/v1/inventory_item/${sku}`
      );
    });

    it('should throw error for invalid SKU', async () => {
      await expect(
        inventoryApi.getInventoryItem('')
      ).rejects.toThrow('SKU is required');
    });
  });
});
```

### Running Tests

```bash
# Run unit tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run integration tests
pnpm test:integration

# Run in watch mode
pnpm exec vitest
```

## Releases

There are no changesets and no version-bump commits. When a PR is merged to `main`, `.github/workflows/release.yml`:

1. Skips the release if the PR carries the `no-release` label
2. Bumps the version from the latest `v*` tag: `major` or `minor` PR labels choose that bump, otherwise it is a patch
3. Runs typecheck, tests, and build
4. Pushes the new tag (the version lives in the tag, not in `package.json` on `main`) and creates a GitHub Release named after the PR title, with notes built from the commit log
5. Triggers `.github/workflows/publish.yml` to publish to npm

## This Fork (marlermedia)

This repository is a fork of [YosefHayim/ebay-mcp](https://github.com/YosefHayim/ebay-mcp). `main` mirrors upstream exactly; fork-only work lands on the `marlermedia` branch. Fixes that would help upstream users can also be offered upstream as PRs against `main` there.

## Community

### Getting Help

- **GitHub Issues** - Ask questions or report problems
- **Discussions** - Share ideas and discuss features
- **Documentation** - Check README.md and other docs

### Recognition

Contributors are recognized in the following ways:

- Mentioned in release notes (generated from commit history)
- Added to GitHub contributors list

Thank you for contributing! Your efforts help make this project better for everyone. 🚀

---

**Questions?** Feel free to open an issue or reach out to the maintainers.

**License:** By contributing, you agree that your contributions will be licensed under the MIT License.
