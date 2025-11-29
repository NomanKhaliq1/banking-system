"use client";

import { useMemo } from "react";
import { createSupabaseClient } from "./supabaseClient";

export const useSupabase = () => {
  return useMemo(() => createSupabaseClient(), []);
};
