"use client";

import React, { useRef, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useHRMS } from "@/context/hrms-context";
import { EmployeeDocument, DocumentCategory } from "@/types";
import { FileText, Upload, Download, Eye, CheckCircle2, Clock, X, FileCheck, Trash2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1").replace(/\/$/, "");
const MAX_FILE_SIZE = 4 * 1024 * 1024; // keep below the Vercel proxy body limit (4.5 MB)
const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg"];

export default function DocumentsPage() {
  const { currentUser, documents, employees, uploadDocument, verifyDocument, deleteDocument } = useHRMS();
  const isHr = currentUser.role === "super_admin" || currentUser.role === "hr_admin";
  const [targetEmployee, setTargetEmployee] = useState(""); // GRP code; HR only, empty = own profile
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<EmployeeDocument | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newDoc, setNewDoc] = useState({
    title: "",
    category: "Identification" as DocumentCategory,
  });

  const categories: DocumentCategory[] = [
    "Appointment Letter",
    "Identification",
    "Education",
    "Experience",
    "Policy Acknowledgement",
    "Other",
  ];

  const displayedDocs = documents.filter((doc) => {
    if (currentUser.role === "employee") {
      return doc.employeeId === currentUser.employeeId;
    }
    return true;
  });

  const resetUploadForm = () => {
    setNewDoc({ title: "", category: "Identification" });
    setTargetEmployee("");
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const closeUploadModal = () => {
    if (isUploading) return;
    setShowUploadModal(false);
    resetUploadForm();
  };

  const handleFileChange = (file?: File) => {
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Only PDF, PNG and JPG files are allowed.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File size must be 4 MB or less.");
      return;
    }
    setSelectedFile(file);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newDoc.title.trim()) {
      toast.error("Please provide a document title.");
      return;
    }
    if (!selectedFile) {
      toast.error("Please select a PDF, PNG or JPG file.");
      return;
    }

    const form = new FormData();
    form.append("title", newDoc.title.trim());
    form.append("category", newDoc.category);
    // For an employee's own upload, the backend derives the owner from the logged-in session.
    // HR/Super Admin may upload to a selected employee only when an employeeId is explicitly added.
    if (isHr && targetEmployee) form.append("employeeId", targetEmployee);
    form.append("file", selectedFile);

    setIsUploading(true);
    const success = await uploadDocument(form);
    setIsUploading(false);

    if (success) {
      closeUploadModal();
    }
  };

  const handleDownload = async (doc: EmployeeDocument) => {
    try {
      const response = await fetch(
        `${API_URL}/documents/${encodeURIComponent(doc.id)}/download`,
        { credentials: "include" }
      );
      if (!response.ok) throw new Error("Unable to download document.");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = doc.fileName || "document";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success(`Downloading ${doc.fileName}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Document download failed.");
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl lg:text-2xl font-bold text-slate-800">
              {currentUser.role === "employee" ? "My Document Repository" : "Employee Document Repository"}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Secure records of signed letters, identity proofs, education credentials, and policy signoffs.
            </p>
          </div>

          <button
            onClick={() => setShowUploadModal(true)}
            className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-sm flex items-center gap-1.5"
          >
            <Upload size={15} /> Upload Document
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                  <th className="py-3 px-4">Document Title</th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">File Name & Size</th>
                  <th className="py-3 px-4">Uploaded Date</th>
                  <th className="py-3 px-4">Verification</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedDocs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      No documents found.
                    </td>
                  </tr>
                ) : displayedDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <span className="flex items-center gap-2"><FileText size={16} className="text-emerald-600 flex-shrink-0" />{doc.title}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800">{doc.employeeName}</span>
                      <span className="block text-[10px] text-slate-400 font-mono">{doc.employeeId}</span>
                    </td>
                    <td className="py-3 px-4"><span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-medium">{doc.category}</span></td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">{doc.fileName} ({doc.fileSize})</td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">{doc.uploadedAt}</td>
                    <td className="py-3 px-4">
                      {doc.verified ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded"><CheckCircle2 size={12} /> Verified</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded"><Clock size={12} /> Pending</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setPreviewDoc(doc)} className="p-1.5 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100" title="Preview details"><Eye size={15} /></button>
                        <button onClick={() => handleDownload(doc)} className="p-1.5 text-emerald-600 hover:text-emerald-800 rounded hover:bg-emerald-50" title="Download"><Download size={15} /></button>
                        {isHr && (
                          <button onClick={() => verifyDocument(doc.id, !doc.verified)} className="p-1.5 text-blue-600 hover:text-blue-800 rounded hover:bg-blue-50" title={doc.verified ? "Remove verification" : "Mark as verified"}><ShieldCheck size={15} /></button>
                        )}
                        {(isHr || !doc.verified) && (
                          <button onClick={() => { if (window.confirm(`Delete "${doc.title}"? This cannot be undone.`)) deleteDocument(doc.id); }} className="p-1.5 text-rose-600 hover:text-rose-800 rounded hover:bg-rose-50" title="Delete"><Trash2 size={15} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity" onClick={closeUploadModal} />
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl z-10 p-6 space-y-4 border border-slate-200/80">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-bold text-sm text-slate-900">Upload Employee Document</h3>
                <button type="button" onClick={closeUploadModal} disabled={isUploading} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
              </div>

              <form onSubmit={handleUploadSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Document Title *</label>
                  <input type="text" required placeholder="e.g. Master Degree Certificate" value={newDoc.title}
                    onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg" />
                </div>

                {isHr && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Upload for employee</label>
                    <select value={targetEmployee} onChange={(e) => setTargetEmployee(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg">
                      <option value="">My own profile</option>
                      {employees.filter((e) => e.status !== "Inactive").map((e) => <option key={e.id} value={e.employeeId}>{e.fullName} ({e.employeeId})</option>)}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select value={newDoc.category} onChange={(e) => setNewDoc({ ...newDoc, category: e.target.value as DocumentCategory })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg">
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">File *</label>
                  <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                    onChange={(e) => handleFileChange(e.target.files?.[0])} className="hidden" />
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-slate-200 hover:border-emerald-400 rounded-lg p-5 text-center bg-slate-50 transition">
                    <Upload size={24} className="mx-auto text-slate-400 mb-2" />
                    <p className="font-semibold text-slate-700">{selectedFile ? selectedFile.name : "Click to choose a file"}</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB selected` : "Supports PDF, JPG, PNG up to 4MB"}
                    </p>
                  </button>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={closeUploadModal} disabled={isUploading} className="py-1.5 px-3 bg-slate-100 text-slate-700 rounded-lg font-semibold disabled:opacity-50">Cancel</button>
                  <button type="submit" disabled={isUploading} className="py-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg font-bold shadow-sm">
                    {isUploading ? "Uploading..." : "Upload Document"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {previewDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity" onClick={() => setPreviewDoc(null)} />
            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl z-10 p-6 space-y-4 text-xs border border-slate-200/80">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2"><FileCheck size={18} className="text-emerald-600" /><h3 className="font-bold text-sm text-slate-900">{previewDoc.title}</h3></div>
                <button onClick={() => setPreviewDoc(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg space-y-2 border">
                <p><span className="font-semibold text-slate-700">Employee:</span> {previewDoc.employeeName} ({previewDoc.employeeId})</p>
                <p><span className="font-semibold text-slate-700">Category:</span> {previewDoc.category}</p>
                <p><span className="font-semibold text-slate-700">File Name:</span> {previewDoc.fileName}</p>
                <p><span className="font-semibold text-slate-700">Uploaded On:</span> {previewDoc.uploadedAt}</p>
                <p><span className="font-semibold text-slate-700">Uploaded By:</span> {previewDoc.uploadedBy}</p>
              </div>
              <div className="flex justify-end"><button onClick={() => handleDownload(previewDoc)} className="py-2 px-3 bg-emerald-600 text-white rounded-lg font-semibold">Download</button></div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
