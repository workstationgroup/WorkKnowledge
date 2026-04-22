"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, GripVertical, X, Check, Loader2, BookOpen, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#0ea5e9", "#64748b",
];

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  icon: string;
  order: number;
  _count: { lessons: number };
}

interface FormState {
  name: string;
  description: string;
  color: string;
}

const emptyForm = (): FormState => ({ name: "", description: "", color: "#6366f1" });

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={cn(
            "w-6 h-6 rounded-full border-2 transition-transform",
            value === c ? "border-gray-800 scale-110" : "border-transparent hover:scale-105"
          )}
          style={{ backgroundColor: c }}
        />
      ))}
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-6 h-6 rounded cursor-pointer border border-gray-200"
        title="Custom color"
      />
    </div>
  );
}

function DeleteConfirmDialog({
  category,
  onConfirm,
  onCancel,
  deleting,
}: {
  category: Category;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-sm p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Delete category?</h2>
            <p className="text-sm text-gray-500 mt-1">
              Are you sure you want to delete <strong>{category.name}</strong>? This cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={deleting}>Cancel</Button>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={deleting}
            className="bg-red-600 hover:bg-red-700 text-white border-0"
          >
            {deleting ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Deleting…</> : "Delete"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Category | null>(null);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => { setCategories(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  };

  const openEdit = (cat: Category) => {
    setEditingId(cat.id);
    setForm({ name: cat.name, description: cat.description ?? "", color: cat.color });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const url = editingId ? `/api/categories/${editingId}` : "/api/categories";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");

      if (editingId) {
        setCategories((prev) => prev.map((c) => c.id === editingId ? data : c));
        toast.success("Category updated");
      } else {
        setCategories((prev) => [...prev, data]);
        toast.success("Category created");
      }
      cancelForm();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (cat: Category) => {
    if (cat._count.lessons > 0) {
      toast.error(`Cannot delete — ${cat._count.lessons} lesson${cat._count.lessons > 1 ? "s" : ""} use this category`);
      return;
    }
    setConfirmDelete(cat);
  };

  const confirmDeleteAction = async () => {
    if (!confirmDelete) return;
    setDeletingId(confirmDelete.id);
    try {
      const res = await fetch(`/api/categories/${confirmDelete.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to delete");
      setCategories((prev) => prev.filter((c) => c.id !== confirmDelete.id));
      toast.success("Category deleted");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-500 mt-0.5">Organise lessons into categories.</p>
        </div>
        <Button onClick={openNew} size="sm">
          <Plus className="w-4 h-4 mr-1.5" /> New Category
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="border-indigo-200 shadow-sm">
          <CardContent className="pt-5 space-y-4">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-semibold text-gray-900">
                {editingId ? "Edit Category" : "New Category"}
              </h2>
              <button type="button" onClick={cancelForm} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                autoFocus
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Human Resources"
                onKeyDown={(e) => e.key === "Enter" && save()}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Description <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Short description…"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Color</Label>
              <ColorPicker value={form.color} onChange={(c) => setForm((f) => ({ ...f, color: c }))} />
            </div>

            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={save} disabled={saving}>
                {saving ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving…</> : <><Check className="w-3.5 h-3.5 mr-1.5" />Save</>}
              </Button>
              <Button size="sm" variant="outline" onClick={cancelForm} disabled={saving}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-8 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
          <Tag className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400 mb-4">No categories yet</p>
          <Button variant="outline" size="sm" onClick={openNew}>
            <Plus className="w-4 h-4 mr-1.5" /> Create First Category
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
            >
              <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />

              {/* Color dot */}
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{cat.name}</p>
                {cat.description && (
                  <p className="text-xs text-gray-400 truncate">{cat.description}</p>
                )}
              </div>

              {/* Lesson count badge */}
              <span className={cn(
                "shrink-0 text-xs px-2 py-0.5 rounded-full font-medium",
                cat._count.lessons > 0
                  ? "bg-indigo-50 text-indigo-600"
                  : "bg-gray-100 text-gray-400"
              )}>
                {cat._count.lessons} lesson{cat._count.lessons !== 1 ? "s" : ""}
              </span>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => openEdit(cat)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                  title="Edit"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteClick(cat)}
                  disabled={deletingId === cat.id}
                  className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    cat._count.lessons > 0
                      ? "text-gray-200 cursor-not-allowed"
                      : "text-gray-400 hover:text-red-600 hover:bg-red-50"
                  )}
                  title={cat._count.lessons > 0 ? `Used by ${cat._count.lessons} lesson(s) — cannot delete` : "Delete"}
                >
                  {deletingId === cat.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      {confirmDelete && (
        <DeleteConfirmDialog
          category={confirmDelete}
          onConfirm={confirmDeleteAction}
          onCancel={() => setConfirmDelete(null)}
          deleting={deletingId === confirmDelete.id}
        />
      )}
    </div>
  );
}
