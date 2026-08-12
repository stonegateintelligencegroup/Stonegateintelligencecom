import { useEffect, useState, useCallback, useRef } from "react";
import { Plus, FileText, Trash2, ChevronDown, ChevronUp, AlertCircle, Check, X, Pencil } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface CaseNote {
  id: number;
  title: string;
  content: string;
  folderId: number | null;
  authorName: string | null;
  createdAt: string;
  updatedAt: string;
}

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return ""; }
}

export default function CaseNotes({ caseId }: { caseId: number; adminId: number }) {
  const [notes, setNotes] = useState<CaseNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  // Which note is expanded for editing
  const [openId, setOpenId] = useState<number | null>(null);
  // Edit buffers keyed by note id
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  // Inline delete confirm
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  // Inline rename
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${BASE}/api/portal/admin/cases/${caseId}/case-notes`, { credentials: "include" });
      const data = await r.json();
      setNotes(Array.isArray(data) ? data : []);
    } catch {
      setError("Failed to load notes.");
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => { load(); }, [load]);

  const openNote = (note: CaseNote) => {
    setOpenId(note.id);
    setEditTitle(note.title || "");
    setEditContent(note.content || "");
    setSaved(false);
    setConfirmId(null);
  };

  const closeNote = () => {
    setOpenId(null);
    setSaved(false);
  };

  const handleCreate = async () => {
    setCreating(true);
    setError("");
    try {
      const r = await fetch(`${BASE}/api/portal/admin/cases/${caseId}/case-notes`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled Note", content: "" }),
      });
      if (!r.ok) { setError("Could not create note."); return; }
      const note: CaseNote = await r.json();
      // Normalise field names in case API returns camelCase or snake_case
      const normalised: CaseNote = {
        id: note.id,
        title: note.title,
        content: note.content,
        folderId: (note as any).folderId ?? (note as any).folder_id ?? null,
        authorName: (note as any).authorName ?? (note as any).author_name ?? null,
        createdAt: (note as any).createdAt ?? (note as any).created_at ?? new Date().toISOString(),
        updatedAt: (note as any).updatedAt ?? (note as any).updated_at ?? new Date().toISOString(),
      };
      setNotes(prev => [normalised, ...prev]);
      openNote(normalised);
    } catch {
      setError("Network error.");
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async () => {
    if (openId === null) return;
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const r = await fetch(`${BASE}/api/portal/admin/case-notes/${openId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle.trim() || "Untitled Note", content: editContent }),
      });
      if (!r.ok) { setError("Save failed."); return; }
      const updated = await r.json();
      setNotes(prev => prev.map(n => n.id === openId ? { ...n, title: updated.title ?? editTitle, content: updated.content ?? editContent, updatedAt: updated.updatedAt ?? updated.updated_at ?? n.updatedAt } : n));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  };

  const startRename = (note: CaseNote) => {
    setRenamingId(note.id);
    setRenameValue(note.title || "");
    setConfirmId(null);
    setTimeout(() => renameInputRef.current?.select(), 30);
  };

  const commitRename = async () => {
    if (renamingId === null) return;
    const trimmed = renameValue.trim() || "Untitled Note";
    setNotes(prev => prev.map(n => n.id === renamingId ? { ...n, title: trimmed } : n));
    // If this note is open in the editor, sync the edit buffer too
    if (openId === renamingId) setEditTitle(trimmed);
    setRenamingId(null);
    try {
      await fetch(`${BASE}/api/portal/admin/case-notes/${renamingId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
    } catch { /* silent — optimistic update already applied */ }
  };

  const handleDelete = async (noteId: number) => {
    setDeleting(true);
    setError("");
    try {
      const r = await fetch(`${BASE}/api/portal/admin/case-notes/${noteId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!r.ok) { setError("Could not delete note."); return; }
      setNotes(prev => prev.filter(n => n.id !== noteId));
      if (openId === noteId) closeNote();
    } catch {
      setError("Network error.");
    } finally {
      setDeleting(false);
      setConfirmId(null);
    }
  };

  return (
    <div className="border border-white/10 rounded-lg bg-white/2 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-4 h-4 text-primary" />
          <h2 className="font-serif text-xl text-foreground">Investigator Notes</h2>
          <span className="text-xs text-muted-foreground">({notes.length})</span>
        </div>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" />
          {creating ? "Creating…" : "New Note"}
        </button>
      </div>

      {error && (
        <div className="mx-4 mt-3 flex items-center gap-2 text-red-400 text-xs border border-red-900/40 bg-red-900/10 rounded px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError("")} className="opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Notes list */}
      <div className="divide-y divide-white/5">
        {loading ? (
          <p className="px-6 py-8 text-sm text-muted-foreground">Loading…</p>
        ) : notes.length === 0 ? (
          <button
            onClick={handleCreate}
            disabled={creating}
            className="w-full px-6 py-10 text-sm text-muted-foreground hover:text-primary transition-colors flex flex-col items-center gap-2 disabled:opacity-50"
          >
            <Plus className="w-5 h-5 opacity-40" />
            No notes yet — click to add one
          </button>
        ) : (
          notes.map(note => {
            const isOpen = openId === note.id;
            const isConfirming = confirmId === note.id;

            return (
              <div key={note.id} className="group">
                {/* Note row header */}
                <div className={`flex items-center gap-3 px-6 py-3 transition-colors ${isOpen ? "bg-white/3" : "hover:bg-white/2"}`}>
                  {/* Chevron toggle */}
                  <button
                    onClick={() => isOpen ? closeNote() : openNote(note)}
                    className="shrink-0 p-1"
                    aria-label={isOpen ? "Collapse" : "Expand"}
                  >
                    {isOpen
                      ? <ChevronUp className="w-3.5 h-3.5 text-primary" />
                      : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    }
                  </button>

                  {/* Title — inline rename input OR plain text */}
                  {renamingId === note.id ? (
                    <input
                      ref={renameInputRef}
                      type="text"
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") commitRename();
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      onBlur={commitRename}
                      className="flex-1 min-w-0 bg-black/60 border border-primary/40 rounded px-2 py-0.5 text-sm font-medium text-foreground outline-none"
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <button
                      onClick={() => isOpen ? closeNote() : openNote(note)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <span className={`text-sm font-medium truncate block ${isOpen ? "text-primary underline" : "text-primary hover:underline"}`}>
                        {note.title || "Untitled Note"}
                      </span>
                    </button>
                  )}

                  <span className="text-xs text-muted-foreground/50 shrink-0 hidden md:inline">{fmt(note.updatedAt)}</span>

                  {/* Rename + Delete actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {renamingId !== note.id && (
                      <button
                        onClick={e => { e.stopPropagation(); startRename(note); }}
                        className="text-muted-foreground/30 hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                        title="Rename note"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    )}
                    {isConfirming ? (
                      <>
                        <button
                          onClick={() => handleDelete(note.id)}
                          disabled={deleting}
                          className="text-xs bg-red-900/40 hover:bg-red-900/60 text-red-400 border border-red-900/40 rounded px-2 py-0.5 transition-colors disabled:opacity-50"
                        >
                          {deleting ? "…" : "Delete"}
                        </button>
                        <button
                          onClick={() => setConfirmId(null)}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmId(note.id); }}
                        className="text-muted-foreground/30 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline editor */}
                {isOpen && (
                  <div className="px-6 pb-5 bg-white/3 border-t border-white/5">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      placeholder="Note title"
                      className="w-full bg-transparent border-b border-white/10 focus:border-primary/40 text-base font-serif text-foreground py-3 outline-none transition-colors placeholder:text-muted-foreground/40"
                    />
                    <textarea
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); handleSave(); } }}
                      placeholder="Start writing…"
                      rows={6}
                      className="w-full bg-transparent text-sm text-foreground/90 py-3 outline-none resize-none placeholder:text-muted-foreground/40 leading-relaxed"
                    />
                    <div className="flex items-center gap-4 pt-2 border-t border-white/5">
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-1.5 text-xs bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded px-3 py-1.5 transition-colors disabled:opacity-50"
                      >
                        {saving ? "Saving…" : <><Check className="w-3 h-3" /> Save</>}
                      </button>
                      {saved && <span className="text-xs text-green-400">Saved ✓</span>}
                      <button
                        onClick={closeNote}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-auto"
                      >
                        Close
                      </button>
                      {note.authorName && (
                        <span className="text-xs text-muted-foreground/40">{note.authorName} · {fmt(note.createdAt)}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
