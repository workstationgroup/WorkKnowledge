"use client";

import { useEffect, useState, useRef } from "react";
import { MessageSquare, Send, Trash2, Pin, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Reply {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
}

interface Post {
  id: string;
  userId: string;
  userName: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
  replies: Reply[];
}

interface LessonForumProps {
  lessonId: string;
  currentUserId: string;
  isAdmin: boolean;
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(date).toLocaleDateString();
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export function LessonForum({ lessonId, currentUserId, isAdmin }: LessonForumProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);
  const replyRef = useRef<HTMLTextAreaElement>(null);

  const load = async () => {
    try {
      const res = await fetch(`/api/lessons/${lessonId}/forum`);
      if (res.ok) setPosts(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [lessonId]);

  useEffect(() => {
    if (replyingTo) replyRef.current?.focus();
  }, [replyingTo]);

  const submitPost = async () => {
    if (!newPost.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/lessons/${lessonId}/forum`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newPost }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const post = await res.json();
      setPosts((prev) => [...prev, post]);
      setNewPost("");
      toast.success("Question posted");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to post");
    } finally {
      setSubmitting(false);
    }
  };

  const deletePost = async (postId: string) => {
    try {
      const res = await fetch(`/api/lessons/${lessonId}/forum/${postId}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch {
      toast.error("Failed to delete");
    }
  };

  const togglePin = async (post: Post) => {
    try {
      const res = await fetch(`/api/lessons/${lessonId}/forum/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned: !post.isPinned }),
      });
      if (!res.ok) throw new Error();
      setPosts((prev) =>
        [...prev.map((p) => p.id === post.id ? { ...p, isPinned: !p.isPinned } : p)]
          .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      );
    } catch {
      toast.error("Failed to update pin");
    }
  };

  const submitReply = async (postId: string) => {
    if (!replyText.trim()) return;
    setReplySubmitting(true);
    try {
      const res = await fetch(`/api/lessons/${lessonId}/forum/${postId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyText }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const reply = await res.json();
      setPosts((prev) => prev.map((p) =>
        p.id === postId ? { ...p, replies: [...p.replies, reply] } : p
      ));
      setReplyText("");
      setReplyingTo(null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to reply");
    } finally {
      setReplySubmitting(false);
    }
  };

  const deleteReply = async (postId: string, replyId: string) => {
    try {
      const res = await fetch(`/api/lessons/${lessonId}/forum/${postId}/replies`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replyId }),
      });
      if (!res.ok) throw new Error();
      setPosts((prev) => prev.map((p) =>
        p.id === postId ? { ...p, replies: p.replies.filter((r) => r.id !== replyId) } : p
      ));
    } catch {
      toast.error("Failed to delete reply");
    }
  };

  const toggleExpanded = (postId: string) => {
    setExpandedPosts((prev) => {
      const next = new Set(prev);
      next.has(postId) ? next.delete(postId) : next.add(postId);
      return next;
    });
  };

  if (loading) return (
    <div className="flex items-center justify-center py-8 text-gray-400">
      <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading discussion…
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-gray-400" />
        <h2 className="text-base font-semibold text-gray-900">
          Discussion {posts.length > 0 && <span className="text-gray-400 font-normal">({posts.length})</span>}
        </h2>
      </div>

      {/* New post */}
      <div className="space-y-2">
        <Textarea
          placeholder="Ask a question or start a discussion…"
          value={newPost}
          onChange={(e) => setNewPost(e.target.value)}
          rows={3}
          className="resize-none"
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitPost(); }}
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">Cmd+Enter to post</p>
          <Button size="sm" onClick={submitPost} disabled={submitting || !newPost.trim()} className="gap-1.5">
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Post
          </Button>
        </div>
      </div>

      {posts.length === 0 && (
        <p className="text-center text-sm text-gray-400 py-6">
          No discussion yet. Be the first to ask a question!
        </p>
      )}

      {/* Post list */}
      <div className="space-y-4">
        {posts.map((post) => {
          const expanded = expandedPosts.has(post.id);
          const isReplying = replyingTo === post.id;
          const canDelete = isAdmin || post.userId === currentUserId;

          return (
            <div
              key={post.id}
              className={cn(
                "rounded-xl border bg-white",
                post.isPinned ? "border-indigo-200 bg-indigo-50/30" : "border-gray-200"
              )}
            >
              {/* Post header */}
              <div className="px-4 pt-4 pb-3">
                <div className="flex items-start gap-3">
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs font-semibold">
                      {initials(post.userName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">{post.userName}</span>
                      {post.isPinned && (
                        <span className="inline-flex items-center gap-1 text-xs text-indigo-600 font-medium">
                          <Pin className="w-3 h-3" /> Pinned
                        </span>
                      )}
                      <span className="text-xs text-gray-400">{timeAgo(post.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{post.content}</p>
                  </div>
                </div>

                {/* Post actions */}
                <div className="flex items-center gap-1 mt-3 ml-11">
                  <button
                    onClick={() => {
                      if (!isReplying) {
                        setReplyingTo(post.id);
                        if (!expanded) toggleExpanded(post.id);
                      } else {
                        setReplyingTo(null);
                        setReplyText("");
                      }
                    }}
                    className="text-xs text-gray-400 hover:text-indigo-600 font-medium px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
                  >
                    Reply
                  </button>

                  {post.replies.length > 0 && (
                    <button
                      onClick={() => toggleExpanded(post.id)}
                      className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-50 transition-colors"
                    >
                      {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {post.replies.length} {post.replies.length === 1 ? "reply" : "replies"}
                    </button>
                  )}

                  {isAdmin && (
                    <button
                      onClick={() => togglePin(post)}
                      className={cn(
                        "text-xs px-2 py-1 rounded transition-colors",
                        post.isPinned
                          ? "text-indigo-600 hover:bg-indigo-50"
                          : "text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"
                      )}
                    >
                      <Pin className="w-3 h-3" />
                    </button>
                  )}

                  {canDelete && (
                    <button
                      onClick={() => deletePost(post.id)}
                      className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded hover:bg-red-50 transition-colors ml-auto"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Replies */}
              {(expanded || isReplying) && (
                <div className="border-t border-gray-100 px-4 pb-4 space-y-3">
                  {post.replies.map((reply) => (
                    <div key={reply.id} className="flex items-start gap-3 pt-3">
                      <Avatar className="w-6 h-6 flex-shrink-0">
                        <AvatarFallback className="bg-gray-100 text-gray-600 text-[10px] font-semibold">
                          {initials(reply.userName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-medium text-gray-900">{reply.userName}</span>
                          <span className="text-xs text-gray-400">{timeAgo(reply.createdAt)}</span>
                          {(isAdmin || reply.userId === currentUserId) && (
                            <button
                              onClick={() => deleteReply(post.id, reply.id)}
                              className="ml-auto text-gray-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 whitespace-pre-wrap">{reply.content}</p>
                      </div>
                    </div>
                  ))}

                  {/* Reply input */}
                  {isReplying && (
                    <div className="pt-3 space-y-2">
                      <Textarea
                        ref={replyRef}
                        placeholder="Write a reply…"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        rows={2}
                        className="resize-none text-sm"
                        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitReply(post.id); }}
                      />
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => { setReplyingTo(null); setReplyText(""); }}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={() => submitReply(post.id)} disabled={replySubmitting || !replyText.trim()} className="gap-1.5">
                          {replySubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                          Reply
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
