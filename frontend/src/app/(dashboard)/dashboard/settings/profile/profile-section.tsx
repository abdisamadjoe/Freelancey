"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth/client";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/toast";
import { useConfirm } from "@/components/confirm-modal";
import { Alert, Button, Card, CardContent, CardHeader, Field, Input, SectionHeading } from "@/components/ui";
import type { DeletionInfo } from "@/shared";

export function ProfileSection(): React.ReactElement {
  const { data: session } = authClient.useSession();
  const { success, error: showError } = useToast();
  const confirm = useConfirm();
  const [name, setName] = useState<string>("");

  useEffect(() => {
    if (session?.user.name) setName(session.user.name);
  }, [session?.user.name]);

  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [deleting, setDeleting] = useState<boolean>(false);
  const [deletePassword, setDeletePassword] = useState<string>("");
  const [deletionInfo, setDeletionInfo] = useState<DeletionInfo | null>(null);

  useEffect(() => {
    apiFetch<DeletionInfo>("/account/deletion-info")
      .then(setDeletionInfo)
      .catch((err) => console.error(err));
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    try {
      const { error } = await authClient.updateUser({ name });
      if (error) throw new Error(error.message || "Failed to update profile");
      success("Profile updated");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to update profile");
    }
  };

  const handleChangePassword = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (newPassword.length < 8) {
      showError("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      showError("Passwords do not match");
      return;
    }
    try {
      const { error } = await authClient.changePassword({ currentPassword, newPassword });
      if (error) {
        throw new Error(error.message || "Failed to change password");
      }
      success("Password changed");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to change password");
    }
  };

  const handleDeleteAccount = async (): Promise<void> => {
    if (!deletePassword) {
      showError("Enter your password to confirm account deletion.");
      return;
    }

    const orgsToDelete = deletionInfo?.ownedOrganizations.filter((o) => o.isSoleOwner) || [];
    const orgName = orgsToDelete[0]?.name;

    const message = orgName
      ? `This will permanently delete your account and your organization "${orgName}" including all its projects, files, invoices, and client access. This action cannot be undone.`
      : "This will permanently delete your account and all associated data. This action cannot be undone.";

    const confirmText = orgName ? `DELETE ${orgName}` : "DELETE";

    const confirmed = await confirm({
      title: "Delete Account",
      message,
      confirmLabel: "Delete Account",
      confirmText,
      variant: "danger",
    });
    if (!confirmed) return;

    setDeleting(true);
    try {
      await apiFetch("/account", {
        method: "DELETE",
        body: JSON.stringify({ password: deletePassword }),
      });
      window.location.href = "/login";
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to delete account");
      setDeletePassword("");
    } finally {
      setDeleting(false);
    }
  };

  const isOwner = deletionInfo !== null && deletionInfo.ownedOrganizations.length > 0;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <SectionHeading title="Profile" className="flex-1" />
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="flex max-w-md flex-col gap-4">
            <Field label="Name" htmlFor="account-profile-name" required>
              <Input
                id="account-profile-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Field>
            <div>
              <Button type="submit" variant="primary">
                Save
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <SectionHeading title="Change Password" className="flex-1" />
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="flex max-w-md flex-col gap-4">
            <Field label="Current Password" htmlFor="account-current-password" required>
              <Input
                id="account-current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </Field>
            <Field label="New Password" htmlFor="account-new-password" required>
              <Input
                id="account-new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
            </Field>
            <Field label="Confirm New Password" htmlFor="account-confirm-password" required>
              <Input
                id="account-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </Field>
            <div>
              <Button type="submit" variant="primary">
                Change Password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-alert-danger-border">
        <CardHeader>
          <SectionHeading title="Danger Zone" className="flex-1" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert status="error">
            {isOwner
              ? "Permanently delete your account and your organization. All projects, files, invoices, and client access will be removed."
              : "Permanently delete your account. You will be removed from this organization and lose access to all projects."}
          </Alert>

          <div className="max-w-md">
            <Field label="Enter your password to confirm" htmlFor="account-delete-password">
              <Input
                id="account-delete-password"
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Your current password"
              />
            </Field>
          </div>

          <Button
            type="button"
            variant="danger"
            onClick={handleDeleteAccount}
            disabled={deleting || !deletePassword}
            loading={deleting}
          >
            {deleting ? "Deleting..." : "Delete Account"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
