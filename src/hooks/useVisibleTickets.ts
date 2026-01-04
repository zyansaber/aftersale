import { useMemo } from "react";
import { useTicketData } from "./useTicketData";
import { useDisplaySettings } from "./useDisplaySettings";
import { filterTicketsByDisplaySettings } from "@/utils/dataParser";
import { TicketData } from "@/types/ticket";

export function useVisibleTickets() {
  const ticketQuery = useTicketData();
  const settingsQuery = useDisplaySettings();

  const filteredData: TicketData | undefined = useMemo(() => {
    if (!ticketQuery.data) return undefined;
    return filterTicketsByDisplaySettings(ticketQuery.data, settingsQuery.data);
  }, [settingsQuery.data, ticketQuery.data]);

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
