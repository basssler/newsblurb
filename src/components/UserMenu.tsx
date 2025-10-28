"use client";

import { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";

export default function UserMenu() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  if (!session) {
    return (
      <button
        onClick={() => signIn("github")}
        className="px-4 py-2 rounded-lg font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
      >
        Sign In
      </button>
    );
  }

  return (
    <div className="relative">
      {/* User Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        {session.user?.image ? (
          <img
            src={session.user.image}
            alt={session.user.name || "User"}
            className="w-8 h-8 rounded-full"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
            {session.user?.name?.charAt(0) || "U"}
          </div>
        )}
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {session.user?.name?.split(" ")[0]}
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50">
          <div className="p-3 border-b border-slate-200 dark:border-slate-700">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {session.user?.name}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {session.user?.email}
            </p>
          </div>

          <nav className="py-1">
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              👤 Profile
            </Link>
            <Link
              href="/watchlist"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              ⭐ Watchlist
            </Link>
            <Link
              href="/history"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              📊 Analysis History
            </Link>
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              ⚙️ Settings
            </Link>
          </nav>

          <div className="border-t border-slate-200 dark:border-slate-700 p-2">
            <button
              onClick={() => {
                signOut();
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
            >
              🚪 Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
