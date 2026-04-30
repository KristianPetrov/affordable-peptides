"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import { getSession, signIn, useSession } from "next-auth/react";

import { SharedUiAdapterProvider } from "@ap/shared-ui/adapters";
import { SUPPORT_PHONE_DISPLAY, SUPPORT_SMS_LINK } from "@ap/shared-core";

import {
  registerCustomerAction,
  updateCustomerProfileAction,
  changePasswordAction,
  requestPasswordResetAction,
  resetPasswordWithTokenAction,
} from "@/app/actions/customers";
import { createOrderAction, lookupOrderAction } from "@/app/actions/orders";
import { submitOrderStatusForm, deleteOrderAction } from "@/app/actions/admin";
import { applyReferralCodeAction } from "@/app/actions/referrals";

type AppSharedUiAdapterProviderProps = {
  children: ReactNode;
};

export function AppSharedUiAdapterProvider({
  children,
}: AppSharedUiAdapterProviderProps) {
  const adapters = useMemo(
    () => ({
      support: {
        phoneDisplay: SUPPORT_PHONE_DISPLAY,
        smsLink: SUPPORT_SMS_LINK,
      },
      auth: {
        useSession,
        signIn,
        getSession,
      },
      customerActions: {
        registerCustomer: registerCustomerAction,
        updateCustomerProfile: updateCustomerProfileAction,
        changePassword: changePasswordAction,
        requestPasswordReset: requestPasswordResetAction,
        resetPasswordWithToken: resetPasswordWithTokenAction,
      },
      orderActions: {
        createOrder: createOrderAction,
        lookupOrder: lookupOrderAction,
        submitOrderStatusForm,
        deleteOrder: deleteOrderAction,
      },
      referralActions: {
        applyReferralCode: applyReferralCodeAction,
      },
    }),
    []
  );

  return (
    <SharedUiAdapterProvider adapters={adapters}>
      {children}
    </SharedUiAdapterProvider>
  );
}
