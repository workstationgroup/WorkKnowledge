"use client";

import { useEffect, useState } from "react";
import { Users, Shield, UserCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { PageTour, type PageTourStep } from "@/components/page-tour";

const EMPLOYEES_TOUR: PageTourStep[] = [
  {
    title: "Manage Employees",
    description: "View all staff who have signed in. Click any employee to assign their position and access groups.",
    placement: "center",
  },
  {
    target: "employee-list",
    title: "Employee List",
    description: "Each card shows the employee's name, email, position, and groups. Click a card to open the edit panel and make changes.",
    placement: "bottom",
  },
];

interface Group {
  id: string;
  name: string;
  color: string;
}

interface Position {
  id: string;
  name: string;
  color: string;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "EMPLOYEE";
  canManageLessons: boolean;
  avatarUrl?: string | null;
  positionId: string | null;
  position: Position | null;
  groupMembers: { group: Group }[];
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [positionId, setPositionId] = useState<string>("none");
  const [memberGroups, setMemberGroups] = useState<Set<string>>(new Set());
  const [canManageLessons, setCanManageLessons] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [empRes, grpRes, posRes] = await Promise.all([
      fetch("/api/employees"),
      fetch("/api/groups"),
      fetch("/api/positions"),
    ]);
    setEmployees(await empRes.json());
    setGroups(await grpRes.json());
    setPositions(await posRes.json());
  };

  useEffect(() => { load(); }, []);

  const openEmployee = (emp: Employee) => {
    setSelected(emp);
    setPositionId(emp.positionId ?? "none");
    setMemberGroups(new Set(emp.groupMembers.map((gm) => gm.group.id)));
    setCanManageLessons(emp.canManageLessons);
  };

  const toggleGroup = (groupId: string) => {
    setMemberGroups((prev) => {
      const next = new Set(prev);
      next.has(groupId) ? next.delete(groupId) : next.add(groupId);
      return next;
    });
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      // Save position and lesson management permission
      await fetch(`/api/employees/${selected.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positionId: positionId === "none" ? null : positionId, canManageLessons }),
      });

      // Sync group memberships
      const currentGroups = new Set(selected.groupMembers.map((gm) => gm.group.id));
      const toAdd = [...memberGroups].filter((id) => !currentGroups.has(id));
      const toRemove = [...currentGroups].filter((id) => !memberGroups.has(id));

      await Promise.all([
        ...toAdd.map((gId) =>
          fetch(`/api/groups/${gId}/members`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: selected.id }),
          })
        ),
        ...toRemove.map((gId) =>
          fetch(`/api/groups/${gId}/members`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: selected.id }),
          })
        ),
      ]);

      toast.success("Employee updated");
      setSelected(null);
      load();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const initials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Employees</h1>
        <p className="text-gray-500 mt-1">Manage staff positions, groups, and access</p>
      </div>

      <div data-tour="employee-list" className="space-y-3">
        {employees.map((emp) => (
          <Card key={emp.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openEmployee(emp)}>
            <CardContent className="py-4 flex items-center gap-4">
              <Avatar className="w-10 h-10 flex-shrink-0">
                {emp.avatarUrl && <AvatarImage src={emp.avatarUrl} alt={emp.name} />}
                <AvatarFallback className="bg-indigo-100 text-indigo-700 font-semibold text-sm">
                  {initials(emp.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900">{emp.name}</p>
                  {emp.role === "ADMIN" && <Badge variant="destructive" className="text-xs">Admin</Badge>}
                </div>
                <p className="text-sm text-gray-400 truncate">{emp.email}</p>
              </div>
              <div className="hidden sm:flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                {emp.position && (
                  <Badge variant="outline" style={{ borderColor: emp.position.color, color: emp.position.color }}>
                    {emp.position.name}
                  </Badge>
                )}
                {emp.groupMembers.slice(0, 2).map((gm) => (
                  <Badge key={gm.group.id} variant="secondary" className="text-xs">{gm.group.name}</Badge>
                ))}
                {emp.groupMembers.length > 2 && (
                  <Badge variant="secondary" className="text-xs">+{emp.groupMembers.length - 2}</Badge>
                )}
                {!emp.position && emp.groupMembers.length === 0 && (
                  <span className="text-xs text-gray-300">No position</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <PageTour tourKey="wso_page_employees_v1" steps={EMPLOYEES_TOUR} />

      {/* Edit Dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-5 py-2">
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  {selected.avatarUrl && <AvatarImage src={selected.avatarUrl} alt={selected.name} />}
                  <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold">
                    {initials(selected.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-gray-900">{selected.name}</p>
                  <p className="text-sm text-gray-400">{selected.email}</p>
                </div>
              </div>

              {/* Position */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5" /> Position / Role
                </label>
                <select
                  value={positionId}
                  onChange={(e) => setPositionId(e.target.value)}
                  className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
                >
                  <option value="none">— No position —</option>
                  {positions.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Groups */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" /> Access Groups
                </label>
                <div className="flex flex-wrap gap-2">
                  {groups.map((g) => {
                    const active = memberGroups.has(g.id);
                    return (
                      <button
                        key={g.id}
                        onClick={() => toggleGroup(g.id)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all ${
                          active ? "border-transparent text-white" : "border-gray-200 text-gray-500 bg-white hover:border-gray-300"
                        }`}
                        style={active ? { backgroundColor: g.color } : {}}
                      >
                        {g.name}
                      </button>
                    );
                  })}
                  {groups.length === 0 && <p className="text-sm text-gray-400">No groups yet. Create them first.</p>}
                </div>
              </div>

              {/* Lesson manager permission */}
              {selected.role !== "ADMIN" && (
                <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Can manage lessons</p>
                    <p className="text-xs text-gray-400 mt-0.5">Can create & edit lessons within their groups</p>
                  </div>
                  <button
                    onClick={() => setCanManageLessons((v) => !v)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      canManageLessons ? "bg-indigo-600" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        canManageLessons ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
