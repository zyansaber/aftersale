import { useEffect, useMemo, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { useTicketData } from "@/hooks/useTicketData";
import { useTicketStatusMapping } from "@/hooks/useTicketStatusMapping";
import { TicketStatusMapping } from "@/types/ticket";
import { toast } from "@/components/ui/sonner";

type StatusRow = {
  code: string;
  text: string;
};

export default function MappingPage() {
  const ticketQuery = useTicketData();
  const mappingQuery = useTicketStatusMapping();

  const [localMapping, setLocalMapping] = useState<Record<string, string>>({});

  const statusRows: StatusRow[] = useMemo(() => {
    if (!ticketQuery.data) return [];

    const seen = new Map<string, string>();
    Object.values(ticketQuery.data.c4cTickets_test.tickets).forEach((entry) => {
      if (!seen.has(entry.ticket.TicketStatus)) {
        seen.set(entry.ticket.TicketStatus, entry.ticket.TicketStatusText);
      }
    });

    return Array.from(seen.entries())
      .map(([code, text]) => ({ code, text }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [ticketQuery.data]);

  const buildLocalMapping = (mapping: TicketStatusMapping) =>
    Object.fromEntries(
      Object.entries(mapping).map(([code, entry]) => [code, entry.firstLevelStatus ?? ""])
    );

  useEffect(() => {
    if (!mappingQuery.data) return;
    setLocalMapping(buildLocalMapping(mappingQuery.data));
  }, [mappingQuery.data]);

  const handleChange = (code: string, value: string) => {
    setLocalMapping((prev) => ({
      ...prev,
      [code]: value,
    }));
  };

  const handleSave = (row: StatusRow) => {
    const firstLevelStatus = (localMapping[row.code] ?? "").trim();
    mappingQuery.updateEntry(row.code, {
      ticketStatusText: row.text,
      firstLevelStatus,
    });

    toast.success("Mapping submitted to Firebase", {
      description: `${row.code} → ${firstLevelStatus || "(empty)"}`,
    });
  };

  if (ticketQuery.isLoading || mappingQuery.isLoading) {
    return <div className="p-8">Loading ticket status mapping...</div>;
  }

  if (ticketQuery.error || mappingQuery.error) {
    const ticketError =
      ticketQuery.error instanceof Error ? ticketQuery.error.message : "Ticket data error";
    const mappingError =
      mappingQuery.error instanceof Error ? mappingQuery.error.message : "Mapping error";

    return (
      <div className="p-8 text-destructive">
        Failed to load data:
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>{ticketError}</li>
          <li>{mappingError}</li>
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Ticket Status Mapping</h2>
        <p className="text-muted-foreground mt-2">
          List every TicketStatus and TicketStatusText, fill the First Level Status, and sync it to Firebase.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mapping list</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">TicketStatus</TableHead>
                <TableHead>TicketStatusText</TableHead>
                <TableHead className="w-[220px]">First Level Status</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statusRows.map((row) => (
                <TableRow key={row.code}>
                  <TableCell className="font-mono font-medium">{row.code}</TableCell>
                  <TableCell className="text-muted-foreground">{row.text}</TableCell>
                  <TableCell>
                    <Input
                      value={localMapping[row.code] ?? ""}
                      onChange={(event) => handleChange(row.code, event.target.value)}
                      placeholder="Enter First Level Status"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      onClick={() => handleSave(row)}
                      disabled={mappingQuery.isUpdating || mappingQuery.isLoading}
                    >
                      Save
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {statusRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No TicketStatus data.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
