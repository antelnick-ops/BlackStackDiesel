# BSD App — Deferred TODOs

A holding pen for non-blocking issues to revisit during the Phase 6 polish pass.

---

## Dependency hygiene

### npm audit warnings (deferred from Phase 1 — 2026-05-16)

After initial `npm install`, npm reported:

- **3 moderate severity vulnerabilities** (transitive deps)
- Deprecated: `source-map@0.8.0-beta.0` (transitive)
- Deprecated: `glob@11.1.0` (transitive)

None block development or production builds. Investigate during Phase 6.

To inspect:

```bash
cd C:\dev\BlackStackDiesel\app
npm audit
npm ls source-map
npm ls glob
```

Don't run `npm audit fix --force` blindly — it can pull in breaking-change majors. Walk the audit output and patch dependents only where safe.

---

## Architectural

### Canonical part IDs across mock data

Phase 2 mock data (`src/lib/mock-data/parts.ts`) carries some parts in multiple lists (e.g. `edge-cts3` appears in both the trending list and the diagnose-recommended list) with slightly different display strings. IDs are aligned, but display strings aren't canonical. Phase 6 should consolidate into a single source-of-truth catalog and treat the other lists as references.

### Bertha's name is hardcoded in the AI canned response

`hardStartDiagnosis.text` in `src/lib/mock-data/diagnoses.ts` references "Bertha's age" literally. Mockup behavior preserved. Phase 4 templatizes when the AI hook is wired up.
