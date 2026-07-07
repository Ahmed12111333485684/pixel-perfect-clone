import { createContext, useContext, useRef, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationItem,
  type NotificationsResponse,
} from "./api";

export type { NotificationItem, NotificationsResponse };

interface NotificationsContextValue {
  items: NotificationItem[];
  unreadCount: number;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationsCtx = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const lastTimestampRef = useRef<string | undefined>(undefined);
  const initialLoadRef = useRef(true);
  const prevUnreadRef = useRef(0);
  const [items, setItems] = useState<NotificationItem[]>([]);

  const { data } = useQuery<NotificationsResponse>({
    queryKey: ["notifications"],
    queryFn: () => fetchNotifications(lastTimestampRef.current),
    refetchInterval: 15_000,
  });

  useEffect(() => {
    if (!data) return;

    const { notifications, unreadCount } = data;

    if (lastTimestampRef.current === undefined) {
      setItems(notifications);
      if (notifications.length > 0) {
        lastTimestampRef.current = notifications[0].createdAt;
      }
    } else {
      if (notifications.length > 0) {
        setItems((prev) => [...notifications, ...prev]);
        lastTimestampRef.current = notifications[0].createdAt;
      }
    }

    if (!initialLoadRef.current && unreadCount > prevUnreadRef.current) {
      if (notifications.length > 0) {
        toast.info(notifications[0].title, {
          action: {
            label: notifications[0].type === "seeker" ? "طلب سكني جديد" : "عميل جديد",
            onClick: () => navigate({ to: notifications[0].link }),
          },
        } as any);
      }
    }

    initialLoadRef.current = false;
    prevUnreadRef.current = unreadCount;
  }, [data, navigate]);

  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (data) setUnreadCount(data.unreadCount);
  }, [data]);

  const markReadMut = useMutation<void, Error, number>({
    mutationFn: (id: number) => markNotificationRead(id) as Promise<void>,
    onSuccess: (_data, id) => {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, read: true } : item)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    },
  });

  const markAllReadMut = useMutation<void, Error, void>({
    mutationFn: () => markAllNotificationsRead() as Promise<void>,
    onSuccess: () => {
      setItems((prev) => prev.map((item) => ({ ...item, read: true })));
      setUnreadCount(0);
    },
  });

  const value = useMemo<NotificationsContextValue>(
    () => ({
      items,
      unreadCount,
      markRead: async (id: number) => markReadMut.mutateAsync(id),
      markAllRead: async () => markAllReadMut.mutateAsync(),
    }),
    [items, unreadCount, markReadMut, markAllReadMut],
  );

  return <NotificationsCtx.Provider value={value}>{children}</NotificationsCtx.Provider>;
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsCtx);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
