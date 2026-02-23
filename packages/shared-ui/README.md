# @ap/shared-ui

Shared UI components reused by peptide storefront projects.

## Install

### Local (current setup)

```bash
pnpm add @ap/shared-ui@file:../affordable-peptides/packages/shared-ui
pnpm add @ap/shared-core@file:../affordable-peptides/packages/shared-core
```

### Next.js config

Enable package transpilation in `next.config.ts`:

```ts
const nextConfig = {
  transpilePackages: ["@ap/shared-ui", "@ap/shared-core"],
  experimental: {
    externalDir: true,
  },
};
```

## Styling Contract (Tailwind v4)

1. Ensure `tailwindcss` and `@tailwindcss/postcss` are installed.
2. Ensure PostCSS has `@tailwindcss/postcss` configured.
3. Import shared styles once at app root:

```ts
import "@ap/shared-ui/styles.css";
```

This provides shared CSS variables and utility animations used by the shared components.

## Adapter Setup

Wrap your app with `SharedUiAdapterProvider` and provide adapters for:

- auth (`useSession`, `signIn`, `getSession`)
- customer account actions
- order actions
- referral checkout actions
- support contact info

Example implementation exists in:

- `affordable-peptides`: `components/AppSharedUiAdapterProvider.tsx`
- `1uplabs`: `app/shared/SharedUiAdaptersProvider.tsx`
