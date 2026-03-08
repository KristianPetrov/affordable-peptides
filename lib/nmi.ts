import { Appearance } from "@nmipayments/nmi-core";
import { formatOrderNumber } from "@/lib/orders";

const sharedCustomTheme = {
  layout: {
    radius: {
      small: "4px",
      medium: "8px",
      large: "12px",
    },
    borderWidth: {
      small: "1px",
      medium: "1px",
      large: "4px",
    },
    spacing: {
      padding: "16px",
      xs: "4px",
      sm: "8px",
      md: "16px",
      lg: "24px",
      xl: "32px",
      "2xl": "48px",
      "3xl": "64px",
    },
  },
  typography: {
    size: {
      xs: "12px",
      sm: "14px",
      md: "16px",
      lg: "18px",
      xl: "20px",
      "2xl": "24px",
    },
    weight: {
      light: "300",
      medium: "500",
      bold: "700",
    },
    font: {
      sans: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
      mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    },
  },
} as const;

const themeColors = {
  dark: {
    background: "#1A1B1E",
    foreground: "#E6E8EB",
    border: "#2E3033",
    input: "#1E1F23",
    primary: {
      "100": "#93C5FD",
      "200": "#1D4ED8",
      default: "#AC24EB",
      foreground: "#FFFFFF",
    },
    secondary: {
      "100": "#EDE9FE",
      "200": "#A78BFA",
      default: "#8B5CF6",
      foreground: "#FFFFFF",
    },
    success: {
      "100": "#DCFCE7",
      "200": "#86EFAC",
      default: "#22C55E",
      foreground: "#000000",
    },
    warning: {
      "100": "#FEF9C3",
      "200": "#FDE047",
      default: "#EAB308",
      foreground: "#000000",
    },
    danger: {
      "100": "#FEE2E2",
      "200": "#FCA5A5",
      default: "#EF4444",
      foreground: "#FFFFFF",
    },
    default: {
      "100": "#F3F4F6",
      "200": "#D1D5DB",
      default: "#6B7280",
      foreground: "#FFFFFF",
    },
    content1: {
      "100": "#26282D",
      "200": "#2E3136",
      default: "#1E1F23",
      foreground: "#E6E8EB",
    },
    content2: {
      "100": "#2E3136",
      "200": "#363A40",
      default: "#26282D",
      foreground: "#E6E8EB",
    },
  },
  light: {
    background: "#FFFFFF",
    foreground: "#111827",
    border: "#D1D5DB",
    input: "#F9FAFB",
    primary: {
      "100": "#E9D5FF",
      "200": "#C084FC",
      default: "#9333EA",
      foreground: "#FFFFFF",
    },
    secondary: {
      "100": "#EEF2FF",
      "200": "#C7D2FE",
      default: "#6366F1",
      foreground: "#FFFFFF",
    },
    success: {
      "100": "#DCFCE7",
      "200": "#86EFAC",
      default: "#16A34A",
      foreground: "#FFFFFF",
    },
    warning: {
      "100": "#FEF3C7",
      "200": "#FCD34D",
      default: "#D97706",
      foreground: "#FFFFFF",
    },
    danger: {
      "100": "#FEE2E2",
      "200": "#FCA5A5",
      default: "#DC2626",
      foreground: "#FFFFFF",
    },
    default: {
      "100": "#F3F4F6",
      "200": "#E5E7EB",
      default: "#6B7280",
      foreground: "#FFFFFF",
    },
    content1: {
      "100": "#FFFFFF",
      "200": "#F9FAFB",
      default: "#F3F4F6",
      foreground: "#111827",
    },
    content2: {
      "100": "#F9FAFB",
      "200": "#F3F4F6",
      default: "#E5E7EB",
      foreground: "#111827",
    },
  },
} as const;

export const appearance = (theme: "dark" | "light" = "dark"): Appearance => ({
  theme,
  customTheme: {
    ...sharedCustomTheme,
    colors: themeColors[theme],
  },
});



export type NmiSaleInput = {
  amount: number;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  billingStreet: string;
  billingCity: string;
  billingState: string;
  billingZipCode: string;
  billingCountry: string;
  paymentToken: string;
};

export type NmiTransactionResult = {
  approved: boolean;
  transactionId: string | null;
  responseCode: string | null;
  responseText: string;
  authCode: string | null;
  avsResponse: string | null;
  cvvResponse: string | null;
  raw: Record<string, string>;
};

const DEFAULT_NMI_API_URL = "https://secure.nmi.com/api/transact.php";

function getNmiConfig (): {
  apiUrl: string;
  securityKey: string;
  testMode: "enabled" | null;
}
{
  const securityKey = (process.env.NMI_SECURITY_KEY ?? "").trim();

  if (!securityKey) {
    // throw new Error(
    //   "NMI is not configured yet. Add NMI_SECURITY_KEY before enabling card payments."
    // );
  }

  const apiUrl = (process.env.NMI_API_URL ?? DEFAULT_NMI_API_URL).trim();
  const testMode =
    (process.env.NMI_TEST_MODE ?? "").trim().toLowerCase() === "enabled"
      ? "enabled"
      : null;

  return {
    apiUrl,
    securityKey,
    testMode,
  };
}

function splitCustomerName (fullName: string): {
  firstName: string;
  lastName: string;
}
{
  const trimmed = fullName.trim();
  const parts = trimmed.split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? trimmed;
  const lastName = parts.slice(1).join(" ") || firstName;

  return { firstName, lastName };
}

function assertValidSaleInput (input: NmiSaleInput): void
{
  if (!input.paymentToken.trim()) {
    throw new Error("Your payment details are incomplete. Please check the card form and try again.");
  }

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("Order total must be greater than zero.");
  }
}

async function postNmiTransaction (
  fields: URLSearchParams
): Promise<NmiTransactionResult>
{
  const { apiUrl, securityKey, testMode } = getNmiConfig();

  fields.set("security_key", securityKey);

  if (testMode) {
    fields.set("test_mode", testMode);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        accept: "text/plain, application/x-www-form-urlencoded, */*",
      },
      body: fields.toString(),
      cache: "no-store",
      signal: controller.signal,
    });

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(
        `NMI request failed with status ${response.status}. ${responseText || "Please try again."}`
      );
    }

    const params = new URLSearchParams(responseText);
    const raw = Object.fromEntries(params.entries());
    const approved = raw.response === "1";

    return {
      approved,
      transactionId: raw.transactionid || null,
      responseCode: raw.response_code || null,
      responseText: raw.responsetext || "Unable to process payment.",
      authCode: raw.authcode || null,
      avsResponse: raw.avsresponse || null,
      cvvResponse: raw.cvvresponse || null,
      raw,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function submitNmiSale (
  input: NmiSaleInput
): Promise<NmiTransactionResult>
{
  assertValidSaleInput(input);
  const { firstName, lastName } = splitCustomerName(input.customerName);
  const orderNumber = formatOrderNumber(input.orderNumber);
  const form = new URLSearchParams({
    type: "sale",
    amount: input.amount.toFixed(2),
    orderid: orderNumber,
    orderdescription: `Affordable Peptides order ${orderNumber}`,
    firstname: firstName,
    lastname: lastName,
    email: input.customerEmail.trim(),
    phone: input.customerPhone.trim(),
    address1: input.billingStreet.trim(),
    city: input.billingCity.trim(),
    state: input.billingState.trim(),
    zip: input.billingZipCode.trim(),
    country: input.billingCountry.trim(),
    payment_token: input.paymentToken.trim(),
    currency: "USD",
  });

  return postNmiTransaction(form);
}

export async function voidNmiTransaction (
  transactionId: string
): Promise<NmiTransactionResult>
{
  if (!transactionId.trim()) {
    throw new Error("Missing NMI transaction ID.");
  }

  return postNmiTransaction(
    new URLSearchParams({
      type: "void",
      transactionid: transactionId.trim(),
    })
  );
}
