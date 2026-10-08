import React from "react";
import { Platform } from "react-native";
import MapPickerWeb from "./MapPicker.web";
import MapPickerNative from "./MapPicker.native";

type Props = {
  position: { lat: number; lng: number } | null;
  setPosition: (p: { lat: number; lng: number }) => void;
};

export default function DynamicMapPicker(props: Props) {
  if (Platform.OS === "web") {
    return <MapPickerWeb {...props} />;
  }
  return <MapPickerNative {...props} />;
}
