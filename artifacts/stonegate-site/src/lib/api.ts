import { setBaseUrl } from '@workspace/api-client-react';

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

setBaseUrl(API_BASE_URL || null);
