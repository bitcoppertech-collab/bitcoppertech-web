import { getCountryConfig, formatCurrency, calculateTax, getAvailableGateways, getSupportedCountries } from "../../../shared/country-config";
import type { CountryConfig, PaymentGatewayConfig } from "../../../shared/country-config";

const COUNTRY_STORAGE_KEY = "smartbuild_country";

export function getActiveCountry(): string {
  if (typeof window !== "undefined") {
    return localStorage.getItem(COUNTRY_STORAGE_KEY) || "CL";
  }
  return "CL";
}

export function setActiveCountry(code: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(COUNTRY_STORAGE_KEY, code);
  }
}

export function fc(amount: number, countryCode?: string): string {
  return formatCurrency(amount, countryCode || getActiveCountry());
}

export function taxInfo(amount: number, countryCode?: string) {
  return calculateTax(amount, countryCode || getActiveCountry());
}

export function activeConfig(countryCode?: string): CountryConfig {
  return getCountryConfig(countryCode || getActiveCountry());
}

export function activeGateways(countryCode?: string): PaymentGatewayConfig[] {
  return getAvailableGateways(countryCode || getActiveCountry());
}

export { getSupportedCountries, formatCurrency, getCountryConfig };
export type { CountryConfig, PaymentGatewayConfig };
