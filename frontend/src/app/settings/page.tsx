"use client";

import React, { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useHRMS } from "@/context/hrms-context";
import {
  Settings,
  Bell,
  Globe,
  Clock,
  Shield,
  HelpCircle,
  ToggleLeft,
  ToggleRight,
  Sun,
  Moon,
  Laptop,
  Check,
  Palette,
} from "lucide-react";
import { toast } from "sonner";
import { settingsApi } from "@/lib/api/hrms-api";

export default function SettingsPage() {
  const { currentUser, theme, setTheme } = useHRMS();

  const [emailAlerts, setEmailAlerts] = useState(true);
  const [inAppAlerts, setInAppAlerts] = useState(true);
  const timezone = "Asia/Kolkata (IST +5:30)"; // fixed business timezone (server enforces it)
  const [dateFormat, setDateFormat] = useState("DD-MMM-YYYY");
  const [saving, setSaving] = useState(false);

  // Load the saved preferences from the server
  useEffect(() => {
    settingsApi.get().then((r) => {
      setEmailAlerts(r.data.emailNotifications);
      setInAppAlerts(r.data.inAppNotifications);
      setDateFormat(r.data.dateFormat);
    }).catch((err) => toast.error(err instanceof Error ? err.message : "Unable to load preferences"));
  }, []);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await settingsApi.update({ emailNotifications: emailAlerts, inAppNotifications: inAppAlerts, dateFormat });
      toast.success("Preferences saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to save preferences");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-slate-800">Portal Settings & System Preferences</h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure theme appearance, localization formats, notification channels, and portal preferences.
          </p>
        </div>

        <form onSubmit={handleSavePreferences} className="space-y-6">
          {/* Theme & Visual Appearance Card - Sleek 2-Mode Switcher */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3.5">
              <div>
                <h3 className="font-bold text-sm text-slate-800">Interface Appearance</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Choose your preferred color theme for comfortable viewing.
                </p>
              </div>

              {/* Minimalist Segmented Pill Toggle */}
              <div className="inline-flex items-center p-1 bg-slate-100/90 dark:bg-slate-800/80 rounded-xl border border-slate-200/70 dark:border-slate-700/60 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    setTheme("light");
                    toast.success("Theme set to Light Mode");
                  }}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-semibold text-xs transition cursor-pointer ${
                    theme === "light"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Sun size={14} className={theme === "light" ? "text-amber-500" : "text-slate-400"} />
                  <span>Light</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTheme("dark");
                    toast.success("Theme set to Dark Mode");
                  }}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-semibold text-xs transition cursor-pointer ${
                    theme === "dark"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-200"
                  }`}
                >
                  <Moon size={14} className={theme === "dark" ? "text-blue-400" : "text-slate-400"} />
                  <span>Dark</span>
                </button>
              </div>
            </div>

            {/* Visual Preview Cards (2 Modes only: Light vs Dark) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Light Mode Preview Card */}
              <div
                onClick={() => {
                  setTheme("light");
                  toast.success("Theme set to Light Mode");
                }}
                className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between group ${
                  theme === "light"
                    ? "border-blue-600 bg-blue-50/30 ring-2 ring-blue-500/20"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 flex-shrink-0">
                    <Sun size={17} />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">Light Mode</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Fresh daylight contrast with soft slate tones.</p>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  theme === "light" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"
                }`}>
                  {theme === "light" && <Check size={10} strokeWidth={3} />}
                </div>
              </div>

              {/* Dark Mode Preview Card */}
              <div
                onClick={() => {
                  setTheme("dark");
                  toast.success("Theme set to Dark Mode");
                }}
                className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between group ${
                  theme === "dark"
                    ? "border-blue-500 bg-slate-900/40 ring-2 ring-blue-500/20"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
                    <Moon size={17} />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">Dark Mode</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Sleek obsidian palette easy on the eyes.</p>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  theme === "dark" ? "border-blue-500 bg-blue-500 text-white" : "border-slate-300"
                }`}>
                  {theme === "dark" && <Check size={10} strokeWidth={3} />}
                </div>
              </div>
            </div>
          </div>
          {/* Localization Card */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4 text-xs">
            <div className="flex items-center gap-2 border-b pb-2">
              <Globe size={16} className="text-emerald-600" />
              <h3 className="font-bold text-sm text-slate-800">Regional Localization & Calendar (BR-009)</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company Approved Timezone</label>
                <select
                  value={timezone}
                  disabled
                  onChange={() => undefined}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                >
                  <option value="Asia/Kolkata (IST +5:30)">Asia/Kolkata (IST +5:30) - Standard</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Mandated standard timezone for all attendance punches and approval timestamps.
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Preferred Date Display Format</label>
                <select
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                >
                  <option value="DD-MMM-YYYY">DD-MMM-YYYY (e.g. 24-Oct-2026)</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD (ISO standard)</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notification Channels (OQ-09) */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4 text-xs">
            <div className="flex items-center gap-2 border-b pb-2">
              <Bell size={16} className="text-blue-600" />
              <h3 className="font-bold text-sm text-slate-800">Notification Delivery Channels</h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div>
                  <p className="font-bold text-slate-800">In-App Notification Center</p>
                  <p className="text-[11px] text-slate-500">Live request alerts, status updates, and announcement broadcasts.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setInAppAlerts(!inAppAlerts)}
                  className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition ${
                    inAppAlerts ? "bg-emerald-600 justify-end" : "bg-slate-300 justify-start"
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div>
                  <p className="font-bold text-slate-800">Email Notifications (Mock Gateway)</p>
                  <p className="text-[11px] text-slate-500">Dispatch email notifications for leave approvals and credentials.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEmailAlerts(!emailAlerts)}
                  className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition ${
                    emailAlerts ? "bg-emerald-600 justify-end" : "bg-slate-300 justify-start"
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                </button>
              </div>
            </div>
          </div>

          {/* Conditional Modules Status */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4 text-xs">
            <div className="flex items-center gap-2 border-b pb-2">
              <Shield size={16} className="text-purple-600" />
              <h3 className="font-bold text-sm text-slate-800">Optional / Later-Phase Modules Configuration</h3>
            </div>

            <div className="space-y-2">
              <div className="p-3 bg-slate-50 rounded-lg border flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">Payroll & Statutory Deductions</span>
                  <span className="text-[11px] text-slate-400">Locked pending statutory and pay-period validation (BR-010).</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">Phase 2 Disabled</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">Biometric Hardware & GPS Geofencing</span>
                  <span className="text-[11px] text-slate-400">Excluded from initial release (BRD section 4.3).</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">Out of Scope</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="py-2.5 px-6 disabled:opacity-60 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-sm transition"
            >
              {saving ? "Saving..." : "Save System Preferences"}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
