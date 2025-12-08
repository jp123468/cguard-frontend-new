import "axios";

declare module "axios" {
  export interface AxiosRequestConfig {
    toast?: {
      loading?: string;
      success?: string;
      error?: string | ((e: any) => string);
      silentError?: boolean;
    };
  }
}
