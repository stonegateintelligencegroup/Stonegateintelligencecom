import { useEffect, useState, useCallback } from "react";
import { Plus, Folder, FolderOpen, FileText, Trash2, ChevronRight, AlertCircle } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface NoteFolder { id: number; name: string; createdAt: string; }
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

export default function CaseNotes({ caseId, adminId }: { caseId: number; adminId: number }) {
  const [folders, setFolders] = useState<NoteFolder[]>([]);
  const [notes, setNotes] = useState<CaseNote[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<FolderView>("all");
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [error, setError] = useState("");

  // Editor state
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editFolderId, setEditFolderId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // New folder state
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [f, n] = await Promise.all([
        fetch(`${BASE}/api/portal/admin/cases/${caseId}/folders`, { credentials: "include" }).then(r => r.json()),
        fetch(`${BASE}/api/portal/admin/cases/${caseId}/case-notes`, { credentials: "include" }).then(r => r.json()),
      ]);
      setFolders(Array.isArray(f) ? f : []);
      setNotes(Array.isArray(n) ? n : []);
    } catch { setError("Failed to load notes."); }
  }, [caseId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Sync editor when selected note changes
  useEffect(() => {
    if (selectedNoteId === null) { setEditTitle(""); setEditContent(""); setEditFolderId(null); return; }
    const note = notes.find(n => n.id === selectedNoteId);
    if (note) { setEditTitle(note.title); setEditContent(note.content); setEditFolderId(note.folderId); }
  }, [selectedNoteId, notes]);

  const visibleNotes = notes.filter(n => {
    if (selectedFolder === "all") return true;
    if (selectedFolder === "unfiled") return n.folderId === null;
    return n.folderId === selectedFolder;
  });

  const selectedNote = notes.find(n => n.id === selectedNoteId) ?? null;

  const createNote = async () => {
    const folderId = selectedFolder === "all" || selectedFolder === "unfiled" ? null : selectedFolder;
    const res = await fetch(`${BASE}/api/portal/admin/cases/${caseId}/case-notes`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Untitled Note", content: "", folderId }),
    });
    if (!res.ok) return;
    const note = await res.json();
    await loadAll();
    setSelectedNoteId(note.id);
  };

  const saveNote = async () => {
    if (!selectedNoteId) return;
    setSaving(true); setSaved(false);
    try {
      const res = await fetch(`${BASE}/api/portal/admin/case-notes/${selectedNoteId}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle || "Untitled Note", content: editContent, folderId: editFolderId }),
      });
      if (!res.ok) { setError("Failed to save note."); return; }
      await loadAll();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally { setSaving(false); }
  };

  const deleteNote = async (noteId: number) => {
    if (!confirm("Delete this note? This cannot be undone.")) return;
    await fetch(`${BASE}/api/portal/admin/case-notes/${noteId}`, { method: "DELETE", credentials: "include" });
    if (selectedNoteId === noteId) setSelectedNoteId(null);
    await loadAll();
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    try {
      const res = await fetch(`${BASE}/api/portal/admin/cases/${caseId}/folders`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFolderName.trim() }),
      });
      if (!res.ok) { setError("Failed to create folder."); return; }
      const folder = await res.json();
      await loadAll();
      setSelectedFolder(folder.id);
      setNewFolderName(""); setShowNewFolder(false);
    } finally { setCreatingFolder(false); }
  };

  const deleteFolder = async (folderId: number) => {
    if (!confirm("Delete this folder? Notes inside will become unfiled.")) return;
    await fetch(`${BASE}/api/portal/admin/folders/${folderId}`, { method: "DELETE", credentials: "include" });
    if (selectedFolder === folderId) setSelectedFolder("all");
    await loadAll();
  };

  return (
    <div className="border border-white/10 rounded-lg overflow-hidden bg-white/2">
      {/* Header */}
      <div className="px-8 py-5 border-b border-white/8 flex items-center justify-between">
        <h2 className="font-serif text-xl text-foreground">Investigator Notes</h2>
        <span className="text-xs text-muted-foreground">{notes.length} note{notes.length !== 1 ? "s" : ""}</span>
      </div>

      {error && (
        <div className="mx-6 mt-4 flex items-center gap-2 text-red-400 text-xs">
          <AlertCircle className="w-3.5 h-3.5" />{error}
        </div>
      )}

      <div className="flex min-h-[480px]">
        {/* Folder sidebar */}
        <div className="w-52 shrink-0 border-r border-white/8 flex flex-col">
          <div className="p-3 space-y-0.5 flex-1">
            {/* Virtual folders */}
            {[
              { key: "all" as FolderView, label: "All Notes", count: notes.length },
              { key: "unfiled" as FolderView, label: "Unfiled", count: notes.filter(n => n.folderId === null).length },
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setSelectedFolder(key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs transition-colors text-left ${
                  selectedFolder === key
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
              >
                {selectedFolder === key ? <FolderOpen className="w-3.5 h-3.5 shrink-0" /> : <Folder className="w-3.5 h-3.5 shrink-0" />}
                <span className="flex-1 truncate">{label}</span>
                <span className="text-[10px] opacity-50">{count}</span>
              </button>
            ))}

            {/* Named folders */}
            {folders.length > 0 && <div className="pt-2 pb-1"><div className="px-3 text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50">Folders</div></div>}
            {folders.map(f => {
              const count = notes.filter(n => n.folderId === f.id).length;
              const active = selectedFolder === f.id;
              return (
                <div key={f.id} className="group flex items-center">
                  <button
                    onClick={() => setSelectedFolder(f.id)}
                    className={`flex-1 flex items-center gap-2.5 px-3 py-2 rounded text-xs transition-colors text-left min-w-0 ${
                      active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    }`}
                  >
                    {active ? <FolderOpen className="w-3.5 h-3.5 shrink-0" /> : <Folder className="w-3.5 h-3.5 shrink-0" />}
                    <span className="flex-1 truncate">{f.name}</span>
                    <span className="text-[10px] opacity-50">{count}</span>
                  </button>
                  <button
                    onClick={() => deleteFolder(f.id)}
                    className="mr-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* New folder */}
          <div className="p-3 border-t border-white/8">
            {showNewFolder ? (
              <div className="space-y-2">
                <input
                  autoFocus
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") createFolder(); if (e.key === "Escape") { setShowNewFolder(false); setNewFolderName(""); } }}
                  placeholder="Folder name…"
                  className="w-full bg-black border border-white/15 rounded px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60"
                />
                <div className="flex gap-1.5">
                  <button onClick={createFolder} disabled={creatingFolder || !newFolderName.trim()} className="flex-1 bg-primary/20 text-primary text-[10px] uppercase tracking-wider py-1 rounded disabled:opacity-50">
                    {creatingFolder ? "…" : "Create"}
                  </button>
                  <button onClick={() => { setShowNewFolder(false); setNewFolderName(""); }} className="flex-1 text-muted-foreground text-[10px] uppercase tracking-wider py-1 rounded hover:text-foreground">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowNewFolder(true)}
                className="w-full flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-xs py-1"
              >
                <Plus className="w-3.5 h-3.5" /> New Folder
              </button>
            )}
          </div>
        </div>

        {/* Notes list */}
        <div className="w-56 shrink-0 border-r border-white/8 flex flex-col">
          <div className="p-3 border-b border-white/8">
            <button
              onClick={createNote}
              className="w-full flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary text-xs tracking-[0.12em] uppercase px-3 py-2 rounded transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> New Note
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {visibleNotes.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-xs">No notes here</div>
            ) : (
              visibleNotes.map(note => {
                const active = selectedNoteId === note.id;
                return (
                  <button
                    key={note.id}
                    onClick={() => setSelectedNoteId(note.id)}
                    className={`w-full text-left px-4 py-3 border-b border-white/5 transition-colors ${
                      active ? "bg-primary/10 border-l-2 border-l-primary" : "hover:bg-white/3"
                    }`}
                  >
                    <div className="flex items-start gap-1.5">
                      <FileText className={`w-3 h-3 mt-0.5 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`} />
                      <div className="min-w-0">
                        <p className={`text-xs font-medium truncate ${active ? "text-primary" : "text-foreground"}`}>
                          {note.title || "Untitled Note"}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                          {note.content ? note.content.slice(0, 40) + (note.content.length > 40 ? "…" : "") : "No content"}
                        </p>
                        <p className="text-[10px] text-muted-foreground/50 mt-1">{timeAgo(note.updatedAt)}</p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedNote === null ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <FileText className="w-8 h-8 opacity-20" />
              <p className="text-sm">Select a note or create a new one</p>
              <button onClick={createNote} className="text-xs text-primary hover:underline flex items-center gap-1">
                <Plus className="w-3 h-3" /> New Note
              </button>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Editor toolbar */}
              <div className="px-6 py-3 border-b border-white/8 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60 min-w-0">
                  <span>Created {new Date(selectedNote.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  {selectedNote.authorName && <><ChevronRight className="w-3 h-3" /><span>{selectedNote.authorName}</span></>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {/* Move to folder */}
                  <select
                    value={editFolderId ?? ""}
                    onChange={e => setEditFolderId(e.target.value === "" ? null : Number(e.target.value))}
                    className="bg-black border border-white/10 rounded px-2 py-1 text-[10px] text-muted-foreground focus:outline-none focus:border-primary/40"
                  >
                    <option value="">Unfiled</option>
                    {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                  {saved && <span className="text-[10px] text-green-400">Saved ✓</span>}
                  <button
                    onClick={saveNote}
                    disabled={saving}
                    className="bg-primary/20 hover:bg-primary/30 text-primary text-[10px] tracking-[0.12em] uppercase px-3 py-1.5 rounded transition-colors disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                  <button onClick={() => deleteNote(selectedNote.id)} className="text-muted-foreground hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Title */}
              <input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                placeholder="Note title"
                className="px-6 pt-5 pb-2 bg-transparent text-base font-serif text-foreground placeholder:text-muted-foreground/30 focus:outline-none border-none"
              />

              {/* Content */}
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                placeholder="Start writing…"
                className="flex-1 px-6 pb-6 bg-transparent text-sm text-foreground/90 placeholder:text-muted-foreground/30 focus:outline-none resize-none leading-relaxed"
                onKeyDown={e => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); saveNote(); }
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
