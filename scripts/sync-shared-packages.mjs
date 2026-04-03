import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

const sharedCoreSourceFiles = [
  ["lib/datetime.ts", "packages/shared-core/src/datetime.ts"],
  ["lib/cart-pricing.ts", "packages/shared-core/src/cart-pricing.ts"],
  ["lib/shipping.ts", "packages/shared-core/src/shipping.ts"],
  ["lib/support.ts", "packages/shared-core/src/support.ts"],
  ["lib/molecules.ts", "packages/shared-core/src/molecules.ts"],
  ["lib/products.ts", "packages/shared-core/src/products.ts"],
  ["lib/reviews.ts", "packages/shared-core/src/reviews.ts"],
  ["types/referrals.ts", "packages/shared-core/src/referrals.ts"],
];

const sharedUiSourceFiles = [
  ["components/AgeGate.tsx", "packages/shared-ui/src/components/AgeGate.tsx"],
  [
    "components/AgeGateProvider.tsx",
    "packages/shared-ui/src/components/AgeGateProvider.tsx",
  ],
  ["components/Disclaimer.tsx", "packages/shared-ui/src/components/Disclaimer.tsx"],
  [
    "components/MoleculeViewer.tsx",
    "packages/shared-ui/src/components/MoleculeViewer.tsx",
  ],
  ["components/NavBar.tsx", "packages/shared-ui/src/components/NavBar.tsx"],
  [
    "components/ProductMockup.tsx",
    "packages/shared-ui/src/components/ProductMockup.tsx",
  ],
  ["components/Providers.tsx", "packages/shared-ui/src/components/Providers.tsx"],
];

const sharedUiSourceDirs = [
  ["components/account", "packages/shared-ui/src/components/account"],
  ["components/admin", "packages/shared-ui/src/components/admin"],
  ["components/analytics", "packages/shared-ui/src/components/analytics"],
  ["components/checkout", "packages/shared-ui/src/components/checkout"],
  ["components/home", "packages/shared-ui/src/components/home"],
  ["components/orders", "packages/shared-ui/src/components/orders"],
  ["components/store", "packages/shared-ui/src/components/store"],
];

async function copyFilePair([srcRelativePath, destRelativePath]) {
  const source = join(repoRoot, srcRelativePath);
  const destination = join(repoRoot, destRelativePath);
  await mkdir(dirname(destination), { recursive: true });
  await cp(source, destination);
}

async function copyDirectoryPair([srcRelativePath, destRelativePath]) {
  const source = join(repoRoot, srcRelativePath);
  const destination = join(repoRoot, destRelativePath);
  await rm(destination, { recursive: true, force: true });
  await mkdir(dirname(destination), { recursive: true });
  await cp(source, destination, { recursive: true });
}

async function syncSharedCore() {
  for (const pair of sharedCoreSourceFiles) {
    await copyFilePair(pair);
  }
}

async function syncSharedUi() {
  const componentsRoot = join(repoRoot, "packages/shared-ui/src/components");
  await rm(componentsRoot, { recursive: true, force: true });
  await mkdir(componentsRoot, { recursive: true });

  for (const pair of sharedUiSourceFiles) {
    await copyFilePair(pair);
  }

  for (const pair of sharedUiSourceDirs) {
    await copyDirectoryPair(pair);
  }
}

async function main() {
  await syncSharedCore();
  await syncSharedUi();
}

main().catch((error) => {
  console.error("Failed to sync shared packages:", error);
  process.exit(1);
});
