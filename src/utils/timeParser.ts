import { TimeBreakdown } from "@/types/ticket";

export function parseTimeConsumed(timeStr: string): TimeBreakdown {
  if (!timeStr) {
    return { days: 0, hours: 0, minutes: 0, totalMinutes: 0 };
  }

  const dayMatch = timeStr.match(/(\d+)\s*D/);
  const hourMatch = timeStr.match(/(\d+)\s*H/);
  const minuteMatch = timeStr.match(/(\d+)\s*M/);

  const days = dayMatch ? parseInt(dayMatch[1]) : 0;
  const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
  const minutes = minuteMatch ? parseInt(minuteMatch[1]) : 0;

  const totalMinutes = days * 24 * 60 + hours * 60 + minutes;

  return { days, hours, minutes, totalMinutes };
}

export function formatTimeBreakdown(time: TimeBreakdown): string {
  const parts = [];
  if (time.days > 0) parts.push(`${time.days}d`);
  if (time.hours > 0) parts.push(`${time.hours}h`);
  if (time.minutes > 0) parts.push(`${time.minutes}m`);
  return parts.join(" ") || "0m";
}

export function addTimeBreakdowns(times: TimeBreakdown[]): TimeBreakdown {
  const totalMinutes = times.reduce((sum, t) => sum + t.totalMinutes, 0);
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  return { days, hours, minutes, totalMinutes };
}

export function averageTimeBreakdown(times: TimeBreakdown[]): TimeBreakdown {
  if (times.length === 0) {
    return { days: 0, hours: 0, minutes: 0, totalMinutes: 0 };
  }

  const totalMinutes = times.reduce((sum, t) => sum + t.totalMinutes, 0);
  const avgMinutes = Math.floor(totalMinutes / times.length);
  const days = Math.floor(avgMinutes / (24 * 60));
  const hours = Math.floor((avgMinutes % (24 * 60)) / 60);
  const minutes = avgMinutes % 60;

  return { days, hours, minutes, totalMinutes: avgMinutes };
}