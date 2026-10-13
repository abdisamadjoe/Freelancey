"use client";

import { ActionButton, Panel, TextInput, useConfirm } from "@/components/app/kit";
import { apiFetch } from "@/lib/api";
import { authClient } from "@/lib/auth/client";
import { useSession } from "@/lib/session";
import type { DeletionInfo } from "@/shared";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function ProfileSection() {
  const session = useSession();
  const { confirm, dialog } = useConfirm();
  const [name, setName] = useState(session.user.name ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deletionInfo, setDeletionInfo] = useState<DeletionInfo | null>(null);

  useEffect(() => {
    apiFetch<DeletionInfo>("/account/deletion-info").then(setDeletionInfo).catch(() => {});
  }, []);

  async function updateProfile(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { error } = await authClient.updateUser({ name });
      if (error) throw new Error(error.message || "Failed to update profile");
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    try {
      const { error } = await authClient.changePassword({ currentPassword, newPassword });
      if (error) throw new Error(error.message || "Failed to change password");
      toast.success("Password changed");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to change password");
    }
  }

  async function deleteAccount() {
    if (!deletePassword) {
      toast.error("Enter your password to confirm account deletion.");
      return;
    }
    const orgsToDelete = deletionInfo?.ownedOrganizations.filter((o) => o.isSoleOwner) || [];
    const orgName = orgsToDelete[0]?.name;
    const ok = await confirm({
      title: "Delete Account",
      message: orgName
        ? `This will permanently delete your account and your organization "${orgName}" including all its projects, files, invoices, and client access. This action cannot be undone.`
        : "This will permanently delete your account and all associated data. This action cannot be undone.",
      confirmLabel: "Delete Account",
      danger: true,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await apiFetch("/account", { method: "DELETE", body: JSON.stringify({ password: deletePassword }) });
      window.location.href = "/login";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete account");
      setDeletePassword("");
    } finally {
      setDeleting(false);
    }
  }

  const orgToDelete = deletionInfo?.ownedOrganizations.find((o) => o.isSoleOwner);

  return (
    <>
      <Panel title="Profile">
        <form onSubmit={updateProfile} className="max-w-md space-y-4">
          <TextInput label="Name" required value={name} onChange={setName} />
          <TextInput label="Email" value={session.user.email} onChange={() => {}} disabled />
          <ActionButton type="submit" variant="primary">
            Save
          </ActionButton>
        </form>
      </Panel>

      <Panel title="Change Password">
        <form onSubmit={changePassword} className="max-w-md space-y-4">
          <TextInput label="Current Password" type="password" required value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" />
          <TextInput label="New Password" type="password" required value={newPassword} onChange={setNewPassword} autoComplete="new-password" />
          <TextInput label="Confirm New Password" type="password" required value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />
          <ActionButton type="submit" variant="primary">
            Change Password
          </ActionButton>
        </form>
      </Panel>

      <Panel title="Delete Account" description="Permanently remove your account and its data.">
        <div className="max-w-md space-y-4">
          {orgToDelete && (
            <p className="text-sm text-text-secondary">
              You are the only owner of <span className="font-medium text-text-primary">{orgToDelete.name}</span>. Deleting your account also
              deletes this organization and everything in it.
            </p>
          )}
          <TextInput label="Confirm with your password" type="password" value={deletePassword} onChange={setDeletePassword} autoComplete="current-password" />
          <ActionButton variant="danger" loading={deleting} onPress={deleteAccount}>
            Delete Account
          </ActionButton>
        </div>
      </Panel>
      {dialog}
    </>
  );
}
