import { forwardRef, useImperativeHandle, useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, View } from "react-native";

export type CenteredModalHandle = { present: () => void; dismiss: () => void };

type Props = {
  children: ReactNode;
  /** 텍스트 입력이 있는 모달에서 키보드가 뜰 때 카드를 함께 밀어올린다(안드로이드 Modal은
   * 기본적으로 키보드에 맞춰 리사이즈되지 않아서 KeyboardAvoidingView로 직접 보정해야 한다). */
  keyboardHandling?: boolean;
  /** 배경 탭/안드로이드 뒤로가기/ref.dismiss() 등 어떤 경로로 닫히든 한 번 호출된다. */
  onDismiss?: () => void;
};

/**
 * 웹 버전의 "가운데 뜨는 모달"(animate-modal-pop) 그대로 재현한 것.
 * Sheet(바텀시트)와 똑같이 ref.present()/dismiss()로 여닫아서, 호출부 코드는
 * Sheet든 CenteredModal이든 동일하게 쓸 수 있다.
 */
export const CenteredModal = forwardRef<CenteredModalHandle, Props>(function CenteredModal(
  { children, keyboardHandling, onDismiss },
  ref
) {
  const [visible, setVisible] = useState(false);

  function close() {
    setVisible(false);
    onDismiss?.();
  }

  useImperativeHandle(ref, () => ({
    present: () => setVisible(true),
    dismiss: close,
  }));

  const content = (
    <View className="flex-1 items-center justify-center bg-black/40 p-4">
      <Pressable className="absolute inset-0" onPress={close} accessibilityLabel="닫기" />
      <View className="max-h-[85%] w-full max-w-md overflow-hidden rounded-[28px] bg-background shadow-2xl">
        {children}
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      {keyboardHandling ? (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </Modal>
  );
});
