"use server";

import {
  createGreenPayorForPlaidCheckout,
  getGreenPayorBankDisplay,
} from "@/lib/green";
import {
  clearCheckoutGreenPayorCookie,
  readCheckoutGreenPayorId,
  setCheckoutGreenPayorCookie,
} from "@/lib/green-payor-session";

export type PrepareGreenPlaidPayorInput = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingStreet: string;
  shippingCity: string;
  shippingState: string;
  shippingZipCode: string;
  shippingCountry: string;
};

export type PrepareGreenPlaidPayorResult =
  | { success: true; payorId: string }
  | { success: false; error: string };

export type FetchGreenPlaidBankResult =
  | {
      success: true;
      display: {
        payorId: string;
        bankName: string;
        routingDisplay: string;
        accountDisplay: string;
      };
    }
  | { success: false; error: string };

export async function prepareGreenPlaidPayorAction (
  input: PrepareGreenPlaidPayorInput
): Promise<PrepareGreenPlaidPayorResult>
{
  try {
    if (
      !input.customerName?.trim() ||
      !input.customerEmail?.trim() ||
      !input.customerPhone?.trim() ||
      !input.shippingStreet?.trim() ||
      !input.shippingCity?.trim() ||
      !input.shippingState?.trim() ||
      !input.shippingZipCode?.trim() ||
      !input.shippingCountry?.trim()
    ) {
      return {
        success: false,
        error:
          "Fill in your name, email, phone, and shipping address before linking your bank.",
      };
    }

    const { payorId } = await createGreenPayorForPlaidCheckout({
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
      shippingStreet: input.shippingStreet,
      shippingCity: input.shippingCity,
      shippingState: input.shippingState,
      shippingZipCode: input.shippingZipCode,
      shippingCountry: input.shippingCountry,
    });

    await setCheckoutGreenPayorCookie(payorId);

    return { success: true, payorId };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Green could not start Plaid bank linking.",
    };
  }
}

export async function clearGreenPlaidSessionAction (): Promise<void>
{
  await clearCheckoutGreenPayorCookie();
}

export async function fetchGreenPlaidLinkedBankAction (): Promise<FetchGreenPlaidBankResult>
{
  try {
    const payorId = await readCheckoutGreenPayorId();
    if (!payorId) {
      return {
        success: false,
        error:
          "Your secure bank session expired. Click “Prepare bank linking” again.",
      };
    }

    const display = await getGreenPayorBankDisplay(payorId);
    return { success: true, display };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not load linked bank details from Green.",
    };
  }
}
