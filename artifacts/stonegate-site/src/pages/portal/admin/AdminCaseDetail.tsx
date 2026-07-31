import { useEffect, useState, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, Upload, Download, Send, FileText, AlertCircle } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Case {
  id: number; caseNumber: string; status: string;
  assignedInvestigator: string | null; notes: string | null; lastUpdate: string;
  clientId: number;
}
interface Doc { id: number; fileName: string; fileType: string; fileSize: number | null; objectPath: string; direction: string; createdAt: string; }
interface Message { id: number; content: string; createdAt: string; senderId: number; senderName: string | null; senderRole: string | null; }

const STATUSES = ["pending", "active", "on_hold", "closed"];
function formatBytes(b: number | null) {
  if (!b) return "";
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

export default function AdminCaseDetail() {
  const params = useParams<{ id: string }>();
  const caseId = Number(params.id);
  const [, setLocation] = useLocation();

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Edit state
  const [status, setStatus] = useState("");
  const [investigator, setInvestigator] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Message state
  const [msgContent, setMsgContent] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadAll = async () => {
    try {
      const [c, d, m] = await Promise.all([
        fetch(`${BASE}/api/portal/admin/cases`, { credentials: "include" }).then(r => r.json()),
        fetch(`${BASE}/api/portal/admin/documents/${caseId}`, { credentials: "include" }).then(r => r.json()),
        fetch(`${BASE}/api/portal/admin/messages/${caseId}`, { credentials: "include" }).then(r => r.json()),
      ]);
      const found: Case = Array.isArray(c) ? c.find((x: Case) => x.id === caseId) : null;
      if (found) {
        setCaseData(found);
        setStatus(found.status);
        setInvestigator(found.assignedInvestigator ?? "");
        setNotes(found.notes ?? "");
      }
      setDocs(Array.isArray(d) ? d : []);
      setMessages(Array.isArray(m) ? m : []);
    } catch { setError("Failed to load case."); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, [caseId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const saveCase = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch(`${BASE}/api/portal/admin/cases/${caseId}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, assignedInvestigator: investigator || null, notes: notes || null }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `Save failed (${res.status}).`);
        return;
      }
      await loadAll();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { setError("Network error — could not save."); }
    finally { setSaving(false); }
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const urlRes = await fetch(`${BASE}/api/storage/uploads/request-url`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      const { uploadURL, objectPath } = await urlRes.json();
      await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      await fetch(`${BASE}/api/portal/admin/documents/${caseId}`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, fileType: file.type, fileSize: file.size, objectPath }),
      });
      await loadAll();
    } catch { setError("Upload failed."); }
    finally { setUploading(false); }
  };

  const handleDownload = async (doc: Doc) => {
    const res = await fetch(`${BASE}/api/storage${doc.objectPath}`, { credentials: "include" });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = doc.fileName; a.click();
    URL.revokeObjectURL(url);
  };

  const deleteDoc = async (docId: number) => {
    await fetch(`${BASE}/api/portal/admin/documents/file/${docId}`, { method: "DELETE", credentials: "include" });
    await loadAll();
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgContent.trim()) return;
    setSending(true);
    try {
      await fetch(`${BASE}/api/portal/admin/messages/${caseId}`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: msgContent }),
      });
      setMsgContent("");
      await loadAll();
    } catch { setError("Failed to send."); }
    finally { setSending(false); }
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><p className="text-muted-foreground text-sm">Loading…</p></div>;

  return (
    <div className="min-h-screen bg-black">
      <div className="border-b border-white/8 bg-black/80 sticky top-20 z-40">
        <div className="container mx-auto px-4 md:px-8 h-14 flex items-center gap-4">
          <button onClick={() => setLocation("/portal/admin")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-xs">
            <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
          </button>
          <span className="text-white/20">·</span>
          <span className="text-sm text-foreground">{caseData?.caseNumber ?? `Case #${caseId}`}</span>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 py-12 max-w-5xl space-y-12">
        {error && <div className="flex items-center gap-3 text-red-400 text-sm"><AlertCircle className="w-4 h-4" />{error}</div>}

        {/* Case Details */}
        <div className="border border-white/10 rounded-lg p-8 bg-white/2">
          <h2 className="font-serif text-xl text-foreground mb-6">Case Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs tracking-[0.15em] uppercase text-muted-foreground mb-2">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full bg-black border border-white/15 rounded px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors"
              >
                {STATUSES.map(s => <option key={s} value={s}>{s.replace("_", " ").replace(/^\w/, c => c.toUpperCase())}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs tracking-[0.15em] uppercase text-muted-foreground mb-2">Assigned Investigator</label>
              <input
                type="text"
                value={investigator}
                onChange={e => setInvestigator(e.target.value)}
                className="w-full bg-black border border-white/15 rounded px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 transition-colors"
                placeholder="Investigator name"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs tracking-[0.15em] uppercase text-muted-foreground mb-2">Notes (visible to client)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                className="w-full bg-black border border-white/15 rounded px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 transition-colors resize-none"
                placeholder="Optional notes visible to the client"
              />
            </div>
          </div>
          <div className="mt-5 flex items-center gap-4">
            <button
              onClick={saveCase}
              disabled={saving}
              className="bg-primary hover:bg-primary/90 text-white text-xs tracking-[0.15em] uppercase px-6 py-2.5 rounded transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
            {saved && <span className="text-xs text-green-400 tracking-wide">Saved ✓</span>}
          </div>
        </div>

        {/* Documents */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-xl text-foreground">Documents</h2>
            <div>
              <input ref={fileRef} type="file" className="hidden" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary text-xs tracking-[0.15em] uppercase px-5 py-2 rounded transition-colors disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />{uploading ? "Uploading…" : "Share Document"}
              </button>
            </div>
          </div>
          {docs.length === 0 ? (
            <div className="border border-white/10 rounded-lg p-8 text-center text-muted-foreground text-sm">No documents yet</div>
          ) : (
            <div className="space-y-2">
              {docs.map(doc => (
                <div key={doc.id} className="flex items-center justify-between border border-white/10 rounded-lg px-5 py-4 bg-white/2">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-foreground truncate">{doc.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.direction === "client_upload" ? "Client upload" : "Shared by Stonegate"} · {formatBytes(doc.fileSize)} · {new Date(doc.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <button onClick={() => handleDownload(doc)} className="text-muted-foreground hover:text-primary transition-colors"><Download className="w-4 h-4" /></button>
                    <button onClick={() => deleteDoc(doc.id)} className="text-muted-foreground hover:text-red-400 transition-colors text-xs">Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Messages */}
        <div>
          <h2 className="font-serif text-xl text-foreground mb-6">Secure Messages</h2>
          <div className="border border-white/10 rounded-lg overflow-hidden bg-white/2">
            <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No messages yet</p>
              ) : messages.map(msg => {
                const isAdmin = msg.senderRole === "admin";
                return (
                  <div key={msg.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-lg px-4 py-3 ${isAdmin ? "bg-primary/20 border border-primary/30" : "bg-white/5 border border-white/10"}`}>
                      <p className={`text-xs mb-1 ${isAdmin ? "text-primary/70" : "text-muted-foreground"}`}>
                        {msg.senderName ?? (isAdmin ? "Stonegate" : "Client")} · {new Date(msg.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </p>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
            <form onSubmit={sendMessage} className="flex gap-3 p-4 border-t border-white/8">
              <textarea
                value={msgContent}
                onChange={e => setMsgContent(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(e as any); } }}
                rows={2}
                placeholder="Message the client… (Enter to send)"
                className="flex-1 bg-black border border-white/15 rounded px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 transition-colors resize-none"
              />
              <button type="submit" disabled={sending || !msgContent.trim()} className="bg-primary hover:bg-primary/90 text-white px-4 rounded transition-colors disabled:opacity-50 shrink-0">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Create Case Section */}
        <CreateCaseSection clientId={caseData?.clientId ?? 0} onCreated={loadAll} />
      </div>
    </div>
  );
}

function CreateCaseSection({ clientId, onCreated }: { clientId: number; onCreated: () => void }) {
  const [show, setShow] = useState(false);
  const [caseNum, setCaseNum] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch(`${BASE}/api/portal/admin/cases`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, caseNumber: caseNum }),
      });
      setCaseNum(""); setShow(false); onCreated();
    } finally { setSaving(false); }
  };

  if (!show) return null;
  return (
    <div className="border border-white/10 rounded-lg p-6 bg-white/2">
      <h3 className="font-serif text-lg text-foreground mb-4">Add Another Case</h3>
      <form onSubmit={handleCreate} className="flex gap-3">
        <input type="text" value={caseNum} onChange={e => setCaseNum(e.target.value)} required placeholder="Case number" className="flex-1 bg-black border border-white/15 rounded px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors" />
        <button type="submit" disabled={saving} className="bg-primary text-white text-xs tracking-[0.1em] uppercase px-5 py-2 rounded disabled:opacity-50">{saving ? "Creating…" : "Create"}</button>
      </form>
    </div>
  );
}
