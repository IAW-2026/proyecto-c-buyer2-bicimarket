// Valida el X-Service-Token en los endpoints que reciben llamadas de otras apps.
// Cuando no hay token configurado (dev sin otras apps), rechaza con 401.

import { NextResponse } from "next/server";

export function validateServiceToken(
  request: Request,
  envVarName: string,
): NextResponse | null {
  const expectedToken = process.env[envVarName];
  if (!expectedToken) {
    return NextResponse.json(
      { error: { code: "SERVICE_TOKEN_NOT_CONFIGURED", message: `La variable de entorno ${envVarName} no está configurada` } },
      { status: 500 },
    );
  }

  const receivedToken = request.headers.get("X-Service-Token");
  if (!receivedToken || receivedToken !== expectedToken) {
    return NextResponse.json(
      { error: { code: "INVALID_SERVICE_TOKEN", message: "Token de servicio inválido o ausente" } },
      { status: 401 },
    );
  }

  return null;
}
