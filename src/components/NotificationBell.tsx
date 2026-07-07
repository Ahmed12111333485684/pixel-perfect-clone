import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Bell, X } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNotifications } from "@/lib/notifications";

function timeAgo(dateStr: string, lang: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return lang === "ar" ? "الآن" : "now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return lang === "ar" ? `منذ ${diffMin}د` : `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return lang === "ar" ? `منذ ${diffHr}س` : `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return lang === "ar" ? `منذ ${diffDay}ي` : `${diffDay}d ago`;
}

export function NotificationBell() {
  const { t, i18n } = useTranslation();
  const { items, unreadCount, markRead, markAllRead, remove } = useNotifications();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const isAr = i18n.language === "ar";

  const handleItemClick = async (item: (typeof items)[0]) => {
    if (!item.read) await markRead(item.id);
    setOpen(false);
    const link = item.link.replace(/\/app\/residential-seekers\/\d+$/, "/app/residential-seekers");
    navigate({ to: link });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0" sideOffset={8}>
        <div className="border-b border-border px-4 py-3 font-medium text-sm">
          {t("notifications.title")}
        </div>
        <div className="max-h-[210px] overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              {t("notifications.empty")}
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="group relative border-b border-border"
              >
                <button
                  onClick={() => handleItemClick(item)}
                  className={`flex w-full items-start gap-3 px-4 py-3 pr-8 text-left text-sm transition hover:bg-muted/50 ${
                    !item.read ? "font-medium" : ""
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="truncate">
                      {isAr ? item.title : item.titleEn}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
                      {isAr ? item.summary : item.summaryEn}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground/60">
                      {timeAgo(item.createdAt, i18n.language)}
                    </div>
                  </div>
                  {!item.read && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                  )}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(item.id);
                  }}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded text-muted-foreground/40 opacity-0 transition hover:text-foreground group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))
          )}
        </div>
        <div className="border-t border-border p-2">
          <Link
            to="/app/notifications"
            onClick={() => setOpen(false)}
            className="mb-1 flex w-full items-center justify-center rounded-md px-2 py-1.5 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            {t("notifications.viewAll")}
          </Link>
          {items.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                markAllRead();
                setOpen(false);
              }}
            >
              {t("notifications.markAllRead")}
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
