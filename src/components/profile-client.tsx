"use client";

import { useEffect, useState } from "react";
import {
  User, Mail, Shield, Calendar, Link2, Link2Off,
  Bell, CheckCircle2, AlertCircle, Loader2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { PageTour, type PageTourStep } from "@/components/page-tour";

const PROFILE_TOUR: PageTourStep[] = [
  {
    title: "My Profile",
    description: "This page shows your account details, connected accounts, and notification preferences.",
    placement: "center",
  },
  {
    target: "profile-info",
    title: "Personal Information",
    description: "Your name, email, position, and the groups you belong to are shown here. Contact an admin to update your position or groups.",
    placement: "bottom",
  },
  {
    target: "connected-accounts",
    title: "Connected Accounts",
    description: "You can connect your LINE account to receive push notifications about new lessons and training updates.",
    placement: "bottom",
  },
  {
    target: "notification-prefs",
    title: "Notification Preferences",
    description: "Toggle email and LINE notifications on or off. LINE notifications require a connected LINE account.",
    placement: "top",
  },
];

interface ProfileUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
  lineUserId: string | null;
  lineDisplayName: string | null;
  notifyEmail: boolean;
  notifyLine: boolean;
  createdAt: string;
  position: { id: string; name: string; color: string } | null;
  groupMembers: { group: { id: string; name: string; color: string } }[];
}

interface Props {
  user: ProfileUser;
  lineStatus?: string;   // "success" | "error"
  lineReason?: string;
  lineConfigured: boolean;
}

const LINE_REASON_MESSAGES: Record<string, string> = {
  state_mismatch: "Security check failed. Please try again.",
  no_code: "LINE did not return an authorization code.",
  token_failed: "Could not obtain a LINE access token.",
  profile_failed: "Could not retrieve your LINE profile.",
  already_linked: "This LINE account is already linked to another WSO user.",
  error: "An unexpected error occurred.",
};

// LINE brand colour
const LINE_GREEN = "#06C755";

export function ProfileClient({ user, lineStatus, lineReason, lineConfigured }: Props) {
  const [notifyEmail, setNotifyEmail] = useState(user.notifyEmail);
  const [notifyLine, setNotifyLine] = useState(user.notifyLine);
  const [lineConnected, setLineConnected] = useState(!!user.lineUserId);
  const [lineDisplayName, setLineDisplayName] = useState(user.lineDisplayName);
  const [disconnecting, setDisconnecting] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Show toast for LINE OAuth result (URL param after redirect)
  useEffect(() => {
    if (lineStatus === "success") {
      toast.success("LINE account connected successfully!");
      setLineConnected(true);
    } else if (lineStatus === "error") {
      const msg = LINE_REASON_MESSAGES[lineReason ?? ""] ?? "Could not connect LINE. Please try again.";
      toast.error(msg);
    }
  }, [lineStatus, lineReason]);

  const disconnectLine = async () => {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/auth/line", { method: "DELETE" });
      if (!res.ok) throw new Error();
      setLineConnected(false);
      setLineDisplayName(null);
      setNotifyLine(false);
      toast.success("LINE account disconnected.");
    } catch {
      toast.error("Failed to disconnect LINE. Try again.");
    } finally {
      setDisconnecting(false);
    }
  };

  const savePrefs = async (updates: { notifyEmail?: boolean; notifyLine?: boolean }) => {
    setSavingPrefs(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error();
      toast.success("Preferences saved.");
    } catch {
      toast.error("Failed to save preferences.");
    } finally {
      setSavingPrefs(false);
    }
  };

  const toggleEmailNotify = async () => {
    const next = !notifyEmail;
    setNotifyEmail(next);
    await savePrefs({ notifyEmail: next });
  };

  const toggleLineNotify = async () => {
    const next = !notifyLine;
    setNotifyLine(next);
    await savePrefs({ notifyLine: next });
  };

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const memberSince = new Date(user.createdAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500 mt-1">Account details and notification settings</p>
      </div>

      {/* ── Personal info ── */}
      <Card data-tour="profile-info">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" /> Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Avatar + name */}
          <div className="flex items-center gap-4">
            <Avatar className="w-14 h-14 flex-shrink-0">
              {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
              <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold text-gray-900">{user.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {user.role === "ADMIN" && (
                  <Badge variant="destructive" className="text-xs">Admin</Badge>
                )}
                {user.position && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: user.position.color + "20", color: user.position.color }}
                  >
                    {user.position.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3 text-gray-600">
              <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span>{user.email}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span>Member since {memberSince}</span>
            </div>
            {user.groupMembers.length > 0 && (
              <div className="flex items-start gap-3 text-gray-600">
                <Shield className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <div className="flex flex-wrap gap-1.5">
                  {user.groupMembers.map(({ group: g }) => (
                    <span
                      key={g.id}
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: g.color + "20", color: g.color }}
                    >
                      {g.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Connected accounts ── */}
      <Card data-tour="connected-accounts">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="w-4 h-4 text-gray-400" /> Connected Accounts
          </CardTitle>
          <p className="text-xs text-gray-400">
            Link your accounts to receive notifications from WSO Knowledge.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Microsoft 365 — always connected (it's the login method) */}
          <div className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 border border-gray-100">
            {/* Microsoft logo */}
            <div className="w-9 h-9 flex items-center justify-center flex-shrink-0">
              <svg width="22" height="22" viewBox="0 0 21 21" fill="none">
                <rect x="1"  y="1"  width="9" height="9" fill="#F25022" />
                <rect x="11" y="1"  width="9" height="9" fill="#7FBA00" />
                <rect x="1"  y="11" width="9" height="9" fill="#00A4EF" />
                <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">Microsoft 365</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium flex-shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Connected
            </div>
          </div>

          {/* LINE */}
          <div className="flex items-center gap-4 p-3 rounded-xl border border-gray-100">
            {/* LINE logo */}
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: lineConnected ? LINE_GREEN : "#e5e7eb" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">LINE</p>
              {lineConnected && lineDisplayName ? (
                <p className="text-xs text-gray-400 truncate">{lineDisplayName}</p>
              ) : (
                <p className="text-xs text-gray-400">
                  {lineConfigured ? "Not connected" : "Not configured — add LINE env vars"}
                </p>
              )}
            </div>

            {lineConnected ? (
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={disconnectLine}
                  disabled={disconnecting}
                  className="h-7 text-xs text-red-500 hover:text-red-600 hover:border-red-300"
                >
                  {disconnecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link2Off className="w-3 h-3" />}
                  <span className="ml-1">{disconnecting ? "…" : "Disconnect"}</span>
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                disabled={!lineConfigured}
                onClick={() => { window.location.href = "/api/auth/line"; }}
                className="flex-shrink-0 h-7 text-xs gap-1.5"
                style={lineConfigured ? { borderColor: LINE_GREEN, color: LINE_GREEN } : {}}
              >
                Connect LINE
              </Button>
            )}
          </div>

          {lineStatus === "error" && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                {LINE_REASON_MESSAGES[lineReason ?? ""] ?? "Could not connect LINE. Please try again."}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Notification preferences ── */}
      <Card data-tour="notification-prefs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="w-4 h-4 text-gray-400" /> Notification Preferences
          </CardTitle>
          <p className="text-xs text-gray-400">
            Choose how you want to be notified about new lessons, deadlines, and updates.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Email */}
          <label className="flex items-center justify-between gap-4 p-3 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Mail className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Email notifications</p>
                <p className="text-xs text-gray-400">{user.email}</p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={notifyEmail}
              onClick={toggleEmailNotify}
              disabled={savingPrefs}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 ${
                notifyEmail ? "bg-indigo-600" : "bg-gray-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  notifyEmail ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </label>

          {/* LINE */}
          <label className={`flex items-center justify-between gap-4 p-3 rounded-xl border transition-colors ${
            lineConnected ? "border-gray-100 cursor-pointer hover:bg-gray-50" : "border-gray-100 opacity-50 cursor-not-allowed"
          }`}>
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: LINE_GREEN + "20" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill={LINE_GREEN}>
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">LINE notifications</p>
                <p className="text-xs text-gray-400">
                  {lineConnected
                    ? `Sending to ${lineDisplayName ?? "your LINE account"}`
                    : "Connect LINE above to enable"}
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={notifyLine}
              onClick={lineConnected ? toggleLineNotify : undefined}
              disabled={!lineConnected || savingPrefs}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                notifyLine && lineConnected
                  ? "focus:ring-[#06C755]"
                  : "focus:ring-indigo-400"
              } ${
                notifyLine && lineConnected ? "bg-[#06C755]" : "bg-gray-200"
              } ${!lineConnected ? "cursor-not-allowed" : ""}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  notifyLine && lineConnected ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </label>
        </CardContent>
      </Card>
      <PageTour tourKey="wso_page_profile_v1" steps={PROFILE_TOUR} />
    </div>
  );
}
