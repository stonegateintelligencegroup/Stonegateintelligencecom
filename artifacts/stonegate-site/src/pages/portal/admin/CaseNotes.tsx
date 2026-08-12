import { useEffect, useState, useRef, useCallback } from "react";
import { Plus, Folder, FolderOpen, FileText, Trash2, ChevronRight, AlertCircle, Pencil } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface NoteFolder { id: number; name: string; }
interface CaseNote {
  id: number; title: string; content: string;
  folderId: number | null; authorName: string | null;
  createdAt: string; updatedAt: string;
}
type FolderView = "all" | "unfiled" | number;

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function CaseNotes({ caseId }: { caseId: number; adminId: number }) {
  const [folders, setFolders] = useState<NoteFolder[]>([]);
  const [notes, setNotes] = useState<CaseNote[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<FolderView>("all");
  const [error, setError] = useState("");

  // Which note is open in the editor
  const [openNoteId, setOpenNoteId] = useState<number | null>(null);
  // Editor fields — plain controlled inputs, no clever sync
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editFolderId, setEditFolderId] = useState<number | null>(null);
  // Track which note these fields belong to, so switching notes reloads them
  const loadedForId = useRef<number | null>(null);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [creating, setCreating] = useState(false);
  const [confirmDeleteNoteId, setConfirmDeleteNoteId] = useState<number | null>(null);
  const [confirmDeleteFolderId, setConfirmDeleteFolderId] = useState<number | null>(null);

  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // ── Data loading ──────────────────────────────────────────────────────────

  const fetchNotes = useCallback(async () => {
    const [f, n] = await Promise.all([
      fetch(`${BASE}/api/portal/admin/cases/${caseId}/folders`, { credentials: "include" }).then(r => r.json()),
      fetch(`${BASE}/api/portal/admin/cases/${caseId}/case-notes`, { credentials: "include" }).then(r => r.json()),
    ]);
    setFolders(Array.isArray(f) ? f : []);
    setNotes(Array.isArray(n) ? n : []);
  }, [caseId]);

  useEffect(() => {
    fetchNotes().catch(() => setError("Failed to load notes."));
  }, [fetchNotes]);

  // ── Sync editor when a different note is opened ───────────────────────────

  // openNote: opens a note and populates the editor with its data.
  // Only call this to SWITCH notes — never to refresh while the user is typing.
  const openNote = useCallback((note: CaseNote) => {
    setOpenNoteId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditFolderId(note.folderId);
    loadedForId.current = note.id;
  }, []);

  const closeNote = useCallback(() => {
    setOpenNoteId(null);
    setEditTitle("");
    setEditContent("");
    setEditFolderId(null);
    loadedForId.current = null;
  }, []);

  // When the notes list refreshes, patch the editor title/content ONLY if
  // the currently open note changed on the server (e.g. the save landed).
  // Never overwrite mid-typing — only apply if loadedForId matches.
  useEffect(() => {
    if (loadedForId.current === null) return;
    const refreshed = notes.find(n => n.id === loadedForId.current);
    if (!refreshed) {
      // Note was deleted externally
      closeNote();
    }
    // We intentionally do NOT reset editTitle/editContent here.
    // After a successful save, we already hold the saved values in state.
  }, [notes, closeNote]);

  // ── Computed ──────────────────────────────────────────────────────────────

  const visibleNotes = notes.filter(n => {
    if (selectedFolder === "all") return true;
    if (selectedFolder === "unfiled") return n.folderId === null;
    return n.folderId === selectedFolder;
  });

  const openNote_ = openNoteId !== null ? notes.find(n => n.id === openNoteId) ?? null : null;

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const handleCreate = async (folderId: number | null = null) => {
    setCreating(true);
    setError("");
    try {
      const res = await fetch(`${BASE}/api/portal/admin/cases/${caseId}/case-notes`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled Note", content: "", folderId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(`Could not create note (${res.status}${body.error ? ": " + body.error : ""}).`);
        return;
      }
      const note: CaseNote = await res.json();
      setNotes(prev => [note, ...prev]);
      openNote(note);
    } catch {
      setError("Network error — could not create note.");
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async () => {
    if (openNoteId === null) return;
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const res = await fetch(`${BASE}/api/portal/admin/case-notes/${openNoteId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle || "Untitled Note", content: editContent, folderId: editFolderId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(`Save failed (${res.status}${body.error ? ": " + body.error : ""}).`);
        return;
      }
      const updated: CaseNote = await res.json();
      // Update the notes list in place so the sidebar preview reflects the new title/content.
      setNotes(prev => prev.map(n => n.id === updated.id ? updated : n));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Network error — could not save.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (noteId: number) => {
    setError("");
    try {
      const res = await fetch(`${BASE}/api/portal/admin/case-notes/${noteId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) { setError("Could not delete note."); return; }
      setNotes(prev => prev.filter(n => n.id !== noteId));
      if (openNoteId === noteId) closeNote();
    } catch {
      setError("Network error — could not delete.");
    } finally {
      setConfirmDeleteNoteId(null);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setError("");
    try {
      const res = await fetch(`${BASE}/api/portal/admin/cases/${caseId}/folders`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFolderName.trim() }),
      });
      if (!res.ok) { setError("Could not create folder."); return; }
      const f: NoteFolder = await res.json();
      setFolders(prev => [...prev, f].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedFolder(f.id);
      setNewFolderName("");
      setShowNewFolder(false);
    } catch {
      setError("Network error — could not create folder.");
    }
  };

  const handleDeleteFolder = async (folderId: number) => {
    setError("");
    try {
      const res = await fetch(`${BASE}/api/portal/admin/folders/${folderId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) { setError("Could not delete folder."); return; }
      setFolders(prev => prev.filter(f => f.id !== folderId));
      setNotes(prev => prev.map(n => n.folderId === folderId ? { ...n, folderId: null } : n));
      if (selectedFolder === folderId) setSelectedFolder("all");
    } catch {
      setError("Network error — could not delete folder.");
    } finally {
      setConfirmDeleteFolderId(null);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const folderIdForCreate = selectedFolder === "all" || selectedFolder === "unfiled"
    ? null
    : selectedFolder as number;

  return (
    <div className="border border-white/10 rounded-lg bg-white/2" style={{ overflow: "hidden" }}>
      {/* Header */}
      <div className="px-8 py-5 border-b border-white/8 flex items-center justify-between">
        <h2 className="font-serif text-xl text-foreground">Investigator Notes</h2>
        <span className="text-xs text-muted-foreground">{notes.length} note{notes.length !== 1 ? "s" : ""}</span>
      </div>

      {error && (
        <div className="mx-6 mt-3 flex items-center gap-2 text-red-400 text-xs border border-red-900/40 bg-red-900/10 rounded px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError("")} className="opacity-60 hover:opacity-100 ml-2">✕</button>
        </div>
      )}

      {/* Three-column layout */}
      <div style={{ display: "flex", height: "520px" }}>

        {/* ── Folder sidebar ──────────────────────────── */}
        <div style={{ width: 200, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: 2 }}>
            {(["all", "unfiled"] as const).map(key => {
              const label = key === "all" ? "All Notes" : "Unfiled";
              const count = key === "all" ? notes.length : notes.filter(n => n.folderId === null).length;
              const active = selectedFolder === key;
              return (
                <button key={key} onClick={() => setSelectedFolder(key)}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 4, fontSize: 12, textAlign: "left", width: "100%", background: active ? "rgba(192,57,43,0.15)" : "transparent", color: active ? "var(--primary)" : "var(--muted-foreground)", border: "none", cursor: "pointer" }}>
                  {active ? <FolderOpen size={13} style={{ flexShrink: 0 }} /> : <Folder size={13} style={{ flexShrink: 0 }} />}
                  <span style={{ flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
                  <span style={{ fontSize: 10, opacity: 0.5 }}>{count}</span>
                </button>
              );
            })}

            {folders.length > 0 && (
              <div style={{ paddingTop: 8, paddingBottom: 4 }}>
                <div style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted-foreground)", opacity: 0.5, paddingLeft: 10 }}>Folders</div>
              </div>
            )}
            {folders.map(f => {
              const count = notes.filter(n => n.folderId === f.id).length;
              const active = selectedFolder === f.id;
              return (
                <div key={f.id} style={{ display: "flex", alignItems: "center", position: "relative" }} className="group">
                  <button onClick={() => setSelectedFolder(f.id)}
                    style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 4, fontSize: 12, textAlign: "left", minWidth: 0, background: active ? "rgba(192,57,43,0.15)" : "transparent", color: active ? "var(--primary)" : "var(--muted-foreground)", border: "none", cursor: "pointer" }}>
                    {active ? <FolderOpen size={13} style={{ flexShrink: 0 }} /> : <Folder size={13} style={{ flexShrink: 0 }} />}
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                    <span style={{ fontSize: 10, opacity: 0.5 }}>{count}</span>
                  </button>
                  {confirmDeleteFolderId === f.id ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "0 4px", flexShrink: 0 }}>
                      <button onClick={() => handleDeleteFolder(f.id)}
                        style={{ fontSize: 9, background: "rgba(185,28,28,0.3)", color: "#f87171", border: "none", borderRadius: 3, padding: "2px 5px", cursor: "pointer" }}>
                        Del
                      </button>
                      <button onClick={() => setConfirmDeleteFolderId(null)}
                        style={{ fontSize: 9, background: "none", color: "var(--muted-foreground)", border: "none", cursor: "pointer" }}>
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDeleteFolderId(f.id)}
                      style={{ padding: "0 8px", background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", flexShrink: 0 }}
                      className="opacity-0 group-hover:opacity-100">
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* New folder input */}
          <div style={{ padding: 12, borderTop: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
            {showNewFolder ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <input
                  autoFocus
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") handleCreateFolder();
                    if (e.key === "Escape") { setShowNewFolder(false); setNewFolderName(""); }
                  }}
                  placeholder="Folder name…"
                  style={{ width: "100%", background: "black", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 4, padding: "5px 8px", fontSize: 12, color: "var(--foreground)", outline: "none", boxSizing: "border-box" }}
                />
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={handleCreateFolder} disabled={!newFolderName.trim()}
                    style={{ flex: 1, background: "rgba(192,57,43,0.2)", color: "var(--primary)", border: "none", borderRadius: 4, padding: "4px 0", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}>
                    Create
                  </button>
                  <button onClick={() => { setShowNewFolder(false); setNewFolderName(""); }}
                    style={{ flex: 1, background: "none", border: "none", borderRadius: 4, padding: "4px 0", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted-foreground)", cursor: "pointer" }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowNewFolder(true)}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--muted-foreground)", fontSize: 12, cursor: "pointer", padding: "4px 0", width: "100%" }}>
                <Plus size={13} /> New Folder
              </button>
            )}
          </div>
        </div>

        {/* ── Notes list ──────────────────────────────── */}
        <div style={{ width: 210, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: 10, borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
            <button onClick={() => handleCreate(folderIdForCreate)} disabled={creating}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", background: "rgba(192,57,43,0.1)", border: "1px solid rgba(192,57,43,0.3)", borderRadius: 4, color: "var(--primary)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", padding: "8px 0", cursor: creating ? "wait" : "pointer", opacity: creating ? 0.6 : 1 }}>
              <Plus size={13} /> {creating ? "Creating…" : "New Note"}
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {visibleNotes.length === 0 ? (
              <button onClick={() => handleCreate(folderIdForCreate)} disabled={creating}
                style={{ width: "100%", padding: "24px 16px", background: "none", border: "none", color: "var(--muted-foreground)", fontSize: 12, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <Plus size={16} style={{ opacity: 0.4 }} />
                <span>No notes here.<br />Click to add one.</span>
              </button>
            ) : (
              visibleNotes.map(note => {
                const active = openNoteId === note.id;
                return (
                  <div key={note.id} className="group"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: active ? "rgba(192,57,43,0.1)" : "transparent", borderLeft: active ? "2px solid var(--primary)" : "2px solid transparent", position: "relative" }}>
                    {/* Clickable note body */}
                    <button onClick={() => openNote(note)}
                      style={{ width: "100%", textAlign: "left", padding: "10px 14px 10px 12px", background: "none", border: "none", cursor: "pointer", display: "block", paddingRight: 56 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                        <FileText size={11} style={{ marginTop: 2, flexShrink: 0, color: active ? "var(--primary)" : "var(--muted-foreground)" }} />
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--primary)", textDecoration: active ? "underline" : "none", margin: 0 }}
                            onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
                            onMouseLeave={e => (e.currentTarget.style.textDecoration = active ? "underline" : "none")}>
                            {note.title || "Untitled Note"}
                          </p>
                          <p style={{ fontSize: 10, color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>
                            {note.content ? note.content.slice(0, 40) + (note.content.length > 40 ? "…" : "") : "No content"}
                          </p>
                          <p style={{ fontSize: 10, color: "var(--muted-foreground)", opacity: 0.5, marginTop: 4 }}>{timeAgo(note.updatedAt)}</p>
                        </div>
                      </div>
                    </button>
                    {/* Edit + Delete actions — visible on row hover */}
                    {confirmDeleteNoteId === note.id ? (
                      <div style={{ position: "absolute", top: "50%", right: 8, transform: "translateY(-50%)", display: "flex", alignItems: "center", gap: 4 }}>
                        <button onClick={e => { e.stopPropagation(); handleDelete(note.id); }}
                          style={{ fontSize: 9, background: "rgba(185,28,28,0.3)", color: "#f87171", border: "none", borderRadius: 3, padding: "3px 6px", cursor: "pointer" }}>
                          Delete
                        </button>
                        <button onClick={e => { e.stopPropagation(); setConfirmDeleteNoteId(null); }}
                          style={{ fontSize: 9, background: "none", color: "var(--muted-foreground)", border: "none", cursor: "pointer", padding: "2px 3px" }}>
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto"
                        style={{ position: "absolute", top: "50%", right: 8, transform: "translateY(-50%)", display: "flex", gap: 2, transition: "opacity 0.15s" }}>
                        <button onClick={e => { e.stopPropagation(); openNote(note); }} title="Edit"
                          style={{ padding: "4px 5px", background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 3, cursor: "pointer", color: "var(--muted-foreground)", display: "flex", alignItems: "center" }}>
                          <Pencil size={10} />
                        </button>
                        <button onClick={e => { e.stopPropagation(); setConfirmDeleteNoteId(note.id); }} title="Delete"
                          style={{ padding: "4px 5px", background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 3, cursor: "pointer", color: "var(--muted-foreground)", display: "flex", alignItems: "center" }}>
                          <Trash2 size={10} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Editor ──────────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {openNote_ === null ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "var(--muted-foreground)" }}>
              <FileText size={32} style={{ opacity: 0.15 }} />
              <p style={{ fontSize: 13, margin: 0 }}>Select a note or create one</p>
              <button onClick={() => handleCreate(folderIdForCreate)} disabled={creating}
                style={{ fontSize: 12, color: "var(--primary)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                <Plus size={12} /> {creating ? "Creating…" : "New Note"}
              </button>
            </div>
          ) : (
            <>
              {/* Toolbar */}
              <div style={{ padding: "8px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "var(--muted-foreground)", opacity: 0.6, minWidth: 0 }}>
                  <span>{new Date(openNote_.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  {openNote_.authorName && <><ChevronRight size={10} /><span>{openNote_.authorName}</span></>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  <select value={editFolderId ?? ""} onChange={e => setEditFolderId(e.target.value === "" ? null : Number(e.target.value))}
                    style={{ background: "black", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, padding: "3px 6px", fontSize: 10, color: "var(--muted-foreground)", outline: "none" }}>
                    <option value="">Unfiled</option>
                    {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                  {saved && <span style={{ fontSize: 10, color: "#4ade80" }}>Saved ✓</span>}
                  <button onClick={handleSave} disabled={saving}
                    style={{ background: "rgba(192,57,43,0.2)", color: "var(--primary)", border: "none", borderRadius: 4, padding: "5px 10px", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", cursor: saving ? "wait" : "pointer", opacity: saving ? 0.5 : 1 }}>
                    {saving ? "Saving…" : "Save"}
                  </button>
                  {confirmDeleteNoteId === openNote_.id ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <button onClick={() => handleDelete(openNote_.id)}
                        style={{ fontSize: 10, background: "rgba(185,28,28,0.3)", color: "#f87171", border: "1px solid rgba(185,28,28,0.4)", borderRadius: 4, padding: "4px 8px", cursor: "pointer" }}>
                        Delete
                      </button>
                      <button onClick={() => setConfirmDeleteNoteId(null)}
                        style={{ fontSize: 10, background: "none", color: "var(--muted-foreground)", border: "none", cursor: "pointer" }}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDeleteNoteId(openNote_.id)}
                      style={{ background: "none", border: "none", color: "var(--muted-foreground)", cursor: "pointer", padding: 2 }}
                      title="Delete note">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Title */}
              <input
                type="text"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                placeholder="Note title"
                onFocus={e => (e.currentTarget.style.borderBottomColor = "rgba(192,57,43,0.5)")}
                onBlur={e => (e.currentTarget.style.borderBottomColor = "transparent")}
                style={{ padding: "18px 20px 6px", background: "transparent", border: "none", borderBottom: "1px solid transparent", fontSize: 15, fontFamily: "var(--font-serif, serif)", color: "var(--foreground)", outline: "none", flexShrink: 0, width: "100%", boxSizing: "border-box", cursor: "text", transition: "border-color 0.15s" }}
              />

              {/* Body */}
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                placeholder="Start writing…"
                onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); handleSave(); } }}
                style={{ flex: 1, padding: "4px 20px 20px", background: "transparent", border: "none", fontSize: 13, color: "var(--foreground)", opacity: 0.9, outline: "none", resize: "none", lineHeight: 1.7, minHeight: 0, width: "100%", boxSizing: "border-box", fontFamily: "inherit" }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
