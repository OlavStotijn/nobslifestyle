import { useMutation } from "@tanstack/react-query";
import { api } from "../client";

// Issues a short-lived token the website can redeem for a logged-in
// session, so upgrading doesn't require re-entering credentials in the
// external browser Mollie's checkout needs.
export function useCheckoutToken() {
  return useMutation({
    mutationFn: () => api.post<{ url: string }>("/billing/checkout-token").then((r) => r.url),
  });
}
