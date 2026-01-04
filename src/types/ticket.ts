export interface TicketData {
  c4cTickets_test: {
    tickets: {
      [ticketId: string]: {
        updatedAt: number;
        ticket: Ticket;
        roles: {
          "1001"?: DealerRole;
          "40"?: EmployeeRole;
          "43"?: RepairRole;
        };
      };
    };
  };
}

export interface Ticket {
  AmountIncludingTax: string;
  ApprovalNumber: string;
  ChassisNumber: string;
  CreatedOn: string;
  ERPFreeOrder: string;
  ERPInvoiceNumber: string;
  ERPPurchaseOrder: string;
  HubSpotID: string;
  Responded: boolean;
  ServiceRequesterEmail: string;
  TicketID: string;
  TicketName: string;
  TicketSeverity: string;
  TicketStatus: string;
  TicketStatusText: string;
  TicketType: string;
  TicketTypeText: string;
  Z1Z8TimeConsumed: string;
}

export interface DealerRole {
  InvolvedPartyBusinessPartnerID: string | null;
  InvolvedPartyID: string | null;
  InvolvedPartyName: string | null;
  InvolvedPartyRoleID: string | null;
  RepairerBusinessNameID: string | null;
  RepairerEmail: string | null;
  RepairerPhoneNumber: string | null;
  RepairerNamePointOfContact: string | null;
  requested_skip: number | null;
}

export interface EmployeeRole {
  InvolvedPartyBusinessPartnerID: string | null;
  InvolvedPartyID: string | null;
  InvolvedPartyName: string | null;
  InvolvedPartyRoleID: string | null;
  RepairerBusinessNameID: string | null;
  RepairerEmail: string | null;
  RepairerPhoneNumber: string | null;
  RepairerNamePointOfContact: string | null;
  requested_skip: number | null;
}

export interface RepairRole {
  InvolvedPartyBusinessPartnerID: string | null;
  InvolvedPartyID: string | null;
  InvolvedPartyName: string | null;
  InvolvedPartyRoleID: string | null;
  RepairerBusinessNameID: string | null;
  RepairerEmail: string | null;
  RepairerPhoneNumber: string | null;
  RepairerNamePointOfContact: string | null;
  requested_skip: number | null;
}

export interface TimeBreakdown {
  days: number;
  hours: number;
  minutes: number;
  totalMinutes: number;
}

export interface DealerStats {
  dealerId: string;
  dealerName: string;
  totalTickets: number;
  ticketsByStatus: Record<string, number>;
  ticketsByType: Record<string, number>;
  chassisNumbers: string[];
  avgTimeConsumed: TimeBreakdown;
}

export interface EmployeeStats {
  employeeId: string;
  employeeName: string;
  activeTickets: number;
  completedTickets: number;
  ticketsByStatus: Record<string, number>;
  totalTimeConsumed: TimeBreakdown;
  avgTimePerTicket: TimeBreakdown;
}

export interface RepairStats {
  repairId: string;
  repairName: string;
  totalCost: number;
  avgCost: number;
  ticketCount: number;
  costByType: Record<string, number>;
  costRanges: {
    low: number;
    medium: number;
    high: number;
  };
}

export type EntityVisibilityCategory = "dealerships" | "employees" | "repairs";

export interface DisplaySettings {
  dealerships: Record<string, boolean>;
  employees: Record<string, boolean>;
  repairs: Record<string, boolean>;
}

export interface UpdateDisplaySettingPayload {
  category: EntityVisibilityCategory;
  entityId: string;
  isVisible: boolean;
}
