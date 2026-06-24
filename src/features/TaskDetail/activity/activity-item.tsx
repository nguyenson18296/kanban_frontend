import { formatDistanceToNow, format } from "date-fns";
import {
  ArrowRight,
  ArrowRightLeft,
  CalendarDays,
  FileText,
  GripVertical,
  Pencil,
  Plus,
  ShieldAlert,
  Tag,
  Tags,
  Type,
  UserPlus,
  UserMinus,
} from "lucide-react";

import { TaskActivityAction } from "@/types";
import type {
  IActivity,
  FieldChangePayload,
  DueDateChangePayload,
  AssigneeChangePayload,
  LabelChangePayload,
} from "@/types";
import { UserAvatar } from "@/components/UserAvatar";

interface ActionStyle {
  icon: React.ReactNode;
  bg: string;
  text: string;
}

function getActionStyle(action: string): ActionStyle {
  switch (action) {
    case TaskActivityAction.TASK_CREATED:
      return { icon: <Plus className="size-3.5" />, bg: "bg-emerald-100", text: "text-emerald-600" };
    case TaskActivityAction.TASK_TITLE_UPDATED:
      return { icon: <Type className="size-3.5" />, bg: "bg-sky-100", text: "text-sky-600" };
    case TaskActivityAction.TASK_DESCRIPTION_UPDATED:
      return { icon: <FileText className="size-3.5" />, bg: "bg-slate-100", text: "text-slate-500" };
    case TaskActivityAction.TASK_STATUS_CHANGED:
      return { icon: <ArrowRightLeft className="size-3.5" />, bg: "bg-indigo-100", text: "text-indigo-600" };
    case TaskActivityAction.TASK_PRIORITY_CHANGED:
      return { icon: <ShieldAlert className="size-3.5" />, bg: "bg-rose-100", text: "text-rose-500" };
    case TaskActivityAction.TASK_DUE_DATE_CHANGED:
      return { icon: <CalendarDays className="size-3.5" />, bg: "bg-amber-100", text: "text-amber-600" };
    case TaskActivityAction.TASK_ASSIGNEE_ADDED:
      return { icon: <UserPlus className="size-3.5" />, bg: "bg-teal-100", text: "text-teal-600" };
    case TaskActivityAction.TASK_ASSIGNEE_REMOVED:
      return { icon: <UserMinus className="size-3.5" />, bg: "bg-orange-100", text: "text-orange-500" };
    case TaskActivityAction.TASK_LABEL_ADDED:
      return { icon: <Tag className="size-3.5" />, bg: "bg-violet-100", text: "text-violet-600" };
    case TaskActivityAction.TASK_LABEL_REMOVED:
      return { icon: <Tags className="size-3.5" />, bg: "bg-pink-100", text: "text-pink-500" };
    case TaskActivityAction.TASK_MOVED:
      return { icon: <ArrowRightLeft className="size-3.5" />, bg: "bg-cyan-100", text: "text-cyan-600" };
    case TaskActivityAction.TASK_REORDERED:
      return { icon: <GripVertical className="size-3.5" />, bg: "bg-gray-100", text: "text-gray-500" };
    default:
      return { icon: <Pencil className="size-3.5" />, bg: "bg-gray-100", text: "text-gray-500" };
  }
}

const PRIORITY_BADGE_STYLES: Record<string, string> = {
  urgent: "bg-red-50 border-red-200 text-red-600",
  high: "bg-orange-50 border-orange-200 text-orange-500",
  medium: "bg-yellow-50 border-yellow-200 text-yellow-500",
  low: "bg-blue-50 border-blue-200 text-blue-400",
  no_priority: "bg-[#f8fafc] border-[#e2e8f0] text-[#94a3b8]",
};

const DEFAULT_BADGE_STYLE = "border border-[#e2e8f0] bg-[#f8fafc] text-[#475569]";

function getPriorityBadgeStyle(value: string): string {
  const match = PRIORITY_BADGE_STYLES[value.toLowerCase()];
  return match ? `border ${match}` : DEFAULT_BADGE_STYLE;
}

interface FieldChangeBadgesProps {
  from: string;
  to: string;
  fromStyle?: string;
  toStyle?: string;
}

function FieldChangeBadges({ from, to, fromStyle, toStyle }: Readonly<FieldChangeBadgesProps>) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${fromStyle ?? DEFAULT_BADGE_STYLE}`}>
        {from}
      </span>
      <ArrowRight className="size-3 text-[#cbd5e1]" />
      <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${toStyle ?? DEFAULT_BADGE_STYLE}`}>
        {to}
      </span>
    </span>
  );
}

function ActivityContent({ activity }: Readonly<{ activity: IActivity }>) {
  const { action, actor, payload } = activity;
  const name = <span className="font-semibold text-[#0f172a]">{actor.full_name}</span>;

  switch (action) {
    case TaskActivityAction.TASK_CREATED:
      return <p className="text-[13px] text-[#475569] m-0">{name} created this task</p>;

    case TaskActivityAction.TASK_TITLE_UPDATED:
      return <p className="text-[13px] text-[#475569] m-0">{name} updated the title</p>;

    case TaskActivityAction.TASK_DESCRIPTION_UPDATED:
      return <p className="text-[13px] text-[#475569] m-0">{name} updated task description</p>;

    case TaskActivityAction.TASK_STATUS_CHANGED: {
      const { from, to } = payload as FieldChangePayload;
      return (
        <div className="text-[13px] text-[#475569]">
          <span>{name} changed status from </span>
          <FieldChangeBadges from={from} to={to} toStyle="border border-indigo-200 bg-indigo-50 text-indigo-700" />
        </div>
      );
    }

    case TaskActivityAction.TASK_PRIORITY_CHANGED: {
      const { from, to } = payload as FieldChangePayload;
      return (
        <div className="text-[13px] text-[#475569]">
          <span>{name} changed priority from </span>
          <FieldChangeBadges from={from} to={to} fromStyle={getPriorityBadgeStyle(from)} toStyle={getPriorityBadgeStyle(to)} />
        </div>
      );
    }

    case TaskActivityAction.TASK_DUE_DATE_CHANGED: {
      const { from, to } = payload as DueDateChangePayload;
      const formatDate = (d: string | null) => (d ? format(new Date(d), "MMM d, yyyy") : "None");
      return (
        <div className="text-[13px] text-[#475569]">
          <span>{name} changed the due date </span>
          <FieldChangeBadges from={formatDate(from)} to={formatDate(to)} toStyle="border border-amber-200 bg-amber-50 text-amber-700" />
        </div>
      );
    }

    case TaskActivityAction.TASK_ASSIGNEE_ADDED: {
      const users = (payload as AssigneeChangePayload).users ?? [];
      return (
        <p className="text-[13px] text-[#475569] m-0">
          {name} assigned this to{" "}
          {users.map((u, i) => (
            <span key={u.user_id}>
              <span className="font-semibold text-[#0f172a]">{u.full_name}</span>
              {i < users.length - 1 && ", "}
            </span>
          ))}
        </p>
      );
    }

    case TaskActivityAction.TASK_ASSIGNEE_REMOVED: {
      const users = (payload as AssigneeChangePayload).users ?? [];
      return (
        <p className="text-[13px] text-[#475569] m-0">
          {name} unassigned{" "}
          {users.map((u, i) => (
            <span key={u.user_id}>
              <span className="font-semibold text-[#0f172a]">{u.full_name}</span>
              {i < users.length - 1 && ", "}
            </span>
          ))}
        </p>
      );
    }

    case TaskActivityAction.TASK_LABEL_ADDED: {
      const labels = (payload as LabelChangePayload).labels ?? [];
      return (
        <p className="text-[13px] text-[#475569] m-0">
          {name} added label{labels.length > 1 ? "s" : ""}{" "}
          {labels.map((l, i) => (
            <span key={l.label_id}>
              <span
                className="rounded-md border px-2 py-0.5 text-xs font-semibold"
                style={{ borderColor: `${l.color}40`, backgroundColor: `${l.color}15`, color: l.color }}
              >
                {l.label_name}
              </span>
              {i < labels.length - 1 && " "}
            </span>
          ))}
        </p>
      );
    }

    case TaskActivityAction.TASK_LABEL_REMOVED: {
      const labels = (payload as LabelChangePayload).labels ?? [];
      const fallback = "#94a3b8";
      return (
        <p className="text-[13px] text-[#475569] m-0">
          {name} removed label{labels.length > 1 ? "s" : ""}{" "}
          {labels.map((l, i) => {
            const c = l.color || fallback;
            return (
              <span key={l.label_id}>
                <span
                  className="rounded-md border px-2 py-0.5 text-xs font-semibold line-through opacity-60"
                  style={{ borderColor: `${c}40`, backgroundColor: `${c}15`, color: c }}
                >
                  {l.label_name}
                </span>
                {i < labels.length - 1 && " "}
              </span>
            );
          })}
        </p>
      );
    }

    case TaskActivityAction.TASK_MOVED:
      return <p className="text-[13px] text-[#475569] m-0">{name} moved this task to another column</p>;

    case TaskActivityAction.TASK_REORDERED:
      return <p className="text-[13px] text-[#475569] m-0">{name} reordered this task</p>;

    default:
      return <p className="text-[13px] text-[#475569] m-0">{name} updated this task</p>;
  }
}

export default function ActivityItem({ activity }: Readonly<{ activity: IActivity }>) {
  const { actor, action, created_at } = activity;
  const style = getActionStyle(action);

  return (
    <div className="relative flex items-start gap-3 py-3">
      {/* Timeline connector line */}
      <div className="activity-timeline-line absolute left-[15px] top-[42px] bottom-0 w-px bg-[#e2e8f0]" />

      {/* Color-coded action icon */}
      <div className={`relative z-10 flex size-[30px] shrink-0 items-center justify-center rounded-full ${style.bg} ${style.text} ring-[3px] ring-white`}>
        {style.icon}
      </div>

      {/* Actor avatar */}
      <UserAvatar
        user={actor}
        className="size-7 shrink-0 ring-2 ring-white"
      />

      {/* Content */}
      <div className="min-w-0 flex-1 pt-0.5">
        <ActivityContent activity={activity} />
      </div>

      {/* Timestamp */}
      <span className="shrink-0 pt-0.5 text-[11px] text-[#94a3b8] font-medium">
        {formatDistanceToNow(new Date(created_at), { addSuffix: true })}
      </span>
    </div>
  );
}
