# Contributing to drift-guard

Thank you for your interest in contributing! 🛡️

## Quick Start

```bash
git clone https://github.com/Hwani-Net/drift-guard.git
cd drift-guard
npm install
npm run build
npm test
```

## Development Workflow

1. **Fork** the repo and create a feature branch
2. **Write tests** for any new functionality
3. **Run checks** before submitting:
   ```bash
   npm run typecheck  # TypeScript check
   npm run build       # Build
   npm test            # Tests
   ```
4. **Submit a PR** with a clear description

## Code Style

- TypeScript strict mode
- ESM modules (`import`/`export`)
- Conventional Commits for commit messages:
  - `feat:` new features
  - `fix:` bug fixes
  - `docs:` documentation
  - `test:` test changes
  - `chore:` maintenance

## Adding New Token Categories

1. Add the category to `TokenCategory` in `src/types/index.ts`
2. Add CSS property mappings in `src/parsers/css-parser.ts` (`CATEGORY_MAP`)
3. Add HTML property mappings in `src/parsers/html-parser.ts` (`TRACKED_PROPERTIES`)
4. Update `buildSummary()` in `src/core/snapshot.ts`
5. Write tests!

## Adding New AI Rule Formats

1. Add the format name to `RuleFormat` in `src/types/index.ts`
2. Add a generator function in `src/core/rules-generator.ts`
3. Add the file mapping in `saveRules()`
4. Write tests!

## Reporting Issues

- **Bug reports**: Include steps to reproduce, expected vs actual behavior
- **Feature requests**: Describe the use case and proposed solution

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
