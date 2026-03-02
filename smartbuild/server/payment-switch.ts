import {
  getCountryConfig,
  formatCurrency,
  type PaymentGatewayConfig,
  type CountryConfig,
} from "../shared/country-config";

export interface PaymentIntent {
  amount: number;
  countryCode: string;
  description: string;
  clientId?: number;
  maestroId?: number;
  walletId?: number;
  metadata?: Record<string, string>;
}

export interface PaymentRecommendation {
  primary: {
    gateway: PaymentGatewayConfig;
    reason: string;
    displayLabel: string;
    estimatedCommission: number;
    netToReceive: number;
  };
  alternatives: {
    gateway: PaymentGatewayConfig;
    reason: string;
    displayLabel: string;
    estimatedCommission: number;
    netToReceive: number;
  }[];
  amount: number;
  formattedAmount: string;
  countryCode: string;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  gatewayId: string;
  gatewayResponse?: Record<string, unknown>;
  error?: string;
  status: "pending" | "completed" | "failed" | "requires_action";
  redirectUrl?: string;
}

function computeCommission(amount: number, gateway: PaymentGatewayConfig) {
  const commission = Math.round(amount * (gateway.commissionPercent / 100));
  return { commission, net: amount - commission };
}

function isHighAmount(amount: number, config: CountryConfig): boolean {
  return amount >= config.highAmountThreshold;
}

export function recommendPaymentGateway(intent: PaymentIntent): PaymentRecommendation {
  const config = getCountryConfig(intent.countryCode);
  const enabledGateways = config.paymentGateways.filter(
    (g) => g.enabled && intent.amount >= g.minAmount && intent.amount <= g.maxAmount
  );

  if (enabledGateways.length === 0) {
    const fallback = config.paymentGateways.find((g) => g.enabled);
    if (!fallback) {
      throw new Error(`No payment gateways available for ${config.name}`);
    }
    enabledGateways.push(fallback);
  }

  const highAmount = isHighAmount(intent.amount, config);

  let primary: PaymentGatewayConfig;
  let reason: string;
  let displayLabel: string;

  if (highAmount) {
    const bankTransfer = enabledGateways.find((g) => g.supportsBankTransfer);
    if (bankTransfer) {
      primary = bankTransfer;
      reason = `Monto alto (${formatCurrency(intent.amount, intent.countryCode)}): transferencia bancaria reduce comisiones`;
      displayLabel = `Paga con tu Banco (Sin comision)`;
    } else {
      primary = enabledGateways.reduce((a, b) =>
        a.commissionPercent < b.commissionPercent ? a : b
      );
      reason = `Menor comision disponible para monto alto`;
      displayLabel = primary.displayName;
    }
  } else {
    const cardGateway = enabledGateways.find(
      (g) => g.supportsCreditCard && g.supportsInstallments
    );
    if (cardGateway) {
      primary = cardGateway;
      reason = `Monto bajo: tarjeta/cuotas disponible para mayor flexibilidad`;
      displayLabel = `Tarjeta de Credito o Cuotas`;
    } else {
      primary = enabledGateways[0];
      reason = `Unica pasarela disponible`;
      displayLabel = primary.displayName;
    }
  }

  const { commission: primaryCommission, net: primaryNet } = computeCommission(
    intent.amount,
    primary
  );

  const alternatives = enabledGateways
    .filter((g) => g.id !== primary.id)
    .map((g) => {
      const { commission, net } = computeCommission(intent.amount, g);
      return {
        gateway: g,
        reason: g.supportsBankTransfer
          ? "Transferencia bancaria"
          : g.supportsInstallments
          ? "Cuotas disponibles"
          : "Alternativa",
        displayLabel: g.displayName,
        estimatedCommission: commission,
        netToReceive: net,
      };
    });

  return {
    primary: {
      gateway: primary,
      reason,
      displayLabel,
      estimatedCommission: primaryCommission,
      netToReceive: primaryNet,
    },
    alternatives,
    amount: intent.amount,
    formattedAmount: formatCurrency(intent.amount, intent.countryCode),
    countryCode: intent.countryCode,
  };
}

interface GatewayAdapter {
  createPayment(intent: PaymentIntent): Promise<PaymentResult>;
  verifyPayment(transactionId: string): Promise<PaymentResult>;
  refundPayment(transactionId: string, amount?: number): Promise<PaymentResult>;
}

const gatewayAdapters: Record<string, GatewayAdapter> = {
  fintoc: {
    async createPayment(intent) {
      return {
        success: true,
        transactionId: `FINTOC-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        gatewayId: "fintoc",
        status: "pending",
        gatewayResponse: {
          provider: "fintoc",
          amount: intent.amount,
          note: "Fintoc integration pending - requires API key setup",
        },
      };
    },
    async verifyPayment(transactionId) {
      return { success: true, transactionId, gatewayId: "fintoc", status: "pending" };
    },
    async refundPayment(transactionId) {
      return { success: true, transactionId, gatewayId: "fintoc", status: "pending" };
    },
  },
  mercadopago: {
    async createPayment(intent) {
      return {
        success: true,
        transactionId: `MP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        gatewayId: "mercadopago",
        status: "pending",
        gatewayResponse: {
          provider: "mercadopago",
          amount: intent.amount,
          note: "MercadoPago integration pending - requires API key setup",
        },
      };
    },
    async verifyPayment(transactionId) {
      return { success: true, transactionId, gatewayId: "mercadopago", status: "pending" };
    },
    async refundPayment(transactionId) {
      return { success: true, transactionId, gatewayId: "mercadopago", status: "pending" };
    },
  },
  culqi: {
    async createPayment(intent) {
      return {
        success: true,
        transactionId: `CULQI-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        gatewayId: "culqi",
        status: "pending",
        gatewayResponse: {
          provider: "culqi",
          amount: intent.amount,
          note: "Culqi integration pending - requires API key setup",
        },
      };
    },
    async verifyPayment(transactionId) {
      return { success: true, transactionId, gatewayId: "culqi", status: "pending" };
    },
    async refundPayment(transactionId) {
      return { success: true, transactionId, gatewayId: "culqi", status: "pending" };
    },
  },
};

export async function processPayment(
  intent: PaymentIntent,
  gatewayId: string
): Promise<PaymentResult> {
  const adapter = gatewayAdapters[gatewayId];
  if (!adapter) {
    return {
      success: false,
      gatewayId,
      status: "failed",
      error: `Gateway "${gatewayId}" no disponible`,
    };
  }

  try {
    return await adapter.createPayment(intent);
  } catch (err) {
    return {
      success: false,
      gatewayId,
      status: "failed",
      error: err instanceof Error ? err.message : "Error desconocido",
    };
  }
}

export async function verifyPayment(
  gatewayId: string,
  transactionId: string
): Promise<PaymentResult> {
  const adapter = gatewayAdapters[gatewayId];
  if (!adapter) {
    return { success: false, gatewayId, status: "failed", error: "Gateway no disponible" };
  }
  return adapter.verifyPayment(transactionId);
}

export function getPaymentSplit(
  amount: number,
  countryCode: string
): {
  ferreteria: number;
  platform: number;
  maestroCashback: number;
  formattedTotal: string;
} {
  const ferreteriaPercent = 0.85;
  const platformPercent = 0.12;
  const cashbackPercent = 0.03;

  return {
    ferreteria: Math.round(amount * ferreteriaPercent),
    platform: Math.round(amount * platformPercent),
    maestroCashback: Math.round(amount * cashbackPercent),
    formattedTotal: formatCurrency(amount, countryCode),
  };
}
