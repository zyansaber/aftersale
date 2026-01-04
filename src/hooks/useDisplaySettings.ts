import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DisplaySettings,
  EntityVisibilityCategory,
  UpdateDisplaySettingPayload,
} from "@/types/ticket";
import { loadDisplaySettings, updateDisplaySetting } from "@/utils/dataParser";

export const DISPLAY_SETTINGS_KEY = ["displaySettings"];

export function useDisplaySettings() {
  const queryClient = useQueryClient();

  const settingsQuery = useQuery<DisplaySettings>({
    queryKey: DISPLAY_SETTINGS_KEY,
    queryFn: loadDisplaySettings,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const mutation = useMutation({
    mutationFn: (payload: UpdateDisplaySettingPayload) =>
      updateDisplaySetting(payload.category, payload.entityId, payload.isVisible),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: DISPLAY_SETTINGS_KEY });

      const previousSettings = queryClient.getQueryData<DisplaySettings>(DISPLAY_SETTINGS_KEY);

      queryClient.setQueryData<DisplaySettings | undefined>(DISPLAY_SETTINGS_KEY, (current) => {
        if (!current) return current;
        return {
          ...current,
          [payload.category]: {
            ...current[payload.category],
            [payload.entityId]: payload.isVisible,
          },
        };
      });

      return { previousSettings };
    },
    onError: (_error, _payload, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(DISPLAY_SETTINGS_KEY, context.previousSettings);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: DISPLAY_SETTINGS_KEY });
    },
  });

  const toggleVisibility = (
    category: EntityVisibilityCategory,
    entityId: string,
    isVisible: boolean
  ) => {
    mutation.mutate({ category, entityId, isVisible });
  };

  return {
    ...settingsQuery,
    toggleVisibility,
    isUpdating: mutation.isPending,
  };
}
