"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import {
  Users, BookOpen, Clock, CheckCircle2, Trophy, TrendingUp, ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Group { id: string; name: string; color: string }
interface UserSummary { id: string; name: string }

interface User {
  id: string;
  name: string;
  email: string;
  position: { id: string; name: string; color: string } | null;
  groups: { id: string; name: string; color: string }[];
}

interface Lesson {
  id: string;
  title: string;
  readMinutes: number;
  category: { id: string; name: string; color: string };
}

interface ProgressRow {
  userId: string;
  lessonId: string;
  completedAt: string | null;
  timeSpentSeconds: number;
  lastSeenAt: string | null;
}

interface QuizAttempt {
  userId: string;
  lessonId: string;
  score: number;
  passed: boolean;
  createdAt: string;
}

interface Props {
  groups: Group[];
  allUsers: UserSummary[];
  users: User[];
  lessons: Lesson[];
  progress: ProgressRow[];
  quizAttempts: QuizAttempt[];
  activeGroupId: string;
  activeUserId: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function pct(done: number, total: number) {
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

// ── Main component ─────────────────────────────────────────────────────────────

export function ProgressDashboard({
  groups, allUsers, users, lessons, progress, quizAttempts,
  activeGroupId, activeUserId,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setFilter = useCallback(
    (key: string, value: string) => {
      const p = new URLSearchParams(searchParams.toString());
      if (value) p.set(key, value);
      else p.delete(key);
      // Changing group clears user selection
      if (key === "group") p.delete("user");
      router.push(`${pathname}?${p.toString()}`);
    },
    [router, pathname, searchParams]
  );

  // Index progress & attempts by userId+lessonId
  const progMap = new Map<string, ProgressRow>();
  for (const p of progress) progMap.set(`${p.userId}:${p.lessonId}`, p);

  // Best quiz score per user+lesson
  const bestScore = new Map<string, number>();
  for (const a of quizAttempts) {
    const key = `${a.userId}:${a.lessonId}`;
    if ((bestScore.get(key) ?? -1) < a.score) bestScore.set(key, a.score);
  }

  // Summary stats
  const totalUsers = users.length;
  const totalLessons = lessons.length;
  const totalCompleted = progress.filter((p) => p.completedAt).length;
  const totalSeconds = progress.reduce((s, p) => s + p.timeSpentSeconds, 0);
  const avgPct = totalUsers === 0 ? 0 : Math.round(
    users.reduce((sum, u) => {
      const done = lessons.filter((l) => progMap.get(`${u.id}:${l.id}`)?.completedAt).length;
      return sum + pct(done, totalLessons);
    }, 0) / totalUsers
  );

  // Single-user view
  const focusUser = activeUserId ? users.find((u) => u.id === activeUserId) : null;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Progress Dashboard</h1>
        <p className="text-gray-500 mt-1">Track learning progress across all employees</p>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-2 mb-6">
        {/* Group filter */}
        <button
          onClick={() => setFilter("group", "")}
          className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
            !activeGroupId ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
          }`}
        >
          All teams
        </button>
        {groups.map((g) => (
          <button
            key={g.id}
            onClick={() => setFilter("group", g.id)}
            className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              activeGroupId === g.id ? "text-white border-transparent" : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
            }`}
            style={activeGroupId === g.id ? { backgroundColor: g.color, borderColor: g.color } : {}}
          >
            {g.name}
          </button>
        ))}

        {/* Person filter */}
        {totalUsers > 1 && (
          <select
            value={activeUserId}
            onChange={(e) => setFilter("user", e.target.value)}
            className="ml-auto h-8 rounded-full border border-gray-200 bg-white px-3 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
          >
            <option value="">All employees ({totalUsers})</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{totalUsers}</p>
                <p className="text-xs text-gray-500">Employees</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{totalCompleted}</p>
                <p className="text-xs text-gray-500">Completions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{avgPct}%</p>
                <p className="text-xs text-gray-500">Avg completion</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{formatTime(totalSeconds)}</p>
                <p className="text-xs text-gray-500">Total learning time</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {focusUser ? (
        /* ── Single employee detail view ── */
        <UserDetail
          user={focusUser}
          lessons={lessons}
          progMap={progMap}
          bestScore={bestScore}
          onBack={() => setFilter("user", "")}
        />
      ) : (
        /* ── Employee list view ── */
        <div className="space-y-3">
          {users.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-gray-400">No employees found.</CardContent>
            </Card>
          )}
          {users.map((u) => {
            const done = lessons.filter((l) => progMap.get(`${u.id}:${l.id}`)?.completedAt).length;
            const completion = pct(done, totalLessons);
            const timeSpent = progress.filter((p) => p.userId === u.id).reduce((s, p) => s + p.timeSpentSeconds, 0);
            const lastSeen = progress
              .filter((p) => p.userId === u.id && p.lastSeenAt)
              .sort((a, b) => (b.lastSeenAt! > a.lastSeenAt! ? 1 : -1))[0]?.lastSeenAt;

            return (
              <Card
                key={u.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setFilter("user", u.id)}
              >
                <CardContent className="py-4 flex items-center gap-4">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 text-sm font-bold text-indigo-700">
                    {u.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>

                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-gray-900">{u.name}</p>
                      {u.position && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: u.position.color + "20", color: u.position.color }}>
                          {u.position.name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex-1 max-w-[180px]">
                        <Progress value={completion} className="h-1.5" />
                      </div>
                      <span className="text-xs text-gray-500">{done}/{totalLessons} lessons</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="hidden sm:flex flex-col items-end gap-1 flex-shrink-0 text-xs text-gray-400">
                    <span className="font-semibold text-gray-700">{completion}%</span>
                    <span>{formatTime(timeSpent)} learning</span>
                    {lastSeen && (
                      <span>Last seen {new Date(lastSeen).toLocaleDateString()}</span>
                    )}
                  </div>

                  <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Single user detail ─────────────────────────────────────────────────────────

function UserDetail({
  user, lessons, progMap, bestScore, onBack,
}: {
  user: User;
  lessons: Lesson[];
  progMap: Map<string, ProgressRow>;
  bestScore: Map<string, number>;
  onBack: () => void;
}) {
  const done = lessons.filter((l) => progMap.get(`${user.id}:${l.id}`)?.completedAt).length;
  const totalTime = lessons.reduce(
    (s, l) => s + (progMap.get(`${user.id}:${l.id}`)?.timeSpentSeconds ?? 0), 0
  );
  const completion = pct(done, lessons.length);

  // Group lessons by category
  const byCategory = new Map<string, { label: string; color: string; items: Lesson[] }>();
  for (const l of lessons) {
    const cat = byCategory.get(l.category.id) ??
      { label: l.category.name, color: l.category.color, items: [] };
    cat.items.push(l);
    byCategory.set(l.category.id, cat);
  }

  return (
    <div className="space-y-6">
      {/* Back + user header */}
      <div className="flex items-start gap-4">
        <button
          onClick={onBack}
          className="flex-shrink-0 mt-1 p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
        >
          ← Back
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700 flex-shrink-0">
              {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-lg">{user.name}</p>
              <p className="text-sm text-gray-400">{user.email}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {user.position && (
              <Badge variant="outline" style={{ borderColor: user.position.color, color: user.position.color }}>
                {user.position.name}
              </Badge>
            )}
            {user.groups.map((g) => (
              <Badge key={g.id} variant="secondary">{g.name}</Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-indigo-600">{completion}%</p>
            <p className="text-xs text-gray-500 mt-0.5">{done}/{lessons.length} lessons</p>
            <Progress value={completion} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{formatTime(totalTime)}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total learning time</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-green-600">{done}</p>
            <p className="text-xs text-gray-500 mt-0.5">Lessons completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Lessons by category */}
      {[...byCategory.values()].map((cat) => (
        <div key={cat.label}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-4 rounded-full" style={{ backgroundColor: cat.color }} />
            <p className="font-semibold text-sm text-gray-700">{cat.label}</p>
          </div>
          <div className="space-y-1.5">
            {cat.items.map((lesson) => {
              const row = progMap.get(`${user.id}:${lesson.id}`);
              const isDone = !!row?.completedAt;
              const timeSpent = row?.timeSpentSeconds ?? 0;
              const score = bestScore.get(`${user.id}:${lesson.id}`);

              return (
                <div key={lesson.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-sm ${
                    isDone ? "border-green-100 bg-green-50" : timeSpent > 0 ? "border-amber-100 bg-amber-50" : "border-gray-100 bg-white"
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isDone ? "bg-green-500" : "bg-gray-200"
                  }`}>
                    {isDone
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      : <BookOpen className="w-3 h-3 text-gray-400" />
                    }
                  </div>

                  <span className={`flex-1 font-medium truncate ${isDone ? "text-gray-600" : "text-gray-900"}`}>
                    {lesson.title}
                  </span>

                  <div className="flex items-center gap-3 flex-shrink-0 text-xs text-gray-400">
                    {timeSpent > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />{formatTime(timeSpent)}
                      </span>
                    )}
                    {score !== undefined && (
                      <span className={`flex items-center gap-1 font-medium ${score >= 80 ? "text-green-600" : "text-red-500"}`}>
                        <Trophy className="w-3 h-3" />{score}%
                      </span>
                    )}
                    {isDone && row?.completedAt && (
                      <span>{new Date(row.completedAt).toLocaleDateString()}</span>
                    )}
                    {!isDone && timeSpent > 0 && (
                      <Badge variant="outline" className="text-xs text-amber-600 border-amber-200">In progress</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
