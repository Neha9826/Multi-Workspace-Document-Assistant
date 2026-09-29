"use client";

import { useActionState } from "react";
import {
  loginAction,
  signupAction,
  googleAction,
  type AuthState,
} from "./actions";

const initialState: AuthState = {};

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

const buttonClass =
  "w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60";

export default function LoginPage() {
  const [loginState, loginFormAction, loginPending] =
    useActionState(loginAction, initialState);

  const [signupState, signupFormAction, signupPending] =
    useActionState(signupAction, initialState);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-6">
      <div className="mx-auto w-full max-w-5xl">

        {/* Branding */}
        <header className="mb-8 text-center">
          <div className="brand-mark">
            A
          </div>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Abstrabit Doc Assistant
          </h1>

          <p className="mt-3 text-sm text-slate-400 sm:text-base">
            Your documents. Your workspaces. Your AI assistant.
          </p>
        </header>

        {/* Google Sign In */}
        <form action={googleAction} className="mx-auto mb-8 max-w-md">
          <button
            type="submit"
            className="google-button"
          >
            <svg
              aria-hidden="true"
              width="20"
              height="20"
              viewBox="0 0 48 48"
            >
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.72 7.18l7.62 5.91c4.45-4.11 7.14-10.16 7.14-17.56Z"
              />
              <path
                fill="#FBBC05"
                d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.88.93 7.55 2.56 10.78l7.97-6.19Z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.9-5.89l-7.62-5.91c-2.12 1.42-4.84 2.27-8.28 2.27-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"
              />
            </svg>

            Continue with Google
          </button>
        </form>

        <div className="mb-8 flex items-center gap-4">
          <div className="h-px flex-1 bg-slate-800" />
          <span className="text-xs font-medium uppercase tracking-widest text-slate-500">
            Or continue with email
          </span>
          <div className="h-px flex-1 bg-slate-800" />
        </div>

        {/* Authentication Forms */}
        <div className="auth-grid">

          {/* Sign In */}
          <section className="auth-card rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold">
                Welcome back
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                Sign in to continue to your workspace.
              </p>
            </div>

            <form action={loginFormAction} className="space-y-5">
              <div>
                <label
                  htmlFor="login-email"
                  className="mb-2 block text-sm font-medium"
                >
                  Email address
                </label>

                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="mb-2 block text-sm font-medium"
                >
                  Password
                </label>

                <input
                  id="login-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  required
                  className={inputClass}
                />
              </div>

              {loginState.error && (
                <p
                  role="alert"
                  className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400"
                >
                  {loginState.error}
                </p>
              )}

              <button
                type="submit"
                disabled={loginPending}
                className={buttonClass}
              >
                {loginPending ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <p className="mt-5 text-center text-xs text-slate-500">
              Already have an account? Sign in here.
            </p>
          </section>

          {/* Create Account */}
          <section className="auth-card rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold">
                Create your account
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                Get started with your own workspace.
              </p>
            </div>

            <form action={signupFormAction} className="space-y-5">
              <div>
                <label
                  htmlFor="signup-email"
                  className="mb-2 block text-sm font-medium"
                >
                  Email address
                </label>

                <input
                  id="signup-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="signup-password"
                  className="mb-2 block text-sm font-medium"
                >
                  Create password
                </label>

                <input
                  id="signup-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  placeholder="At least 8 characters"
                  required
                  className={inputClass}
                />
              </div>

              {signupState.error && (
                <p
                  role="alert"
                  className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400"
                >
                  {signupState.error}
                </p>
              )}

              {signupState.success && (
                <p
                  role="status"
                  className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-400"
                >
                  {signupState.success}
                </p>
              )}

              <button
                type="submit"
                disabled={signupPending}
                className={buttonClass}
              >
                {signupPending
                  ? "Creating account..."
                  : "Create Account"}
              </button>
            </form>

            <p className="mt-5 text-center text-xs text-slate-500">
              New to Abstrabit? Create your account here.
            </p>
          </section>

        </div>

        {/* Footer */}
        <footer className="mt-8 text-center text-xs text-slate-500">
          Secure authentication · Intelligent document workflows
        </footer>
      </div>
    </main>
  );
}