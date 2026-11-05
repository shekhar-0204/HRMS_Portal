"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useHRMS } from "@/context/hrms-context";
import { ApiError } from "@/lib/api/client";
import { Lock, Mail, Eye, EyeOff, Shield, Sun, Moon, Copy, Users, CalendarCheck, FileText, BarChart3, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Where password-reset requests are sent. Override with NEXT_PUBLIC_SUPER_ADMIN_EMAIL in Vercel.
const SUPER_ADMIN_EMAIL = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || "superadmin@graapes.com";

const FEATURES = [
  { icon: Users, text: "Employee directory & organization" },
  { icon: CalendarCheck, text: "Attendance and leave in one place" },
  { icon: FileText, text: "Secure employee documents" },
  { icon: BarChart3, text: "Reports & analytics for HR" },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, theme, setTheme } = useHRMS();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const isDark = theme === "dark";

  const mailHref = `mailto:${SUPER_ADMIN_EMAIL}?subject=${encodeURIComponent("Password reset request - Graapes HRMS")}&body=${encodeURIComponent(`Hello Super Admin,\n\nI forgot my password for Graapes HRMS. Please reset it and share a temporary password with me.\n\nMy login email: ${email.trim() || "(please add your email)"}\n\nThank you.`)}`;
  const copyAdminEmail = async () => {
    try { await navigator.clipboard.writeText(SUPER_ADMIN_EMAIL); toast.success("Super Admin email copied"); }
    catch { toast.error("Could not copy the email"); }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) { toast.error("Please enter your email and password"); return; }
    try {
      setLoading(true);
      const user = await login(email.trim(), password);
      toast.success(`Welcome back, ${user.name}`);
      router.replace(user.mustChangePassword ? "/change-password" : "/dashboard");
    } catch (err) {
      const msg = err instanceof ApiError && err.status === 429 ? "Too many login attempts. Please wait and try again." : err instanceof Error ? err.message : "Unable to sign in";
      toast.error("Login failed", { description: msg });
    } finally { setLoading(false); }
  };

  const input = cn("w-full pl-10 pr-3 py-3 rounded-xl border text-sm outline-none transition focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500", isDark ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400");

  return (
    <main className={cn("min-h-screen grid lg:grid-cols-2", isDark ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900")}>
      {/* Brand panel */}
      <section className="relative hidden lg:flex flex-col justify-between overflow-hidden p-12 text-white bg-gradient-to-br from-indigo-700 via-violet-700 to-fuchsia-700">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[28rem] h-[28rem] rounded-full bg-fuchsia-400/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <img src="/graapes-logo.png" alt="Graapes" className="w-11 h-11 rounded-xl bg-white p-1 object-contain" />
          <span className="text-lg font-bold tracking-wide">GRAAPES HRMS</span>
        </div>
        <div className="relative max-w-md">
          <h2 className="text-4xl font-extrabold leading-tight">Everything your team needs, in one portal.</h2>
          <p className="mt-4 text-indigo-100">Manage people, time off and records securely — from anywhere.</p>
          <ul className="mt-8 space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg bg-white/15 backdrop-blur flex items-center justify-center"><Icon size={18} /></span>
                <span className="text-sm font-medium">{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-indigo-200">© Graapes. All rights reserved.</p>
      </section>

      {/* Form panel */}
      <section className="relative flex items-center justify-center p-6">
        <button onClick={() => setTheme(isDark ? "light" : "dark")} aria-label="Toggle theme" className={cn("absolute top-5 right-5 p-2 rounded-lg border transition", isDark ? "border-slate-700 hover:bg-slate-800" : "border-slate-200 hover:bg-white")}>
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className={cn("w-full max-w-md rounded-2xl border shadow-2xl p-8 sm:p-10", isDark ? "bg-slate-900 border-slate-800 shadow-black/40" : "bg-white border-slate-200 shadow-indigo-100")}>
          <div className="flex justify-center mb-5 lg:hidden"><img src="/graapes-logo.png" alt="Graapes" className="w-14 h-14 object-contain rounded-xl" /></div>
          <h1 className="text-3xl font-extrabold">Welcome back 👋</h1>
          <p className="text-sm text-slate-500 mt-2">Sign in to continue to your Graapes workspace.</p>

          <form onSubmit={submit} className="mt-8 space-y-5">
            <label className="block text-sm font-semibold">Email Address
              <div className="relative mt-1.5">
                <Mail size={17} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" className={input} />
              </div>
            </label>
            <label className="block text-sm font-semibold">Password
              <div className="relative mt-1.5">
                <Lock size={17} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input type={show ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className={cn(input, "pr-11")} />
                <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
            </label>
            <div className="text-right -mt-2"><button type="button" onClick={() => setShowForgot((v) => !v)} className="text-xs font-semibold text-indigo-600 hover:underline">Forgot password?</button></div>
            <button disabled={loading} className="group w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold shadow-lg shadow-indigo-500/30 transition disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? "Signing in..." : <>Sign In <ArrowRight size={17} className="transition group-hover:translate-x-0.5" /></>}
            </button>
          </form>

          {showForgot && (
            <div className={cn("mt-5 rounded-xl border p-4 text-sm", isDark ? "bg-slate-800 border-slate-700" : "bg-indigo-50 border-indigo-100")}>
              <p className="font-semibold">Forgot your password?</p>
              <p className="mt-1 text-xs text-slate-500">Passwords can only be reset by your Super Admin. Please send them an email and they will share a new temporary password with you.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a href={mailHref} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold"><Mail size={14} /> Email Super Admin</a>
                <button type="button" onClick={copyAdminEmail} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold"><Copy size={14} /> Copy email</button>
              </div>
              <p className="mt-2 text-[11px] text-slate-500">{SUPER_ADMIN_EMAIL}</p>
            </div>
          )}

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500"><Shield size={14} /> Secure access • Permissions are managed by your account</div>
        </div>
      </section>
    </main>
  );
}
