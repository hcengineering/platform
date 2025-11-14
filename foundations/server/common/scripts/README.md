# Coverage Scripts Documentation

This directory contains Node.js scripts for managing code coverage in the huly.server monorepo.

## Scripts Overview

### 1. `merge-coverage.js`

Merges individual package coverage reports into a single LCOV file.

**Usage:**

```bash
node merge-coverage.js
```

**What it does:**

- Scans `packages/`, `pods/`, and `tests/` directories for coverage reports
- Finds all `coverage/lcov.info` files
- Merges them into a single `coverage/lcov.info` at the root
- Resolves file paths to absolute paths
- Handles duplicate TN (test name) headers

**Output:**

- `coverage/lcov.info` - Merged coverage data

---

### 2. `generate-coverage-html.js`

Generates HTML coverage reports from LCOV data.

**Usage:**

```bash
node generate-coverage-html.js [input-lcov-file] [output-directory]
```

**Default usage:**

```bash
node generate-coverage-html.js coverage/lcov.info coverage/html
```

**What it does:**

- Parses LCOV format coverage data
- Uses Istanbul library to generate HTML reports
- Creates interactive HTML pages with line-by-line coverage
- Resolves source file paths
- Post-processes HTML to fix missing source code

**Output:**

- `coverage/html/index.html` - Main coverage report
- `coverage/html/**/*.html` - Per-file coverage reports

**Dependencies:**

- `lcov-parse` - Parses LCOV format
- `istanbul-lib-coverage` - Coverage map management
- `istanbul-lib-report` - Report context
- `istanbul-reports` - HTML report generation

---

### 3. `show-coverage-summary.js`

Displays a summary of coverage statistics by package.

**Usage:**

```bash
node show-coverage-summary.js [lcov-file]
```

**Default usage:**

```bash
node show-coverage-summary.js coverage/lcov.info
```

**What it does:**

- Parses the merged LCOV file
- Aggregates coverage by package
- Displays formatted table with:
  - Covered lines
  - Total lines
  - Coverage percentage
- Shows overall totals

**Example Output:**

```
==============================================
COVERAGE SUMMARY BY PACKAGE
==============================================

Package                     Covered     Total  Coverage
----------------------------------------------
datalake                         10        10   100.00%
minio                           111       165    67.27%
postgres                        815      1351    60.33%
...
----------------------------------------------
TOTAL                          1156      2220    52.07%
```

---

### 4. `run-tests-with-coverage.js`

Runs tests with coverage for all packages sequentially.

**Usage:**

```bash
node run-tests-with-coverage.js
```

**What it does:**

- Scans all packages in `packages/` directory
- For each package with a test script:
  - Runs `npm test -- --coverage --silent`
  - Extracts and displays coverage summary
- Reports which packages passed/failed

**Note:** This is an alternative to `rush test` for running tests individually.

---

## NPM Scripts

The `package.json` in this directory provides convenient aliases:

```bash
# Merge coverage reports
npm run coverage:merge

# Generate HTML report
npm run coverage:html

# Show coverage summary
npm run coverage:summary

# Run all package tests with coverage
npm run test:coverage
```

---

## Complete Coverage Workflow

### Using Rush (Recommended)

```bash
# Run all tests with coverage and generate reports
rush coverage
```

This command does:

1. `rush test` - Runs all package tests (coverage enabled by jest.config.js)
2. `node scripts/merge-coverage.js` - Merges all LCOV files
3. `node scripts/generate-coverage-html.js` - Generates HTML report

### Manual Workflow

```bash
# 1. Run tests with coverage (coverage enabled in jest.config.js)
rush test

# 2. Merge coverage reports
node common/scripts/merge-coverage.js

# 3. Generate HTML report
node common/scripts/generate-coverage-html.js coverage/lcov.info coverage/html

# 4. View summary
node common/scripts/show-coverage-summary.js
```

---

## Jest Configuration

All packages have coverage enabled by default in `jest.config.js`:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
  roots: ['./src'],
  collectCoverage: true, // ✅ Enabled by default
  coverageReporters: ['text-summary', 'html', 'lcov'], // ✅ LCOV format
  coverageDirectory: 'coverage' // ✅ Output directory
}
```

---

## Output Files

```
coverage/
├── lcov.info              # Merged LCOV coverage data
└── html/                  # HTML reports
    ├── index.html         # Main report page
    ├── base.css           # Styling
    ├── prettify.js        # Code highlighting
    └── [package]/         # Per-package reports
        └── [file].html    # Per-file coverage

packages/
└── [package-name]/
    └── coverage/
        ├── lcov.info      # Package-specific LCOV
        └── html/          # Package-specific HTML
```

---

## Coverage Thresholds

Current overall coverage: **52.07%**

Per-package targets:

- ✅ **≥90%**: Excellent coverage
- ✅ **70-89%**: Good coverage
- ⚠️ **50-69%**: Moderate coverage (needs improvement)
- 🔴 **<50%**: Low coverage (priority improvement)

---

## Troubleshooting

### No LCOV files found

**Error:** `No lcov files found in packages/pods/tests/*/coverage/lcov.info`

**Solution:** Run tests first with `rush test` to generate coverage files.

### Missing dependencies

**Error:** `Cannot find module 'lcov-parse'`

**Solution:**

```bash
cd common/scripts
npm install
```

### Source files not found in HTML report

The scripts attempt to resolve source file paths using multiple strategies:

1. Absolute path (if exists)
2. Relative to package directory
3. Suffix match in repository

If files still can't be found, check that source files exist and paths in LCOV are correct.

---

## Legacy Scripts

The following bash scripts have been replaced with Node.js versions:

- ❌ `show-coverage.sh` → ✅ `run-tests-with-coverage.js`
- ❌ `show-coverage-summary.sh` → ✅ `show-coverage-summary.js`

The bash scripts are kept for backward compatibility but the Node.js versions are recommended for better cross-platform support.

---

## CI/CD Integration

The LCOV format is compatible with common coverage tools:

- **Codecov**: `bash <(curl -s https://codecov.io/bash)`
- **Coveralls**: `cat coverage/lcov.info | coveralls`
- **SonarQube**: Configure `sonar.javascript.lcov.reportPaths=coverage/lcov.info`

---

## See Also

- [COVERAGE_REPORT.md](../../COVERAGE_REPORT.md) - Full coverage analysis
- [Jest Documentation](https://jestjs.io/docs/configuration#collectcoverage-boolean)
- [Istanbul Documentation](https://istanbul.js.org/)
