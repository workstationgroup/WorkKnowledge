"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, BookOpen, Users, ChevronRight, Search, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import Link from "next/link";
import { PageTour, type PageTourStep } from "@/components/page-tour";

const POSITIONS_TOUR: PageTourStep[] = [
  {
    title: "Position Templates",
    description: "Positions define the training curriculum for each job role. Employees are assigned a position, and they'll see those lessons in their Training Path.",
    placement: "center",
  },
  {
    target: "new-position-btn",
    title: "Create a Position",
    description: "Click here to create a new job position. Give it a name, description, and colour, then add lessons to it.",
    placement: "bottom",
  },
  {
    target: "position-list",
    title: "Position Cards",
    description: "Each card shows the position name, how many lessons are assigned, and how many staff hold that position. Click 'Edit Template' to manage its lessons.",
    placement: "top",
  },
];

interface Position {
  id: string;
  name: string;
  description: string | null;
  color: string;
  _count: { users: number; lessons: number };
}

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6"];

export default function PositionsPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "lessons" | "staff">("name");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Position | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const res = await fetch("/api/positions");
    setPositions(await res.json());
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setName(""); setDescription(""); setColor(COLORS[0]);
    setOpen(true);
  };

  const openEdit = (p: Position) => {
    setEditing(p);
    setName(p.name); setDescription(p.description ?? ""); setColor(p.color);
    setOpen(true);
  };

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const method = editing ? "PUT" : "POST";
      const url = editing ? `/api/positions/${editing.id}` : "/api/positions";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, description, color }) });
      if (!res.ok) throw new Error();
      toast.success(editing ? "Position updated" : "Position created");
      setOpen(false);
      load();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: Position) => {
    if (!confirm(`Delete position "${p.name}"?`)) return;
    const res = await fetch(`/api/positions/${p.id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Deleted"); load(); }
    else toast.error("Failed to delete");
  };

  const filtered = positions
    .filter((p) =>
      !search.trim() ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description ?? "").toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "lessons") return b._count.lessons - a._count.lessons;
      if (sortBy === "staff") return b._count.users - a._count.users;
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Position Templates</h1>
          <p className="text-gray-500 mt-1">Define job positions and their required training lessons</p>
        </div>
        <Button data-tour="new-position-btn" onClick={openNew} className="flex-shrink-0">
          <Plus className="w-4 h-4 mr-2" /> New Position
        </Button>
      </div>

      {/* Search + sort */}
      {positions.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search positions..."
              className="w-full h-10 pl-9 pr-9 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-gray-400 mr-1">Sort:</span>
            {(["name", "lessons", "staff"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  sortBy === s
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                }`}
              >
                {s === "name" ? "Name" : s === "lessons" ? "Lessons" : "Staff"}
              </button>
            ))}
          </div>
        </div>
      )}

      {positions.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center text-gray-400">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No positions yet. Create your first one.</p>
          </CardContent>
        </Card>
      )}

      {positions.length > 0 && filtered.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-gray-400">
            <Search className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p>No positions match &ldquo;{search}&rdquo;</p>
          </CardContent>
        </Card>
      )}

      <div data-tour="position-list" className="grid gap-4">
        {filtered.map((p) => (
          <Card key={p.id} className="hover:shadow-md transition-shadow">
            <CardContent className="py-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex-shrink-0" style={{ backgroundColor: p.color + "25" }}>
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{p.name}</p>
                {p.description && <p className="text-sm text-gray-400 truncate">{p.description}</p>}
              </div>
              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-4 flex-shrink-0">
                <div className="hidden sm:flex items-center gap-3">
                  <div className="flex items-center gap-1 text-sm text-gray-400">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{p._count.lessons} lessons</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-400">
                    <Users className="w-3.5 h-3.5" />
                    <span>{p._count.users} staff</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Link href={`/admin/positions/${p.id}`}>
                    <Button variant="outline" size="sm">
                      <span className="hidden sm:inline">Edit Template</span>
                      <span className="sm:hidden">Edit</span>
                      <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600" onClick={() => remove(p)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <PageTour tourKey="wso_page_positions_v1" steps={POSITIONS_TOUR} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Position" : "New Position"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Position Name</Label>
              <Input placeholder="e.g. Sales Executive" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Textarea placeholder="Brief description of this role..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((c) => (
                  <button key={c} onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${color === c ? "border-gray-900 scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !name.trim()}>
              {saving ? "Saving..." : editing ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
