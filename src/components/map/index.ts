import dynamic from "next/dynamic";

export const LocationPickerMap = dynamic(() => import("./LocationPickerMap"), {
  ssr: false,
});
