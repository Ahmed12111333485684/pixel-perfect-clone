import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, getStoredToken, type UserDto, type Role, type Owner } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageHeader, StatusBadge } from "@/components/PageHeader";
import { DataTable, type Column } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormDialog, ConfirmDialog } from "@/components/FormDialog";
import { Plus, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import { APP_NAV_ITEMS } from "@/lib/navigation";

const ROLES: Role[] = ["Admin", "Employee", "OwnerClient"];
const EMPLOYEE_SCREEN_OPTIONS = APP_NAV_ITEMS.filter((item) => !item.adminOnly);

export const Route = createFileRoute("/app/users")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    if (!getStoredToken()) throw redirect({ to: "/login" });
  },
  component: UsersPage,
});

function UsersPage() {
  const { t } = useTranslation();
  const auth = useAuth();
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["users"],
    queryFn: () => api<UserDto[]>("/api/users"),
    enabled: auth.hasRole("Admin"),
  });

  const owners = useQuery({
    queryKey: ["owners", "user-account-picker"],
    queryFn: () => api<Owner[]>("/api/owners"),
    enabled: auth.hasRole("Admin"),
  });

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<UserDto | null>(null);
  const [deleting, setDeleting] = useState<UserDto | null>(null);
  const [resetting, setResetting] = useState<UserDto | null>(null);

  const upsert = useMutation({
    mutationFn: async (vals: { id?: number; username: string; password?: string; role: Role; ownerId?: number; screenPermissions?: string[] }) => {
      if (vals.id) {
        const body: Record<string, unknown> = { username: vals.username, role: vals.role };
        if (vals.password) body.password = vals.password;
        if (vals.role === "Employee") body.screenPermissions = vals.screenPermissions ?? [];
        await api(`/api/users/${vals.id}`, { method: "PUT", body });
        return;
      }

      if (vals.role === "OwnerClient") {
        if (!vals.ownerId) throw new Error(t("common.ownerAccountNeedsOwner"));
        if (!vals.password) throw new Error(t("common.ownerAccountNeedsPassword"));
        await api(`/api/owners/${vals.ownerId}/account`, {
          method: "POST",
          body: { username: vals.username, password: vals.password },
        });
        return;
      }

      await api("/api/users", { method: "POST", body: { username: vals.username, password: vals.password, role: vals.role, ...(vals.role === "Employee" ? { screenPermissions: vals.screenPermissions ?? [] } : {}) } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success(t("common.success"));
      setCreating(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: number) => api(`/api/users/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success(t("common.deleted"));
      setDeleting(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reset = useMutation({
    mutationFn: (vals: { id: number; password: string }) =>
      api(`/api/users/${vals.id}/reset-password`, { method: "POST", body: { password: vals.password } }),
    onSuccess: () => {
      toast.success(t("common.success"));
      setResetting(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!auth.hasRole("Admin")) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
        {t("common.adminOnly")}
      </div>
    );
  }

  const cols: Column<UserDto>[] = [
    { key: "username", header: t("common.username"), cell: (r) => <span className="font-medium">{r.username}</span> },
    {
      key: "role",
      header: t("common.role"),
      cell: (r) => <StatusBadge tone={r.role === "Admin" ? "destructive" : r.role === "Employee" ? "info" : "neutral"}>{t(`role.${r.role}`)}</StatusBadge>,
    },
    {
      key: "owner",
      header: t("common.owner"),
      cell: (r) => r.ownerFullName ? (
        <div className="flex flex-col">
          <span className="font-medium">{r.ownerFullName}</span>
          <span className="text-xs text-muted-foreground">#{r.ownerId}</span>
        </div>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
    },
    { key: "created", header: t("common.createdAt"), cell: (r) => formatDate(r.createdAt) },
    {
      key: "reset",
      header: "",
      className: "w-12",
      cell: (r) => (
        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setResetting(r); }} title={t("common.resetPassword")}>
          <KeyRound className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t("nav.users")}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="me-1 h-4 w-4" />
            {t("common.add")}
          </Button>
        }
      />
      <DataTable
        columns={cols}
        rows={list.data}
        loading={list.isLoading}
        error={list.error}
        rowKey={(r) => r.id}
        onEdit={setEditing}
        onDelete={setDeleting}
      />

      <UserDialog
        open={creating || !!editing}
        onOpenChange={(v) => { if (!v) { setCreating(false); setEditing(null); } }}
        user={editing}
        owners={owners.data ?? []}
        submitting={upsert.isPending}
        onSubmit={(vals) => upsert.mutate({ ...vals, id: editing?.id })}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        title={`${t("common.delete")}: ${deleting?.username ?? ""}`}
        destructive
        loading={del.isPending}
        onConfirm={() => deleting && del.mutate(deleting.id)}
      />

      <ResetPasswordDialog
        user={resetting}
        onOpenChange={(v) => !v && setResetting(null)}
        submitting={reset.isPending}
        onSubmit={(password) => resetting && reset.mutate({ id: resetting.id, password })}
      />
    </div>
  );
}

function UserDialog({ open, onOpenChange, user, owners, onSubmit, submitting }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user: UserDto | null;
  owners: Owner[];
  onSubmit: (vals: { username: string; password?: string; role: Role; ownerId?: number; screenPermissions?: string[] }) => void;
  submitting?: boolean;
}) {
  const { t } = useTranslation();
  const [role, setRole] = useState<Role>(user?.role ?? "Admin");
  const [ownerId, setOwnerId] = useState<number | undefined>(undefined);
  const [screenPermissions, setScreenPermissions] = useState<string[]>(user?.screenPermissions ?? []);
  const key = `${user?.id ?? "new"}-${open}`;

  useEffect(() => {
    if (!open) return;
    setRole(user?.role ?? "Admin");
    setOwnerId(undefined);
    setScreenPermissions(user?.screenPermissions ?? []);
  }, [open, user]);

  const ownerClientMode = !user && role === "OwnerClient";
  const employeeMode = role === "Employee";

  const toggleScreenPermission = (screen: string, checked: boolean) => {
    setScreenPermissions((current) => {
      if (checked) {
        return current.includes(screen) ? current : [...current, screen];
      }

      return current.filter((value) => value !== screen);
    });
  };

  return (
    <FormDialog
      key={key}
      open={open}
      onOpenChange={(v) => { if (!v) onOpenChange(false); }}
      title={ownerClientMode ? t("common.addOwnerPortalAccount") : user ? t("common.edit") : t("common.add")}
      submitting={submitting}
      size="lg"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const password = String(fd.get("password") ?? "").trim();
        if (employeeMode && screenPermissions.length === 0) {
          toast.error(t("common.selectAtLeastOneScreen"));
          return;
        }
        onSubmit({
          username: String(fd.get("username") ?? ""),
          role,
          ...(password ? { password } : {}),
          ...(ownerClientMode ? { ownerId } : {}),
          ...(employeeMode ? { screenPermissions } : {}),
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="username">{t("common.username")}</Label>
        <Input id="username" name="username" defaultValue={user?.username ?? ""} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">
          {t("common.password")} {user && <span className="text-xs text-muted-foreground">({t("common.optional")})</span>}
        </Label>
        <Input id="password" name="password" type="password" required={!user} />
      </div>
      {ownerClientMode && (
        <div className="space-y-2">
          <Label htmlFor="ownerId">{t("common.ownerId")}</Label>
          <Select value={ownerId?.toString() ?? ""} onValueChange={(v) => setOwnerId(Number(v))}>
            <SelectTrigger id="ownerId">
              <SelectValue placeholder={t("common.selectOwner")} />
            </SelectTrigger>
            <SelectContent>
              {owners.map((owner) => (
                <SelectItem key={owner.id} value={owner.id.toString()}>
                  {owner.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {employeeMode && (
        <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
          <div>
            <Label className="text-sm font-medium">{t("common.screenAccess")}</Label>
            <p className="mt-1 text-xs text-muted-foreground">{t("common.screenAccessHelp")}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {EMPLOYEE_SCREEN_OPTIONS.map((item) => (
              <label key={item.to} className="flex items-start gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm">
                <Checkbox
                  checked={screenPermissions.includes(item.to)}
                  onCheckedChange={(checked) => toggleScreenPermission(item.to, checked === true)}
                  className="mt-0.5"
                />
                <span className="flex-1">
                  <span className="block font-medium">{t(item.label)}</span>
                  <span className="block text-xs text-muted-foreground">{item.to}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
      <div className="space-y-2">
        <Label>{t("common.role")}</Label>
        <Select value={role} onValueChange={(v) => {
          const nextRole = v as Role;
          setRole(nextRole);
          if (nextRole === "Employee" && screenPermissions.length === 0) {
            setScreenPermissions(["/app"]);
          }
        }}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => <SelectItem key={r} value={r}>{t(`role.${r}`)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </FormDialog>
  );
}

function ResetPasswordDialog({ user, onOpenChange, onSubmit, submitting }: {
  user: UserDto | null;
  onOpenChange: (v: boolean) => void;
  onSubmit: (password: string) => void;
  submitting?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <FormDialog
      open={!!user}
      onOpenChange={onOpenChange}
      title={`${t("common.resetPassword")} — ${user?.username ?? ""}`}
      submitting={submitting}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const pw = String(fd.get("newPassword") ?? "").trim();
        if (pw.length < 6) {
          toast.error(t("common.passwordTooShort"));
          return;
        }
        onSubmit(pw);
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="newPassword">{t("common.newPassword")}</Label>
        <Input id="newPassword" name="newPassword" type="password" required minLength={6} />
      </div>
    </FormDialog>
  );
}
