"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useHRMS } from "@/context/hrms-context";
import {
  UserCircle,
  Mail,
  Phone,
  Building2,
  Calendar,
  MapPin,
  Shield,
  FileCheck,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import type { Employee } from "@/types";

export default function ProfilePage() {
  const { currentUser, employees } = useHRMS();

  // The employee record linked to this login. Never fall back to somebody else's record.
  const profile = employees.find((e) => e.employeeId === currentUser.employeeId);

  if (!profile) {
    return (
      <AppShell>
        <div className="max-w-xl bg-white rounded-xl border border-slate-200 p-6 text-sm text-slate-600">
          {currentUser.employeeId
            ? "Loading your profile..."
            : "Your login is not linked to an employee record, so there is no HR profile to show. Please contact HR."}
        </div>
      </AppShell>
    );
  }
  // key: form fields restart from the loaded record
  return <ProfileContent key={profile.id} profile={profile} />;
}

function ProfileContent({ profile }: { profile: Employee }) {
  const { currentUser, updateEmployee } = useHRMS();

  const [personalEmail, setPersonalEmail] = useState(profile.personalEmail || "");
  const [phone, setPhone] = useState(profile.phone || "");
  const [address, setAddress] = useState(profile.address || "");
  const [saving, setSaving] = useState(false);

  const displayName = profile.fullName || currentUser.name || currentUser.email || "User";
  const designation = profile?.designationTitle || currentUser.designation || "Employee";
  const department = profile?.departmentName || "";

  // Employees may change only these contact fields (the API rejects anything else).
  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    const changes: Partial<Employee> = {};
    if (phone.trim() !== profile.phone) {
      if (phone.trim().length < 7) return void toast.error("Enter a valid phone number");
      changes.phone = phone.trim();
    }
    if (personalEmail.trim() && personalEmail.trim().toLowerCase() !== (profile.personalEmail || "")) changes.personalEmail = personalEmail.trim();
    if (address.trim() !== (profile.address || "")) changes.address = address.trim();
    if (Object.keys(changes).length === 0) return void toast.info("No changes to save");

    setSaving(true);
    await updateEmployee(profile.id, changes); // shows its own success / error toast
    setSaving(false);
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl">
        {/* Header Banner */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="h-28 bg-gradient-to-r from-emerald-800 to-slate-900" />
          <div className="px-6 pb-6 pt-0 relative flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4 -mt-12 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={displayName}
                  className="w-24 h-24 rounded-full border-4 border-white shadow-md object-cover bg-white"
                />
              ) : (
                <div className="w-24 h-24 rounded-full border-4 border-white shadow-md bg-emerald-700 text-white text-2xl font-bold flex items-center justify-center">
                  {displayName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                </div>
              )}
              <div className="pt-2 sm:pt-12">
                <h2 className="text-xl font-bold text-slate-900">{displayName}</h2>
                <p className="text-xs text-slate-500 font-medium">
                  {designation}{department ? ` • ${department}` : ""}
                </p>
                <div className="flex items-center justify-center sm:justify-start gap-2 mt-1">
                  <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                    {profile.employeeId}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                    {profile?.employmentType || "Active"}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 sm:pt-0">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                <CheckCircle2 size={14} /> {profile.status} Employment Status
              </span>
            </div>
          </div>
        </div>

        {/* Two-Column Information Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Employment Details (Read-only policy controlled) */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="border-b pb-2">
              <h3 className="font-bold text-slate-800 text-sm">Employment Profile (HR Master)</h3>
              <p className="text-[11px] text-slate-500">Core organizational and reporting lines</p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Department</span>
                <span className="font-semibold text-slate-800">{profile?.departmentName || "—"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Designation</span>
                <span className="font-semibold text-slate-800">{profile?.designationTitle || currentUser.designation || "—"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Reporting Manager</span>
                <span className="font-semibold text-slate-800">{profile.reportingManagerName || "—"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Date of Joining</span>
                <span className="font-semibold text-slate-800">{profile?.joiningDate || "—"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Work Location</span>
                <span className="font-semibold text-slate-800">{profile.workLocation}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Official Work Email</span>
                <span className="font-semibold text-slate-800">{profile.workEmail}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg text-[11px] text-slate-500 leading-relaxed border border-slate-100">
              <span className="font-semibold text-slate-700">Protected Fields Notice:</span> Official designation, department assignment, and reporting managers can only be updated by authorized HR Operations personnel (BR-003).
            </div>
          </div>

          {/* Contact & Personal Settings (Editable by Employee) */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="border-b pb-2">
              <h3 className="font-bold text-slate-800 text-sm">Personal & Contact Preferences</h3>
              <p className="text-[11px] text-slate-500">Update permitted contact information</p>
            </div>

            <form onSubmit={handleSaveContact} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Personal Email</label>
                <input
                  type="email"
                  value={personalEmail}
                  onChange={(e) => setPersonalEmail(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mobile Contact Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Residential Address</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-2 px-4 disabled:opacity-60 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-sm transition"
                >
                  {saving ? "Saving..." : "Save Contact Updates"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
