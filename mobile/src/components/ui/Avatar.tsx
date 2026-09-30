import { Image } from "expo-image";
import { View } from "react-native";

/** 아바타 원형 이미지. 웹 버전의 `relative h-N w-N overflow-hidden rounded-full bg-brand-soft` 패턴. */
export function Avatar({
  url,
  size,
  className = "bg-brand-soft",
}: {
  url: string | null | undefined;
  size: number;
  className?: string;
}) {
  return (
    <View
      className={`shrink-0 overflow-hidden rounded-full ${className}`}
      style={{ width: size, height: size }}
    >
      {url && <Image source={{ uri: url }} style={{ width: size, height: size }} contentFit="cover" alt="" />}
    </View>
  );
}
