"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useHRMS } from "@/context/hrms-context";
import { toast } from "sonner";

const POLICY = "At least 10 characters with an upper-case letter, a lower-case letter and a digit.";
const meetsPolicy = (p: string) => p.length >= 10 && p.length <= 128 && /[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p);

export default function ChangePasswordPage() {
  const router = useRouter();
  const { logout, completePasswordChange, isAuthenticated, authLoading, currentUser } = useHRMS();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Only a signed-in user can be here.
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace("/login");
  }, [authLoading, isAuthenticated, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetsPolicy(newPassword)) return void toast.error("Password does not meet the policy", { description: POLICY });
    if (newPassword !== confirmPassword) return void toast.error("New password and confirmation do not match");
    if (newPassword === currentPassword) return void toast.error("New password must be different from the current password");
    setLoading(true);
    // Refreshes the session (clears "must change password") and loads the data that was blocked until now.
    const ok = await completePasswordChange(currentPassword, newPassword);
    setLoading(false);
    if (ok) router.replace("/dashboard");
  };

  if (authLoading || !isAuthenticated) return <div className="min-h-screen grid place-items-center text-slate-500">Loading...</div>;

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <form onSubmit={submit} className="w-full max-w-md bg-white border rounded-2xl shadow p-8 space-y-4">
        <h1 className="text-2xl font-bold">Change password</h1>
        <p className="text-sm text-slate-500">
          {currentUser.mustChangePassword ? "You must change your temporary password before continuing." : "Choose a new password for your account."}
        </p>
        <input className="w-full border rounded-lg p-3" type="password" autoComplete="current-password" placeholder="Current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
        <input className="w-full border rounded-lg p-3" type="password" autoComplete="new-password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
        <input className="w-full border rounded-lg p-3" type="password" autoComplete="new-password" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
        <p className="text-xs text-slate-500">{POLICY}</p>
        <button className="w-full bg-indigo-600 text-white rounded-lg p-3 disabled:opacity-60" disabled={loading}>{loading ? "Updating..." : "Update password"}</button>
        {!currentUser.mustChangePassword && (
          <button type="button" className="w-full text-sm text-slate-500" onClick={() => router.back()}>Cancel</button>
        )}
        <button type="button" className="w-full text-sm text-slate-500" onClick={async () => { await logout(); router.replace("/login"); }}>Sign out</button>
      </form>
    </main>
  );
}
