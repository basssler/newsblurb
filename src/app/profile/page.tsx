"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default function ProfilePage() {
  const { data: session, status } = useSession();

  // Redirect to home if not authenticated
  if (status === "unauthenticated") {
    redirect("/");
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-slate-600 dark:text-slate-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Navigation */}
      <div className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-blue-500 hover:text-blue-600 font-medium transition-colors flex items-center gap-2"
          >
            ← Back
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Profile</h1>
          <div className="w-20" /> {/* Spacer for alignment */}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-12">
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-8 max-w-2xl">
          {/* User Avatar and Basic Info */}
          <div className="flex items-center gap-6 mb-8">
            {session?.user?.image ? (
              <img
                src={session.user.image}
                alt={session.user.name || "User"}
                className="w-20 h-20 rounded-full"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-3xl font-semibold">
                {session?.user?.name?.charAt(0) || "U"}
              </div>
            )}
            <div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
                {session?.user?.name}
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                {session?.user?.email}
              </p>
            </div>
          </div>

          {/* Profile Info */}
          <div className="space-y-6 mb-8">
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Full Name
              </h3>
              <p className="text-slate-900 dark:text-white">
                {session?.user?.name || "Not set"}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Email
              </h3>
              <p className="text-slate-900 dark:text-white">
                {session?.user?.email || "Not set"}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Account Status
              </h3>
              <p className="text-slate-900 dark:text-white">
                ✅ Active (GitHub OAuth)
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-6 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="px-4 py-2 rounded-lg font-medium bg-red-600 hover:bg-red-700 text-white transition-colors"
            >
              Sign Out
            </button>
            <Link
              href="/settings"
              className="px-4 py-2 rounded-lg font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              Settings
            </Link>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <Link
            href="/watchlist"
            className="p-6 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <h3 className="text-xl font-bold mb-2">⭐ Watchlist</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              View your saved stocks
            </p>
          </Link>
          <Link
            href="/history"
            className="p-6 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <h3 className="text-xl font-bold mb-2">📊 History</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              View analysis history
            </p>
          </Link>
          <Link
            href="/settings"
            className="p-6 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <h3 className="text-xl font-bold mb-2">⚙️ Settings</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Manage preferences
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
