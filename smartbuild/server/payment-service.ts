import crypto from "crypto";
import { storage } from "./storage";
import {
  recommendPaymentGateway,
  processPayment as processGatewayPayment,
  getPaymentSplit,
  type PaymentIntent,
  type PaymentRecommendation,
  type PaymentResult,
} from "./payment-switch";
import { getCountryConfig } from "../shared/country-config";
import {
  PAYMENT_STATUS,
  PAYMENT_PROVIDERS,
  PAYMENT_NOTIFICATION_TYPES,
  type PaymentTransaction,
  type InsertPaymentTransaction,
} from "../shared/models/auth";

export interface CreatePaymentRequest {
  amount: number;
  countryCode: string;
  gatewayId: string;
  description?: string;
  clientLeadId?: number;
  maestroId?: number;
  marketplaceRequestId?: number;
  projectWalletId?: number;
  metadata?: Record<string, unknown>;
}

export interface WebhookPayload {
  provider: string;
  event: string;
  transactionId: string;
  status: string;
  amount?: number;
  rawPayload: Record<string, unknown>;
  signature?: string;
}

function generateExternalId(): string {
  return `PAY-${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
}

export class PaymentService {
  recommend(intent: PaymentIntent): PaymentRecommendation {
    return recommendPaymentGateway(intent);
  }

  async createPayment(req: CreatePaymentRequest): Promise<{
    transaction: PaymentTransaction;
    gatewayResult: PaymentResult;
  }> {
    const config = getCountryConfig(req.countryCode);
    const split = getPaymentSplit(req.amount, req.countryCode);

    const guaranteePercent = 0.02;
    const montoGarantia = Math.round(req.amount * guaranteePercent);
    const montoLiberado = req.amount - montoGarantia;

    const intent: PaymentIntent = {
      amount: req.amount,
      countryCode: req.countryCode,
      description: req.description || "Pago SmartBuild",
      clientId: req.clientLeadId,
      maestroId: req.maestroId,
      walletId: req.projectWalletId,
    };

    const gatewayResult = await processGatewayPayment(intent, req.gatewayId);

    const externalId = generateExternalId();

    const txData: InsertPaymentTransaction = {
      externalId,
      provider: req.gatewayId,
      providerTransactionId: gatewayResult.transactionId || null,
      status: gatewayResult.success ? PAYMENT_STATUS.PROCESANDO : PAYMENT_STATUS.FALLIDO,
      montoTotal: req.amount.toString(),
      montoGarantia: montoGarantia.toString(),
      montoLiberado: montoLiberado.toString(),
      montoComision: split.platform.toString(),
      montoFerreteria: split.ferreteria.toString(),
      montoPlatforma: split.platform.toString(),
      montoCashbackMaestro: split.maestroCashback.toString(),
      countryCode: req.countryCode,
      currency: config.currency.code,
      marketplaceRequestId: req.marketplaceRequestId || null,
      projectWalletId: req.projectWalletId || null,
      clientLeadId: req.clientLeadId || null,
      maestroId: req.maestroId || null,
      description: req.description || null,
      metadata: {
        gatewayResponse: gatewayResult.gatewayResponse,
        redirectUrl: gatewayResult.redirectUrl,
        ...req.metadata,
      },
    };

    const transaction = await storage.createPaymentTransaction(txData);

    return { transaction, gatewayResult };
  }

  async handleWebhook(payload: WebhookPayload): Promise<{
    processed: boolean;
    transaction?: PaymentTransaction;
    error?: string;
  }> {
    let existingTx: PaymentTransaction | undefined;
    if (payload.transactionId) {
      existingTx = await storage.getPaymentTransactionByProviderId(payload.transactionId);
      if (!existingTx) {
        existingTx = await storage.getPaymentTransactionByExternalId(payload.transactionId);
      }
    }

    if (!existingTx) {
      return {
        processed: false,
        error: `Transaccion no encontrada: ${payload.transactionId}`,
      };
    }

    const validTransitions: Record<string, string[]> = {
      [PAYMENT_STATUS.PENDIENTE]: [PAYMENT_STATUS.PROCESANDO, PAYMENT_STATUS.PAGADO, PAYMENT_STATUS.FALLIDO],
      [PAYMENT_STATUS.PROCESANDO]: [PAYMENT_STATUS.PAGADO, PAYMENT_STATUS.FALLIDO],
      [PAYMENT_STATUS.PAGADO]: [PAYMENT_STATUS.REEMBOLSADO],
      [PAYMENT_STATUS.FALLIDO]: [],
      [PAYMENT_STATUS.REEMBOLSADO]: [],
    };

    if (existingTx.status === PAYMENT_STATUS.PAGADO && payload.event === "payment_approved") {
      return { processed: true, transaction: existingTx };
    }

    let newStatus: string;
    const updates: Partial<InsertPaymentTransaction> = {
      webhookReceivedAt: new Date(),
      metadata: {
        ...(existingTx.metadata as Record<string, unknown> || {}),
        lastWebhook: payload.rawPayload,
        webhookEvent: payload.event,
      },
    };

    switch (payload.event) {
      case "payment_approved":
      case "payment.successful":
      case "payment_intent.succeeded":
        newStatus = PAYMENT_STATUS.PAGADO;
        updates.paidAt = new Date();
        break;
      case "payment_rejected":
      case "payment.failed":
      case "payment_intent.payment_failed":
        newStatus = PAYMENT_STATUS.FALLIDO;
        break;
      case "payment_refunded":
      case "charge.refunded":
        newStatus = PAYMENT_STATUS.REEMBOLSADO;
        break;
      case "payment_pending":
      case "payment.pending":
        newStatus = PAYMENT_STATUS.PROCESANDO;
        break;
      default:
        newStatus = existingTx.status;
    }

    const allowed = validTransitions[existingTx.status] || [];
    if (newStatus !== existingTx.status && !allowed.includes(newStatus)) {
      return {
        processed: true,
        transaction: existingTx,
        error: `Transicion invalida: ${existingTx.status} -> ${newStatus}`,
      };
    }

    const updatedTx = await storage.updatePaymentTransactionStatus(
      existingTx.id,
      newStatus,
      updates
    );

    if (newStatus === PAYMENT_STATUS.PAGADO) {
      await this.onPaymentApproved(updatedTx);
    } else if (newStatus === PAYMENT_STATUS.FALLIDO) {
      await this.onPaymentFailed(updatedTx);
    }

    return { processed: true, transaction: updatedTx };
  }

  private async onPaymentApproved(tx: PaymentTransaction): Promise<void> {
    if (tx.marketplaceRequestId) {
      try {
        await storage.updateMarketplaceRequestStatus(tx.marketplaceRequestId, "pagado");
      } catch (err) {
        console.error("Error updating marketplace request status:", err);
      }
    }

    if (tx.projectWalletId) {
      try {
        const wallet = await storage.getProjectWallet(tx.projectWalletId);
        if (wallet && wallet.status === "HELD_IN_ESCROW") {
          await storage.updateProjectWallet(tx.projectWalletId, {
            status: "SPLIT_ALLOCATED",
          });
        }

        await storage.createEscrowNotification({
          projectWalletId: tx.projectWalletId,
          recipientType: "client",
          recipientId: tx.clientLeadId || 0,
          type: PAYMENT_NOTIFICATION_TYPES.PAYMENT_APPROVED,
          title: "Pago Confirmado",
          message: `Tu pago de $${Number(tx.montoTotal).toLocaleString()} ha sido confirmado. Los fondos están en custodia.`,
          read: false,
        });

        if (tx.maestroId) {
          await storage.createEscrowNotification({
            projectWalletId: tx.projectWalletId,
            recipientType: "maestro",
            recipientId: tx.maestroId,
            type: PAYMENT_NOTIFICATION_TYPES.PAYMENT_APPROVED,
            title: "Pago Recibido",
            message: `Se ha recibido un pago de $${Number(tx.montoTotal).toLocaleString()} para tu proyecto. Fondos en custodia.`,
            read: false,
          });
        }
      } catch (err) {
        console.error("Error processing escrow on payment approval:", err);
      }
    }

    if (tx.maestroId && Number(tx.montoCashbackMaestro) > 0) {
      try {
        await storage.incrementMaestroCreditScore(tx.maestroId, Number(tx.montoCashbackMaestro));
      } catch (err) {
        console.error("Error adding maestro cashback:", err);
      }
    }
  }

  private async onPaymentFailed(tx: PaymentTransaction): Promise<void> {
    if (tx.marketplaceRequestId) {
      try {
        await storage.updateMarketplaceRequestStatus(tx.marketplaceRequestId, "pago_fallido");
      } catch (err) {
        console.error("Error updating marketplace request on payment failure:", err);
      }
    }

    if (tx.projectWalletId && tx.clientLeadId) {
      try {
        await storage.createEscrowNotification({
          projectWalletId: tx.projectWalletId,
          recipientType: "client",
          recipientId: tx.clientLeadId,
          type: PAYMENT_NOTIFICATION_TYPES.PAYMENT_FAILED,
          title: "Pago Fallido",
          message: `Tu pago no pudo ser procesado. Por favor intenta nuevamente.`,
          read: false,
        });
      } catch (err) {
        console.error("Error creating payment failure notification:", err);
      }
    }
  }

  async getTransactionsByClient(clientLeadId: number): Promise<PaymentTransaction[]> {
    return storage.getPaymentTransactionsByClient(clientLeadId);
  }

  async getTransactionsByMaestro(maestroId: number): Promise<PaymentTransaction[]> {
    return storage.getPaymentTransactionsByMaestro(maestroId);
  }

  async getTransactionsByWallet(projectWalletId: number): Promise<PaymentTransaction[]> {
    return storage.getPaymentTransactionsByWallet(projectWalletId);
  }

  async getTransaction(id: number): Promise<PaymentTransaction | undefined> {
    return storage.getPaymentTransactionById(id);
  }

  async getTransactionByExternalId(externalId: string): Promise<PaymentTransaction | undefined> {
    return storage.getPaymentTransactionByExternalId(externalId);
  }

  verifyFintocSignature(payload: string, signature: string, secret: string): boolean {
    if (!secret) return true;
    const computed = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    return crypto.timingSafeEqual(
      Buffer.from(computed, "hex"),
      Buffer.from(signature, "hex")
    );
  }

  verifyMercadoPagoSignature(
    xSignature: string,
    xRequestId: string,
    dataId: string,
    secret: string
  ): boolean {
    if (!secret) return true;
    const parts = xSignature.split(",");
    let ts = "";
    let hash = "";
    for (const part of parts) {
      const [key, value] = part.trim().split("=");
      if (key === "ts") ts = value;
      if (key === "v1") hash = value;
    }
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
    const computed = crypto
      .createHmac("sha256", secret)
      .update(manifest)
      .digest("hex");
    try {
      return crypto.timingSafeEqual(
        Buffer.from(computed, "hex"),
        Buffer.from(hash, "hex")
      );
    } catch {
      return false;
    }
  }
}

export const paymentService = new PaymentService();
