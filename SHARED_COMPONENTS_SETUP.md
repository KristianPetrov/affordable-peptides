# Shared Components Setup

This repository now exposes reusable packages:

- `@ap/shared-ui`
- `@ap/shared-core`

## What was implemented

- Workspace packages under `packages/`
- Shared UI adapter contract (`@ap/shared-ui/adapters`)
- Tailwind v4 style contract (`@ap/shared-ui/styles.css`)
- App-level adapter wiring in `components/AppSharedUiAdapterProvider.tsx`
- `affordable-peptides` app imports switched to `@ap/shared-ui`
- `1uplabs` wired to consume shared packages through local file dependencies

## 1uplabs integration

`/Users/kristianpetrov/Desktop/1uplabs` now includes:

- dependencies on both shared packages (local file paths)
- Next.js transpilation config for shared packages
- app adapter provider at `app/shared/SharedUiAdaptersProvider.tsx`
- first reused shared component in `app/orders/[id]/CopyField.tsx` (`CopyButton`)

## Private publish workflow

A manual GitHub Actions workflow is available at:

- `.github/workflows/publish-shared-packages.yml`

Set `NPM_TOKEN` in repository secrets before running it.
