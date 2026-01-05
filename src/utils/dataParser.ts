import {
  TicketData,
  DealerStats,
  EmployeeStats,
  RepairStats,
  DisplaySettings,
  EntityVisibilityCategory,
  TicketStatusMapping,
  TicketStatusMappingEntry,
} from "@/types/ticket";
import { parseTimeConsumed, averageTimeBreakdown } from "./timeParser";
import { database, ref, get, set } from "@/lib/firebase";

type TicketEntry = TicketData["c4cTickets_test"]["tickets"][string];

const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  dealerships: {},
  employees: {},
  repairs: {},
};

const DEFAULT_TICKET_STATUS_MAPPING: TicketStatusMapping = {};

export async function loadDisplaySettings(): Promise<DisplaySettings> {
  const settingsRef = ref(database, "displaySettings");
  const snapshot = await get(settingsRef);

  if (!snapshot.exists()) {
    return DEFAULT_DISPLAY_SETTINGS;
  }

  const data = snapshot.val();

  return {
    dealerships: data.dealerships ?? {},
    employees: data.employees ?? {},
    repairs: data.repairs ?? {},
  } satisfies DisplaySettings;
}

export async function updateDisplaySetting(
  category: EntityVisibilityCategory,
  entityId: string,
  isVisible: boolean
): Promise<void> {
  const targetRef = ref(database, `displaySettings/${category}/${entityId}`);
  await set(targetRef, isVisible);
}

function getDealerInfo(ticketEntry: TicketEntry) {
  const dealer = ticketEntry.roles["1001"];
  return {
    dealerId: dealer?.InvolvedPartyBusinessPartnerID ?? "unknown",
    dealerName: dealer?.RepairerBusinessNameID ?? "Unknown Dealer",
  };
}

function getEmployeeInfo(ticketEntry: TicketEntry) {
  const employee = ticketEntry.roles["40"];
  return {
    employeeId: employee?.InvolvedPartyBusinessPartnerID ?? "unassigned",
    employeeName: employee?.InvolvedPartyName ?? "Unassigned",
  };
}

function getRepairInfo(ticketEntry: TicketEntry) {
  const repair = ticketEntry.roles["43"];
  return {
    repairId: repair?.InvolvedPartyBusinessPartnerID ?? "no-repair",
    repairName: repair?.RepairerBusinessNameID ?? "No Repair Shop Assigned",
  };
}

export async function loadTicketData(): Promise<TicketData> {
  const ticketsRef = ref(database, "c4cTickets_test/tickets");
  const snapshot = await get(ticketsRef);

  if (!snapshot.exists()) {
    throw new Error("No ticket data available");
  }

  const data = snapshot.val();

  return {
    c4cTickets_test: {
      tickets: data,
    },
  };
}

export async function loadTicketStatusMapping(): Promise<TicketStatusMapping> {
  const mappingRef = ref(database, "ticketStatusMapping");
  const snapshot = await get(mappingRef);

  if (!snapshot.exists()) {
    return DEFAULT_TICKET_STATUS_MAPPING;
  }

  return snapshot.val();
}

export async function updateTicketStatusMappingEntry(
  ticketStatus: string,
  entry: TicketStatusMappingEntry
): Promise<void> {
  const targetRef = ref(database, `ticketStatusMapping/${ticketStatus}`);
  await set(targetRef, entry);
}

export function filterTicketsByFirstLevelStatus(
  data: TicketData,
  mapping?: TicketStatusMapping,
  options?: { excludedFirstLevelStatuses?: string[] }
): TicketData {
  const excluded = (options?.excludedFirstLevelStatuses ?? []).map((status) => status.toLowerCase());

  if (!mapping || excluded.length === 0) {
    return data;
  }

  const filteredTickets = Object.entries(data.c4cTickets_test.tickets).reduce(
    (acc, [ticketId, ticketEntry]) => {
      const statusText = ticketEntry.ticket.TicketStatusText;
      const firstLevelStatus =
        mapping[statusText]?.firstLevelStatus ?? mapping[statusText]?.ticketStatusText ?? statusText;

      if (!excluded.includes(firstLevelStatus.toLowerCase())) {
        acc[ticketId] = ticketEntry;
      }

      return acc;
    },
    {} as TicketData["c4cTickets_test"]["tickets"]
  );

  return {
    c4cTickets_test: {
      tickets: filteredTickets,
    },
  };
}

export function filterTicketsByDisplaySettings(
  data: TicketData,
  settings?: DisplaySettings,
  options?: {
    applyDealershipVisibility?: boolean;
    applyEmployeeVisibility?: boolean;
    applyRepairVisibility?: boolean;
  }
): TicketData {
  const {
    applyDealershipVisibility = true,
    applyEmployeeVisibility = true,
    applyRepairVisibility = true,
  } = options ?? {};

  if (!settings) {
    return data;
  }

  const filteredTickets = Object.entries(data.c4cTickets_test.tickets).reduce(
    (acc, [ticketId, ticketEntry]) => {
      const { dealerId } = getDealerInfo(ticketEntry);
      const { employeeId } = getEmployeeInfo(ticketEntry);
      const { repairId } = getRepairInfo(ticketEntry);

      const isDealerVisible =
        !applyDealershipVisibility || (settings.dealerships[dealerId] ?? true);
      const isEmployeeVisible =
        !applyEmployeeVisibility || (settings.employees[employeeId] ?? true);
      const isRepairVisible = !applyRepairVisibility || (settings.repairs[repairId] ?? true);

      if (isDealerVisible && isEmployeeVisible && isRepairVisible) {
        acc[ticketId] = ticketEntry;
      }
      return acc;
    },
    {} as TicketData["c4cTickets_test"]["tickets"]
  );

  return {
    c4cTickets_test: {
      tickets: filteredTickets,
    },
  };
}

export function summarizeDealerships(data: TicketData) {
  const dealers = new Map<string, { dealerId: string; dealerName: string; count: number }>();

  Object.values(data.c4cTickets_test.tickets).forEach((ticketEntry) => {
    const { dealerId, dealerName } = getDealerInfo(ticketEntry);
    const existing = dealers.get(dealerId) ?? { dealerId, dealerName, count: 0 };
    existing.count += 1;
    dealers.set(dealerId, existing);
  });

  return Array.from(dealers.values()).sort((a, b) => b.count - a.count);
}

export function summarizeEmployees(data: TicketData) {
  const employees = new Map<string, { employeeId: string; employeeName: string; count: number }>();

  Object.values(data.c4cTickets_test.tickets).forEach((ticketEntry) => {
    const { employeeId, employeeName } = getEmployeeInfo(ticketEntry);
    const existing = employees.get(employeeId) ?? { employeeId, employeeName, count: 0 };
    existing.count += 1;
    employees.set(employeeId, existing);
  });

  return Array.from(employees.values()).sort((a, b) => b.count - a.count);
}

export function summarizeRepairs(data: TicketData) {
  const repairs = new Map<string, { repairId: string; repairName: string; count: number }>();

  Object.values(data.c4cTickets_test.tickets).forEach((ticketEntry) => {
    const { repairId, repairName } = getRepairInfo(ticketEntry);
    const existing = repairs.get(repairId) ?? { repairId, repairName, count: 0 };
    existing.count += 1;
    repairs.set(repairId, existing);
  });

  return Array.from(repairs.values()).sort((a, b) => b.count - a.count);
}

export function analyzeDealers(data: TicketData): DealerStats[] {
  const dealerMap = new Map<string, DealerStats>();

  Object.values(data.c4cTickets_test.tickets).forEach((ticketEntry) => {
    const { dealerId, dealerName } = getDealerInfo(ticketEntry);

    if (!dealerMap.has(dealerId)) {
      dealerMap.set(dealerId, {
        dealerId,
        dealerName,
        totalTickets: 0,
        ticketsByStatus: {},
        ticketsByType: {},
        chassisNumbers: [],
        avgTimeConsumed: { days: 0, hours: 0, minutes: 0, totalMinutes: 0 },
      });
    }

    const stats = dealerMap.get(dealerId)!;
    stats.totalTickets++;

    const ticket = ticketEntry.ticket;
    stats.ticketsByStatus[ticket.TicketStatusText] =
      (stats.ticketsByStatus[ticket.TicketStatusText] || 0) + 1;
    stats.ticketsByType[ticket.TicketTypeText] =
      (stats.ticketsByType[ticket.TicketTypeText] || 0) + 1;

    if (ticket.ChassisNumber && !stats.chassisNumbers.includes(ticket.ChassisNumber)) {
      stats.chassisNumbers.push(ticket.ChassisNumber);
    }
  });

  // Calculate average time consumed
  dealerMap.forEach((stats, dealerId) => {
    const times = Object.values(data.c4cTickets_test.tickets)
      .filter((t) => {
        const dealer = t.roles["1001"];
        if (!dealer || !dealer.InvolvedPartyBusinessPartnerID) {
          return dealerId === "unknown" && t.ticket.Z1Z8TimeConsumed;
        }
        return dealer.InvolvedPartyBusinessPartnerID === dealerId && t.ticket.Z1Z8TimeConsumed;
      })
      .map((t) => parseTimeConsumed(t.ticket.Z1Z8TimeConsumed));

    if (times.length > 0) {
      stats.avgTimeConsumed = averageTimeBreakdown(times);
    }
  });

  return Array.from(dealerMap.values()).sort((a, b) => b.totalTickets - a.totalTickets);
}

export function analyzeEmployees(data: TicketData): EmployeeStats[] {
  const employeeMap = new Map<string, EmployeeStats>();

  Object.values(data.c4cTickets_test.tickets).forEach((ticketEntry) => {
    const { employeeId, employeeName } = getEmployeeInfo(ticketEntry);

    if (!employeeMap.has(employeeId)) {
      employeeMap.set(employeeId, {
        employeeId,
        employeeName,
        activeTickets: 0,
        completedTickets: 0,
        ticketsByStatus: {},
        totalTimeConsumed: { days: 0, hours: 0, minutes: 0, totalMinutes: 0 },
        avgTimePerTicket: { days: 0, hours: 0, minutes: 0, totalMinutes: 0 },
      });
    }

    const stats = employeeMap.get(employeeId)!;
    const ticket = ticketEntry.ticket;

    if (ticket.TicketStatus === "Z9" || ticket.TicketStatusText.includes("Approved")) {
      stats.completedTickets++;
    } else {
      stats.activeTickets++;
    }

    stats.ticketsByStatus[ticket.TicketStatusText] =
      (stats.ticketsByStatus[ticket.TicketStatusText] || 0) + 1;
  });

  // Calculate time consumed
  employeeMap.forEach((stats, employeeId) => {
    const times = Object.values(data.c4cTickets_test.tickets)
      .filter((t) => {
        const employee = t.roles["40"];
        if (!employee || !employee.InvolvedPartyBusinessPartnerID) {
          return employeeId === "unassigned" && t.ticket.Z1Z8TimeConsumed;
        }
        return employee.InvolvedPartyBusinessPartnerID === employeeId && t.ticket.Z1Z8TimeConsumed;
      })
      .map((t) => parseTimeConsumed(t.ticket.Z1Z8TimeConsumed));

    if (times.length > 0) {
      const totalMinutes = times.reduce((sum, t) => sum + t.totalMinutes, 0);
      const days = Math.floor(totalMinutes / (24 * 60));
      const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
      const minutes = totalMinutes % 60;

      stats.totalTimeConsumed = { days, hours, minutes, totalMinutes };
      stats.avgTimePerTicket = averageTimeBreakdown(times);
    }
  });

  return Array.from(employeeMap.values()).sort(
    (a, b) => b.activeTickets + b.completedTickets - (a.activeTickets + a.completedTickets)
  );
}

export function analyzeRepairs(data: TicketData): RepairStats[] {
  const repairMap = new Map<string, RepairStats>();

  Object.values(data.c4cTickets_test.tickets).forEach((ticketEntry) => {
    const { repairId, repairName } = getRepairInfo(ticketEntry);

    if (!repairMap.has(repairId)) {
      repairMap.set(repairId, {
        repairId,
        repairName,
        totalCost: 0,
        avgCost: 0,
        ticketCount: 0,
        costByType: {},
        costRanges: { low: 0, medium: 0, high: 0 },
      });
    }

    const stats = repairMap.get(repairId)!;
    const ticket = ticketEntry.ticket;
    const cost = parseFloat(ticket.AmountIncludingTax) || 0;

    stats.totalCost += cost;
    stats.ticketCount++;
    stats.costByType[ticket.TicketTypeText] =
      (stats.costByType[ticket.TicketTypeText] || 0) + cost;

    // Categorize cost ranges
    if (cost < 500) {
      stats.costRanges.low++;
    } else if (cost < 2000) {
      stats.costRanges.medium++;
    } else {
      stats.costRanges.high++;
    }
  });

  // Calculate average cost
  repairMap.forEach((stats) => {
    stats.avgCost = stats.ticketCount > 0 ? stats.totalCost / stats.ticketCount : 0;
  });

  return Array.from(repairMap.values()).sort((a, b) => b.totalCost - a.totalCost);
}
