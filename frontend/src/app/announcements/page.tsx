"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useHRMS } from "@/context/hrms-context";
import { Announcement } from "@/types";
import {
  Megaphone,
  Plus,
  Calendar,
  User,
  Tag,
  AlertCircle,
  X,
  Share2,
} from "lucide-react";
import { toast } from "sonner";

export default function AnnouncementsPage() {
  const { currentUser, announcements, createAnnouncement } = useHRMS();

  const [showModal, setShowModal] = useState(false);
  const [newAnn, setNewAnn] = useState({
    title: "",
    content: "",
    category: "General" as Announcement["category"],
    priority: "Medium" as Announcement["priority"],
    targetAudience: "All Employees" as Announcement["targetAudience"],
  });

  const canPublish = currentUser.role === "super_admin" || currentUser.role === "hr_admin";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnn.title || !newAnn.content) {
      toast.error("Please enter both title and content");
      return;
    }

    createAnnouncement(newAnn);
    setShowModal(false);
    setNewAnn({
      title: "",
      content: "",
      category: "General",
      priority: "Medium",
      targetAudience: "All Employees",
    });
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl lg:text-2xl font-bold text-slate-800">Company Announcements & Broadcasts</h2>
            <p className="text-xs text-slate-500 mt-1">
              Official company notices, policy releases, festive holiday schedules, and event updates.
            </p>
          </div>

          {canPublish && (
            <button
              onClick={() => setShowModal(true)}
              className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-sm flex items-center gap-1.5"
            >
              <Plus size={15} /> Publish Announcement
            </button>
          )}
        </div>

        {/* Announcements List */}
        <div className="space-y-4">
          {announcements.map((ann) => (
            <div
              key={ann.id}
              className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition space-y-3"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                      ann.priority === "High"
                        ? "bg-rose-100 text-rose-800"
                        : ann.priority === "Medium"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {ann.category} • {ann.priority} Priority
                  </span>
                  <span className="text-xs text-slate-400">Audience: {ann.targetAudience}</span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Calendar size={13} />
                  <span>Published {ann.publishedDate}</span>
                </div>
              </div>

              <h3 className="font-bold text-slate-900 text-base">{ann.title}</h3>

              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                {ann.content}
              </p>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5 font-medium">
                  <User size={13} /> {ann.authorName}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(window.location.href);
                    toast.info("Link copied to clipboard");
                  }}
                  className="text-emerald-600 hover:underline flex items-center gap-1"
                >
                  <Share2 size={13} /> Share Link
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Publish Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity" onClick={() => setShowModal(false)} />
            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl z-10 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 border border-slate-200/80">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-bold text-sm text-slate-900">Publish Company Announcement</h3>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Headline Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Quarterly Townhall Schedule"
                    value={newAnn.title}
                    onChange={(e) => setNewAnn({ ...newAnn, title: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Category</label>
                    <select
                      value={newAnn.category}
                      onChange={(e) => setNewAnn({ ...newAnn, category: e.target.value as Announcement["category"] })}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                    >
                      <option value="General">General</option>
                      <option value="HR Notice">HR Notice</option>
                      <option value="Policy Update">Policy Update</option>
                      <option value="Celebration">Celebration</option>
                      <option value="Emergency">Emergency</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Priority</label>
                    <select
                      value={newAnn.priority}
                      onChange={(e) => setNewAnn({ ...newAnn, priority: e.target.value as Announcement["priority"] })}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High (Urgent)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Announcement Content *</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Write your complete notice or announcement details..."
                    value={newAnn.content}
                    onChange={(e) => setNewAnn({ ...newAnn, content: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="py-1.5 px-3 bg-slate-100 text-slate-700 rounded-lg font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="py-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-sm"
                  >
                    Publish to Portal
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
