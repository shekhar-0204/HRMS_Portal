"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useHRMS } from "@/context/hrms-context";
import { ApiError } from "@/lib/api/client";
import { Lock, Mail, Eye, EyeOff, Sun, Moon, Copy, ArrowLeft, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Where password-reset requests are sent. Override with NEXT_PUBLIC_SUPER_ADMIN_EMAIL in Vercel.
const SUPER_ADMIN_EMAIL = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || "superadmin@graapes.com";

export default function LoginPage() {
  const router = useRouter();
  const { login, theme, setTheme } = useHRMS();
  const [view, setView] = useState<"signin" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const isDark = theme === "dark";

  const mailHref = `mailto:${SUPER_ADMIN_EMAIL}?subject=${encodeURIComponent("Password reset request - Graapes HRMS")}&body=${encodeURIComponent(`Hello,\n\nI am unable to sign in to Graapes HRMS and would like my password to be reset.\n\nLogin email: ${email.trim() || "(please add your email)"}\n\nKindly share a temporary password.\n\nThank you.`)}`;
  const copyAdminEmail = async () => {
    try { await navigator.clipboard.writeText(SUPER_ADMIN_EMAIL); toast.success("Email address copied"); }
    catch { toast.error("Could not copy the email address"); }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) { toast.error("Please enter your email and password"); return; }
    try {
      setLoading(true);
      const user = await login(email.trim(), password);
      toast.success(`Signed in as ${user.name}`);
      router.replace(user.mustChangePassword ? "/change-password" : "/dashboard");
    } catch (err) {
      const msg = err instanceof ApiError && err.status === 429 ? "Too many login attempts. Please wait and try again." : err instanceof Error ? err.message : "Unable to sign in";
      toast.error("Sign-in failed", { description: msg });
    } finally { setLoading(false); }
  };

  const label = "block text-sm font-medium mb-1.5";
  const field = cn(
    "w-full pl-10 pr-3 py-2.5 rounded-lg border text-sm outline-none transition focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600",
    isDark ? "bg-slate-900 border-slate-700 text-white placeholder:text-slate-500" : "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
  );
  const primary = "w-full py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2";

  return (
    <main className={cn("min-h-screen grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]", isDark ? "bg-slate-950 text-white" : "bg-white text-slate-900")}>
      {/* Brand panel */}
      <aside className="relative hidden lg:flex flex-col justify-between bg-slate-900 text-white px-14 py-12 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "44px 44px" }} />
        <div className="absolute inset-y-0 right-0 w-px bg-white/10" />
        <div className="relative flex items-center gap-3">
          <img src="/graapes-logo.png" alt="Graapes" className="w-10 h-10 rounded-lg bg-white p-1 object-contain" />
          <div className="leading-tight">
            <p className="text-base font-semibold tracking-wide">Graapes</p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Human Resource Management</p>
          </div>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold leading-snug">A single, secure workspace for people operations.</h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-300">Employee records, attendance, leave and documents, managed with role-based access and a complete audit trail.</p>
          <dl className="mt-10 divide-y divide-white/10 border-y border-white/10 text-sm">
            {[
              ["Role-based access", "Every user sees only what their role allows."],
              ["Audit trail", "Sensitive actions are recorded for accountability."],
              ["Protected records", "Employee documents are stored and shared securely."],
            ].map(([t, d]) => (
              <div key={t} className="flex gap-4 py-4">
                <dt className="w-40 shrink-0 font-medium text-white">{t}</dt>
                <dd className="text-slate-400">{d}</dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="relative text-xs text-slate-500">© Graapes. Authorised users only.</p>
      </aside>

      {/* Form panel */}
      <section className={cn("relative flex items-center justify-center px-6 py-12", isDark ? "bg-slate-950" : "bg-slate-50")}>
        <button onClick={() => setTheme(isDark ? "light" : "dark")} aria-label="Toggle theme" className={cn("absolute top-5 right-5 p-2 rounded-lg border transition", isDark ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-slate-200 text-slate-600 hover:bg-white")}>
          {isDark ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <div className="w-full max-w-sm">
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <img src="/graapes-logo.png" alt="Graapes" className="w-10 h-10 object-contain rounded-lg" />
            <p className="font-semibold">Graapes HRMS</p>
          </div>

          {view === "signin" ? (
            <>
              <h1 className="text-2xl font-semibold">Sign in</h1>
              <p className={cn("mt-1.5 text-sm", isDark ? "text-slate-400" : "text-slate-600")}>Use your company email and password to access the portal.</p>

              <form onSubmit={submit} className="mt-8 space-y-5">
                <div>
                  <label htmlFor="email" className={label}>Email address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                    <input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" className={field} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="password" className="text-sm font-medium">Password</label>
                    <button type="button" onClick={() => setView("forgot")} className="text-xs font-medium text-blue-700 hover:text-blue-800 hover:underline dark:text-blue-400">Forgot password?</button>
                  </div>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                    <input id="password" type={show ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className={cn(field, "pr-10")} />
                    <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">{show ? <EyeOff size={17} /> : <Eye size={17} />}</button>
                  </div>
                </div>
                <button disabled={loading} className={primary}>{loading ? "Signing in..." : "Sign in"}</button>
              </form>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setView("signin")} className={cn("inline-flex items-center gap-1.5 text-sm font-medium mb-6 hover:underline", isDark ? "text-slate-300" : "text-slate-600")}>
                <ArrowLeft size={15} /> Back to sign in
              </button>
              <h1 className="text-2xl font-semibold">Reset your password</h1>
              <p className={cn("mt-1.5 text-sm leading-relaxed", isDark ? "text-slate-400" : "text-slate-600")}>
                For security, passwords are reset by your Super Admin. Send a request and you will receive a temporary password, which you must change at your next sign-in.
              </p>

              <ol className={cn("mt-6 space-y-3 text-sm", isDark ? "text-slate-300" : "text-slate-700")}>
                {["Send the request to the Super Admin by email.", "Receive a temporary password from them.", "Sign in and set a new password of your own."].map((s, i) => (
                  <li key={s} className="flex gap-3">
                    <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold", isDark ? "border-slate-600" : "border-slate-300 bg-white")}>{i + 1}</span>
                    <span className="pt-0.5">{s}</span>
                  </li>
                ))}
              </ol>

              <div className={cn("mt-6 flex items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5", isDark ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white")}>
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Super Admin</p>
                  <p className="truncate text-sm font-medium">{SUPER_ADMIN_EMAIL}</p>
                </div>
                <button type="button" onClick={copyAdminEmail} aria-label="Copy email address" className={cn("shrink-0 rounded-md border p-2 transition", isDark ? "border-slate-700 hover:bg-slate-800" : "border-slate-200 hover:bg-slate-50")}><Copy size={15} /></button>
              </div>

              <a href={mailHref} className={cn(primary, "mt-5")}><Mail size={16} /> Send request by email</a>
              <p className="mt-3 text-xs text-slate-500">This opens your email application with the message already written.</p>
            </>
          )}

          <p className="mt-10 flex items-center gap-2 text-xs text-slate-500"><ShieldCheck size={14} /> Access is monitored. Authorised users only.</p>
        </div>
      </section>
    </main>
  );
}
