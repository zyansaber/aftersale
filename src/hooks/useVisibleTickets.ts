import { useMemo } from "react";
import { useTicketData } from "./useTicketData";
import { useDisplaySettings } from "./useDisplaySettings";
import { filterTicketsByDisplaySettings } from "@/utils/dataParser";
import { TicketData } from "@/types/ticket";

type VisibilityOptions = {
  applyDealershipVisibility?: boolean;
  applyEmployeeVisibility?: boolean;
  applyRepairVisibility?: boolean;
};

export function useVisibleTickets(options?: VisibilityOptions) {
  const {
    applyDealershipVisibility = true,
    applyEmployeeVisibility = false,
    applyRepairVisibility = true,
  } = options ?? {};

  const ticketQuery = useTicketData();
  const settingsQuery = useDisplaySettings();

  const filteredData: TicketData | undefined = useMemo(() => {
    if (!ticketQuery.data) return undefined;
    return filterTicketsByDisplaySettings(ticketQuery.data, settingsQuery.data, {
      applyDealershipVisibility,
      applyEmployeeVisibility,
      applyRepairVisibility,
    });
  }, [
    applyDealershipVisibility,
    applyEmployeeVisibility,
    applyRepairVisibility,
    settingsQuery.data,
    ticketQuery.data,
  ]);

  const isLoading = ticketQuery.isLoading || settingsQuery.isLoading;
  const error = ticketQuery.error || settingsQuery.error;

  return {
    data: filteredData,
    rawData: ticketQuery.data,
    settings: settingsQuery.data,
    isLoading,
    error,
    refetch: ticketQuery.refetch,
    settingsLoading: settingsQuery.isLoading,
    settingsError: settingsQuery.error,
  };
}
