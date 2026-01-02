import { TicketData, DealerStats, EmployeeStats, RepairStats } from "@/types/ticket";
import { parseTimeConsumed, averageTimeBreakdown } from "./timeParser";
import { database, ref, onValue } from "@/lib/firebase";

export async function loadTicketData(): Promise<TicketData> {
  return new Promise((resolve, reject) => {
    const ticketsRef = ref(database, "c4cTickets_test/tickets");
    
    onValue(
      ticketsRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          resolve({
            c4cTickets_test: {
              tickets: data,
            },
          });
        } else {
          reject(new Error("No data available"));
        }
      },
      (error) => {
        reject(error);
      }
    );
  });
}

export function analyzeDealers(data: TicketData): DealerStats[] {
  const dealerMap = new Map<string, DealerStats>();

  Object.values(data.c4cTickets_test.tickets).forEach((ticketEntry) => {
    const dealer = ticketEntry.roles["1001"];
    // Check if dealer exists and has valid data
    if (!dealer || !dealer.InvolvedPartyBusinessPartnerID) {
      // Create a default "Unknown Dealer" entry for tickets without dealer info
      const dealerId = "unknown";
      const dealerName = "Unknown Dealer";
      
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
      return;
    }

    const dealerId = dealer.InvolvedPartyBusinessPartnerID;
    const dealerName = dealer.RepairerBusinessNameID || "Unknown Dealer";

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
    const employee = ticketEntry.roles["40"];
    // Check if employee exists and has valid data
    if (!employee || !employee.InvolvedPartyBusinessPartnerID) {
      // Create a default "Unassigned" entry for tickets without employee info
      const employeeId = "unassigned";
      const employeeName = "Unassigned";
      
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
      return;
    }

    const employeeId = employee.InvolvedPartyBusinessPartnerID;
    const employeeName = employee.InvolvedPartyName || "Unknown Employee";

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
    const repair = ticketEntry.roles["43"];
    // Check if repair exists and has valid data
    if (!repair || !repair.InvolvedPartyBusinessPartnerID) {
      // Create a default "No Repair Shop" entry for tickets without repair info
      const repairId = "no-repair";
      const repairName = "No Repair Shop Assigned";
      
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
      return;
    }

    const repairId = repair.InvolvedPartyBusinessPartnerID;
    const repairName = repair.RepairerBusinessNameID || "Unknown Repair Shop";

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