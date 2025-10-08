import React from "react";
import { useLocation } from "wouter";

type Folder = { prefix: string; name: string };
type FileRow = { key: string; name: string; size: number; lastModified: string };

async function j<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (res.status === 401) {
    const msg = (await res.text().catch(() => "")) || "Unauthorized";
    const err = new Error(msg) as any;
    err.code = 401;
    throw err;
  }
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function joinPath(a: string, b: string) {
  const s = (a ? a.replace(/\/+$/, "") + "/" : "") + (b || "").replace(/^\/+/, "");
  return s.replace(/\/+/g, "/");
}

export default function FileManager({ hideAuthPrompt = false }: { hideAuthPrompt?: boolean }) {
  const [, navigate] = useLocation();
  const [kind, setKind] = React.useState<"originals" | "staged">("staged");
  const [path, setPath] = React.useState<string>(""); // relative under kind
  const [folders, setFolders] = React.useState<Folder[]>([]);
  const [files, setFiles] = React.useState<FileRow[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [newFolder, setNewFolder] = React.useState("");
  const [authNeeded, setAuthNeeded] = React.useState(false);

  async function load() {
    setBusy(true);
    try {
      const data = await j<{ base: string; folders: Folder[]; files: FileRow[] }>(
        `/api/manager/list?kind=${encodeURIComponent(kind)}&path=${encodeURIComponent(path)}`
      );
      setFolders(data.folders);
      setFiles(data.files);
    } catch (e: any) {
      if (e?.code === 401) setAuthNeeded(true);
      else throw e;
    } finally {
      setBusy(false);
    }
  }

  React.useEffect(() => { 
    load(); 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, path]);

  function crumbs() {
    const parts = path ? path.replace(/\/+$/,"").split("/") : [];
    const segs: Array<{ name: string; p: string }> = [{ name: kind, p: "" }];
    let acc = "";
    for (const p of parts) { acc = joinPath(acc, p); segs.push({ name: p, p: acc }); }
    return segs;
  }

  async function makeFolder() {
    if (!newFolder.trim()) return;
    await j("/api/manager/folder", { method: "POST", body: JSON.stringify({ kind, path: joinPath(path, newFolder.trim()) }) });
    setNewFolder("");
    load();
  }

  async function del(item: { key?: string; prefix?: string }, isFolder: boolean) {
    if (!confirm(`Delete ${isFolder ? "folder" : "file"}?`)) return;
    await j("/api/manager/delete", { method: "POST", body: JSON.stringify({ key: item.key || item.prefix, isFolder }) });
    load();
  }

  async function renameFolder(oldPrefix: string, newName: string) {
    if (!newName.trim()) return;
    const parts = oldPrefix.replace(/\/$/, "").split("/");
    parts.pop(); // old folder name
    const newPrefix = [...parts, newName.trim()].join("/") + "/";
    await j("/api/manager/rename-folder", {
      method: "POST",
      body: JSON.stringify({ oldKey: oldPrefix, newKey: newPrefix }),
    });
    await load();
  }

  async function moveFile(file: FileRow, toFolderPrefix: string) {
    const fname = file.key.split("/").pop()!;
    const toKey = (toFolderPrefix.endsWith("/") ? toFolderPrefix : toFolderPrefix + "/") + fname;
    await j("/api/manager/move", { method: "POST", body: JSON.stringify({ fromKey: file.key, toKey }) });
    load();
  }

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const filename = f.name;
    const resp = await j<{ key: string; url: string; headers: Record<string,string> }>("/api/manager/sign-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-upload-content-type": f.type || "application/octet-stream" },
      body: JSON.stringify({ kind, path, filename })
    });
    await fetch(resp.url, { method: "PUT", headers: resp.headers, body: f });
    load();
    e.currentTarget.value = "";
  }

  async function open(file: FileRow) {
    const res = await j<{ url: string }>(`/api/files/url?key=${encodeURIComponent(file.key)}`);
    window.open(res.url, "_blank");
  }

  if (authNeeded && !hideAuthPrompt) {
    const onDev = import.meta.env?.VITE_DEV_AUTH?.toString() === "1";
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900">
        <h3 className="font-semibold mb-1">Sign in required</h3>
        <p className="mb-3">
          You need to be logged in to access the file manager.
        </p>
        {!onDev && (
          <button onClick={() => navigate("/account")} className="inline-block rounded bg-primary px-3 py-2 text-primary-foreground hover:bg-primary/90">
            Go to Login
          </button>
        )}
        {onDev && (
          <p className="text-sm italic">
            Dev auth is enabled; refresh the page after server restart.
          </p>
        )}
      </div>
    );
  }
  
  if (authNeeded && hideAuthPrompt) {
    return null;
  }

  return (
    <div className="rounded-xl border bg-white p-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <select value={kind} onChange={e=>{ setPath(""); setKind(e.target.value as "originals" | "staged"); }} className="border rounded-lg p-2">
            <option value="originals">Originals</option>
            <option value="staged">Staged</option>
          </select>

          <nav className="text-sm">
            {crumbs().map((c, i) => (
              <span key={i}>
                {i>0 && <span className="text-gray-400 mx-1">/</span>}
                <button className="text-blue-600 hover:underline" onClick={()=>setPath(c.p)}>{c.name || kind}</button>
              </span>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <label className="px-3 py-2 rounded-lg bg-gray-100 cursor-pointer">
            <input type="file" className="hidden" onChange={upload} />
            Upload
          </label>
          {/* Download ZIP of all files in this folder */}
          {files.length > 0 && (
            <button
              className="px-3 py-2 rounded-lg bg-gray-100"
              onClick={async()=>{
                try {
                  const r = await fetch('/api/files/zip', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ keys: files.map(f=>f.key) })
                  });
                  if (!r.ok) throw new Error('Failed to create ZIP');
                  const blob = await r.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = 'photos.zip';
                  document.body.appendChild(a); a.click(); a.remove();
                  URL.revokeObjectURL(url);
                } catch (e) { /* optionally toast */ }
              }}
            >
              Download ZIP
            </button>
          )}
          <input
            placeholder="New folder name"
            value={newFolder}
            onChange={e=>setNewFolder(e.target.value)}
            className="border rounded-lg p-2"
          />
          <button onClick={makeFolder} className="px-3 py-2 rounded-lg bg-black text-white hover:opacity-90">Create</button>
        </div>
      </div>

      {/* Grid */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Folders */}
        {folders.map(f => (
          <div key={f.prefix} className="border rounded-xl p-3 flex flex-col">
            <button className="text-left font-medium mb-2" onClick={()=>setPath(joinPath(path, f.name))}>📁 {f.name}</button>
            <div className="mt-auto flex gap-2 text-xs">
              <button className="px-2 py-1 rounded bg-gray-100" onClick={()=>del(f as any, true)}>Delete</button>
              <button
                className="px-2 py-1 rounded bg-gray-100"
                onClick={async ()=>{
                  const current = f.name;
                  const newName = prompt("Rename folder to:", current);
                  if (newName && newName !== current) {
                    await renameFolder(f.prefix, newName);
                  }
                }}
              >
                Rename
              </button>
            </div>
          </div>
        ))}

        {/* Files */}
        {files.map(file => (
          <div key={file.key} className="border rounded-xl overflow-hidden">
            <div className="h-36 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">image</div>
            <div className="p-2 text-xs">
              <div className="truncate" title={file.name}>{file.name}</div>
              <div className="text-gray-500">{(file.size/1024).toFixed(1)} KB · {new Date(file.lastModified).toLocaleString()}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button className="px-2 py-1 rounded bg-gray-100" onClick={()=>open(file)}>Open</button>
                <button className="px-2 py-1 rounded bg-gray-100" onClick={async()=>{
                  const r = await j<{url:string}>(`/api/files/url?key=${encodeURIComponent(file.key)}&format=jpg`);
                  window.open(r.url, '_blank');
                }}>JPG</button>
                <button className="px-2 py-1 rounded bg-gray-100" onClick={async()=>{
                  const r = await j<{url:string}>(`/api/files/url?key=${encodeURIComponent(file.key)}&format=png`);
                  window.open(r.url, '_blank');
                }}>PNG</button>
                <button className="px-2 py-1 rounded bg-gray-100" onClick={async()=>{
                  const r = await j<{url:string}>(`/api/files/url?key=${encodeURIComponent(file.key)}&format=webp`);
                  window.open(r.url, '_blank');
                }}>WebP</button>
                {/* Move to parent folder or root */}
                {path && (
                  <button
                    className="px-2 py-1 rounded bg-gray-100"
                    onClick={()=>moveFile(file, userMoveTargetPrefix(kind, path.slice(0, path.lastIndexOf("/"))))}
                  >
                    Move up
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {busy && <div className="text-sm text-gray-500 mt-3">Loading…</div>}
    </div>
  );
}

// Helper: build R2 prefix for a folder within kind
function userMoveTargetPrefix(kind: string, targetPath: string) {
  targetPath = (targetPath || "").replace(/\/+$/,"");
  return `${/* server verifies user id */ ""}${kind}/${targetPath ? targetPath + "/" : ""}`; // server will prepend userId
}
