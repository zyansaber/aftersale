import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import StatCard from "@/components/StatCard";
import { AlertCircle, Clock, FileWarning, Ticket as TicketIcon } from "lucide-react";
import { useVisibleTickets } from "@/hooks/useVisibleTickets";
import { parse } from "date-fns";

type ChartDatum = { name: string; value: number };

export default function TicketsPage() {
  const { data, isLoading, error } = useVisibleTickets();
  const [statusPage, setStatusPage] = useState(1);
  const [typePage, setTypePage] = useState(1);
  const PAGE_SIZE = 50;

  const tickets = useMemo(() => {
    if (!data) return [];
    return Object.values(data.c4cTickets_test.tickets);
  }, [data]);

  useEffect(() => {
    setStatusPage(1);
    setTypePage(1);
  }, [tickets.length]);

  const {
    totalTickets,
    unapprovedCount,
    unrespondedCount,
    statusData,
    typeData,
    creationTrend,
    dateRangeLabel,
  } = useMemo(() => {
    const total = tickets.length;
    let unapproved = 0;
    let unresponded = 0;

    const statusCount: Record<string, number> = {};
    const typeCount: Record<string, number> = {};
    const creationCount: Record<string, number> = {};
    const creationDates: Date[] = [];

    tickets.forEach((entry) => {
      const ticket = entry.ticket;
      if (!ticket.ApprovalNumber) unapproved += 1;
      if (!ticket.Responded) unresponded += 1;

      statusCount[ticket.TicketStatusText] = (statusCount[ticket.TicketStatusText] || 0) + 1;
      typeCount[ticket.TicketTypeText] = (typeCount[ticket.TicketTypeText] || 0) + 1;

      const parsedDate = parse(ticket.CreatedOn, "dd/MM/yyyy", new Date());
      if (!Number.isNaN(parsedDate.getTime())) {
        creationDates.push(parsedDate);
        const monthKey = `${parsedDate.getFullYear()}-${(parsedDate.getMonth() + 1)
          .toString()
          .padStart(2, "0")}`;
        creationCount[monthKey] = (creationCount[monthKey] || 0) + 1;
      }
    });

    const statusList: ChartDatum[] = Object.entries(statusCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const typeList: ChartDatum[] = Object.entries(typeCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const trendList: ChartDatum[] = Object.entries(creationCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const earliest = creationDates.length ? new Date(Math.min(...creationDates.map((d) => d.getTime()))) : null;
    const latest = creationDates.length ? new Date(Math.max(...creationDates.map((d) => d.getTime()))) : null;

    const rangeLabel =
      earliest && latest
        ? `${earliest.toISOString().slice(0, 10)} → ${latest.toISOString().slice(0, 10)}`
        : "N/A";

    return {
      totalTickets: total,
      unapprovedCount: unapproved,
      unrespondedCount: unresponded,
      statusData: statusList,
      typeData: typeList,
      creationTrend: trendList,
      dateRangeLabel: rangeLabel,
    };
  }, [tickets]);

  const paginatedStatus = useMemo(() => {
    const start = (statusPage - 1) * PAGE_SIZE;
    return statusData.slice(start, start + PAGE_SIZE);
  }, [statusData, statusPage]);

  const paginatedTypes = useMemo(() => {
    const start = (typePage - 1) * PAGE_SIZE;
    return typeData.slice(start, start + PAGE_SIZE);
  }, [typeData, typePage]);

  if (isLoading) {
    return <div className="p-8">Loading ticket analytics...</div>;
  }

  if (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return <div className="p-8 text-destructive">Failed to load ticket analytics: {message}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Ticket Overview</h2>
        <p className="text-muted-foreground mt-2">
          High-level analysis of ticket approvals, responses, status distribution, and creation
          trends.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Tickets"
          value={totalTickets}
          icon={TicketIcon}
          description="Tickets currently visible"
        />
        <StatCard
          title="Pending Approval"
          value={unapprovedCount}
          icon={FileWarning}
          description="Missing ApprovalNumber"
        />
        <StatCard
          title="Awaiting Response"
          value={unrespondedCount}
          icon={AlertCircle}
          description="Responded is false"
        />
        <StatCard
          title="Created Date Range"
          value={dateRangeLabel}
          icon={Clock}
          description="Earliest → Latest"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Creation Trend (by month)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={creationTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="value" stroke="#3B82F6" name="Tickets" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={paginatedStatus}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-30} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#10B981" name="Count" />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex justify-between text-sm text-muted-foreground mt-2">
              <span>
                Page {statusPage} / {Math.max(1, Math.ceil(statusData.length / PAGE_SIZE))}
              </span>
              <div className="space-x-2">
                <button
                  className="underline disabled:text-slate-300"
                  disabled={statusPage === 1}
                  onClick={() => setStatusPage((prev) => Math.max(1, prev - 1))}
                >
                  Previous
                </button>
                <button
                  className="underline disabled:text-slate-300"
                  disabled={statusPage === Math.max(1, Math.ceil(statusData.length / PAGE_SIZE))}
                  onClick={() =>
                    setStatusPage((prev) =>
                      Math.min(Math.max(1, Math.ceil(statusData.length / PAGE_SIZE)), prev + 1)
                    )
                  }
                >
                  Next
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ticket Types</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={paginatedTypes}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-30} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#F59E0B" name="Count" />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex justify-between text-sm text-muted-foreground mt-2">
            <span>
              Page {typePage} / {Math.max(1, Math.ceil(typeData.length / PAGE_SIZE))}
            </span>
            <div className="space-x-2">
              <button
                className="underline disabled:text-slate-300"
                disabled={typePage === 1}
                onClick={() => setTypePage((prev) => Math.max(1, prev - 1))}
              >
                Previous
              </button>
              <button
                className="underline disabled:text-slate-300"
                disabled={typePage === Math.max(1, Math.ceil(typeData.length / PAGE_SIZE))}
                onClick={() =>
                  setTypePage((prev) =>
                    Math.min(Math.max(1, Math.ceil(typeData.length / PAGE_SIZE)), prev + 1)
                  )
                }
              >
                Next
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
