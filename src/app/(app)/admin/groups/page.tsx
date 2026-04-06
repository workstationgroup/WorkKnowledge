"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Users, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Group {
  id: string;
  name: string;
  description: string | null;
  color: string;
  _count: { members: number };
}

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6"];

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Group | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const res = await fetch("/api/groups");
    setGroups(await res.json());
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null); setName(""); setDescription(""); setColor(COLORS[0]);
    setOpen(true);
  };
  const openEdit = (g: Group) => {
    setEditing(g); setName(g.name); setDescription(g.description ?? ""); setColor(g.color);
    setOpen(true);
  };

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const method = editing ? "PUT" : "POST";
      const url = editing ? `/api/groups/${editing.id}` : "/api/groups";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, description, color }) });
      if (!res.ok) throw new Error();
      toast.success(editing ? "Group updated" : "Group created");
      setOpen(false);
      load();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (g: Group) => {
    if (!confirm(`Delete group "${g.name}"? Members will lose access.`)) return;
    const res = await fetch(`/api/groups/${g.id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Deleted"); load(); }
    else toast.error("Failed to delete");
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Access Groups</h1>
          <p className="text-gray-500 mt-1">Control which employees can see which lessons</p>
        </div>
        <Button onClick={openNew} className="flex-shrink-0"><Plus className="w-4 h-4 mr-2" /> New Group</Button>
      </div>

      {groups.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center text-gray-400">
            <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No groups yet. Create one to control lesson access.</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {groups.map((g) => (
          <Card key={g.id}>
            <CardContent className="py-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: g.color + "20" }}>
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{g.name}</p>
                {g.description && <p className="text-sm text-gray-400 truncate">{g.description}</p>}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-sm text-gray-400">
                  <Users className="w-3.5 h-3.5" />
                  <span>{g._count.members} members</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => openEdit(g)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600" onClick={() => remove(g)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Group" : "New Group"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Group Name</Label>
              <Input placeholder="e.g. Sales Team" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Textarea placeholder="What is this group for?" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((c) => (
                  <button key={c} onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${color === c ? "border-gray-900 scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }} />
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
