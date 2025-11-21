"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type SessionUser = {
  email: string;
  name?: string | null;
};

const links = [
  { href: "/account", label: "Overview" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/profile", label: "Profile" },
];

export function AccountSidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.25em] text-purple-200">
          Welcome
        </p>
        <p className="mt-2 text-sm font-semibold text-white">
          {user.name ?? user.email}
        </p>
        <p className="text-xs text-zinc-400">{user.email}</p>
      </div>
      <nav className="flex flex-col gap-2">
        {links.map((link) => {
          const isActive =
            pathname === link.href ||
            (link.href !== "/account" && pathname?.startsWith(link.href));

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                isActive
                  ? "border-purple-500/60 bg-purple-500/10 text-white"
                  : "border-purple-900/40 text-zinc-300 hover:border-purple-500/60 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

