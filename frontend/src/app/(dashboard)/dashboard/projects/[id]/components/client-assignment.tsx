"use client";

import { useEffect, useState, useRef } from "react";
import { Eye, Users, X } from "lucide-react";
import { Tooltip } from "@/components/tooltip";
import { Avatar, Card, CardContent, CardHeader, CardTitle, Checkbox, EmptyState } from "@/components/ui";
import { cn } from "@/lib/utils";

interface ClientMember {
  id: string;
  userId: string;
  role: string;
  user: { id: string; name: string; email: string };
}

/**
 * Multi-select of the clients assigned to a project. Behaviour (search,
 * toggle, remove, preview handler and outside-click close) is unchanged.
 */
export function ClientAssignment({
  clients,
  assignedIds,
  onToggle,
  onRemove,
  onPreview,
  disabled,
}: {
  clients: ClientMember[];
  assignedIds: Set<string>;
  onToggle: (userId: string) => void;
  onRemove: (userId: string) => void;
  onPreview?: (
    userId: string,
    clientName: string,
    clientEmail: string,
  ) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const query = search.toLowerCase();
  const filtered = clients.filter(
    (c) =>
      c.user.name.toLowerCase().includes(query) ||
      c.user.email.toLowerCase().includes(query),
  );

  const assignedClients = clients.filter((c) => assignedIds.has(c.userId));

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Clients{assignedIds.size > 0 && ` (${assignedIds.size})`}
        </CardTitle>
      </CardHeader>

      <CardContent>
        {clients.length > 0 ? (
          <div ref={containerRef} className="relative">
            <div
              className={cn(
                "flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border border-card-border bg-input-background px-2.5 py-1.5 transition",
                disabled ? "opacity-60" : "cursor-text focus-within:border-input-primary-focus-border",
              )}
              onClick={() => {
                if (disabled) return;
                setOpen(true);
                inputRef.current?.focus();
              }}
            >
              {assignedClients.map((c) => {
                const canRemove = !disabled;
                const canPreview = !!onPreview;
                const hasActions = canRemove || canPreview;
                return (
                  <span
                    key={c.userId}
                    className="inline-flex items-center gap-1.5 rounded-full bg-background-gray-secondary_alt py-0.5 pr-1 pl-0.5 text-xs font-medium text-text-secondary"
                  >
                    <Avatar name={c.user.name} size={18} />
                    <span className="truncate">{c.user.name}</span>
                    {hasActions && (
                      <span className="inline-flex items-center gap-0.5 border-l border-card-border pl-1.5">
                        {canPreview && (
                          <Tooltip label="View as customer">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onPreview!(c.userId, c.user.name, c.user.email);
                              }}
                              className="inline-flex items-center justify-center rounded p-1 text-icon-tertiary transition-colors hover:bg-card-background hover:text-neutral-brand-color"
                              aria-label={`View portal as ${c.user.name}`}
                            >
                              <Eye size={14} />
                            </button>
                          </Tooltip>
                        )}
                        {canRemove && (
                          <Tooltip label="Remove from project">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemove(c.userId);
                              }}
                              className="inline-flex items-center justify-center rounded p-1 text-icon-tertiary transition-colors hover:bg-card-background hover:text-button-error-outline-text"
                              aria-label={`Remove ${c.user.name} from project`}
                            >
                              <X size={14} />
                            </button>
                          </Tooltip>
                        )}
                      </span>
                    )}
                  </span>
                );
              })}
              {!disabled && (
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => setOpen(true)}
                  placeholder={assignedClients.length === 0 ? "Search clients..." : ""}
                  className="min-w-[100px] flex-1 bg-transparent text-xs text-text-primary outline-none placeholder:text-input-placeholder-text"
                />
              )}
            </div>

            {open && !disabled && (
              <div className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-card-border bg-dropdowns-background p-1.5 shadow-md">
                {filtered.length === 0 ? (
                  <p className="px-2.5 py-2 text-sm text-text-tertiary">No clients found.</p>
                ) : (
                  filtered.map((c) => {
                    const selected = assignedIds.has(c.userId);
                    return (
                      <div
                        key={c.userId}
                        role="button"
                        tabIndex={0}
                        aria-pressed={selected}
                        onClick={() => {
                          onToggle(c.userId);
                          setSearch("");
                          inputRef.current?.focus();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onToggle(c.userId);
                            setSearch("");
                            inputRef.current?.focus();
                          }
                        }}
                        className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-background-gray-secondary_alt focus-visible:ring-4 focus-visible:ring-button-outline-focus-ring focus-visible:outline-none"
                      >
                        <Checkbox
                          checked={selected}
                          readOnly
                          tabIndex={-1}
                          aria-hidden
                          className="pointer-events-none"
                        />
                        <Avatar name={c.user.name} size={24} />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-text-primary">
                            {c.user.name}
                          </span>
                          <span className="block truncate text-xs text-text-tertiary">
                            {c.user.email}
                          </span>
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        ) : (
          <EmptyState
            variant="plain"
            icon={<Users className="size-5" aria-hidden />}
            title="No clients yet."
            description={
              <>
                Invite clients from the{" "}
                <a href="/dashboard/clients" className="text-neutral-brand-color hover:underline">
                  Clients page
                </a>
                .
              </>
            }
            className="px-4 py-8"
          />
        )}

        {assignedIds.size > 0 && (
          <p className="mt-3 text-xs text-text-tertiary">
            {assignedIds.size === 1
              ? "This client will"
              : "These clients will"}{" "}
            see this project in their portal.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
