import { useMutation } from "@tanstack/react-query";
import { api } from "../client";
import type { User, LandingPage } from "../../context/AuthContext";

interface UpdateProfileInput {
  displayName?: string;
  username?: string;
  weightUnit?: "kg" | "lb";
  distanceUnit?: "km" | "mi";
  defaultLandingPage?: LandingPage;
}

export function useUpdateProfile() {
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => api.patch<{ user: User }>("/profile", input).then((r) => r.user),
  });
}
