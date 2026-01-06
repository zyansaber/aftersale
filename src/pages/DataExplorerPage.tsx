import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTicketData } from "@/hooks/useTicketData";
import { PaginationControls } from "@/components/PaginationControls";
import { PageLoader } from "@/components/PageLoader";
import { FileText, RefreshCw, Search } from "lucide-react";
import { getNormalizedSerialId, parseAmountIncludingTax } from "@/utils/dataParser";
import { TicketEntry } from "@/types/ticket";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type EnrichedTicket = {
  id: string;
  name: string;
  status: string;
  type: string;
  createdOn: string;
  createdDate: Date | null;
  chassis: string;
  dealerId: string;
  dealerName: string;
  repairId: string;
  repairName: string;
  employeeName: string;
  amountIncludingTax: string;
  entry: TicketEntry;
};

const normalizeValue = (value: string | null | undefined, fallback: string) => {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? fallback : trimmed;
};

const PAGE_SIZE = 40;

export default function DataExplorerPage() {
  const ticketQuery = useTicketData();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dealerFilter, setDealerFilter] = useState<string>("all");
  const [repairFilter, setRepairFilter] = useState<string>("all");
  const [employeeFilter, setEmployeeFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [page, setPage] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState<TicketEntry | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const tickets = useMemo<EnrichedTicket[]>(() => {
    if (!ticketQuery.data) return [];
    return Object.values(ticketQuery.data.c4cTickets_test.tickets).map((entry) => {
      const dealer = entry.roles?.["1001"];
      const repair = entry.roles?.["43"];
      const employee = entry.roles?.["40"];
      const createdOn = entry.ticket.CreatedOn?.trim?.() ?? entry.ticket.CreatedOn;
      const createdDate = new Date(createdOn);
      const normalizedCreated = Number.isNaN(createdDate.getTime()) ? null : createdDate;
      const normalizedSerialId = getNormalizedSerialId(entry);

      return {
        id: normalizeValue(entry.ticket.TicketID, "unknown"),
        name: normalizeValue(entry.ticket.TicketName, "(no name)"),
        status: normalizeValue(entry.ticket.TicketStatusText, "Unknown"),
        type: normalizeValue(entry.ticket.TicketTypeText, "Unknown"),
        createdOn: createdOn ?? "",
        createdDate: normalizedCreated,
        chassis: normalizedSerialId,
        dealerId: normalizeValue(dealer?.InvolvedPartyBusinessPartnerID, "unknown"),
        dealerName: normalizeValue(dealer?.RepairerBusinessNameID, "Unknown dealer"),
        repairId: normalizeValue(repair?.InvolvedPartyBusinessPartnerID, "no-repair"),
        repairName: normalizeValue(repair?.RepairerBusinessNameID, "No repair assigned"),
        employeeName: normalizeValue(employee?.InvolvedPartyName, "Unassigned"),
        amountIncludingTax: normalizeValue(entry.ticket.AmountIncludingTax, "0"),
        entry,
      };
    });
  }, [ticketQuery.data]);

  const statusOptions = useMemo(
    () => Array.from(new Set(tickets.map((t) => t.status))).sort(),
    [tickets]
  );
  const typeOptions = useMemo(
    () => Array.from(new Set(tickets.map((t) => t.type))).sort(),
    [tickets]
  );
  const dealerOptions = useMemo(
    () =>
      Array.from(
        new Map(tickets.map((t) => [t.dealerId, t.dealerName])).entries()
      ).map(([id, name]) => ({ id, name })),
    [tickets]
  );
  const repairOptions = useMemo(
    () =>
      Array.from(
        new Map(tickets.map((t) => [t.repairId, t.repairName])).entries()
      ).map(([id, name]) => ({ id, name })),
    [tickets]
  );
  const employeeOptions = useMemo(
    () =>
      Array.from(new Set(tickets.map((t) => t.employeeName))).map((name) => ({
        id: name,
        name,
      })),
    [tickets]
  );

  const filtered = useMemo(() => {
    const searchText = search.trim().toLowerCase();
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    return tickets.filter((ticket) => {
      if (statusFilter !== "all" && ticket.status !== statusFilter) return false;
      if (typeFilter !== "all" && ticket.type !== typeFilter) return false;
      if (dealerFilter !== "all" && ticket.dealerId !== dealerFilter) return false;
      if (repairFilter !== "all" && ticket.repairId !== repairFilter) return false;
      if (employeeFilter !== "all" && ticket.employeeName !== employeeFilter) return false;

      if (start && ticket.createdDate && ticket.createdDate < start) return false;
      if (end && ticket.createdDate && ticket.createdDate > end) return false;

      if (searchText) {
        const haystack = [
          ticket.id,
          ticket.name,
          ticket.chassis,
          ticket.dealerName,
          ticket.repairName,
          ticket.employeeName,
        ]
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(searchText)) return false;
      }

      return true;
    });
  }, [
    dealerFilter,
    employeeFilter,
    endDate,
    repairFilter,
    search,
    startDate,
    statusFilter,
    tickets,
    typeFilter,
  ]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const handleReset = () => {
    setSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
    setDealerFilter("all");
    setRepairFilter("all");
    setEmployeeFilter("all");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const handleCopy = () => {
    const payload = filtered.map(({ createdDate, entry, ...rest }) => rest);
    navigator.clipboard
      .writeText(JSON.stringify(payload, null, 2))
      .catch(() => {
        // ignore copy errors silently to avoid breaking UX
      });
  };

  if (ticketQuery.isLoading) {
    return (
      <PageLoader
        title="Loading data explorer"
        description="Fetching tickets and preparing filter lists."
        tasks={[{ label: "Ticket dataset", progress: ticketQuery.data ? 100 : 0 }]}
      />
    );
  }

  if (ticketQuery.error) {
    const message = ticketQuery.error instanceof Error ? ticketQuery.error.message : "Unknown error";
    return <div className="p-8 text-destructive">Failed to load tickets: {message}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Data Explorer</h2>
        <p className="text-muted-foreground mt-2">
          Full-ticket audit with multi-dimensional filters, fuzzy search, and export-ready list.
        </p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <p className="text-sm text-muted-foreground">
            Combine multiple filters to narrow tickets, then use fuzzy search across ID, name, chassis, dealer, and repair.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="search">Fuzzy search</Label>
            <div className="flex gap-2">
              <Input
                id="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Ticket ID, name, chassis, dealer, repair..."
              />
              <Button variant="outline" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={typeFilter}
              onValueChange={(value) => {
                setTypeFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {typeOptions.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Dealer</Label>
            <Select
              value={dealerFilter}
              onValueChange={(value) => {
                setDealerFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All dealers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All dealers</SelectItem>
                {dealerOptions.map((dealer) => (
                  <SelectItem key={dealer.id} value={dealer.id}>
                    {dealer.name} ({dealer.id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Repair</Label>
            <Select
              value={repairFilter}
              onValueChange={(value) => {
                setRepairFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All repairs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All repairs</SelectItem>
                {repairOptions.map((repair) => (
                  <SelectItem key={repair.id} value={repair.id}>
                    {repair.name} ({repair.id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Employee</Label>
            <Select
              value={employeeFilter}
              onValueChange={(value) => {
                setEmployeeFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All employees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All employees</SelectItem>
                {employeeOptions.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="start-date">Created on (start)</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(event) => {
                setStartDate(event.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="end-date">Created on (end)</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(event) => {
                setEndDate(event.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="space-y-2 flex flex-col justify-end">
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset} className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button onClick={handleCopy} className="flex-1">
                <FileText className="h-4 w-4 mr-2" />
                Copy list
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Copy exports filtered tickets (without creation date parsing metadata).
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total tickets (filtered)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{filtered.length}</p>
            <p className="text-sm text-muted-foreground">Out of {tickets.length} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Unique dealers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{new Set(filtered.map((t) => t.dealerId)).size}</p>
            <p className="text-sm text-muted-foreground">Based on filtered set</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Unique repairs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{new Set(filtered.map((t) => t.repairId)).size}</p>
            <p className="text-sm text-muted-foreground">Full coverage with hidden repairs included</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">With chassis numbers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {filtered.filter((t) => t.chassis.trim() !== "").length}
            </p>
            <p className="text-sm text-muted-foreground">Tickets containing a chassis ID</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Ticket list</CardTitle>
          <p className="text-sm text-muted-foreground">
            Paginated view of every ticket that matches the current filters.
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">Ticket ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Dealer</TableHead>
                <TableHead>Repair</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Chassis</TableHead>
                <TableHead>Created On</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((ticket) => (
                <TableRow
                  key={ticket.id}
                  className="hover:bg-muted/50 cursor-pointer"
                  onClick={() => {
                    setSelectedTicket(ticket.entry);
                    setIsDetailOpen(true);
                  }}
                >
                  <TableCell className="font-medium">{ticket.id}</TableCell>
                  <TableCell className="max-w-[220px]">
                    <p className="font-semibold truncate">{ticket.name}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{ticket.status}</Badge>
                  </TableCell>
                  <TableCell>{ticket.type}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{ticket.dealerName}</span>
                      <span className="text-xs text-muted-foreground">{ticket.dealerId}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{ticket.repairName}</span>
                      <span className="text-xs text-muted-foreground">{ticket.repairId}</span>
                    </div>
                  </TableCell>
                  <TableCell>{ticket.employeeName}</TableCell>
                  <TableCell className="font-mono text-sm">{ticket.chassis || "—"}</TableCell>
                  <TableCell>{ticket.createdOn}</TableCell>
                </TableRow>
              ))}
              {paginated.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-6">
                    No tickets match the current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PaginationControls
        totalItems={filtered.length}
        pageSize={PAGE_SIZE}
        page={page}
        onPageChange={setPage}
      />

      <Dialog
        open={isDetailOpen}
        onOpenChange={(open) => {
          setIsDetailOpen(open);
          if (!open) {
            setSelectedTicket(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTicket
                ? `${selectedTicket.ticket.TicketName || "(no name)"} — #${selectedTicket.ticket.TicketID}`
                : "Ticket details"}
            </DialogTitle>
            <DialogDescription>
              Full snapshot of the ticket record, including roles, pricing, and normalized chassis details.
            </DialogDescription>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <DetailItem label="Ticket ID" value={selectedTicket.ticket.TicketID} />
                <DetailItem label="Status" value={selectedTicket.ticket.TicketStatusText} />
                <DetailItem label="Type" value={selectedTicket.ticket.TicketTypeText} />
                <DetailItem label="Created On" value={selectedTicket.ticket.CreatedOn} />
                <DetailItem
                  label="Amount Including Tax"
                  value={formatAmount(selectedTicket.ticket.AmountIncludingTax)}
                />
                <DetailItem
                  label="Chassis (Serial ID)"
                  value={getNormalizedSerialId(selectedTicket) || "—"}
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Roles</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-3">
                  <RoleDetail
                    title="Dealer"
                    name={selectedTicket.roles?.["1001"]?.RepairerBusinessNameID || "Unknown dealer"}
                    id={selectedTicket.roles?.["1001"]?.InvolvedPartyBusinessPartnerID || "unknown"}
                  />
                  <RoleDetail
                    title="Repair"
                    name={selectedTicket.roles?.["43"]?.RepairerBusinessNameID || "No repair assigned"}
                    id={selectedTicket.roles?.["43"]?.InvolvedPartyBusinessPartnerID || "no-repair"}
                  />
                  <RoleDetail
                    title="Employee"
                    name={selectedTicket.roles?.["40"]?.InvolvedPartyName || "Unassigned"}
                    id={selectedTicket.roles?.["40"]?.InvolvedPartyBusinessPartnerID || "unassigned"}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ticket fields</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Raw ticket payload, including pricing and lifecycle metadata.
                  </p>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  {Object.entries(selectedTicket.ticket).map(([key, value]) => (
                    <DetailItem key={key} label={key} value={String(value ?? "—")} />
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

type DetailItemProps = {
  label: string;
  value: string;
};

const DetailItem = ({ label, value }: DetailItemProps) => (
  <div className="rounded-lg border bg-muted/30 p-3">
    <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="font-semibold break-words">{value || "—"}</p>
  </div>
);

type RoleDetailProps = {
  title: string;
  name: string;
  id: string;
};

const RoleDetail = ({ title, name, id }: RoleDetailProps) => (
  <div className="rounded-lg border p-3 space-y-1">
    <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
    <p className="font-semibold">{name}</p>
    <p className="text-xs text-muted-foreground font-mono break-all">{id}</p>
  </div>
);

function formatAmount(amount: string) {
  const parsed = parseAmountIncludingTax(amount);
  if (parsed === null) return amount || "—";
  return parsed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
