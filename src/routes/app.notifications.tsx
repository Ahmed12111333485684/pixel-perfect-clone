import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  fetchAllNotifications,
  markNotificationRead,
  deleteNotification,
  type NotificationItem,
} from "@/lib/api";
import {
  PageHeader,
  StatusBadge,
  LoadingBlock,
  ErrorBlock,
  EmptyState,
} from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, X, CheckCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/notifications")({
  component: NotificationsPage,
});

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function NotificationsPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const isAr = i18n.language === "ar";
  const [page, setPage] = useState(1);
  const [readFilter, setReadFilter] = useState<string>("all");
  const pageSize = 20;

  const readParam = readFilter === "all" ? undefined : readFilter === "read";

  const list = useQuery({
    queryKey: ["notifications-all", page, readFilter],
    queryFn: () => fetchAllNotifications(page, pageSize, readParam),
  });

  const markReadMut = useMutation({
    mutationFn: (id: number) => markNotificationRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications-all"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteNotification(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications-all"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalPages = list.data ? Math.ceil(list.data.totalCount / pageSize) : 0;

  return (
    <div>
      <PageHeader title={t("notifications.pageTitle")} />

      <div className="mb-4 flex items-center gap-3">
        <Select value={readFilter} onValueChange={(v) => { setPage(1); setReadFilter(v); }}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            <SelectItem value="unread">{t("notifications.unread")}</SelectItem>
            <SelectItem value="read">{t("notifications.read")}</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {t("notifications.totalCount", { count: list.data?.totalCount ?? 0 })}
        </span>
      </div>

      {list.isLoading ? (
        <LoadingBlock />
      ) : list.error ? (
        <ErrorBlock message={(list.error as Error)?.message} />
      ) : !list.data || list.data.notifications.length === 0 ? (
        <EmptyState message={t("notifications.empty")} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                  <th className="px-4 py-3">{t("notifications.typeCol")}</th>
                  <th className="px-4 py-3">{t("notifications.titleCol")}</th>
                  <th className="px-4 py-3">{t("notifications.timeCol")}</th>
                  <th className="px-4 py-3">{t("notifications.statusCol")}</th>
                  <th className="w-24 px-4 py-3 text-end">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {list.data.notifications.map((item: NotificationItem) => (
                  <tr key={item.id} className="border-t border-border transition hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <StatusBadge tone={item.type === "seeker" ? "info" : "success"}>
                        {item.type === "seeker" ? t("notifications.newSeeker") : t("notifications.newLead")}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Link to={item.link.replace(/\/app\/residential-seekers\/\d+$/, "/app/residential-seekers")} className="font-medium hover:underline">
                        {isAr ? item.title : item.titleEn}
                      </Link>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {isAr ? item.summary : item.summaryEn}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                      {timeAgo(item.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      {item.read ? (
                        <span className="text-xs text-muted-foreground">{t("notifications.read")}</span>
                      ) : (
                        <span className="text-xs font-medium text-blue-600">{t("notifications.unread")}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-end">
                      <div className="flex justify-end gap-1">
                        {!item.read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => markReadMut.mutate(item.id)}
                            title={t("notifications.markRead")}
                          >
                            <CheckCheck className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => deleteMut.mutate(item.id)}
                          title={t("common.delete")}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-2 text-sm text-muted-foreground">
            {t("notifications.pageInfo", { page, total: totalPages })}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}