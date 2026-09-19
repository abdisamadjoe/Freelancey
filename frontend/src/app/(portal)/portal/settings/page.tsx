"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth/client";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/toast";
import { useConfirm } from "@/components/confirm-modal";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Field,
  Input,
  PageHeader,
  Skeleton,
  Textarea,
} from "@/components/ui";

interface ClientProfile {
  company?: string;
  phone?: string;
  address?: string;
  website?: string;
  description?: string;
}

export default function PortalSettingsPage() {
  const { data: session } = authClient.useSession();
  const { success, error: showError } = useToast();
  const confirm = useConfirm();
  const [name, setName] = useState("");

  useEffect(() => {
    if (session?.user.name) setName(session.user.name);
  }, [session?.user.name]);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Profile fields
  const [profile, setProfile] = useState<ClientProfile>({});
  const [profileLoading, setProfileLoading] = useState(true);

  // Delete account
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    apiFetch<ClientProfile>("/clients/me/profile")
      .then((p) => {
        setProfile(p);
        setProfileLoading(false);
      })
      .catch(() => setProfileLoading(false));
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await authClient.updateUser({ name });
      if (error) throw new Error(error.message || "Failed to update profile");
      success("Profile updated");
    } catch (err) {
      showError(
        err instanceof Error ? err.message : "Failed to update profile",
      );
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
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
      showError(
        err instanceof Error ? err.message : "Failed to change password",
      );
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      showError("Please enter your password");
      return;
    }
    const confirmed = await confirm({
      title: "Delete Account",
      message:
        "Are you sure you want to delete your account? This action cannot be undone.",
      confirmLabel: "Delete Account",
      variant: "danger",
    });
    if (!confirmed) {
      return;
    }
    setDeleteLoading(true);
    try {
      await apiFetch("/account", {
        method: "DELETE",
        body: JSON.stringify({ password: deletePassword }),
      });
      window.location.href = "/login";
    } catch (err) {
      showError(
        err instanceof Error ? err.message : "Failed to delete account",
      );
      setDeleteLoading(false);
    }
  };

  const handleUpdateClientProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch("/clients/me/profile", {
        method: "PUT",
        body: JSON.stringify(profile),
      });
      success("Profile updated");
    } catch (err) {
      showError(
        err instanceof Error ? err.message : "Failed to update profile",
      );
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Account Settings" />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <Field label="Name" htmlFor="portal-settings-name">
                <Input
                  id="portal-settings-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </Field>
              <Button type="submit">Save</Button>
            </form>
          </CardContent>
        </Card>

        {/* Change Password Section */}
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <Field label="Current Password" htmlFor="portal-settings-current-password">
                <Input
                  id="portal-settings-current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </Field>
              <Field label="New Password" htmlFor="portal-settings-new-password">
                <Input
                  id="portal-settings-new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </Field>
              <Field label="Confirm New Password" htmlFor="portal-settings-confirm-password">
                <Input
                  id="portal-settings-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </Field>
              <Button type="submit">Change Password</Button>
            </form>
          </CardContent>
        </Card>

        {/* Client Profile Section */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Your Profile</CardTitle>
          </CardHeader>
          <CardContent>
            {profileLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="space-y-2">
                    <Skeleton className="h-2.5 w-24" />
                    <Skeleton className="h-10 w-full rounded-lg" />
                  </div>
                ))}
              </div>
            ) : (
              <form
                onSubmit={handleUpdateClientProfile}
                className="grid grid-cols-1 gap-4 sm:grid-cols-2"
              >
                <Field label="Company" htmlFor="portal-settings-company">
                  <Input
                    id="portal-settings-company"
                    type="text"
                    value={profile.company || ""}
                    onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                  />
                </Field>
                <Field label="Phone" htmlFor="portal-settings-phone">
                  <Input
                    id="portal-settings-phone"
                    type="text"
                    value={profile.phone || ""}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  />
                </Field>
                <Field label="Address" htmlFor="portal-settings-address">
                  <Input
                    id="portal-settings-address"
                    type="text"
                    value={profile.address || ""}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  />
                </Field>
                <Field label="Website" htmlFor="portal-settings-website">
                  <Input
                    id="portal-settings-website"
                    type="text"
                    value={profile.website || ""}
                    onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                  />
                </Field>
                <Field
                  label="Description"
                  htmlFor="portal-settings-description"
                  className="sm:col-span-2"
                >
                  <Textarea
                    id="portal-settings-description"
                    value={profile.description || ""}
                    onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                    rows={3}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Button type="submit">Save Profile</Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Account Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-button-error-outline-text">Delete Account</CardTitle>
        </CardHeader>
        <CardContent className="max-w-md space-y-4">
          <p className="text-sm leading-5 text-text-tertiary">
            Permanently delete your account and remove your access to all projects. This cannot be undone.
          </p>
          <Field label="Confirm your password" htmlFor="portal-settings-delete-password">
            <Input
              id="portal-settings-delete-password"
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Your current password"
            />
          </Field>
          <Button
            variant="danger"
            onClick={handleDeleteAccount}
            disabled={!deletePassword || deleteLoading}
          >
            {deleteLoading ? "Deleting..." : "Delete Account"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
