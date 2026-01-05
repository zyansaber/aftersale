import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  loadTicketStatusMapping,
  updateTicketStatusMappingEntry,
} from "@/utils/dataParser";
import { TicketStatusMapping, TicketStatusMappingEntry } from "@/types/ticket";

export const TICKET_STATUS_MAPPING_KEY = ["ticketStatusMapping"];

type UpdatePayload = {
  ticketStatus: string;
  entry: TicketStatusMappingEntry;
};

export function useTicketStatusMapping() {
  const queryClient = useQueryClient();

  const mappingQuery = useQuery<TicketStatusMapping>({
    queryKey: TICKET_STATUS_MAPPING_KEY,
    queryFn: loadTicketStatusMapping,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const mutation = useMutation({
    mutationFn: ({ ticketStatus, entry }: UpdatePayload) =>
      updateTicketStatusMappingEntry(ticketStatus, entry),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: TICKET_STATUS_MAPPING_KEY });

      const previousMapping = queryClient.getQueryData<TicketStatusMapping>(TICKET_STATUS_MAPPING_KEY);

      queryClient.setQueryData<TicketStatusMapping | undefined>(TICKET_STATUS_MAPPING_KEY, (current) => {
        if (!current) return current;
        return {
          ...current,
          [payload.ticketStatus]: payload.entry,
        };
      });

      return { previousMapping };
    },
    onError: (_error, _payload, context) => {
      if (context?.previousMapping) {
        queryClient.setQueryData(TICKET_STATUS_MAPPING_KEY, context.previousMapping);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TICKET_STATUS_MAPPING_KEY });
    },
  });

  const updateEntry = (ticketStatus: string, entry: TicketStatusMappingEntry) => {
    mutation.mutate({ ticketStatus, entry });
  };

  return {
    ...mappingQuery,
    updateEntry,
    isUpdating: mutation.isPending,
  };
}
