// Cliente HTTP para llamadas server-to-server entre apps.
// Usa X-Service-Token en lugar de JWT de Clerk.
// Ver documentacion/03-apis.md — sección "Autenticación server-to-server"

import axios from "axios";

export function createServiceClient(baseURL: string, serviceToken: string) {
  const client = axios.create({
    baseURL,
    headers: { "Content-Type": "application/json" },
    timeout: 10_000,
  });

  client.interceptors.request.use((config) => {
    config.headers["X-Service-Token"] = serviceToken;
    config.headers["X-Request-Id"] = crypto.randomUUID();
    return config;
  });

  return client;
}
