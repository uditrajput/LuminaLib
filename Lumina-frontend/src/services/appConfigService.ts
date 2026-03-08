import apiClient from "./apiClient";
import { AppConfig, AppConfigCreate, AppConfigUpdate } from "@/types/appConfig";

export const getAppConfigs = async (): Promise<AppConfig[]> => {
    const response = await apiClient.get<AppConfig[]>("/app-config");
    return response.data;
};

export const getAppConfigByKey = async (key: string): Promise<AppConfig> => {
    const response = await apiClient.get<AppConfig>(`/app-config/${key}`);
    return response.data;
};

export const createAppConfig = async (data: AppConfigCreate): Promise<AppConfig> => {
    const response = await apiClient.post<AppConfig>("/app-config", data);
    return response.data;
};

export const updateAppConfig = async (key: string, data: AppConfigUpdate): Promise<AppConfig> => {
    const response = await apiClient.put<AppConfig>(`/app-config/${key}`, data);
    return response.data;
};
