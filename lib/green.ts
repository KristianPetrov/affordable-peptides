import "server-only";

type GreenDraftVerificationInput = {
  name: string;
  emailAddress?: string;
  phone: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
  routingNumber: string;
  accountNumber: string;
  bankName: string;
  checkMemo: string;
  checkAmount: string;
  checkDate: string;
  checkNumber: string;
};

export type GreenDraftVerificationResult = {
  result?: string;
  resultDescription?: string;
  verifyResult: string;
  verifyResultDescription: string;
  checkNumber?: string;
  checkId?: string;
};

const GREEN_ENDPOINT = "https://www.greenbyphone.com/eCheck.asmx/OneTimeDraftRTV";

function normalizePhone (value: string): string
{
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 10) {
    throw new Error("Enter a valid 10-digit phone number for GreenButton.");
  }

  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function normalizeState (value: string): string
{
  const trimmed = value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(trimmed)) {
    throw new Error("Enter a valid 2-letter state code for GreenButton.");
  }

  return trimmed;
}

function normalizeZip (value: string): string
{
  const trimmed = value.trim();
  if (!/^\d{5}(?:-\d{4})?$/.test(trimmed)) {
    throw new Error("Enter a valid ZIP code for GreenButton.");
  }

  return trimmed;
}

function normalizeCountry (value?: string): string
{
  const trimmed = value?.trim();
  if (!trimmed) {
    return "US";
  }

  const normalized = trimmed.toUpperCase();
  if (normalized === "UNITED STATES" || normalized === "USA" || normalized === "US") {
    return "US";
  }

  if (/^[A-Z]{2}$/.test(normalized)) {
    return normalized;
  }

  return normalized.slice(0, 2);
}

function normalizeRoutingNumber (value: string): string
{
  const digits = value.replace(/\D/g, "");
  if (!/^\d{9}$/.test(digits)) {
    throw new Error("Routing number must be exactly 9 digits.");
  }

  return digits;
}

function normalizeAccountNumber (value: string): string
{
  const digits = value.replace(/\s/g, "");
  if (!/^\d{4,17}$/.test(digits)) {
    throw new Error("Account number must be 4 to 17 digits.");
  }

  return digits;
}

function normalizeAmount (value: string): string
{
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("GreenButton payment amount must be greater than zero.");
  }

  return parsed.toFixed(2);
}

function formatCheckDate (value: string): string
{
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("GreenButton check date is invalid.");
  }

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = String(date.getFullYear());
  return `${month}/${day}/${year}`;
}

function extractXmlValue (xml: string, tagName: string): string | undefined
{
  const match = xml.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, "i"));
  return match?.[1]?.trim();
}

function getRequiredGreenCredentials (): {
  clientId: string;
  apiPassword: string;
}
{
  const clientId = process.env.GREEN_CLIENT_ID?.trim();
  const apiPassword = process.env.GREEN_API_PASSWORD?.trim();

  if (!clientId || !apiPassword) {
    throw new Error("GreenButton API credentials are not configured.");
  }

  return { clientId, apiPassword };
}

export async function submitGreenOneTimeDraftRTV (
  input: GreenDraftVerificationInput
): Promise<GreenDraftVerificationResult>
{
  const { clientId, apiPassword } = getRequiredGreenCredentials();

  const body = new URLSearchParams({
    Client_ID: clientId,
    ApiPassword: apiPassword,
    Name: input.name.trim(),
    EmailAddress: input.emailAddress?.trim() ?? "",
    Phone: normalizePhone(input.phone),
    PhoneExtension: "",
    Address1: input.address1.trim(),
    Address2: input.address2?.trim() ?? "",
    City: input.city.trim(),
    State: normalizeState(input.state),
    Zip: normalizeZip(input.zip),
    Country: normalizeCountry(input.country),
    RoutingNumber: normalizeRoutingNumber(input.routingNumber),
    AccountNumber: normalizeAccountNumber(input.accountNumber),
    BankName: input.bankName.trim(),
    CheckMemo: input.checkMemo.trim(),
    CheckAmount: normalizeAmount(input.checkAmount),
    CheckDate: formatCheckDate(input.checkDate),
    CheckNumber: input.checkNumber.trim(),
    x_delim_data: "",
    x_delim_char: "|",
  });

  const response = await fetch(GREEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  const responseText = await response.text();

  if (!response.ok) {
    const faultString =
      extractXmlValue(responseText, "faultstring") ??
      extractXmlValue(responseText, "message");
    throw new Error(
      faultString || "GreenButton rejected the payment request."
    );
  }

  const result: GreenDraftVerificationResult = {
    result: extractXmlValue(responseText, "Result"),
    resultDescription: extractXmlValue(responseText, "ResultDescription"),
    verifyResult: extractXmlValue(responseText, "VerifyResult") ?? "",
    verifyResultDescription:
      extractXmlValue(responseText, "VerifyResultDescription") ?? "",
    checkNumber: extractXmlValue(responseText, "CheckNumber"),
    checkId: extractXmlValue(responseText, "Check_ID"),
  };

  if (result.result && result.result !== "0") {
    throw new Error(
      result.resultDescription ||
      "GreenButton did not accept the payment request."
    );
  }

  if (!result.verifyResult) {
    throw new Error("GreenButton returned an unexpected payment response.");
  }

  if (result.verifyResult !== "0") {
    throw new Error(
      result.verifyResultDescription ||
      "GreenButton could not verify the bank account."
    );
  }

  return result;
}

const DEFAULT_GREEN_API_ENDPOINT = "https://www.greenbyphone.com/eCheck.asmx";
const GREEN_DELIMITER = "|";

const GREEN_CHECK_ID_KEYS = [
  "Check_ID",
  "check_id",
  "CheckID",
  "checkId",
  "Process_ID",
  "process_id",
  "ProcessID",
  "processId",
] as const;

const GREEN_INVOICE_ID_KEYS = [
  "Invoice_ID",
  "invoice_id",
  "InvoiceID",
  "invoiceId",
] as const;

export type GreenPaymentStatus = "paid" | "pending" | "failed" | "cancelled";

export type GreenPaymentVerificationResult = {
  status: GreenPaymentStatus;
  message: string;
  provider: "check" | "invoice" | "none";
  providerId?: string;
  shouldMarkPaid: boolean;
  raw: Record<string, string>;
};

type GreenCredentials = {
  clientId: string;
  apiPassword: string;
  endpoint: string;
};

function getGreenCredentials(): GreenCredentials {
  const clientId =
    process.env.GREEN_CLIENT_ID?.trim() ||
    process.env.GREEN_API_CLIENT_ID?.trim() ||
    "";
  const apiPassword =
    process.env.GREEN_API_PASSWORD?.trim() ||
    process.env.GREEN_PASSWORD?.trim() ||
    "";
  const endpoint =
    process.env.GREEN_API_ENDPOINT?.trim() ||
    process.env.GREEN_API_URL?.trim() ||
    DEFAULT_GREEN_API_ENDPOINT;

  if (!clientId || !apiPassword) {
    throw new Error(
      "Green API credentials are not configured. Set GREEN_CLIENT_ID and GREEN_API_PASSWORD."
    );
  }

  return { clientId, apiPassword, endpoint };
}

function decodeXmlEntities(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");
}

function extractDelimitedPayload(rawText: string): string {
  const trimmed = rawText.trim();

  if (!trimmed.startsWith("<")) {
    return trimmed;
  }

  const stringMatch = trimmed.match(/<string[^>]*>([\s\S]*?)<\/string>/i);
  if (stringMatch) {
    return decodeXmlEntities(stringMatch[1].trim());
  }

  return decodeXmlEntities(trimmed.replace(/<[^>]+>/g, " ").trim());
}

function mapDelimitedFields(
  outputFields: readonly string[],
  payload: string
): Record<string, string> {
  const values = payload.split(GREEN_DELIMITER);

  return outputFields.reduce<Record<string, string>>((acc, fieldName, index) => {
    acc[fieldName] = values[index]?.trim() ?? "";
    return acc;
  }, {});
}

function isTruthy(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }

  return ["1", "true", "yes", "y"].includes(value.trim().toLowerCase());
}

function getGreenMethodUrl(methodName: string): string {
  const { endpoint } = getGreenCredentials();
  return `${endpoint.replace(/\/+$/, "")}/${methodName}`;
}

async function callGreenDelimitedMethod(
  methodName: string,
  fields: Record<string, string>,
  outputFields: readonly string[]
): Promise<Record<string, string>> {
  const { clientId, apiPassword } = getGreenCredentials();
  const body = new URLSearchParams({
    Client_ID: clientId,
    ApiPassword: apiPassword,
    ...fields,
    x_delim_data: "TRUE",
    x_delim_char: GREEN_DELIMITER,
  });

  const response = await fetch(getGreenMethodUrl(methodName), {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
    },
    body: body.toString(),
    cache: "no-store",
  });

  if (!response.ok) {
    const responseBody = await response.text().catch(() => "");
    throw new Error(
      `Green ${methodName} request failed with ${response.status}: ${responseBody}`
    );
  }

  const rawText = await response.text();
  const delimitedPayload = extractDelimitedPayload(rawText);

  if (!delimitedPayload) {
    throw new Error(`Green ${methodName} returned an empty response.`);
  }

  return mapDelimitedFields(outputFields, delimitedPayload);
}

async function fetchCheckStatus(
  checkId: string
): Promise<Record<string, string>> {
  return callGreenDelimitedMethod(
    "CheckStatus",
    {
      Check_ID: checkId,
    },
    [
      "Result",
      "ResultDescription",
      "VerifyResult",
      "VerifyResultDescription",
      "VerifyOverriden",
      "Deleted",
      "DeletedDate",
      "Processed",
      "ProcessedDate",
      "Rejected",
      "RejectedDate",
      "CheckNumber",
      "Check_ID",
    ]
  );
}

async function fetchInvoiceStatus(
  invoiceId: string
): Promise<Record<string, string>> {
  return callGreenDelimitedMethod(
    "InvoiceStatus",
    {
      Invoice_ID: invoiceId,
    },
    [
      "Result",
      "ResultDescription",
      "PaymentResult",
      "PaymentResultDescription",
      "Invoice_ID",
      "Check_ID",
    ]
  );
}

function interpretCheckStatus(
  raw: Record<string, string>
): GreenPaymentVerificationResult {
  if (raw.Result !== "0") {
    return {
      status: "pending",
      message:
        raw.ResultDescription ||
        "We received your Green return, but payment confirmation is not available yet.",
      provider: "check",
      providerId: raw.Check_ID || undefined,
      shouldMarkPaid: false,
      raw,
    };
  }

  if (isTruthy(raw.Deleted)) {
    return {
      status: "cancelled",
      message:
        raw.ResultDescription ||
        "Your Green payment was cancelled before it completed.",
      provider: "check",
      providerId: raw.Check_ID || undefined,
      shouldMarkPaid: false,
      raw,
    };
  }

  if (isTruthy(raw.Rejected)) {
    return {
      status: "failed",
      message:
        raw.VerifyResultDescription ||
        raw.ResultDescription ||
        "Green rejected this payment attempt.",
      provider: "check",
      providerId: raw.Check_ID || undefined,
      shouldMarkPaid: false,
      raw,
    };
  }

  if (isTruthy(raw.Processed) || raw.VerifyResult === "0") {
    return {
      status: "paid",
      message:
        raw.VerifyResultDescription ||
        raw.ResultDescription ||
        "Green confirmed that your payment was received.",
      provider: "check",
      providerId: raw.Check_ID || undefined,
      shouldMarkPaid: true,
      raw,
    };
  }

  if (raw.VerifyResult === "1" || raw.VerifyResult === "4") {
    return {
      status: "pending",
      message:
        raw.VerifyResultDescription ||
        "Green is still verifying your payment. Please check again shortly.",
      provider: "check",
      providerId: raw.Check_ID || undefined,
      shouldMarkPaid: false,
      raw,
    };
  }

  if (raw.VerifyResult === "2" || raw.VerifyResult === "3") {
    return {
      status: "failed",
      message:
        raw.VerifyResultDescription ||
        "Green could not approve this payment method.",
      provider: "check",
      providerId: raw.Check_ID || undefined,
      shouldMarkPaid: false,
      raw,
    };
  }

  return {
    status: "pending",
    message:
      raw.VerifyResultDescription ||
      raw.ResultDescription ||
      "Green has not confirmed the payment yet.",
    provider: "check",
    providerId: raw.Check_ID || undefined,
    shouldMarkPaid: false,
    raw,
  };
}

function interpretInvoiceStatus(
  raw: Record<string, string>
): GreenPaymentVerificationResult {
  if (raw.Result !== "0") {
    return {
      status: "pending",
      message:
        raw.ResultDescription ||
        "We received your Green return, but invoice confirmation is not available yet.",
      provider: "invoice",
      providerId: raw.Invoice_ID || undefined,
      shouldMarkPaid: false,
      raw,
    };
  }

  switch (raw.PaymentResult) {
    case "0":
      return {
        status: "paid",
        message:
          raw.PaymentResultDescription ||
          raw.ResultDescription ||
          "Green confirmed that your payment was received.",
        provider: "invoice",
        providerId: raw.Invoice_ID || undefined,
        shouldMarkPaid: true,
        raw,
      };
    case "1":
      return {
        status: "pending",
        message:
          raw.PaymentResultDescription ||
          "Green received the debit but has not finished processing it yet.",
        provider: "invoice",
        providerId: raw.Invoice_ID || undefined,
        shouldMarkPaid: false,
        raw,
      };
    case "2":
      return {
        status: "cancelled",
        message:
          raw.PaymentResultDescription ||
          "The Green payment was cancelled before it completed.",
        provider: "invoice",
        providerId: raw.Invoice_ID || undefined,
        shouldMarkPaid: false,
        raw,
      };
    case "3":
    default:
      return {
        status: "pending",
        message:
          raw.PaymentResultDescription ||
          "Green has not recorded a completed payment for this order yet.",
        provider: "invoice",
        providerId: raw.Invoice_ID || undefined,
        shouldMarkPaid: false,
        raw,
      };
  }
}

function readParamValue(
  params: URLSearchParams | Record<string, string | undefined>,
  keys: readonly string[]
): string | undefined {
  if (params instanceof URLSearchParams) {
    for (const key of keys) {
      const value = params.get(key)?.trim();
      if (value) {
        return value;
      }
    }
    return undefined;
  }

  for (const key of keys) {
    const value = params[key]?.trim();
    if (value) {
      return value;
    }
  }

  return undefined;
}

export function extractGreenIdentifiers(
  params: URLSearchParams | Record<string, string | undefined>
): {
  checkId?: string;
  invoiceId?: string;
} {
  return {
    checkId: readParamValue(params, GREEN_CHECK_ID_KEYS),
    invoiceId: readParamValue(params, GREEN_INVOICE_ID_KEYS),
  };
}

export async function verifyGreenPayment(input: {
  checkId?: string;
  invoiceId?: string;
}): Promise<GreenPaymentVerificationResult> {
  const checkId = input.checkId?.trim();
  const invoiceId = input.invoiceId?.trim();

  if (checkId) {
    const raw = await fetchCheckStatus(checkId);
    return interpretCheckStatus(raw);
  }

  if (invoiceId) {
    const raw = await fetchInvoiceStatus(invoiceId);
    return interpretInvoiceStatus(raw);
  }

  return {
    status: "pending",
    message:
      "We received your Green return, but Green did not provide a check or invoice reference to verify.",
    provider: "none",
    shouldMarkPaid: false,
    raw: {},
  };
}
