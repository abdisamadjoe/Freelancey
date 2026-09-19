"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { FolderKanban } from "lucide-react";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Field,
  Input,
  Textarea,
} from "@/components/ui";

interface StepFirstProjectProps {
  onNext: () => void;
  onBack: () => void;
}

export function StepFirstProject({ onNext, onBack }: StepFirstProjectProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Project name is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await apiFetch("/projects", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
        }),
      });
      onNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>Create Your First Project</CardTitle>
          <CardDescription>
            Projects are how you organize work for your clients. You can always
            create more later.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {error && <Alert status="error">{error}</Alert>}

        <div className="space-y-4 rounded-lg border-[0.5px] border-card-border bg-background-gray-secondary_alt_2 p-5">
          <div className="flex items-center gap-2">
            <FolderKanban className="size-4.5 text-icon-tertiary" aria-hidden />
            <span className="text-sm font-medium text-text-primary">
              New Project
            </span>
          </div>

          <Field label="Project Name" htmlFor="setup-project-name">
            <Input
              id="setup-project-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Website Redesign"
            />
          </Field>

          <Field
            label={
              <>
                Description{" "}
                <span className="font-normal text-text-tertiary">
                  (optional)
                </span>
              </>
            }
            htmlFor="setup-project-desc"
          >
            <Textarea
              id="setup-project-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the project scope..."
              rows={3}
              className="resize-none"
            />
          </Field>
        </div>
      </CardContent>

      <CardFooter className="justify-between">
        <Button appearance="outline" onClick={onBack}>
          Back
        </Button>
        <div className="flex items-center gap-3">
          <Button appearance="outline" onClick={onNext}>
            Skip
          </Button>
          <Button onClick={handleCreate} loading={saving}>
            {saving ? "Creating..." : "Create & Continue"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
