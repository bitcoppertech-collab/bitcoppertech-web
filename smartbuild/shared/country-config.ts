export interface PaymentGatewayConfig {
  id: string;
  name: string;
  displayName: string;
  supportsCreditCard: boolean;
  supportsDebit: boolean;
  supportsBankTransfer: boolean;
  supportsInstallments: boolean;
  commissionPercent: number;
  minAmount: number;
  maxAmount: number;
  enabled: boolean;
}

export interface CountryConfig {
  code: string;
  name: string;
  currency: {
    code: string;
    symbol: string;
    decimalPlaces: number;
    thousandsSeparator: string;
    decimalSeparator: string;
    symbolPosition: "before" | "after";
  };
  tax: {
    name: string;
    rate: number;
    included: boolean;
  };
  locale: string;
  paymentGateways: PaymentGatewayConfig[];
  highAmountThreshold: number;
  distributors: string[];
}

const CHILE_CONFIG: CountryConfig = {
  code: "CL",
  name: "Chile",
  currency: {
    code: "CLP",
    symbol: "$",
    decimalPlaces: 0,
    thousandsSeparator: ".",
    decimalSeparator: ",",
    symbolPosition: "before",
  },
  tax: {
    name: "IVA",
    rate: 0.19,
    included: true,
  },
  locale: "es-CL",
  paymentGateways: [
    {
      id: "fintoc",
      name: "fintoc",
      displayName: "Transferencia Bancaria (Fintoc)",
      supportsCreditCard: false,
      supportsDebit: false,
      supportsBankTransfer: true,
      supportsInstallments: false,
      commissionPercent: 0.8,
      minAmount: 1000,
      maxAmount: 50000000,
      enabled: true,
    },
    {
      id: "mercadopago",
      name: "mercadopago",
      displayName: "MercadoPago (Tarjeta / Cuotas)",
      supportsCreditCard: true,
      supportsDebit: true,
      supportsBankTransfer: false,
      supportsInstallments: true,
      commissionPercent: 3.49,
      minAmount: 100,
      maxAmount: 50000000,
      enabled: true,
    },
  ],
  highAmountThreshold: 50000,
  distributors: ["Sodimac", "Easy"],
};

const PERU_CONFIG: CountryConfig = {
  code: "PE",
  name: "Peru",
  currency: {
    code: "PEN",
    symbol: "S/",
    decimalPlaces: 2,
    thousandsSeparator: ",",
    decimalSeparator: ".",
    symbolPosition: "before",
  },
  tax: {
    name: "IGV",
    rate: 0.18,
    included: true,
  },
  locale: "es-PE",
  paymentGateways: [
    {
      id: "culqi",
      name: "culqi",
      displayName: "Culqi (Tarjeta / Transferencia)",
      supportsCreditCard: true,
      supportsDebit: true,
      supportsBankTransfer: true,
      supportsInstallments: false,
      commissionPercent: 3.99,
      minAmount: 1,
      maxAmount: 500000,
      enabled: true,
    },
    {
      id: "mercadopago",
      name: "mercadopago",
      displayName: "MercadoPago (Tarjeta / Cuotas)",
      supportsCreditCard: true,
      supportsDebit: true,
      supportsBankTransfer: false,
      supportsInstallments: true,
      commissionPercent: 4.49,
      minAmount: 1,
      maxAmount: 500000,
      enabled: true,
    },
  ],
  highAmountThreshold: 200,
  distributors: ["Promart", "Maestro"],
};

const COLOMBIA_CONFIG: CountryConfig = {
  code: "CO",
  name: "Colombia",
  currency: {
    code: "COP",
    symbol: "$",
    decimalPlaces: 0,
    thousandsSeparator: ".",
    decimalSeparator: ",",
    symbolPosition: "before",
  },
  tax: {
    name: "IVA",
    rate: 0.19,
    included: true,
  },
  locale: "es-CO",
  paymentGateways: [
    {
      id: "mercadopago",
      name: "mercadopago",
      displayName: "MercadoPago (Tarjeta / Cuotas)",
      supportsCreditCard: true,
      supportsDebit: true,
      supportsBankTransfer: false,
      supportsInstallments: true,
      commissionPercent: 3.79,
      minAmount: 1000,
      maxAmount: 100000000,
      enabled: true,
    },
  ],
  highAmountThreshold: 200000,
  distributors: ["Homecenter"],
};

const COUNTRY_CONFIGS: Record<string, CountryConfig> = {
  CL: CHILE_CONFIG,
  PE: PERU_CONFIG,
  CO: COLOMBIA_CONFIG,
};

const DEFAULT_COUNTRY = "CL";

export function getCountryConfig(countryCode?: string): CountryConfig {
  const code = (countryCode || DEFAULT_COUNTRY).toUpperCase();
  return COUNTRY_CONFIGS[code] || COUNTRY_CONFIGS[DEFAULT_COUNTRY];
}

export function isCountrySupported(countryCode: string): boolean {
  return countryCode.toUpperCase() in COUNTRY_CONFIGS;
}

export function getSupportedCountries(): { code: string; name: string }[] {
  return Object.values(COUNTRY_CONFIGS).map((c) => ({
    code: c.code,
    name: c.name,
  }));
}

export function formatCurrency(amount: number, countryCode?: string): string {
  const config = getCountryConfig(countryCode);
  const { symbol, decimalPlaces, symbolPosition } = config.currency;

  const formatted = amount.toLocaleString(config.locale, {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  });

  if (symbolPosition === "before") {
    return `${symbol}${formatted}`;
  }
  return `${formatted} ${symbol}`;
}

export function calculateTax(netAmount: number, countryCode?: string): {
  net: number;
  tax: number;
  total: number;
  taxName: string;
  taxRate: number;
} {
  const config = getCountryConfig(countryCode);
  const { rate, name, included } = config.tax;

  if (included) {
    const net = Math.round(netAmount / (1 + rate));
    const tax = netAmount - net;
    return { net, tax, total: netAmount, taxName: name, taxRate: rate };
  }

  const tax = Math.round(netAmount * rate);
  return { net: netAmount, tax, total: netAmount + tax, taxName: name, taxRate: rate };
}

export function getAvailableGateways(countryCode?: string): PaymentGatewayConfig[] {
  const config = getCountryConfig(countryCode);
  return config.paymentGateways.filter((g) => g.enabled);
}
