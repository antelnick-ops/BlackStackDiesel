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

---

## Post-restyle cleanup (added 2026-05-17)

After the restyle ships and runs stable in production:

### Remove or archive `app/src/` Vite scaffold

The parked Vite-rebuild scaffold (`app/src/`, `app/package.json`, `app/vite.config.ts`, plus the rest of the Vite-only files under `app/`) was introduced by commit `6634236` "Phase 2 complete" but never deployed. With the restyle replacing the rebuild's purpose, decide:

- Delete entirely (clean cut — restyle obsoletes the rebuild)
- Move to `app/_vite-rebuild-parked/` (preserve as reference for future use)
- Leave in place (current state — clutter but harmless)

### Salvage or delete `tmp/CLAUDE.md.proposed`

`tmp/CLAUDE.md.proposed` (~18 KB, gitignored) is a pre-pivot CLAUDE.md draft from the Vite-rebuild planning session. It contains useful infrastructure docs (`api/*` surface, env-var notes, design system tokens, gotchas) that the current `CLAUDE.md` doesn't have. Salvage what still applies → `CLAUDE.md`, then delete the draft.
