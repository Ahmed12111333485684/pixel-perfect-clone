import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { api, getStoredToken, resolveApiAssetUrl, type UserDto, type Role } from "@/lib/api";
import type { AppNavItem } from "@/lib/navigation";
import { useAuth } from "@/lib/auth";
import { PageHeader, StatusBadge } from "@/components/PageHeader";
import { DataTable, type Column } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { MediaPreview } from "@/components/MediaPreview";
import { MediaLightbox } from "@/components/MediaLightbox";
import { PhotoManager, type PhotoDraft } from "@/components/PhotoManager";
import { deleteUserPhoto } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormDialog, ConfirmDialog } from "@/components/FormDialog";
import { ImagePlus, Plus, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import { APP_NAV_ITEMS } from "@/lib/navigation";

const ROLES: Role[] = ["Admin", "Employee", "Partner"];
function flattenNav(items: AppNavItem[]): AppNavItem[] {
  const out: AppNavItem[] = [];
  function walk(list: AppNavItem[]) {
    for (const it of list) {
      out.push(it);
      if (it.children) walk(it.children);
    }
  }
  walk(items);
  return out;
}

const EMPLOYEE_SCREEN_OPTIONS = flattenNav(APP_NAV_ITEMS).filter(
  (item) => !item.adminOnly && !item.partnerOnly,
);

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
    queryFn: () => api<UserDto[]>("/users"),
    enabled: auth.hasRole("Admin"),
  });

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<UserDto | null>(null);
  const [deleting, setDeleting] = useState<UserDto | null>(null);
  const [resetting, setResetting] = useState<UserDto | null>(null);

  const [sortBy, setSortBy] = useState<string>("created");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [lightboxImages, setLightboxImages] = useState<{ src: string; alt: string }[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const openLightbox = (user: UserDto, startIndex: number) => {
    setLightboxImages((user.photoUrls ?? []).map((url) => ({ src: resolveApiAssetUrl(url), alt: user.fullName ?? user.username })));
    setLightboxIndex(startIndex);
  };

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
  };

  const sortedUsers = useMemo(() => {
    if (!list.data) return [];
    return [...list.data].sort((a, b) => {
      let cmp = 0;
      if (sortBy === "created") {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortBy === "username") {
        cmp = (a.username || "").localeCompare(b.username || "");
      } else if (sortBy === "role") {
        cmp = (a.role || "").localeCompare(b.role || "");
      } else if (sortBy === "owner") {
        cmp = (a.ownerFullName || "").localeCompare(b.ownerFullName || "");
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [list.data, sortBy, sortDir]);

  const upsert = useMutation({
    mutationFn: async (vals: {
      id?: number;
      username: string;
      password?: string;
      role: Role;
      screenPermissions?: string[];
      canDelete?: boolean;
      employeeId?: string;
      jobTitle?: string;
      fullName?: string;
      nationality?: string;
      nationalId?: string;
      dateOfBirth?: string;
      personalMobile?: string;
      workMobile?: string;
      startDate?: string;
      endDate?: string;
      email?: string;
      bank?: string;
      iban?: string;
      notes?: string;
      photos?: File[] | null;
      removePhotoUrls?: string[] | null;
    }) => {
      if (vals.role === "Partner" && !vals.id) {
        throw new Error(t("common.usePartnersPageForPartnerAccounts"));
      }

      const fd = new FormData();
      fd.append("username", vals.username);
      if (vals.password) fd.append("password", vals.password);
      fd.append("role", vals.role);
      if (vals.role === "Employee") {
        for (const perm of vals.screenPermissions ?? []) fd.append("screenPermissions", perm);
        fd.append("canDelete", vals.canDelete ? "true" : "false");
      }
      const optionalFields: { key: string; value?: string }[] = [
        { key: "employeeId", value: vals.employeeId },
        { key: "jobTitle", value: vals.jobTitle },
        { key: "fullName", value: vals.fullName },
        { key: "nationality", value: vals.nationality },
        { key: "nationalId", value: vals.nationalId },
        { key: "dateOfBirth", value: vals.dateOfBirth },
        { key: "personalMobile", value: vals.personalMobile },
        { key: "workMobile", value: vals.workMobile },
        { key: "startDate", value: vals.startDate },
        { key: "endDate", value: vals.endDate },
        { key: "email", value: vals.email },
        { key: "bank", value: vals.bank },
        { key: "iban", value: vals.iban },
        { key: "notes", value: vals.notes },
      ];
      for (const field of optionalFields) {
        if (field.value !== undefined && field.value !== "") fd.append(field.key, field.value);
      }
      for (const photo of vals.photos ?? []) fd.append("photos", photo);

      if (vals.id) {
        await api(`/api/users/${vals.id}`, { method: "PUT", formData: fd });
        for (const url of vals.removePhotoUrls ?? []) {
          await deleteUserPhoto(vals.id, url);
        }
        return;
      }
      await api("/users", { method: "POST", formData: fd });
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
      api(`/api/users/${vals.id}/reset-password`, {
        method: "POST",
        body: { password: vals.password },
      }),
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
    {
      key: "photo",
      header: t("common.photo"),
      className: "w-20",
      cell: (r) =>
        r.photoUrls?.length ? (
          <div
            className="h-12 w-12 overflow-hidden rounded-lg border border-border bg-muted"
            style={{ cursor: "zoom-in" }}
            onClick={(e) => {
              e.stopPropagation();
              openLightbox(r, 0);
            }}
          >
            <MediaPreview
              src={resolveApiAssetUrl(r.photoUrls[0])}
              alt={r.fullName ?? r.username}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground">
            <ImagePlus className="h-4 w-4" />
          </div>
        ),
    },
    {
      key: "username",
      header: t("common.username"),
      cell: (r) => <span className="font-medium">{r.username}</span>,
      sortable: true,
    },
    {
      key: "role",
      header: t("common.role"),
      cell: (r) => (
        <StatusBadge
          tone={r.role === "Admin" ? "destructive" : r.role === "Employee" ? "info" : "neutral"}
        >
          {t(`role.${r.role}`)}
        </StatusBadge>
      ),
      sortable: true,
    },
    {
      key: "owner",
      header: t("common.owner"),
      cell: (r) =>
        r.ownerFullName ? (
          <div className="flex flex-col">
            <span className="font-medium">{r.ownerFullName}</span>
            <span className="text-xs text-muted-foreground">#{r.ownerId}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
      sortable: true,
    },
    { key: "created", header: t("common.createdAt"), cell: (r) => formatDate(r.createdAt), sortable: true },
    {
      key: "reset",
      header: "",
      className: "w-12",
      cell: (r) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            setResetting(r);
          }}
          title={t("common.resetPassword")}
        >
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
        rows={sortedUsers}
        loading={list.isLoading}
        error={list.error}
        rowKey={(r) => r.id}
        onEdit={setEditing}
        onDelete={setDeleting}
        sortKey={sortBy}
        sortDir={sortDir}
        onSort={handleSort}
      />

      <UserDialog
        open={creating || !!editing}
        onOpenChange={(v) => {
          if (!v) {
            setCreating(false);
            setEditing(null);
          }
        }}
        user={editing}
        submitting={upsert.isPending}
        onSubmit={(vals) => upsert.mutate({ ...vals, id: editing?.id })}
      />

      {/* Lightbox */}
      {lightboxIndex !== null && lightboxImages.length > 0 && (
        <MediaLightbox
          images={lightboxImages}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onChange={setLightboxIndex}
        />
      )}

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

function UserDialog({
  open,
  onOpenChange,
  user,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user: UserDto | null;
  onSubmit: (vals: {
    username: string;
    password?: string;
    role: Role;
    screenPermissions?: string[];
    canDelete?: boolean;
    employeeId?: string;
    jobTitle?: string;
    fullName?: string;
    nationality?: string;
    nationalId?: string;
    dateOfBirth?: string;
    personalMobile?: string;
    workMobile?: string;
    startDate?: string;
    endDate?: string;
    email?: string;
    bank?: string;
    iban?: string;
    notes?: string;
    photos?: File[] | null;
    removePhotoUrls?: string[] | null;
  }) => void;
  submitting?: boolean;
}) {
  const { t } = useTranslation();
  const [role, setRole] = useState<Role>(user?.role ?? "Admin");
  const [screenPermissions, setScreenPermissions] = useState<string[]>(
    user?.screenPermissions ?? [],
  );
  const [canDelete, setCanDelete] = useState(user?.canDelete ?? false);
  const [photoDraft, setPhotoDraft] = useState<PhotoDraft>({ files: [], removedUrls: [] });
  const key = `${user?.id ?? "new"}-${open}`;

  useEffect(() => {
    if (!open) return;
    setRole(user?.role ?? "Admin");
    setScreenPermissions(user?.screenPermissions ?? []);
    setCanDelete(user?.canDelete ?? false);
  }, [open, user]);

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
      onOpenChange={(v) => {
        if (!v) onOpenChange(false);
      }}
      title={user ? t("common.edit") : t("common.add")}
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
          ...(employeeMode ? { screenPermissions, canDelete } : {}),
          employeeId: String(fd.get("employeeId") ?? "").trim(),
          jobTitle: String(fd.get("jobTitle") ?? "").trim(),
          fullName: String(fd.get("fullName") ?? "").trim(),
          nationality: String(fd.get("nationality") ?? "").trim(),
          nationalId: String(fd.get("nationalId") ?? "").trim(),
          dateOfBirth: String(fd.get("dateOfBirth") ?? "").trim(),
          personalMobile: String(fd.get("personalMobile") ?? "").trim(),
          workMobile: String(fd.get("workMobile") ?? "").trim(),
          startDate: String(fd.get("startDate") ?? "").trim(),
          endDate: String(fd.get("endDate") ?? "").trim(),
          email: String(fd.get("email") ?? "").trim(),
          bank: String(fd.get("bank") ?? "").trim(),
          iban: String(fd.get("iban") ?? "").trim(),
          notes: String(fd.get("notes") ?? "").trim(),
          photos: photoDraft.files,
          removePhotoUrls: photoDraft.removedUrls,
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="username">{t("common.username")}</Label>
          <Input id="username" name="username" defaultValue={user?.username ?? ""} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">
            {t("common.password")}{" "}
            {user && <span className="text-xs text-muted-foreground">({t("common.optional")})</span>}
          </Label>
          <Input id="password" name="password" type="password" required={!user} />
        </div>
        
        <div className="space-y-2">
          <Label>{t("common.role")}</Label>
          <Select
            value={role}
            onValueChange={(v) => {
              const nextRole = v as Role;
              setRole(nextRole);
              if (nextRole === "Employee" && screenPermissions.length === 0) {
                setScreenPermissions(["/app", "/app/employee-productivity"]);
              }
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {t(`role.${r}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="employeeId">{t("common.employeeId")}</Label>
          <Input id="employeeId" name="employeeId" defaultValue={user?.employeeId ?? ""} />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="fullName">{t("common.employeeName")}</Label>
          <Input id="fullName" name="fullName" defaultValue={user?.fullName ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="jobTitle">{t("common.jobTitle")}</Label>
          <Input id="jobTitle" name="jobTitle" defaultValue={user?.jobTitle ?? ""} />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="nationalId">{t("common.nationalId")}</Label>
          <Input id="nationalId" name="nationalId" defaultValue={user?.nationalId ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nationality">{t("common.nationality")}</Label>
          <Input id="nationality" name="nationality" defaultValue={user?.nationality ?? ""} />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="dateOfBirth">{t("common.dateOfBirth")}</Label>
          <Input id="dateOfBirth" name="dateOfBirth" type="date" defaultValue={user?.dateOfBirth ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">{t("common.email")}</Label>
          <Input id="email" name="email" type="email" defaultValue={user?.email ?? ""} />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="personalMobile">{t("common.personalMobile")}</Label>
          <Input id="personalMobile" name="personalMobile" defaultValue={user?.personalMobile ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="workMobile">{t("common.workMobile")}</Label>
          <Input id="workMobile" name="workMobile" defaultValue={user?.workMobile ?? ""} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="startDate">{t("common.startDate")}</Label>
          <Input id="startDate" name="startDate" type="date" defaultValue={user?.startDate ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">{t("common.endDate")}</Label>
          <Input id="endDate" name="endDate" type="date" defaultValue={user?.endDate ?? ""} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bank">{t("common.bank")}</Label>
          <Input id="bank" name="bank" defaultValue={user?.bank ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="iban">{t("common.iban")}</Label>
          <Input id="iban" name="iban" defaultValue={user?.iban ?? ""} />
        </div>
        
        {user?.id && (
          <div className="sm:col-span-2 rounded-lg border border-border bg-muted/30 p-4">
            <PhotoManager
              urls={user.photoUrls ?? []}
              alt={user.fullName ?? user.username}
              onDraftChange={setPhotoDraft}
            />
          </div>
        )}

        <div className="sm:col-span-2 space-y-2">
          <Label htmlFor="notes">{t("common.notes")}</Label>
          <textarea
            id="notes"
            name="notes"
            defaultValue={user?.notes ?? ""}
            className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      </div>

      {employeeMode && (
        <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
          <div>
            <Label className="text-sm font-medium">{t("common.screenAccess")}</Label>
            <p className="mt-1 text-xs text-muted-foreground">{t("common.screenAccessHelp")}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {EMPLOYEE_SCREEN_OPTIONS.map((item) => (
              <label
                key={item.to}
                className="flex items-start gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <Checkbox
                  checked={screenPermissions.includes(item.to)}
                  onCheckedChange={(checked) => toggleScreenPermission(item.to, checked === true)}
                  className="mt-0.5"
                />
                <span className="flex-1">
                  <span className="block font-medium">{t(item.label)}</span>
                </span>
              </label>
            ))}
          </div>
          <div className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm">
            <Checkbox
              id="canDelete"
              checked={canDelete}
              onCheckedChange={(checked) => setCanDelete(checked === true)}
            />
            <Label htmlFor="canDelete" className="font-medium">{t("common.canDelete")}</Label>
          </div>
        </div>
      )}
    </FormDialog>
  );
}

function ResetPasswordDialog({
  user,
  onOpenChange,
  onSubmit,
  submitting,
}: {
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
