"use client";

import { useState } from "react";
import Link from "next/link";
import { BrainCircuit, Sparkles } from "lucide-react";
import { messages, type Locale } from "@/lib/messages";

export type AuthUser = {
  id: string;
  username: string;
  avatar: string | null;
  role: string;
  isGuest: boolean;
  locale: Locale;
  theme: "light" | "dark";
  defaultLanguage: Locale;
};

type AuthMode = "login" | "register" | "guest";

export function AuthScreen({
  locale,
  googleAuthEnabled,
  onAuthenticated,
}: {
  locale: Locale;
  googleAuthEnabled: boolean;
  onAuthenticated: (user: AuthUser) => void;
}) {
  const t = messages[locale];
  const [mode, setMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (mode === "register" && password !== confirmPassword) {
      setError(locale === "it" ? "Le password non coincidono." : "Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: mode,
          username,
          ...(mode !== "guest" ? { password } : {}),
          ...(mode === "register" ? { confirmPassword } : {}),
        }),
      });
      const result = (await response.json()) as { user?: AuthUser; error?: string };
      if (!response.ok || !result.user) throw new Error(result.error ?? t.networkError);
      onAuthenticated(result.user);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t.networkError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <aside className="auth-aside">
        <div className="brand-lockup">
          <span className="brand-mark"><BrainCircuit size={22} strokeWidth={2.2} /></span>
          <span>SynaptiQuiz</span>
        </div>
        <div className="auth-hero">
          <span className="eyebrow">{t.heroEyebrow}</span>
          <h1>{t.heroTitle}</h1>
          <p>{t.heroDescription}</p>
        </div>
        <div className="auth-illustration" aria-hidden="true">
          <div className="mini-question"><span>01 · science</span><strong>What keeps the moon in orbit?</strong></div>
          <div className="mini-question"><span>02 · culture</span><strong>Two minds. One score.</strong></div>
        </div>
      </aside>
      <section className="auth-main">
        <div className="auth-card">
          <span className="eyebrow">{t.tagline}</span>
          <h2>{mode === "register" ? t.createAccount : t.loginTitle}</h2>
          <p>{t.loginDescription}</p>
          <div className="auth-tabs" role="tablist" aria-label={t.signIn}>
            <button type="button" className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setError(""); }}>
              {t.loginTab}
            </button>
            <button type="button" className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setError(""); }}>
              {t.registerTab}
            </button>
            <button type="button" className={mode === "guest" ? "active" : ""} onClick={() => { setMode("guest"); setError(""); }}>
              {t.guestTab}
            </button>
          </div>
          <form className="form-stack" onSubmit={submit}>
            <label className="field">
              {t.username}
              <input
                autoComplete="username"
                minLength={3}
                maxLength={24}
                pattern="[A-Za-z0-9._-]+"
                required
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="samuele"
              />
            </label>
            {mode !== "guest" && (
              <label className="field">
                {t.password}
                <input
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                  minLength={8}
                  maxLength={128}
                  required
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
            )}
            {mode === "register" && (
              <label className="field">
                {t.confirmPassword}
                <input
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  required
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </label>
            )}
            {error && <div className="error-message" role="alert">{error}</div>}
            <button className="primary-button full-width" type="submit" disabled={busy}>
              {busy ? t.signingIn : mode === "register" ? t.createAccount : mode === "guest" ? t.continueAsGuest : t.signIn}
              <Sparkles size={15} />
            </button>
          </form>
          {googleAuthEnabled && (
            <>
              <div className="auth-divider">{t.orContinue}</div>
              <Link className="secondary-button full-width" href="/api/auth/google">
                <span aria-hidden="true" style={{ fontWeight: 800, color: "#4285f4" }}>G</span>
                {t.google}
              </Link>
            </>
          )}
          <div className="auth-footer">{t.authNote}</div>
        </div>
      </section>
    </main>
  );
}