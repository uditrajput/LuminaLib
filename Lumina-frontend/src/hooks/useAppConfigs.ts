import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAppConfigs, getAppConfigByKey, createAppConfig, updateAppConfig } from "@/services/appConfigService";
import { AppConfigCreate, AppConfigUpdate } from "@/types/appConfig";

export const useAppConfigs = () =>
    useQuery({
        queryKey: ["admin", "app-configs"],
        queryFn: getAppConfigs,
    });

export const useAppConfigByKey = (key: string | null) =>
    useQuery({
        queryKey: ["admin", "app-configs", key],
        queryFn: () => getAppConfigByKey(key!),
        enabled: !!key,
    });

export const useCreateAppConfig = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: AppConfigCreate) => createAppConfig(data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["admin", "app-configs"] });
        },
    });
};

export const useUpdateAppConfig = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ key, data }: { key: string; data: AppConfigUpdate }) =>
            updateAppConfig(key, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["admin", "app-configs"] });
        },
    });
};
