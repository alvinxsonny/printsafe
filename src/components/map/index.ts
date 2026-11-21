"use client";

import dynamic from "next/dynamic";

export const LocationPickerMap = dynamic(() => import("./LocationPickerMap"), {
  ssr: false,
});

export const ShopReviewMap = dynamic(() => import("./ShopReviewMap"), {
  ssr: false,
});
