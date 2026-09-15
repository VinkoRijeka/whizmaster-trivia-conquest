# IMPL-A3-001 — GitHub Execution Guide

## Local commands

```bash
npm install
npm run typecheck
npm test
```

## GitHub Actions

The workflow `P0 Domain State` runs automatically on pushes to `main` or `impl/**` branches and on pull requests targeting `main`.

The workflow executes:

1. Node.js 22 setup.
2. Dependency installation.
3. TypeScript typecheck.
4. Vitest tests.

Runtime test status must be taken from the actual GitHub Actions result. The repository is not production-ready.

