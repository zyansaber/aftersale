import { useQuery } from "@tanstack/react-query";
import { loadTicketData } from "@/utils/dataParser";

export const useTicketData = () =>
  useQuery({
    queryKey: ["tickets"],
    queryFn: loadTicketData,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
  });
