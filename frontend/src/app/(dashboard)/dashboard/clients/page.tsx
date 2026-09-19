"use client";

import { Fragment, useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { useConfirm } from "@/components/confirm-modal";
import { useToast } from "@/components/toast";
import {
  Alert,
  Avatar,
  Badge,
  badgeStyles,
  Button,
  buttonStyles,
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
  DataToolbar,
  EmptyState,
  Field,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  NativeSelect,
  PageHeader,
  Skeleton,
  StatusBadge,
  Tab,
  TabList,
  TabPanel,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRoot,
  TableRow,
  Tabs,
  Textarea,
} from "@/components/ui";
import type { BadgeColor } from "@/components/ui";
import { cn } from "@/lib/utils";
import { UserPlus, Copy, Check, Trash2, ChevronDown, ChevronRight, UsersRound, Download, Sparkles, ExternalLink, KeyRound, Eye } from "lucide-react";
import { track } from "@/lib/track";
import { startPreview } from "@/lib/preview-mode";
import { LabelBadge } from "@/components/label-badge";
import { downloadCsv } from "@/lib/download";
import Link from "next/link";
import { useAppConfig } from "@/lib/app-config";

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  inviteLink: string;
}

interface LabelRecord {
  id: string;
  name: string;
  color: string;
}

interface MemberRecord {
  id: string;
  userId: string;
  role: string;
  hourlyRateCents?: number | null;
  user: { id: string; name: string; email: string };
  labels?: { label: LabelRecord }[];
}

interface ClientProfile {
  company?: string;
  phone?: string;
  address?: string;
  website?: string;
  description?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const roleBadgeColor = (role: string): BadgeColor => {
  switch (role) {
    case "owner":
      return "violet";
    case "admin":
      return "blue";
    default:
      return "gray";
  }
};

type TabId = "team" | "clients";

/** Shared header-row treatment from the template's basic table. */
const HEAD_ROW = "bg-background-gray-secondary_alt";
const HEAD_CELL = "text-text-secondary";

export default function PeoplePage() {
  const config = useAppConfig();
  const confirm = useConfirm();
  const { success, error: showError } = useToast();
  const [activeTab, setActiveTab] = useState<TabId>("team");
  const [planLimits, setPlanLimits] = useState<{
    maxMembers: number; membersUsed: number;
    maxClients: number; clientsUsed: number;
  } | null>(null);

  // Shared state
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [currentRole, setCurrentRole] = useState("");
  const [copied, setCopied] = useState("");

  // Team invite state
  const [teamEmail, setTeamEmail] = useState("");
  const [teamInviteRole, setTeamInviteRole] = useState<"admin" | "owner">("admin");
  const [teamError, setTeamError] = useState("");
  const [teamInviteLink, setTeamInviteLink] = useState("");
  const [teamInviting, setTeamInviting] = useState(false);

  // Client invite state
  const [clientEmail, setClientEmail] = useState("");
  const [clientError, setClientError] = useState("");
  const [clientInviteLink, setClientInviteLink] = useState("");
  const [clientInviting, setClientInviting] = useState(false);

  // Client list state
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Record<string, ClientProfile>>({});
  const [editingProfile, setEditingProfile] = useState<Record<string, ClientProfile>>({});
  const [savingProfile, setSavingProfile] = useState<string | null>(null);

  const [resetLink, setResetLink] = useState<{
    email: string;
    emailSent: boolean;
  } | null>(null);
  const [resettingMemberId, setResettingMemberId] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ user: { id: string }; member: { role: string } }>("/organizations/me")
      .then((session) => {
        setCurrentUserId(session.user.id);
        setCurrentRole(session.member.role);
      })
      .catch(console.error);
  }, []);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<PaginatedResponse<MemberRecord>>(
        `/clients?page=1&limit=100`,
      );
      setMembers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadInvitations = useCallback(() => {
    apiFetch<Invitation[]>("/clients/invitations")
      .then(setInvitations)
      .catch(console.error);
  }, []);

  useEffect(() => {
    loadMembers();
    loadInvitations();
  }, [loadMembers, loadInvitations]);

  useEffect(() => {
    if (!config?.billingEnabled) return;
    Promise.all([
      apiFetch<{ subscription: { plan: { maxMembers: number; maxClients: number } } | null }>("/billing/subscription").catch(() => null),
      apiFetch<{ members: number; clients: number }>("/billing/usage").catch(() => null),
    ]).then(([sub, usage]) => {
      if (sub?.subscription?.plan && usage != null) {
        setPlanLimits({
          maxMembers: sub.subscription.plan.maxMembers,
          membersUsed: usage.members,
          maxClients: sub.subscription.plan.maxClients,
          clientsUsed: usage.clients,
        });
      }
    });
  }, [config?.billingEnabled]);

  const atMemberLimit = planLimits !== null && planLimits.maxMembers !== -1 && planLimits.membersUsed >= planLimits.maxMembers;
  const atClientLimit = planLimits !== null && planLimits.maxClients !== -1 && planLimits.clientsUsed >= planLimits.maxClients;

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopied(link);
    setTimeout(() => setCopied(""), 2000);
  };

  const handleRemoveMember = async (memberId: string, memberName: string, isTeam: boolean) => {
    const ok = await confirm({
      title: isTeam ? "Remove Team Member" : "Remove Client",
      message: `Remove ${memberName}? They will lose access to all projects.`,
      confirmLabel: "Remove",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await apiFetch(`/clients/${memberId}`, { method: "DELETE" });
      success(`${memberName} removed`);
      loadMembers();
      if (isTeam) {
        setPlanLimits((prev) => prev ? { ...prev, membersUsed: Math.max(0, prev.membersUsed - 1) } : prev);
      } else {
        setPlanLimits((prev) => prev ? { ...prev, clientsUsed: Math.max(0, prev.clientsUsed - 1) } : prev);
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to remove");
    }
  };

  const handleViewAsClient = (
    clientUserId: string,
    clientName: string,
    clientEmail: string,
  ) => {
    track("client_viewed_as");
    startPreview(clientUserId, clientName, clientEmail);
  };

  const handleResetPassword = async (memberId: string, email: string) => {
    const ok = await confirm({
      title: "Send Password Reset Email",
      message: `Send a password reset email to ${email}?`,
      confirmLabel: "Send Email",
    });
    if (!ok) return;
    setResettingMemberId(memberId);
    try {
      const res = await apiFetch<{ email: string; emailSent: boolean }>(
        `/clients/${memberId}/reset-password`,
        { method: "POST" },
      );
      setResetLink(res);
      success(
        res.emailSent
          ? `Reset email sent to ${res.email}`
          : `Could not send reset email to ${res.email}`,
      );
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to send reset email");
    } finally {
      setResettingMemberId(null);
    }
  };

  const handleSetRate = async (memberId: string, rawValue: string) => {
    const trimmed = rawValue.trim();
    let cents: number | null = null;
    if (trimmed !== "") {
      const dollars = Number(trimmed);
      if (!Number.isFinite(dollars) || dollars < 0) {
        showError("Enter a valid non-negative rate");
        return;
      }
      cents = Math.round(dollars * 100);
    }
    try {
      await apiFetch(`/clients/${memberId}/rate`, {
        method: "PUT",
        body: JSON.stringify({ hourlyRateCents: cents }),
      });
      success("Rate updated");
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, hourlyRateCents: cents } : m)),
      );
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to update rate");
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      await apiFetch(`/clients/${memberId}/role`, {
        method: "PUT",
        body: JSON.stringify({ role: newRole }),
      });
      success("Role updated");
      loadMembers();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to change role");
    }
  };

  // --- Team invite ---
  const handleTeamInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeamError("");
    setTeamInviteLink("");
    setTeamInviting(true);
    try {
      await apiFetch("/clients/invitations", {
        method: "POST",
        body: JSON.stringify({ email: teamEmail, role: teamInviteRole }),
      });
      track("team_member_invited", { role: teamInviteRole });
      const submittedEmail = teamEmail;
      setTeamEmail("");
      success("Invitation sent");
      setPlanLimits((prev) => prev ? { ...prev, membersUsed: prev.membersUsed + 1 } : prev);

      const updated = await apiFetch<Invitation[]>("/clients/invitations");
      setInvitations(updated);
      const emailLower = submittedEmail.toLowerCase();
      const newest = [...updated]
        .filter((inv) => inv.email.toLowerCase() === emailLower && inv.role !== "member")
        .sort((a, b) => new Date(b.expiresAt).getTime() - new Date(a.expiresAt).getTime())[0];
      if (newest) setTeamInviteLink(newest.inviteLink);
    } catch (err) {
      setTeamError(err instanceof Error ? err.message : "Failed to send invite");
    } finally {
      setTeamInviting(false);
    }
  };

  // --- Client invite ---
  const handleClientInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientError("");
    setClientInviteLink("");
    setClientInviting(true);
    try {
      await apiFetch("/clients/invitations", {
        method: "POST",
        body: JSON.stringify({ email: clientEmail, role: "member" }),
      });
      track("client_invited");
      const submittedEmail = clientEmail;
      setClientEmail("");
      success("Invitation sent");
      setPlanLimits((prev) => prev ? { ...prev, clientsUsed: prev.clientsUsed + 1 } : prev);

      const updated = await apiFetch<Invitation[]>("/clients/invitations");
      setInvitations(updated);
      const emailLower = submittedEmail.toLowerCase();
      const newest = [...updated]
        .filter((inv) => inv.email.toLowerCase() === emailLower)
        .sort((a, b) => new Date(b.expiresAt).getTime() - new Date(a.expiresAt).getTime())[0];
      if (newest) setClientInviteLink(newest.inviteLink);
    } catch (err) {
      setClientError(err instanceof Error ? err.message : "Failed to send invite");
    } finally {
      setClientInviting(false);
    }
  };

  // --- Client profile ---
  const handleExpandMember = async (memberId: string, userId: string) => {
    if (expandedMember === memberId) {
      setExpandedMember(null);
      return;
    }
    setExpandedMember(memberId);
    if (!profiles[userId]) {
      try {
        const p = await apiFetch<ClientProfile>(`/clients/${userId}/profile`);
        setProfiles((prev) => ({ ...prev, [userId]: p }));
        setEditingProfile((prev) => ({ ...prev, [userId]: { ...p } }));
      } catch {
        setProfiles((prev) => ({ ...prev, [userId]: {} }));
        setEditingProfile((prev) => ({ ...prev, [userId]: {} }));
      }
    }
  };

  const handleSaveProfile = async (userId: string) => {
    setSavingProfile(userId);
    try {
      await apiFetch(`/clients/${userId}/profile`, {
        method: "PUT",
        body: JSON.stringify(editingProfile[userId] || {}),
      });
      setProfiles((prev) => ({ ...prev, [userId]: { ...editingProfile[userId] } }));
      success("Profile updated");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSavingProfile(null);
    }
  };

  const team = members.filter((m) => m.role !== "member");
  const clients = members.filter((m) => m.role === "member");
  const teamInvitations = invitations.filter((inv) => inv.role !== "member");
  const clientInvitations = invitations.filter((inv) => inv.role === "member");
  const isOwner = currentRole === "owner";

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: "team", label: "Team", count: team.length },
    { id: "clients", label: "Clients", count: clients.length },
  ];

  /** Placeholder rows used while the member list loads. */
  const renderSkeletonRows = (rows: number, columns: number) =>
    Array.from({ length: rows }).map((_, index) => (
      <TableRow key={`skeleton-${index}`}>
        <TableCell>
          <div className="flex items-center gap-3">
            <Skeleton className="size-8 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-2.5 w-40" />
            </div>
          </div>
        </TableCell>
        {Array.from({ length: columns - 2 }).map((__, cellIndex) => (
          <TableCell key={`skeleton-cell-${cellIndex}`}>
            <Skeleton className="h-5 w-20 rounded-full" />
          </TableCell>
        ))}
        <TableCell>
          <Skeleton className="ml-auto h-3 w-16" />
        </TableCell>
      </TableRow>
    ));

  return (
    <div className="space-y-5">
      <PageHeader
        title="People"
        description="Manage your team and clients."
        actions={
          <Button
            type="button"
            iconOnly={false}
            appearance="outline"
            onClick={() => downloadCsv("/clients/export")}
            title="Export CSV"
          >
            <Download />
            <span className="hidden sm:inline">Export</span>
          </Button>
        }
      />

      <Modal open={!!resetLink} onClose={() => setResetLink(null)} size="sm">
        {resetLink ? (
          <>
            <ModalHeader title="Password reset email" description={`For ${resetLink.email}`} />
            <ModalBody>
              <Alert status={resetLink.emailSent ? "success" : "warning"}>
                {resetLink.emailSent
                  ? `A password reset email was sent to ${resetLink.email}.`
                  : `Could not send a reset email to ${resetLink.email}. Ask them to use "Forgot password" on the sign-in page instead.`}
              </Alert>
            </ModalBody>
            <ModalFooter>
              <Button type="button" appearance="outline" onClick={() => setResetLink(null)}>
                Done
              </Button>
            </ModalFooter>
          </>
        ) : null}
      </Modal>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as TabId)}
        variant="line"
      >
        <TabList>
          {tabs.map((tab) => (
            <Tab
              key={tab.id}
              value={tab.id}
              badge={
                tab.count > 0 ? (
                  <span className="text-xs text-text-tertiary">({tab.count})</span>
                ) : undefined
              }
            >
              {tab.label}
            </Tab>
          ))}
        </TabList>

        {/* ── Team Tab ── */}
        <TabPanel value="team" className="mt-5 space-y-5">
          {/* Team Invite — owner only */}
          {!isOwner && currentRole === "admin" && (
            <Alert status="info">
              Only the organization owner can invite or manage team members.
            </Alert>
          )}

          {isOwner && (
            <Card>
              <CardHeader>
                <CardTitle>Invite a Team Member</CardTitle>
                {planLimits && planLimits.maxMembers !== -1 && (
                  <CardAction>
                    <Badge color={atMemberLimit ? "rose" : "gray"}>
                      {planLimits.membersUsed}/{planLimits.maxMembers} members
                    </Badge>
                  </CardAction>
                )}
              </CardHeader>

              <CardContent className="space-y-3">
                {atMemberLimit ? (
                  <Alert
                    status="warning"
                    icon={<Sparkles />}
                    title="Team member limit reached"
                    actions={
                      <Link
                        href="/dashboard/settings/account?reason=members#billing"
                        className={cn(buttonStyles({ size: "sm" }), "whitespace-nowrap")}
                      >
                        Upgrade
                        <ExternalLink />
                      </Link>
                    }
                  >
                    Upgrade to Pro for up to 5 team members, or Lifetime for 100.
                  </Alert>
                ) : (
                  <form onSubmit={handleTeamInvite} className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    <Input
                      type="email"
                      value={teamEmail}
                      onChange={(e) => setTeamEmail(e.target.value)}
                      placeholder="team@example.com"
                      aria-label="Team member email"
                      required
                      className="sm:flex-1"
                    />
                    <NativeSelect
                      value={teamInviteRole}
                      onChange={(e) => setTeamInviteRole(e.target.value as "admin" | "owner")}
                      aria-label="Invitation role"
                      className="sm:w-40"
                    >
                      <option value="admin">Admin</option>
                      <option value="owner">Owner</option>
                    </NativeSelect>
                    <Button type="submit" disabled={teamInviting}>
                      <UserPlus />
                      {teamInviting ? "Inviting..." : "Invite"}
                    </Button>
                  </form>
                )}

                {teamError && <Alert status="error">{teamError}</Alert>}

                {teamInviteLink && (
                  <Alert status="success" title="Invitation created! Share this link:">
                    <div className="mt-1 flex items-center gap-2">
                      <Input
                        readOnly
                        value={teamInviteLink}
                        aria-label="Team invitation link"
                        className="h-9 py-0 font-mono text-xs"
                      />
                      <Button
                        type="button"
                        variant="success"
                        appearance="outline"
                        size="sm"
                        onClick={() => copyLink(teamInviteLink)}
                      >
                        {copied === teamInviteLink ? <Check /> : <Copy />}
                        {copied === teamInviteLink ? "Copied!" : "Copy"}
                      </Button>
                    </div>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Pending Team Invitations */}
          {teamInvitations.length > 0 && (
            <Card className="overflow-hidden p-0">
              <DataToolbar>
                <CardTitle>Pending Invitations</CardTitle>
              </DataToolbar>
              <TableRoot>
                <TableHeader>
                  <TableRow className={HEAD_ROW}>
                    <TableHead className={HEAD_CELL}>Email</TableHead>
                    <TableHead className={HEAD_CELL}>Role</TableHead>
                    <TableHead className={HEAD_CELL}>Status</TableHead>
                    <TableHead className={cn(HEAD_CELL, "text-right")}>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamInvitations.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="text-text-primary">{inv.email}</TableCell>
                      <TableCell>
                        <Badge color={roleBadgeColor(inv.role)}>{inv.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={inv.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            appearance="outline"
                            size="sm"
                            onClick={() => copyLink(inv.inviteLink)}
                          >
                            {copied === inv.inviteLink ? <Check /> : <Copy />}
                            {copied === inv.inviteLink ? "Copied!" : "Copy Link"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </TableRoot>
            </Card>
          )}

          {/* Team Members List */}
          <Card className="overflow-hidden p-0">
            <DataToolbar>
              <CardTitle>Members{team.length > 0 && ` (${team.length})`}</CardTitle>
            </DataToolbar>

            {!loading && team.length === 0 ? (
              <EmptyState
                variant="plain"
                icon={UsersRound}
                title="Just you for now."
                description="Invite team members above."
              />
            ) : (
              <TableRoot>
                <TableHeader>
                  <TableRow className={HEAD_ROW}>
                    <TableHead className={HEAD_CELL}>Member</TableHead>
                    {isOwner && <TableHead className={HEAD_CELL}>Hourly rate</TableHead>}
                    <TableHead className={HEAD_CELL}>Role</TableHead>
                    <TableHead className={cn(HEAD_CELL, "text-right")}>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading
                    ? renderSkeletonRows(2, isOwner ? 4 : 3)
                    : team.map((member) => {
                        const isSelf = member.userId === currentUserId;
                        const canChangeRole = isOwner && !isSelf;
                        const canRemove = isOwner && !isSelf;
                        const canResetPassword =
                          !isSelf && (isOwner || (currentRole === "admin" && member.role !== "owner"));

                        return (
                          <TableRow key={member.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar name={member.user.name} size={32} />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className="truncate text-sm font-medium text-text-primary">
                                      {member.user.name}
                                    </p>
                                    {isSelf && (
                                      <span className="text-xs text-text-tertiary">(you)</span>
                                    )}
                                  </div>
                                  <p className="truncate text-xs text-text-tertiary">
                                    {member.user.email}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            {isOwner && (
                              <TableCell>
                                <div className="flex items-center gap-1 text-xs text-text-tertiary">
                                  <span>$</span>
                                  <Input
                                    type="number"
                                    min={0}
                                    step={1}
                                    placeholder="Rate"
                                    defaultValue={
                                      member.hourlyRateCents != null
                                        ? (member.hourlyRateCents / 100).toString()
                                        : ""
                                    }
                                    onBlur={(e) => {
                                      const next = e.target.value;
                                      const current =
                                        member.hourlyRateCents != null
                                          ? (member.hourlyRateCents / 100).toString()
                                          : "";
                                      if (next.trim() === current) return;
                                      handleSetRate(member.id, next);
                                    }}
                                    title="Default hourly rate"
                                    aria-label={`Default hourly rate for ${member.user.name}`}
                                    className="h-8 w-20 px-2 py-0 text-right text-xs"
                                  />
                                  <span>/hr</span>
                                </div>
                              </TableCell>
                            )}
                            <TableCell>
                              {canChangeRole ? (
                                <select
                                  value={member.role}
                                  onChange={(e) => handleRoleChange(member.id, e.target.value)}
                                  aria-label={`Role for ${member.user.name}`}
                                  className={cn(
                                    badgeStyles({ color: roleBadgeColor(member.role), size: "sm" }),
                                    "cursor-pointer border-0 pr-6 text-xs outline-none focus-visible:ring-4 focus-visible:ring-button-outline-focus-ring",
                                  )}
                                >
                                  <option value="owner">owner</option>
                                  <option value="admin">admin</option>
                                </select>
                              ) : (
                                <Badge color={roleBadgeColor(member.role)}>{member.role}</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-1">
                                {canResetPassword && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleResetPassword(member.id, member.user.email)}
                                    disabled={resettingMemberId === member.id}
                                    title="Send password reset link"
                                    aria-label={`Send password reset link to ${member.user.email}`}
                                  >
                                    <KeyRound />
                                  </Button>
                                )}
                                {canRemove && (
                                  <Button
                                    type="button"
                                    variant="danger"
                                    appearance="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveMember(member.id, member.user.name, true)}
                                    title="Remove member"
                                    aria-label={`Remove ${member.user.name}`}
                                  >
                                    <Trash2 />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                </TableBody>
              </TableRoot>
            )}
          </Card>
        </TabPanel>

        {/* ── Clients Tab ── */}
        <TabPanel value="clients" className="mt-5 space-y-5">
          {/* Client Invite */}
          <Card>
            <CardHeader>
              <CardTitle>Invite a Client</CardTitle>
              {planLimits && planLimits.maxClients !== -1 && (
                <CardAction>
                  <Badge color={atClientLimit ? "rose" : "gray"}>
                    {planLimits.clientsUsed}/{planLimits.maxClients} clients
                  </Badge>
                </CardAction>
              )}
            </CardHeader>

            <CardContent className="space-y-3">
              {atClientLimit ? (
                <Alert
                  status="warning"
                  icon={<Sparkles />}
                  title="Client limit reached"
                  actions={
                    <Link
                      href="/dashboard/settings/account?reason=clients#billing"
                      className={cn(buttonStyles({ size: "sm" }), "whitespace-nowrap")}
                    >
                      Upgrade
                      <ExternalLink />
                    </Link>
                  }
                >
                  Upgrade to Pro for unlimited clients.
                </Alert>
              ) : (
                <form onSubmit={handleClientInvite} className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <Input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="client@example.com"
                    aria-label="Client email"
                    required
                    className="sm:flex-1"
                  />
                  <Button type="submit" disabled={clientInviting}>
                    <UserPlus />
                    {clientInviting ? "Inviting..." : "Invite"}
                  </Button>
                </form>
              )}

              {clientError && <Alert status="error">{clientError}</Alert>}

              {clientInviteLink && (
                <Alert status="success" title="Invitation created! Share this link with your client:">
                  <div className="mt-1 flex items-center gap-2">
                    <Input
                      readOnly
                      value={clientInviteLink}
                      aria-label="Client invitation link"
                      className="h-9 py-0 font-mono text-xs"
                    />
                    <Button
                      type="button"
                      variant="success"
                      appearance="outline"
                      size="sm"
                      onClick={() => copyLink(clientInviteLink)}
                    >
                      {copied === clientInviteLink ? <Check /> : <Copy />}
                      {copied === clientInviteLink ? "Copied!" : "Copy"}
                    </Button>
                  </div>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Pending Client Invitations */}
          {clientInvitations.length > 0 && (
            <Card className="overflow-hidden p-0">
              <DataToolbar>
                <CardTitle>Pending Invitations</CardTitle>
              </DataToolbar>
              <TableRoot>
                <TableHeader>
                  <TableRow className={HEAD_ROW}>
                    <TableHead className={HEAD_CELL}>Email</TableHead>
                    <TableHead className={HEAD_CELL}>Expires</TableHead>
                    <TableHead className={HEAD_CELL}>Status</TableHead>
                    <TableHead className={cn(HEAD_CELL, "text-right")}>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientInvitations.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="text-text-primary">{inv.email}</TableCell>
                      <TableCell className="text-text-tertiary">
                        Expires {new Date(inv.expiresAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={inv.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            appearance="outline"
                            size="sm"
                            onClick={() => copyLink(inv.inviteLink)}
                          >
                            {copied === inv.inviteLink ? <Check /> : <Copy />}
                            {copied === inv.inviteLink ? "Copied!" : "Copy Link"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </TableRoot>
            </Card>
          )}

          {/* Clients List */}
          <Card className="overflow-hidden p-0">
            <DataToolbar>
              <CardTitle>Clients{clients.length > 0 && ` (${clients.length})`}</CardTitle>
            </DataToolbar>

            {!loading && clients.length === 0 ? (
              <EmptyState
                variant="plain"
                icon={UsersRound}
                title="No clients yet."
                description="Invite your first client above."
              />
            ) : (
              <TableRoot>
                <TableHeader>
                  <TableRow className={HEAD_ROW}>
                    <TableHead className={HEAD_CELL}>Client</TableHead>
                    <TableHead className={cn(HEAD_CELL, "text-right")}>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading
                    ? renderSkeletonRows(2, 2)
                    : clients.map((member) => {
                        const isExpanded = expandedMember === member.id;
                        const memberProfile = editingProfile[member.userId];
                        const savedProfile = profiles[member.userId];

                        return (
                          <Fragment key={member.id}>
                            <TableRow
                              className="cursor-pointer hover:bg-background-gray-secondary"
                              onClick={() => handleExpandMember(member.id, member.userId)}
                            >
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  {isExpanded ? (
                                    <ChevronDown className="size-4 shrink-0 text-icon-tertiary" />
                                  ) : (
                                    <ChevronRight className="size-4 shrink-0 text-icon-tertiary" />
                                  )}
                                  <Avatar name={member.user.name} size={32} />
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <p className="truncate text-sm font-medium text-text-primary">
                                        {member.user.name}
                                      </p>
                                      {member.labels && member.labels.length > 0 &&
                                        member.labels.map((l) => (
                                          <LabelBadge key={l.label.id} name={l.label.name} color={l.label.color} />
                                        ))
                                      }
                                    </div>
                                    <p className="truncate text-xs text-text-tertiary">
                                      {member.user.email}
                                      {savedProfile?.company && (
                                        <span> &middot; {savedProfile.company}</span>
                                      )}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div
                                  className="flex items-center justify-end gap-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {(currentRole === "owner" || currentRole === "admin") && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        handleViewAsClient(
                                          member.userId,
                                          member.user.name,
                                          member.user.email,
                                        )
                                      }
                                      title="View as customer"
                                      aria-label={`View portal as ${member.user.name}`}
                                    >
                                      <Eye />
                                    </Button>
                                  )}
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleResetPassword(member.id, member.user.email)}
                                    disabled={resettingMemberId === member.id}
                                    title="Send password reset link"
                                    aria-label={`Send password reset link to ${member.user.email}`}
                                  >
                                    <KeyRound />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="danger"
                                    appearance="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveMember(member.id, member.user.name, false)}
                                    title="Remove client"
                                    aria-label={`Remove client ${member.user.name}`}
                                  >
                                    <Trash2 />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>

                            {isExpanded && memberProfile && (
                              <TableRow className="bg-background-gray-secondary hover:bg-background-gray-secondary">
                                <TableCell colSpan={2} className="py-4">
                                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <Field label="Company">
                                      <Input
                                        type="text"
                                        value={memberProfile.company || ""}
                                        onChange={(e) =>
                                          setEditingProfile((prev) => ({
                                            ...prev,
                                            [member.userId]: { ...prev[member.userId], company: e.target.value },
                                          }))
                                        }
                                        className="h-9 py-0 text-sm"
                                      />
                                    </Field>
                                    <Field label="Phone">
                                      <Input
                                        type="text"
                                        value={memberProfile.phone || ""}
                                        onChange={(e) =>
                                          setEditingProfile((prev) => ({
                                            ...prev,
                                            [member.userId]: { ...prev[member.userId], phone: e.target.value },
                                          }))
                                        }
                                        className="h-9 py-0 text-sm"
                                      />
                                    </Field>
                                    <Field label="Address">
                                      <Input
                                        type="text"
                                        value={memberProfile.address || ""}
                                        onChange={(e) =>
                                          setEditingProfile((prev) => ({
                                            ...prev,
                                            [member.userId]: { ...prev[member.userId], address: e.target.value },
                                          }))
                                        }
                                        className="h-9 py-0 text-sm"
                                      />
                                    </Field>
                                    <Field label="Website">
                                      <Input
                                        type="text"
                                        value={memberProfile.website || ""}
                                        onChange={(e) =>
                                          setEditingProfile((prev) => ({
                                            ...prev,
                                            [member.userId]: { ...prev[member.userId], website: e.target.value },
                                          }))
                                        }
                                        className="h-9 py-0 text-sm"
                                      />
                                    </Field>
                                  </div>
                                  <Field label="Description" className="mt-3">
                                    <Textarea
                                      value={memberProfile.description || ""}
                                      onChange={(e) =>
                                        setEditingProfile((prev) => ({
                                          ...prev,
                                          [member.userId]: { ...prev[member.userId], description: e.target.value },
                                        }))
                                      }
                                      rows={2}
                                      className="resize-none py-2"
                                    />
                                  </Field>
                                  <div className="mt-4">
                                    <Button
                                      type="button"
                                      onClick={() => handleSaveProfile(member.userId)}
                                      disabled={savingProfile === member.userId}
                                    >
                                      {savingProfile === member.userId ? "Saving..." : "Save Profile"}
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </Fragment>
                        );
                      })}
                </TableBody>
              </TableRoot>
            )}
          </Card>
        </TabPanel>
      </Tabs>
    </div>
  );
}
