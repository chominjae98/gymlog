import * as ImagePicker from "expo-image-picker";
import { Camera, Images } from "lucide-react-native";
import { useRef, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { CenteredModal, type CenteredModalHandle } from "@/components/ui/CenteredModal";

type Resolver = (assets: ImagePicker.ImagePickerAsset[]) => void;

/**
 * "사진 선택"을 OS 기본 Alert.alert 대신 앱 디자인에 맞춘 가운데 모달로 띄운다.
 * pick(remaining)을 호출하면 모달이 뜨고, 사용자가 고르거나 닫을 때까지 기다리는
 * Promise를 돌려준다(옛 pickPhotos와 동일한 사용법) — element를 렌더 트리 어딘가에
 * 같이 넣어두기만 하면 된다.
 */
export function usePhotoSourcePicker() {
  const modalRef = useRef<CenteredModalHandle>(null);
  const resolverRef = useRef<Resolver | null>(null);
  const [remaining, setRemaining] = useState(1);

  function pick(remainingCount: number) {
    setRemaining(remainingCount);
    modalRef.current?.present();
    return new Promise<ImagePicker.ImagePickerAsset[]>((resolve) => {
      resolverRef.current = resolve;
    });
  }

  function settle(assets: ImagePicker.ImagePickerAsset[]) {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    modalRef.current?.dismiss();
    resolve?.(assets);
  }

  async function handleCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("카메라 권한이 필요해요", "설정에서 카메라 접근을 허용해 주세요.");
      return settle([]);
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: "images", quality: 1 });
    settle(result.canceled ? [] : result.assets);
  }

  async function handleLibrary() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("사진첩 권한이 필요해요", "설정에서 사진 접근을 허용해 주세요.");
      return settle([]);
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 1,
    });
    settle(result.canceled ? [] : result.assets);
  }

  const element = (
    <CenteredModal
      ref={modalRef}
      onDismiss={() => {
        const resolve = resolverRef.current;
        resolverRef.current = null;
        resolve?.([]);
      }}
    >
      <View className="px-5 pb-5 pt-5">
        <Text className="mb-4 text-center text-[15px] font-bold text-foreground">사진 선택</Text>
        <Pressable
          onPress={handleCamera}
          className="flex-row items-center gap-3 rounded-2xl bg-surface px-4 py-3.5 active:opacity-80"
        >
          <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-soft">
            <Camera size={18} color="#17914f" />
          </View>
          <Text className="text-[14px] font-semibold text-foreground">카메라로 촬영</Text>
        </Pressable>
        <Pressable
          onPress={handleLibrary}
          className="mt-2 flex-row items-center gap-3 rounded-2xl bg-surface px-4 py-3.5 active:opacity-80"
        >
          <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-soft">
            <Images size={18} color="#17914f" />
          </View>
          <Text className="text-[14px] font-semibold text-foreground">사진첩에서 선택</Text>
        </Pressable>
        <Pressable onPress={() => settle([])} className="mt-3 items-center rounded-2xl py-3 active:opacity-70">
          <Text className="text-[13px] font-semibold text-muted">취소</Text>
        </Pressable>
      </View>
    </CenteredModal>
  );

  return { pick, element };
}
