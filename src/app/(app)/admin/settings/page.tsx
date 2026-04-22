"use client";

import { useEffect, useState } from "react";
import { Save, CheckCircle2, ExternalLink, Wifi, WifiOff, Loader2, Eye, EyeOff, MessageCircle } from "lucide-react";
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
    description: "Configure LINE for push notifications to employees.",
    placement: "center",
  },
  {
    target: "line-settings-card",
    title: "LINE Messaging",
    description: "Connect a LINE Messaging API channel to send push notifications to employees about new lessons and training updates.",
    placement: "top",
  },
];

type TestStatus = "idle" | "testing" | "ok" | "fail";

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

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);

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
          setLineChannelId(data["line_channel_id"] ?? "");
          setLineChannelSecret(data["line_channel_secret"] ?? "");
          setLineAccessToken(data["line_channel_access_token"] ?? "");
          setLineCallbackUrl(data["line_callback_url"] ?? "");
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Save failed");
      }
      toast.success("LINE settings saved");
      setLineSaved(true);
      setTimeout(() => setLineSaved(false), 2000);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not save LINE settings");
    } finally {
      setLineSaving(false);
    }
  };

  const testLine = async () => {
    setLineTestStatus("testing");
    setLineTestMessage("");
    try {
      const res = await fetch("/api/admin/settings/test-line", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setLineTestStatus("ok");
        setLineTestMessage(data.message ?? "LINE connection OK");
      } else {
        setLineTestStatus("fail");
        setLineTestMessage(data.error ?? "LINE connection failed");
      }
    } catch {
      setLineTestStatus("fail");
      setLineTestMessage("Network error — could not reach LINE API");
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Integrations that power WSO Knowledge.</p>
      </div>

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
                  <p className="text-xs text-blue-600 mt-0.5">In LINE Developers Console → your <strong>LINE Login</strong> channel → <strong>Linked LINE Official Account</strong> → link your Messaging API channel.</p>
                </div>
              </div>
            </div>
          </div>

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
            </div>
          </div>

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
