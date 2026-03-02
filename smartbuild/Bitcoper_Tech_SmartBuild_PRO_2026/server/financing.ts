import crypto from "crypto";
import type { FinancingSimulation, BurnTokensResult } from "@shared/schema";

export function generateTokenId(): string {
  return crypto.createHash("sha256")
    .update(`${Date.now()}-${Math.random()}-smartbuild`)
    .digest("hex")
    .substring(0, 16)
    .toUpperCase();
}

export function calculateFinancing(
  projectId: number,
  projectName: string,
  costoDirecto: number,
  tasaMensual: number = 1.5,
  plazoMeses: number = 12,
  cuotasPagadas: number = 0,
  tokenId?: string,
  statusFinanciamiento: string = "pendiente"
): FinancingSimulation {
  const montoFinanciar = Math.round(costoDirecto * 0.3);
  const tasaDecimal = tasaMensual / 100;
  
  const cuotaMensual = tasaDecimal > 0
    ? Math.round(montoFinanciar * (tasaDecimal * Math.pow(1 + tasaDecimal, plazoMeses)) / (Math.pow(1 + tasaDecimal, plazoMeses) - 1))
    : Math.round(montoFinanciar / plazoMeses);

  const totalPagado = cuotaMensual * plazoMeses;
  const totalIntereses = totalPagado - montoFinanciar;
  const retornoBitcoper = totalIntereses;

  const capitalPagado = cuotasPagadas > 0 ? Math.round((montoFinanciar / plazoMeses) * cuotasPagadas) : 0;
  const interesGanado = cuotasPagadas > 0 ? Math.round((cuotaMensual * cuotasPagadas) - capitalPagado) : 0;
  const saldoPendiente = montoFinanciar - capitalPagado;

  return {
    projectId,
    projectName,
    costoDirecto,
    montoFinanciar,
    tasaMensual,
    plazoMeses,
    cuotaMensual,
    totalIntereses,
    retornoBitcoper,
    capitalPagado,
    interesGanado,
    saldoPendiente,
    tokenId: tokenId || generateTokenId(),
    statusFinanciamiento,
  };
}

export function burnTokens(
  montoFinanciar: number,
  tasaMensual: number,
  plazoMeses: number,
  cuotasPagadas: number,
  tokenId: string
): BurnTokensResult {
  const tasaDecimal = tasaMensual / 100;
  
  const cuotaMensual = tasaDecimal > 0
    ? Math.round(montoFinanciar * (tasaDecimal * Math.pow(1 + tasaDecimal, plazoMeses)) / (Math.pow(1 + tasaDecimal, plazoMeses) - 1))
    : Math.round(montoFinanciar / plazoMeses);

  let capitalAcumulado = 0;
  let interesAcumulado = 0;
  let saldo = montoFinanciar;

  for (let i = 0; i < cuotasPagadas && i < plazoMeses; i++) {
    const interesMes = Math.round(saldo * tasaDecimal);
    const capitalMes = cuotaMensual - interesMes;
    capitalAcumulado += capitalMes;
    interesAcumulado += interesMes;
    saldo -= capitalMes;
  }

  const cuotasRestantes = plazoMeses - cuotasPagadas;

  return {
    tokenId,
    capitalInicial: montoFinanciar,
    capitalPagado: Math.round(capitalAcumulado),
    interesGanado: Math.round(interesAcumulado),
    saldoPendiente: Math.max(0, Math.round(saldo)),
    cuotasRestantes: Math.max(0, cuotasRestantes),
    retornoBitcoper: Math.round(interesAcumulado),
  };
}
