"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Users,
  UserPlus,
  Crown,
  Shield,
  Eye,
  Trash2,
  ChevronDown,
  Search,
  Mail,
  MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType; bg: string }> = {
  OWNER:   { label: "Owner",   color: "text-amber-600",  icon: Crown,  bg: "bg-amber-50 dark:bg-amber-900/20" },
  MANAGER: { label: "Manager", color: "text-blue-600",   icon: Shield, bg: "bg-blue-50 dark:bg-blue-900/20" },
  STAFF:   { label: "Staff",   color: "text-emerald-600",icon: Users,  bg: "bg-emerald-50 dark:bg-emerald-900/20" },
  VIEWER:  { label: "Viewer",  color: "text-slate-500",  icon: Eye,    bg: "bg-slate-50 dark:bg-slate-800/50" },
};

interface TeamMember {
  id: string;
  userId: string;
  role: string;
  createdAt: string;
  user?: { name: string; email: string; avatar?: string };
}

interface Team {
  id: string;
  name: string;
  description?: string;
  members: TeamMember[];
  createdAt: string;
}

const DEFAULT_BIZ_ID = "biz_default_001";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

export default function TeamPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDesc, setNewTeamDesc] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["teams", DEFAULT_BIZ_ID],
    queryFn: () => api.get(`/teams?businessId=${DEFAULT_BIZ_ID}`).then(r => r.data.data as Team[]),
  });

  const createTeam = useMutation({
    mutationFn: (body: { name: string; description: string; businessId: string }) =>
      api.post("/teams", body).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teams"] });
      toast.success("Team created successfully");
      setShowCreateModal(false);
      setNewTeamName("");
      setNewTeamDesc("");
    },
    onError: () => toast.error("Failed to create team"),
  });

  const removeMember = useMutation({
    mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) =>
      api.delete(`/teams/${teamId}/members/${userId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teams"] });
      toast.success("Member removed");
    },
    onError: () => toast.error("Failed to remove member"),
  });

  const teams = (data || []).filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-500" />
            Team Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your teams and their access levels
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-medium text-sm shadow-md hover:shadow-lg hover:opacity-90 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          Create Team
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search teams..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
        />
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Teams",   value: (data || []).length,                        color: "from-blue-500 to-cyan-500" },
          { label: "Total Members", value: (data || []).reduce((a, t) => a + t.members.length, 0), color: "from-violet-500 to-purple-500" },
          { label: "Active Roles",  value: 4,                                           color: "from-emerald-500 to-teal-500" },
          { label: "Pending",       value: 0,                                           color: "from-amber-500 to-orange-500" },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className={`text-2xl font-bold bg-gradient-to-r ${s.color} bg-clip-text text-transparent`}>
              {s.value}
            </div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Teams Grid */}
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 rounded-2xl bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : teams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
            <Users className="w-8 h-8 text-blue-500" />
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-foreground">No teams yet</h3>
            <p className="text-sm text-muted-foreground mt-1">Create a team to start collaborating</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
          >
            Create your first team
          </button>
        </div>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid gap-6 md:grid-cols-2"
        >
          {teams.map(team => (
            <motion.div
              key={team.id}
              variants={item}
              className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Team Header */}
              <div className="p-5 border-b border-border flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm">
                    {team.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{team.name}</h3>
                    {team.description && (
                      <p className="text-xs text-muted-foreground">{team.description}</p>
                    )}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                  {team.members.length} member{team.members.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Members */}
              <div className="p-4 space-y-2">
                {team.members.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No members yet</p>
                ) : (
                  team.members.map(member => {
                    const cfg = ROLE_CONFIG[member.role] || ROLE_CONFIG.STAFF;
                    const RoleIcon = cfg.icon;
                    return (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {(member.user?.name || member.userId).charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {member.user?.name || member.userId}
                          </p>
                          {member.user?.email && (
                            <p className="text-xs text-muted-foreground truncate">{member.user.email}</p>
                          )}
                        </div>
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} flex-shrink-0`}>
                          <RoleIcon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                        <button
                          onClick={() => removeMember.mutate({ teamId: team.id, userId: member.userId })}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-100 hover:text-red-600 text-muted-foreground transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-card rounded-2xl border border-border shadow-2xl p-6 w-full max-w-md"
          >
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              Create New Team
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Team Name *</label>
                <input
                  autoFocus
                  type="text"
                  value={newTeamName}
                  onChange={e => setNewTeamName(e.target.value)}
                  placeholder="e.g. Guest Relations"
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Description</label>
                <textarea
                  value={newTeamDesc}
                  onChange={e => setNewTeamDesc(e.target.value)}
                  placeholder="What does this team do?"
                  rows={3}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition"
                >
                  Cancel
                </button>
                <button
                  disabled={!newTeamName.trim() || createTeam.isPending}
                  onClick={() => createTeam.mutate({ name: newTeamName.trim(), description: newTeamDesc.trim(), businessId: DEFAULT_BIZ_ID })}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition"
                >
                  {createTeam.isPending ? "Creating…" : "Create Team"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
