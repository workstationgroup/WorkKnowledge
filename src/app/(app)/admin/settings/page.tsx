"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Save, CheckCircle2, ExternalLink, Wifi, WifiOff, Loader2, ChevronDown, FolderOpen, Search, X, Eye, EyeOff, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PageTour, type PageTourStep } from "@/components/page-tour";

const SETTINGS_TOUR: PageTourStep[] = [
  {
    title: "Settings",
    description: "Configure the integrations that power WSO Knowledge — SharePoint for file storage and LINE for push notifications.",
    placement: "center",
  },
  {
    target: "sharepoint-card",
    title: "SharePoint Integration",
    description: "Connect your Microsoft 365 SharePoint site. Files attached to lessons are stored in the folder you choose here.",
    placement: "bottom",
  },
  {
    target: "line-settings-card",
    title: "LINE Messaging",
    description: "Connect a LINE Messaging API channel to send push notifications to employees about new lessons and training updates.",
    placement: "top",
  },
];

type TestStatus = "idle" | "testing" | "ok" | "fail";

interface SharePointSite {
  id: string;
  displayName: string;
  hostname: string;
  sitePath: string;
  webUrl: string;
}

interface SharePointFolder {
  id: string;
  name: string;
}

// ── Autocomplete site picker ─────────────────────────────────────────────────
function SiteAutocomplete({
  value,
  disabled,
  onSelect,
}: {
  value: string;
  disabled?: boolean;
  onSelect: (site: SharePointSite) => void;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [allSites, setAllSites] = useState<SharePointSite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [manual, setManual] = useState(false);
  const [manualHostname, setManualHostname] = useState("");
  const [manualSitePath, setManualSitePath] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  const loadSites = useCallback(async () => {
    if (allSites.length > 0) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/settings/browse");
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? "Failed to load sites");
      setAllSites(data.sites ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load sites");
    } finally {
      setLoading(false);
    }
  }, [allSites.length]);

  const filtered = query.trim()
    ? allSites.filter((s) =>
        s.displayName.toLowerCase().includes(query.toLowerCase()) ||
        s.hostname.toLowerCase().includes(query.toLowerCase()) ||
        s.sitePath.toLowerCase().includes(query.toLowerCase())
      )
    : allSites;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (site: SharePointSite) => {
    setQuery(site.displayName);
    setOpen(false);
    setManual(false);
    onSelect(site);
  };

  const handleClear = () => {
    setQuery("");
    setAllSites([]);
    setOpen(false);
    setManual(false);
    onSelect({ id: "", displayName: "", hostname: "", sitePath: "", webUrl: "" });
  };

  const applyManual = () => {
    const h = manualHostname.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
    const sp = manualSitePath.trim();
    if (!h || !sp) { toast.error("Both hostname and site path are required"); return; }
    const cleanPath = sp.startsWith("/") ? sp : `/${sp}`;
    setQuery(`${h}${cleanPath}`);
    setOpen(false);
    setManual(false);
    onSelect({ id: "", displayName: `${h}${cleanPath}`, hostname: h, sitePath: cleanPath, webUrl: "" });
  };

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative flex items-center">
        <Search className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          placeholder="Type to search SharePoint sites…"
          disabled={disabled}
          onFocus={() => { setOpen(true); loadSites(); }}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); loadSites(); }}
          className={cn(
            "w-full h-9 pl-9 pr-8 rounded-lg border border-input bg-transparent text-sm",
            "focus:outline-none focus:ring-2 focus:ring-ring/50",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        />
        {query && (
          <button type="button" onClick={handleClear} className="absolute right-2 text-gray-300 hover:text-gray-500">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
          {loading && (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading sites…
            </div>
          )}
          {!loading && error && (
            <div className="px-4 py-3 text-sm text-red-600 whitespace-pre-wrap">{error}</div>
          )}
          {!loading && !error && filtered.length === 0 && (
            <div className="px-4 py-3 text-sm text-gray-400">
              {query ? `No sites matching "${query}"` : "No sites found"}
            </div>
          )}
          {!loading && !error && filtered.map((s) => (
            <button
              key={s.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(s)}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 hover:text-indigo-700 transition-colors border-b border-gray-100 last:border-0"
            >
              <div className="font-medium text-gray-800">{s.displayName}</div>
              <div className="text-xs text-gray-400 mt-0.5">{s.hostname}{s.sitePath}</div>
            </button>
          ))}

          {/* Manual entry fallback */}
          {!loading && (
            <div className="border-t border-gray-100">
              {!manual ? (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setManual(true)}
                  className="w-full text-left px-4 py-2.5 text-xs text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                >
                  Can{"'"}t find your site? Enter URL manually →
                </button>
              ) : (
                <div className="p-3 space-y-2">
                  <input
                    type="text"
                    placeholder="Hostname: yourcompany.sharepoint.com"
                    value={manualHostname}
                    onChange={(e) => setManualHostname(e.target.value)}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="w-full h-8 px-2.5 rounded border border-input text-xs focus:outline-none focus:ring-1 focus:ring-ring/50"
                  />
                  <input
                    type="text"
                    placeholder="Site path: /sites/HR"
                    value={manualSitePath}
                    onChange={(e) => setManualSitePath(e.target.value)}
                    onMouseDown={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.key === "Enter" && applyManual()}
                    className="w-full h-8 px-2.5 rounded border border-input text-xs focus:outline-none focus:ring-1 focus:ring-ring/50"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={applyManual}
                      className="flex-1 h-7 rounded bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition-colors"
                    >
                      Use this site
                    </button>
                    <button
                      type="button"
                      onClick={() => setManual(false)}
                      className="px-3 h-7 rounded border border-gray-200 text-xs text-gray-500 hover:border-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Folder picker with subfolder navigation ──────────────────────────────────
interface NavEntry { id: string | null; name: string }

function FolderPicker({
  value,
  siteId,
  hostname,
  sitePath,
  disabled,
  onChange,
}: {
  value: string;
  siteId: string | null;
  hostname: string;
  sitePath: string;
  disabled?: boolean;
  onChange: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [navStack, setNavStack] = useState<NavEntry[]>([{ id: null, name: "Root" }]);
  const [folders, setFolders] = useState<SharePointFolder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [driveId, setDriveId] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchFolders = async (folderId: string | null, resolvedDriveId?: string) => {
    setLoading(true);
    setError("");
    setFolders([]);
    try {
      const effectiveDriveId = resolvedDriveId ?? driveId;
      let url: string;
      if (effectiveDriveId) {
        // Use driveId directly — avoids re-resolving the site every time
        url = `/api/admin/settings/browse?driveId=${encodeURIComponent(effectiveDriveId)}` +
          (folderId ? `&folderId=${encodeURIComponent(folderId)}` : "");
      } else {
        // First call — resolve via siteId or hostname+sitePath
        const base = siteId
          ? `siteId=${encodeURIComponent(siteId)}`
          : `hostname=${encodeURIComponent(hostname.trim())}&sitePath=${encodeURIComponent(sitePath.trim())}`;
        url = `/api/admin/settings/browse?${base}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? "Failed to load folders");
      if (data.driveId && !effectiveDriveId) setDriveId(data.driveId);
      setFolders(data.folders ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load folders");
    } finally {
      setLoading(false);
    }
  };

  const openPicker = () => {
    if (!siteId && (!hostname.trim() || !sitePath.trim())) {
      toast.error("Select a SharePoint site first");
      return;
    }
    setOpen(true);
    setDriveId(null);
    setNavStack([{ id: null, name: "Root" }]);
    fetchFolders(null);
  };

  const navigateInto = (folder: SharePointFolder) => {
    setNavStack((prev) => [...prev, { id: folder.id, name: folder.name }]);
    fetchFolders(folder.id);
  };

  const navigateTo = (index: number) => {
    setNavStack((prev) => {
      const next = prev.slice(0, index + 1);
      fetchFolders(next[next.length - 1].id);
      return next;
    });
  };

  // Full path = all nav entries except "Root", joined by "/"
  const fullPath = (extraSegment?: string) => {
    const parts = navStack.slice(1).map((e) => e.name);
    if (extraSegment) parts.push(extraSegment);
    return parts.join("/");
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={openPicker}
        disabled={disabled}
        className={cn(
          "w-full flex items-center justify-between gap-2 h-9 px-3 rounded-lg border text-sm transition-colors",
          "border-input bg-transparent hover:border-indigo-400 hover:bg-indigo-50/40",
          "disabled:opacity-50 disabled:cursor-not-allowed text-gray-900"
        )}
      >
        <span className="flex items-center gap-2 min-w-0">
          <FolderOpen className="w-4 h-4 shrink-0 text-amber-400" />
          <span className="truncate">{value || "Training Materials"}</span>
        </span>
        <ChevronDown className="w-4 h-4 shrink-0 text-gray-400" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
          {/* Breadcrumb + select current folder */}
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50 rounded-t-lg">
            <div className="flex items-center gap-1 text-xs text-gray-500 min-w-0 flex-1 overflow-hidden">
              {navStack.map((entry, i) => (
                <span key={i} className="flex items-center gap-1 shrink-0">
                  {i > 0 && <ChevronDown className="w-3 h-3 rotate-[-90deg] text-gray-300" />}
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => navigateTo(i)}
                    className={cn(
                      "hover:text-indigo-600 transition-colors max-w-[100px] truncate",
                      i === navStack.length - 1 ? "font-medium text-gray-700" : "text-gray-400"
                    )}
                  >
                    {entry.name}
                  </button>
                </span>
              ))}
            </div>
            {navStack.length > 1 && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onChange(fullPath()); setOpen(false); }}
                className="shrink-0 text-xs px-2 py-0.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              >
                Select
              </button>
            )}
          </div>

          {/* Folder list */}
          <div className="max-h-52 overflow-y-auto">
            {loading && (
              <div className="flex items-center gap-2 px-4 py-3 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading…
              </div>
            )}
            {!loading && error && (
              <div className="px-4 py-3 text-sm text-red-600">{error}</div>
            )}
            {!loading && !error && folders.length === 0 && (
              <div className="px-4 py-3 text-sm text-gray-400">No subfolders here</div>
            )}
            {!loading && !error && folders.map((f) => (
              <div
                key={f.id}
                className="flex items-center border-b border-gray-100 last:border-0 hover:bg-indigo-50 group transition-colors"
              >
                {/* Click folder name → navigate into it */}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => navigateInto(f)}
                  className="flex-1 text-left px-4 py-2.5 text-sm flex items-center gap-2 group-hover:text-indigo-700"
                >
                  <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" />
                  {f.name}
                </button>
                {/* ✓ button → select this folder directly */}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { onChange(fullPath(f.name)); setOpen(false); }}
                  className="px-3 py-2.5 text-gray-300 hover:text-green-600 transition-colors"
                  title={`Select "${fullPath(f.name)}"`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Secret input (show/hide toggle) ─────────────────────────────────────────
function SecretInput({ value, onChange, placeholder, disabled }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="pr-9 font-mono text-sm"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        tabIndex={-1}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

// ── Status banner ────────────────────────────────────────────────────────────
function StatusBanner({ status, message }: { status: TestStatus; message: string }) {
  if (status === "idle" || !message) return null;
  return (
    <div className={cn(
      "flex items-start gap-2.5 rounded-lg px-4 py-3 text-sm border",
      status === "ok" ? "bg-green-50 border-green-200 text-green-800"
        : status === "fail" ? "bg-red-50 border-red-200 text-red-700"
        : "bg-gray-50 border-gray-200 text-gray-600"
    )}>
      {status === "ok"
        ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-green-500" />
        : <WifiOff className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />}
      <span className="whitespace-pre-wrap">{message}</span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [loading, setLoading] = useState(true);

  // SharePoint state
  const [hostname, setHostname] = useState("");
  const [sitePath, setSitePath] = useState("");
  const [siteLabel, setSiteLabel] = useState("");
  const [folder, setFolder] = useState("Training Materials");
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [spSaving, setSpSaving] = useState(false);
  const [spSaved, setSpSaved] = useState(false);
  const [spTestStatus, setSpTestStatus] = useState<TestStatus>("idle");
  const [spTestMessage, setSpTestMessage] = useState("");

  // LINE state
  const [lineChannelId, setLineChannelId] = useState("");
  const [lineChannelSecret, setLineChannelSecret] = useState("");
  const [lineAccessToken, setLineAccessToken] = useState("");
  const [lineCallbackUrl, setLineCallbackUrl] = useState("");
  const [lineSaving, setLineSaving] = useState(false);
  const [lineSaved, setLineSaved] = useState(false);
  const [lineTestStatus, setLineTestStatus] = useState<TestStatus>("idle");
  const [lineTestMessage, setLineTestMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) {
          const h = data["sharepoint_hostname"] ?? "";
          const sp = data["sharepoint_site_path"] ?? "";
          setHostname(h);
          setSitePath(sp);
          setSiteLabel(h && sp ? `${h}${sp}` : "");
          setFolder(data["sharepoint_folder"] ?? "Training Materials");
          setLineChannelId(data["line_channel_id"] ?? "");
          setLineChannelSecret(data["line_channel_secret"] ?? "");
          setLineAccessToken(data["line_channel_access_token"] ?? "");
          setLineCallbackUrl(data["line_callback_url"] ?? "");
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSiteSelect = (site: SharePointSite) => {
    setHostname(site.hostname);
    setSitePath(site.sitePath);
    setSelectedSiteId(site.id || null);
    setSpTestStatus("idle");
  };

  // ── SharePoint save ──
  const saveSharePoint = async () => {
    if (!hostname.trim() || !sitePath.trim()) {
      toast.error("Please select a SharePoint site first");
      return;
    }
    setSpSaving(true);
    setSpSaved(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sharepoint_hostname: hostname.trim(),
          sharepoint_site_path: sitePath.trim(),
          sharepoint_folder: folder.trim() || "Training Materials",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: `Server error ${res.status}` }));
        throw new Error(data.error ?? "Failed to save");
      }
      setSpSaved(true);
      setSpTestStatus("idle");
      toast.success("SharePoint settings saved");
      setTimeout(() => setSpSaved(false), 3000);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not save settings");
    } finally {
      setSpSaving(false);
    }
  };

  const testSharePoint = async () => {
    setSpTestStatus("testing");
    setSpTestMessage("");
    try {
      const res = await fetch("/api/admin/settings/test");
      const data = await res.json();
      setSpTestStatus(data.ok ? "ok" : "fail");
      setSpTestMessage(data.message ?? (data.ok ? "Connected" : "Connection failed"));
    } catch {
      setSpTestStatus("fail");
      setSpTestMessage("Network error — could not reach the server");
    }
  };

  // ── LINE save ──
  const saveLine = async () => {
    if (!lineChannelId.trim() || !lineChannelSecret.trim() || !lineAccessToken.trim() || !lineCallbackUrl.trim()) {
      toast.error("All LINE fields are required");
      return;
    }
    setLineSaving(true);
    setLineSaved(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          line_channel_id: lineChannelId.trim(),
          line_channel_secret: lineChannelSecret.trim(),
          line_channel_access_token: lineAccessToken.trim(),
          line_callback_url: lineCallbackUrl.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: `Server error ${res.status}` }));
        throw new Error(data.error ?? "Failed to save");
      }
      setLineSaved(true);
      setLineTestStatus("idle");
      toast.success("LINE settings saved");
      setTimeout(() => setLineSaved(false), 3000);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not save settings");
    } finally {
      setLineSaving(false);
    }
  };

  const testLine = async () => {
    setLineTestStatus("testing");
    setLineTestMessage("");
    try {
      const res = await fetch("/api/admin/settings/test-line");
      const data = await res.json();
      setLineTestStatus(data.ok ? "ok" : "fail");
      setLineTestMessage(data.message ?? (data.ok ? "Connected" : "Connection failed"));
    } catch {
      setLineTestStatus("fail");
      setLineTestMessage("Network error — could not reach LINE API");
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Settings</h1>
        <p className="text-sm text-gray-500">Admin-only configuration for integrations.</p>
      </div>

      {/* ── SharePoint ── */}
      <Card data-tour="sharepoint-card">
        <CardContent className="pt-6 space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">SharePoint Integration</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Files uploaded to lessons are stored in your Microsoft 365 SharePoint site.
              </p>
            </div>
            <a
              href="https://portal.azure.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs text-indigo-600 hover:underline shrink-0 mt-1"
            >
              Azure Portal <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="space-y-1.5">
            <Label>SharePoint Site</Label>
            <SiteAutocomplete
              value={siteLabel || (hostname && sitePath ? `${hostname}${sitePath}` : "")}
              disabled={loading}
              onSelect={handleSiteSelect}
            />
            {hostname && sitePath && (
              <p className="text-xs text-gray-400">
                <code className="bg-gray-100 px-1 rounded">{hostname}</code>{" "}
                <code className="bg-gray-100 px-1 rounded">{sitePath}</code>
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Root Folder</Label>
            <FolderPicker
              value={folder}
              siteId={selectedSiteId}
              hostname={hostname}
              sitePath={sitePath}
              disabled={loading}
              onChange={(name) => { setFolder(name); setSpTestStatus("idle"); }}
            />
            <p className="text-xs text-gray-400">
              Top-level folder in the document library where lesson files are stored.
              If it doesn{"'"}t exist yet, it will be created automatically on first upload.
            </p>
          </div>

          <StatusBanner status={spTestStatus} message={spTestMessage} />

          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-4">
              <strong className="text-gray-600">Azure app requirement:</strong> The app registration must have the{" "}
              <code className="bg-gray-100 px-1 rounded">Sites.ReadWrite.All</code> application permission with admin consent granted.
            </p>
            <div className="flex items-center gap-3">
              <Button onClick={saveSharePoint} disabled={spSaving || loading}>
                {spSaved ? (
                  <><CheckCircle2 className="w-4 h-4 mr-1.5 text-green-400" />Saved</>
                ) : spSaving ? "Saving..." : (
                  <><Save className="w-4 h-4 mr-1.5" />Save</>
                )}
              </Button>
              <Button variant="outline" onClick={testSharePoint} disabled={spTestStatus === "testing" || loading}>
                {spTestStatus === "testing" ? (
                  <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Testing...</>
                ) : (
                  <><Wifi className="w-4 h-4 mr-1.5" />Test Connection</>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── LINE Messaging ── */}
      <Card data-tour="line-settings-card">
        <CardContent className="pt-6 space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#06C755" }}>
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">LINE Integration</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Let users connect their LINE account and receive push notifications.
                </p>
              </div>
            </div>
            <a
              href="https://developers.line.biz/console/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs text-indigo-600 hover:underline shrink-0 mt-1"
            >
              LINE Console <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Setup guide */}
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-3 text-sm">
            <p className="font-semibold text-blue-900">Two LINE channels required</p>
            <div className="space-y-2 text-blue-800">
              <div className="flex gap-2">
                <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-blue-200 text-blue-800 text-xs font-bold flex items-center justify-center">1</span>
                <div>
                  <p className="font-medium">LINE Login channel</p>
                  <p className="text-xs text-blue-600 mt-0.5">Lets users authenticate with LINE on their profile page (OAuth). Provides <strong>Channel ID</strong>, <strong>Channel Secret</strong>, and the <strong>Callback URL</strong> registration.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-blue-200 text-blue-800 text-xs font-bold flex items-center justify-center">2</span>
                <div>
                  <p className="font-medium">Messaging API channel</p>
                  <p className="text-xs text-blue-600 mt-0.5">Lets the server send push notifications to users. Provides the <strong>Channel Access Token</strong>.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-green-200 text-green-800 text-xs font-bold flex items-center justify-center">✓</span>
                <div>
                  <p className="font-medium text-green-800">Link both channels</p>
                  <p className="text-xs text-blue-600 mt-0.5">In LINE Developers Console → your <strong>LINE Login</strong> channel → <strong>Linked LINE Official Account</strong> → link your Messaging API channel. This makes the user ID from login work for sending messages.</p>
                </div>
              </div>
            </div>
          </div>

          {/* LINE Login fields */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">LINE Login channel</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Channel ID</Label>
                <Input
                  value={lineChannelId}
                  onChange={(e) => setLineChannelId(e.target.value)}
                  placeholder="e.g. 2006123456"
                  disabled={loading}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-gray-400">Basic settings → Channel ID</p>
              </div>

              <div className="space-y-1.5">
                <Label>Callback URL</Label>
                <Input
                  value={lineCallbackUrl}
                  onChange={(e) => setLineCallbackUrl(e.target.value)}
                  placeholder="https://yourdomain.com/api/auth/line/callback"
                  disabled={loading}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-gray-400">Must be registered under LINE Login → Callback URL</p>
              </div>
            </div>

            <div className="mt-4 space-y-1.5">
              <Label>Channel Secret</Label>
              <SecretInput
                value={lineChannelSecret}
                onChange={(v) => { setLineChannelSecret(v); setLineTestStatus("idle"); }}
                placeholder="32-character hex string"
                disabled={loading}
              />
              <p className="text-xs text-gray-400">Basic settings → Channel secret</p>
            </div>
          </div>

          {/* Messaging API fields */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Messaging API channel</p>
            <div className="space-y-1.5">
              <Label>Channel Access Token</Label>
              <SecretInput
                value={lineAccessToken}
                onChange={(v) => { setLineAccessToken(v); setLineTestStatus("idle"); }}
                placeholder="Long-lived channel access token"
                disabled={loading}
              />
              <p className="text-xs text-gray-400">
                Messaging API → Channel access token (long-lived) → Issue
              </p>
            </div>
          </div>

          <StatusBanner status={lineTestStatus} message={lineTestMessage} />

          <div className="pt-2 border-t border-gray-100 flex items-center gap-3">
            <Button onClick={saveLine} disabled={lineSaving || loading}>
              {lineSaved ? (
                <><CheckCircle2 className="w-4 h-4 mr-1.5 text-green-400" />Saved</>
              ) : lineSaving ? "Saving..." : (
                <><Save className="w-4 h-4 mr-1.5" />Save</>
              )}
            </Button>
            <Button variant="outline" onClick={testLine} disabled={lineTestStatus === "testing" || loading}>
              {lineTestStatus === "testing" ? (
                <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Testing...</>
              ) : (
                <><Wifi className="w-4 h-4 mr-1.5" />Test Connection</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
      <PageTour tourKey="wso_page_settings_v1" steps={SETTINGS_TOUR} />
    </div>
  );
}
