"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Role } from "@prisma/client";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

/** Client-safe role labels (rbac.ts pulls server-only deps, so mirror here). */
const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Chief Engineer",
  MANAGER: "Executive Engineer",
  OFFICER: "Assistant Engineer",
};

type Division = { id: string; name: string };

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  divisionId: string | null;
  divisionName: string | null;
};

const ROLES: Role[] = ["ADMIN", "MANAGER", "OFFICER"];

export function UsersManager({
  initialUsers,
  divisions,
  currentUserId,
}: {
  initialUsers: UserRow[];
  divisions: Division[];
  currentUserId: string;
}) {
  const router = useRouter();
  const toast = useToast();

  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  async function patchUser(id: string, body: Record<string, unknown>) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(
          res.status === 403
            ? "You don't have permission"
            : json?.error?.message ?? "Update failed"
        );
        return false;
      }
      const updated = json.data as {
        id: string;
        role: Role;
        isActive: boolean;
        divisionId: string | null;
        division: { id: string; name: string } | null;
      };
      setUsers((prev) =>
        prev.map((u) =>
          u.id === id
            ? {
                ...u,
                role: updated.role,
                isActive: updated.isActive,
                divisionId: updated.divisionId,
                divisionName: updated.division?.name ?? null,
              }
            : u
        )
      );
      return true;
    } catch {
      toast.error("Network error, please try again.");
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function onRoleChange(u: UserRow, role: Role) {
    // Switching to a division role without a division would 400 on the server;
    // pick the first division as a sensible default so the change succeeds.
    const body: Record<string, unknown> = { role };
    if (role !== "ADMIN" && !u.divisionId) {
      if (divisions.length === 0) {
        toast.error("Create a division first");
        return;
      }
      body.divisionId = divisions[0].id;
    }
    const okd = await patchUser(u.id, body);
    if (okd) toast.success(`${u.name} is now ${ROLE_LABELS[role]}`);
  }

  async function onDivisionChange(u: UserRow, divisionId: string) {
    const okd = await patchUser(u.id, { divisionId });
    if (okd) toast.success("Division updated");
  }

  async function onToggleActive(u: UserRow) {
    const okd = await patchUser(u.id, { isActive: !u.isActive });
    if (okd) toast.success(u.isActive ? "User deactivated" : "User activated");
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setAddOpen(true)}>
          <UserPlus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Division</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => {
              const isSelf = u.id === currentUserId;
              const busy = busyId === u.id;
              return (
                <tr key={u.id} className={cn(!u.isActive && "bg-slate-50/70")}>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {u.name}
                    {isSelf && (
                      <span className="ml-2 text-xs font-normal text-slate-400">
                        (you)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <Select
                      aria-label={`Role for ${u.name}`}
                      className="w-40"
                      value={u.role}
                      disabled={busy}
                      onChange={(e) => onRoleChange(u, e.target.value as Role)}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    {u.role === "ADMIN" ? (
                      <span className="text-slate-400">All divisions</span>
                    ) : (
                      <Select
                        aria-label={`Division for ${u.name}`}
                        className="w-52"
                        value={u.divisionId ?? ""}
                        disabled={busy}
                        onChange={(e) => onDivisionChange(u, e.target.value)}
                      >
                        {divisions.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </Select>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.isActive ? (
                      <Badge tone="green">Active</Badge>
                    ) : (
                      <Badge tone="gray">Inactive</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant={u.isActive ? "secondary" : "primary"}
                      size="sm"
                      loading={busy}
                      disabled={isSelf}
                      title={
                        isSelf ? "You cannot deactivate your own account" : undefined
                      }
                      onClick={() => onToggleActive(u)}
                    >
                      {u.isActive ? "Deactivate" : "Activate"}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AddUserModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        divisions={divisions}
        onCreated={() => {
          setAddOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}

function AddUserModal({
  open,
  onClose,
  divisions,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  divisions: Division[];
  onCreated: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("OFFICER");
  const [divisionId, setDivisionId] = useState(divisions[0]?.id ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const needsDivision = role !== "ADMIN";

  function reset() {
    setName("");
    setEmail("");
    setPassword("");
    setRole("OFFICER");
    setDivisionId(divisions[0]?.id ?? "");
    setErrors({});
    setSubmitting(false);
  }

  function close() {
    if (submitting) return;
    reset();
    onClose();
  }

  async function submit() {
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = "Name is required";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()))
      next.email = "Enter a valid email";
    if (password.length < 8) next.password = "At least 8 characters";
    if (needsDivision && !divisionId) next.divisionId = "Select a division";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          role,
          divisionId: needsDivision ? divisionId : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setErrors({ email: "This email is already in use" });
        } else if (res.status === 403) {
          toast.error("You don't have permission");
        } else {
          toast.error(json?.error?.message ?? "Could not create user");
        }
        setSubmitting(false);
        return;
      }
      toast.success(`${name.trim()} added`);
      reset();
      onCreated();
    } catch {
      toast.error("Network error, please try again.");
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add user"
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} loading={submitting}>
            Create user
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Full name"
          value={name}
          error={errors.name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. R. K. Patel"
        />
        <Input
          label="Email"
          type="email"
          value={email}
          error={errors.email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="engineer@gov.in"
        />
        <Input
          label="Password"
          type="password"
          value={password}
          error={errors.password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
        />
        <Select
          label="Role"
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </Select>
        {needsDivision && (
          <Select
            label="Division"
            value={divisionId}
            error={errors.divisionId}
            onChange={(e) => setDivisionId(e.target.value)}
          >
            <option value="">Select a division…</option>
            {divisions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        )}
      </div>
    </Modal>
  );
}
