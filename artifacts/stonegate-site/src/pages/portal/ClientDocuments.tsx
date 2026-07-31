import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Upload, Download, FileText, ArrowLeft, AlertCircle } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Doc {
  id: number;
  fileName: string;
  fileType: string;
  fileSize: number | null;
  objectPath: string;
  direction: "client_upload" | "admin_share";
  createdAt: string;
}

function formatBytes(b: number | null) {
  if (!b) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

export default function ClientDocuments() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () =>
    fetch(`${BASE}/api/portal/client/documents`, { credentials: "include" })
      .then(r => r.json())
      .then(setDocs)
      .catch(() => setError("Could not load documents."))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      // 1. Request presigned URL
      const urlRes = await fetch(`${BASE}/api/storage/uploads/request-url`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!urlRes.ok) throw new Error("Could not get upload URL.");
      const { uploadURL, objectPath } = await urlRes.json();

      // 2. Upload directly to GCS
      await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      // 3. Register with API
      await fetch(`${BASE}/api/portal/client/documents`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, fileType: file.type, fileSize: file.size, objectPath }),
      });

      await load();
    } catch (err: any) {
      setError(err.message ?? "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: Doc) => {
    const res = await fetch(`${BASE}/api/storage${doc.objectPath}`, { credentials: "include" });
    if (!res.ok) { setError("Could not download file."); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = doc.fileName; a.click();
    URL.revokeObjectURL(url);
  };

  const myUploads = docs.filter(d => d.direction === "client_upload");
  const sharedDocs = docs.filter(d => d.direction === "admin_share");

  return (
    <div className="min-h-screen bg-black">
      <div className="border-b border-white/8 bg-black/80 sticky top-20 z-40">
        <div className="container mx-auto px-4 md:px-8 h-14 flex items-center gap-4">
          <button onClick={() => setLocation("/portal/dashboard")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-xs">
            <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
          </button>
          <span className="text-white/20">·</span>
          <span className="text-sm text-foreground">Documents</span>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 py-16 max-w-4xl">
        {error && <div className="flex items-center gap-3 text-red-400 text-sm mb-6"><AlertCircle className="w-4 h-4" />{error}</div>}

        {/* Upload Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-xl text-foreground">My Uploads</h2>
            <input ref={fileRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.mp3,.mp4,.mov,.wav" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-xs tracking-[0.15em] uppercase px-5 py-2.5 rounded transition-colors disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              {uploading ? "Uploading…" : "Upload File"}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mb-6">Accepted: PDF, Word documents, images (JPG, PNG), audio, and video files.</p>
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : myUploads.length === 0 ? (
            <div className="border border-white/10 rounded-lg p-8 text-center text-muted-foreground text-sm">No uploads yet</div>
          ) : (
            <div className="space-y-2">
              {myUploads.map(doc => (
                <div key={doc.id} className="flex items-center justify-between border border-white/10 rounded-lg px-5 py-4 bg-white/2">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-foreground truncate">{doc.fileName}</p>
                      <p className="text-xs text-muted-foreground">{formatBytes(doc.fileSize)} · {new Date(doc.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <button onClick={() => handleDownload(doc)} className="shrink-0 ml-4 text-muted-foreground hover:text-primary transition-colors"><Download className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Shared Documents */}
        <div>
          <h2 className="font-serif text-xl text-foreground mb-6">Shared by Stonegate</h2>
          {sharedDocs.length === 0 ? (
            <div className="border border-white/10 rounded-lg p-8 text-center text-muted-foreground text-sm">No documents shared yet</div>
          ) : (
            <div className="space-y-2">
              {sharedDocs.map(doc => (
                <div key={doc.id} className="flex items-center justify-between border border-white/10 rounded-lg px-5 py-4 bg-white/2">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-foreground truncate">{doc.fileName}</p>
                      <p className="text-xs text-muted-foreground">{formatBytes(doc.fileSize)} · {new Date(doc.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <button onClick={() => handleDownload(doc)} className="shrink-0 ml-4 flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors">
                    <Download className="w-4 h-4" /> Download
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
