"use client";

import {
  ActionButton,
  AppTabs,
  type Column,
  DataTable,
  fmtDate,
  FormGrid,
  LabelChip,
  Modal,
  Notice,
  Page,
  PageBody,
  PageHeader,
  Panel,
  SelectInput,
  StatusPill,
  TextAreaInput,
  TextInput,
  useConfirm,
} from "@/components/app/kit";
import { Avatar, AvatarFallback } from "@/components/tailgrids/core/avatar";
import { Badge } from "@/components/tailgrids/core/badge";
import { Button } from "@/components/tailgrids/core/button";
import { apiFetch } from "@/lib/api";
import { useAppConfig } from "@/lib/app-config";
import type { BadgeColor } from "@/lib/badge-color";
import { downloadCsv } from "@/lib/download";
import { startPreview } from "@/lib/preview-mode";
import { useSession } from "@/lib/session";
import { track } from "@/lib/track";
import { Fragment, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

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

const roleColor = (role: string): BadgeColor => (role === "owner" ? "violet" : role === "admin" ? "blue" : "gray");

function Person({ name, email, extra }: { name: string; email: string; extra?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar size="sm">
        <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-text-primary">{name}</p>
        <p className="truncate text-xs text-text-tertiary">
          {email}
          {extra}
        </p>
      </div>
    </div>
  );
}

export default function PeoplePage() {
  const config = useAppConfig();
  const { confirm, dialog } = useConfirm();
  const session = useSession();
  const currentUserId = session.user.id;
  const currentRole = session.member.role;
  const isOwner = currentRole === "owner";

  const [planLimits, setPlanLimits] = useState<{ maxMembers: number; membersUsed: number; maxClients: number; clientsUsed: number } | null>(null);
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [copied, setCopied] = useState("");

  const [teamEmail, setTeamEmail] = useState("");
  const [teamInviteRole, setTeamInviteRole] = useState("admin");
  const [teamError, setTeamError] = useState("");
  const [teamInviteLink, setTeamInviteLink] = useState("");
  const [teamInviting, setTeamInviting] = useState(false);

  const [clientEmail, setClientEmail] = useState("");
  const [clientError, setClientError] = useState("");
  const [clientInviteLink, setClientInviteLink] = useState("");
  const [clientInviting, setClientInviting] = useState(false);

  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Record<string, ClientProfile>>({});
  const [editingProfile, setEditingProfile] = useState<Record<string, ClientProfile>>({});
  const [savingProfile, setSavingProfile] = useState<string | null>(null);
  const [resetResult, setResetResult] = useState<{ email: string; emailSent: boolean } | null>(null);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: MemberRecord[] }>("/clients?page=1&limit=100");
      setMembers(res.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load people");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadInvitations = useCallback(() => {
    apiFetch<Invitation[]>("/clients/invitations").then(setInvitations).catch(() => {});
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
      danger: true,
    });
    if (!ok) return;
    try {
      await apiFetch(`/clients/${memberId}`, { method: "DELETE" });
      toast.success(`${memberName} removed`);
      loadMembers();
      setPlanLimits((prev) =>
        prev
          ? isTeam
            ? { ...prev, membersUsed: Math.max(0, prev.membersUsed - 1) }
            : { ...prev, clientsUsed: Math.max(0, prev.clientsUsed - 1) }
          : prev,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove");
    }
  };

  const handleResetPassword = async (memberId: string, email: string) => {
    const ok = await confirm({ title: "Send Password Reset Email", message: `Send a password reset email to ${email}?`, confirmLabel: "Send Email" });
    if (!ok) return;
    try {
      const res = await apiFetch<{ email: string; emailSent: boolean }>(`/clients/${memberId}/reset-password`, { method: "POST" });
      setResetResult(res);
      toast.success(res.emailSent ? `Reset email sent to ${res.email}` : `Could not send reset email to ${res.email}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send reset email");
    }
  };

  const handleSetRate = async (memberId: string, rawValue: string) => {
    const trimmed = rawValue.trim();
    let cents: number | null = null;
    if (trimmed !== "") {
      const dollars = Number(trimmed);
      if (!Number.isFinite(dollars) || dollars < 0) {
        toast.error("Enter a valid non-negative rate");
        return;
      }
      cents = Math.round(dollars * 100);
    }
    try {
      await apiFetch(`/clients/${memberId}/rate`, { method: "PUT", body: JSON.stringify({ hourlyRateCents: cents }) });
      toast.success("Rate updated");
      setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, hourlyRateCents: cents } : m)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update rate");
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      await apiFetch(`/clients/${memberId}/role`, { method: "PUT", body: JSON.stringify({ role: newRole }) });
      toast.success("Role updated");
      loadMembers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to change role");
    }
  };

  async function invite(kind: "team" | "client") {
    const email = kind === "team" ? teamEmail : clientEmail;
    const role = kind === "team" ? teamInviteRole : "member";
    const setErr = kind === "team" ? setTeamError : setClientError;
    const setLink = kind === "team" ? setTeamInviteLink : setClientInviteLink;
    const setBusy = kind === "team" ? setTeamInviting : setClientInviting;
    setErr("");
    setLink("");
    setBusy(true);
    try {
      await apiFetch("/clients/invitations", { method: "POST", body: JSON.stringify({ email, role }) });
      if (kind === "team") track("team_member_invited", { role });
      else track("client_invited");
      if (kind === "team") setTeamEmail("");
      else setClientEmail("");
      toast.success("Invitation sent");
      setPlanLimits((prev) =>
        prev ? (kind === "team" ? { ...prev, membersUsed: prev.membersUsed + 1 } : { ...prev, clientsUsed: prev.clientsUsed + 1 }) : prev,
      );
      const updated = await apiFetch<Invitation[]>("/clients/invitations");
      setInvitations(updated);
      const lower = email.toLowerCase();
      const newest = [...updated]
        .filter((inv) => inv.email.toLowerCase() === lower && (kind === "team" ? inv.role !== "member" : true))
        .sort((a, b) => new Date(b.expiresAt).getTime() - new Date(a.expiresAt).getTime())[0];
      if (newest) setLink(newest.inviteLink);
    } catch (err) {
      setErr(err instanceof Error ? err.message : "Failed to send invite");
    } finally {
      setBusy(false);
    }
  }

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
      await apiFetch(`/clients/${userId}/profile`, { method: "PUT", body: JSON.stringify(editingProfile[userId] || {}) });
      setProfiles((prev) => ({ ...prev, [userId]: { ...editingProfile[userId] } }));
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSavingProfile(null);
    }
  };

  const team = members.filter((m) => m.role !== "member");
  const clients = members.filter((m) => m.role === "member");
  const teamInvitations = invitations.filter((inv) => inv.role !== "member");
  const clientInvitations = invitations.filter((inv) => inv.role === "member");

  const invitationColumns = (withRole: boolean): Column<Invitation>[] => [
    { key: "email", header: "Email", cell: (inv) => inv.email },
    withRole
      ? { key: "role", header: "Role", cell: (inv) => <Badge color={roleColor(inv.role)}>{inv.role}</Badge> }
      : { key: "expires", header: "Expires", cell: (inv) => `Expires ${fmtDate(inv.expiresAt)}` },
    { key: "status", header: "Status", cell: (inv) => <StatusPill status={inv.status} /> },
    {
      key: "action",
      header: "Action",
      className: "text-right",
      cell: (inv) => (
        <Button size="sm" appearance="outline" variant="primary" onPress={() => copyLink(inv.inviteLink)}>
          {copied === inv.inviteLink ? "Copied!" : "Copy Link"}
        </Button>
      ),
    },
  ];

  const teamColumns: Column<MemberRecord>[] = [
    {
      key: "member",
      header: "Member",
      cell: (m) => <Person name={m.user.name} email={m.user.email} extra={m.userId === currentUserId ? " (you)" : undefined} />,
    },
    ...(isOwner
      ? [
          {
            key: "rate",
            header: "Hourly rate",
            cell: (m: MemberRecord) => (
              <div className="flex items-center gap-1 text-xs text-text-tertiary">
                <span>$</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  placeholder="Rate"
                  defaultValue={m.hourlyRateCents != null ? (m.hourlyRateCents / 100).toString() : ""}
                  onBlur={(e) => {
                    const current = m.hourlyRateCents != null ? (m.hourlyRateCents / 100).toString() : "";
                    if (e.target.value.trim() === current) return;
                    handleSetRate(m.id, e.target.value);
                  }}
                  aria-label={`Default hourly rate for ${m.user.name}`}
                  className="h-8 w-20 rounded-lg border border-card-border bg-input-background px-2 text-right text-xs text-title-50 outline-none focus:border-input-primary-focus-border"
                />
                <span>/hr</span>
              </div>
            ),
          },
        ]
      : []),
    {
      key: "role",
      header: "Role",
      cell: (m) =>
        isOwner && m.userId !== currentUserId ? (
          <div className="w-32">
            <SelectInput
              value={m.role}
              onChange={(v) => handleRoleChange(m.id, v)}
              options={[
                { value: "owner", label: "owner" },
                { value: "admin", label: "admin" },
              ]}
            />
          </div>
        ) : (
          <Badge color={roleColor(m.role)}>{m.role}</Badge>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      cell: (m) => {
        const isSelf = m.userId === currentUserId;
        const canReset = !isSelf && (isOwner || (currentRole === "admin" && m.role !== "owner"));
        return (
          <div className="flex items-center justify-end gap-1">
            {canReset && (
              <Button size="sm" variant="ghost" onPress={() => handleResetPassword(m.id, m.user.email)}>
                Reset password
              </Button>
            )}
            {isOwner && !isSelf && (
              <Button size="sm" variant="danger" appearance="ghost" onPress={() => handleRemoveMember(m.id, m.user.name, true)}>
                Remove
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const inviteForm = (kind: "team" | "client") => {
    const isTeam = kind === "team";
    const limitReached = isTeam ? atMemberLimit : atClientLimit;
    const email = isTeam ? teamEmail : clientEmail;
    const link = isTeam ? teamInviteLink : clientInviteLink;
    const err = isTeam ? teamError : clientError;
    return (
      <Panel
        title={isTeam ? "Invite a Team Member" : "Invite a Client"}
        action={
          planLimits &&
          (isTeam ? planLimits.maxMembers : planLimits.maxClients) !== -1 && (
            <Badge color={limitReached ? "rose" : "gray"}>
              {isTeam ? `${planLimits.membersUsed}/${planLimits.maxMembers} members` : `${planLimits.clientsUsed}/${planLimits.maxClients} clients`}
            </Badge>
          )
        }
      >
        <div className="space-y-3">
          {limitReached ? (
            <Notice status="warning">
              {isTeam ? "Team member limit reached. Upgrade to Pro for up to 5 team members, or Lifetime for 100." : "Client limit reached. Upgrade to Pro for unlimited clients."}{" "}
              <a className="font-medium underline" href="/dashboard/settings/billing">
                Upgrade
              </a>
            </Notice>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                invite(kind);
              }}
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
            >
              <div className="sm:flex-1">
                <TextInput
                  type="email"
                  required
                  value={email}
                  onChange={isTeam ? setTeamEmail : setClientEmail}
                  placeholder={isTeam ? "team@example.com" : "client@example.com"}
                />
              </div>
              {isTeam && (
                <div className="sm:w-40">
                  <SelectInput
                    value={teamInviteRole}
                    onChange={setTeamInviteRole}
                    options={[{ value: "admin", label: "Admin" }, ...(isOwner ? [{ value: "owner", label: "Owner" }] : [])]}
                  />
                </div>
              )}
              <ActionButton type="submit" variant="primary" loading={isTeam ? teamInviting : clientInviting}>
                {(isTeam ? teamInviting : clientInviting) ? "Inviting..." : "Invite"}
              </ActionButton>
            </form>
          )}
          {err && <Notice status="error">{err}</Notice>}
          {link && (
            <Notice status="success">
              Invitation created! Share this link: <code className="text-xs break-all">{link}</code>{" "}
              <button type="button" className="font-medium underline" onClick={() => copyLink(link)}>
                {copied === link ? "Copied!" : "Copy"}
              </button>
            </Notice>
          )}
        </div>
      </Panel>
    );
  };

  const clientsTab = (
    <>
      {inviteForm("client")}
      {clientInvitations.length > 0 && (
        <DataTable columns={invitationColumns(false)} rows={clientInvitations} rowKey={(i) => i.id} />
      )}
      <Panel flush title={`Clients${clients.length > 0 ? ` (${clients.length})` : ""}`}>
        {!loading && clients.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-text-tertiary">No clients yet. Invite your first client above.</p>
        ) : (
          <ul className="divide-y divide-card-border border-t border-card-border">
            {clients.map((m) => {
              const isExpanded = expandedMember === m.id;
              const profile = editingProfile[m.userId];
              const saved = profiles[m.userId];
              return (
                <Fragment key={m.id}>
                  <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                    <button type="button" className="min-w-0 flex-1 text-left" onClick={() => handleExpandMember(m.id, m.userId)}>
                      <div className="flex flex-wrap items-center gap-2">
                        <Person
                          name={m.user.name}
                          email={m.user.email}
                          extra={saved?.company ? ` · ${saved.company}` : undefined}
                        />
                        {m.labels?.map((l) => (
                          <LabelChip key={l.label.id} name={l.label.name} color={l.label.color} />
                        ))}
                      </div>
                    </button>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onPress={() => {
                          track("client_viewed_as");
                          startPreview(m.userId, m.user.name, m.user.email);
                        }}
                      >
                        View as client
                      </Button>
                      <Button size="sm" variant="ghost" onPress={() => handleResetPassword(m.id, m.user.email)}>
                        Reset password
                      </Button>
                      <Button size="sm" variant="danger" appearance="ghost" onPress={() => handleRemoveMember(m.id, m.user.name, false)}>
                        Remove
                      </Button>
                    </div>
                  </li>
                  {isExpanded && profile && (
                    <li className="bg-background-gray-secondary px-5 py-4">
                      <FormGrid>
                        {(["company", "phone", "address", "website"] as const).map((key) => (
                          <TextInput
                            key={key}
                            label={key.charAt(0).toUpperCase() + key.slice(1)}
                            value={profile[key] || ""}
                            onChange={(v) => setEditingProfile((prev) => ({ ...prev, [m.userId]: { ...prev[m.userId], [key]: v } }))}
                          />
                        ))}
                      </FormGrid>
                      <div className="mt-3">
                        <TextAreaInput
                          label="Description"
                          rows={2}
                          value={profile.description || ""}
                          onChange={(v) => setEditingProfile((prev) => ({ ...prev, [m.userId]: { ...prev[m.userId], description: v } }))}
                        />
                      </div>
                      <div className="mt-4">
                        <ActionButton variant="primary" loading={savingProfile === m.userId} onPress={() => handleSaveProfile(m.userId)}>
                          {savingProfile === m.userId ? "Saving..." : "Save Profile"}
                        </ActionButton>
                      </div>
                    </li>
                  )}
                </Fragment>
              );
            })}
          </ul>
        )}
      </Panel>
    </>
  );

  const teamTab = (
    <>
      {!isOwner && currentRole === "admin" && <Notice status="info">Only the organization owner can invite or manage team members.</Notice>}
      {isOwner && inviteForm("team")}
      {teamInvitations.length > 0 && <DataTable columns={invitationColumns(true)} rows={teamInvitations} rowKey={(i) => i.id} />}
      <DataTable
        columns={teamColumns}
        rows={team}
        rowKey={(m) => m.id}
        loading={loading}
        empty="Just you for now. Invite team members above."
      />
    </>
  );

  return (
    <Page>
      <PageHeader
        title="People"
        description="Manage your team and clients."
        actions={
          <Button size="md" appearance="outline" variant="primary" onPress={() => downloadCsv("/clients/export")}>
            Export
          </Button>
        }
      />
      <PageBody>
        <AppTabs
          tabs={[
            { value: "team", label: "Team", badge: team.length || undefined, content: teamTab },
            { value: "clients", label: "Clients", badge: clients.length || undefined, content: clientsTab },
          ]}
        />
      </PageBody>

      <Modal
        open={!!resetResult}
        onClose={() => setResetResult(null)}
        title="Password reset email"
        description={resetResult ? `For ${resetResult.email}` : undefined}
        footer={
          <Button appearance="outline" variant="primary" onPress={() => setResetResult(null)}>
            Done
          </Button>
        }
      >
        {resetResult && (
          <Notice status={resetResult.emailSent ? "success" : "warning"}>
            {resetResult.emailSent
              ? `A password reset email was sent to ${resetResult.email}.`
              : `Could not send a reset email to ${resetResult.email}. Ask them to use "Forgot password" on the sign-in page instead.`}
          </Notice>
        )}
      </Modal>
      {dialog}
    </Page>
  );
}
