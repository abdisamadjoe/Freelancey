"use client";

import { ActionButton, FormGrid, Loading, Page, PageBody, PageHeader, Panel, TextAreaInput, TextInput, useConfirm } from "@/components/app/kit";
import { apiFetch } from "@/lib/api";
import { authClient } from "@/lib/auth/client";
import { useSession } from "@/lib/session";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface ClientProfile {
  company?: string;
  phone?: string;
  address?: string;
  website?: string;
  description?: string;
}

export default function PortalSettingsPage() {
  const session = useSession();
  const { confirm, dialog } = useConfirm();
  const [name, setName] = useState(session.user.name ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profile, setProfile] = useState<ClientProfile>({});
  const [profileLoading, setProfileLoading] = useState(true);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    apiFetch<ClientProfile>("/clients/me/profile")
      .then(setProfile)
      .catch(() => {})
      .finally(() => setProfileLoading(false));
  }, []);

  async function updateName(e: React.FormEvent) {
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

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiFetch("/clients/me/profile", { method: "PUT", body: JSON.stringify(profile) });
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    }
  }

  async function deleteAccount() {
    if (!deletePassword) {
      toast.error("Please enter your password");
      return;
    }
    const ok = await confirm({
      title: "Delete Account",
      message: "Are you sure you want to delete your account? This action cannot be undone.",
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
      setDeleting(false);
    }
  }

  return (
    <Page>
      <PageHeader title="Account Settings" />
      <PageBody>
        <Panel title="Profile">
          <form onSubmit={updateName} className="max-w-md space-y-4">
            <TextInput label="Name" required value={name} onChange={setName} />
            <ActionButton type="submit" variant="primary">
              Save
            </ActionButton>
          </form>
        </Panel>

        <Panel title="Your details" description="Shared with the team you work with.">
          {profileLoading ? (
            <Loading />
          ) : (
            <form onSubmit={saveProfile} className="space-y-4">
              <FormGrid>
                {(["company", "phone", "address", "website"] as const).map((k) => (
                  <TextInput key={k} label={k.charAt(0).toUpperCase() + k.slice(1)} value={profile[k] ?? ""} onChange={(v) => setProfile((p) => ({ ...p, [k]: v }))} />
                ))}
              </FormGrid>
              <TextAreaInput label="Description" rows={2} value={profile.description ?? ""} onChange={(v) => setProfile((p) => ({ ...p, description: v }))} />
              <ActionButton type="submit" variant="primary">
                Save details
              </ActionButton>
            </form>
          )}
        </Panel>

        <Panel title="Change Password">
          <form onSubmit={changePassword} className="max-w-md space-y-4">
            <TextInput label="Current Password" type="password" required value={currentPassword} onChange={setCurrentPassword} />
            <TextInput label="New Password" type="password" required value={newPassword} onChange={setNewPassword} />
            <TextInput label="Confirm New Password" type="password" required value={confirmPassword} onChange={setConfirmPassword} />
            <ActionButton type="submit" variant="primary">
              Change Password
            </ActionButton>
          </form>
        </Panel>

        <Panel title="Delete Account" description="Permanently remove your account.">
          <div className="max-w-md space-y-4">
            <TextInput label="Confirm with your password" type="password" value={deletePassword} onChange={setDeletePassword} />
            <ActionButton variant="danger" loading={deleting} onPress={deleteAccount}>
              Delete Account
            </ActionButton>
          </div>
        </Panel>
      </PageBody>
      {dialog}
    </Page>
  );
}
