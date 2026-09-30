import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { forwardRef, useCallback, type ReactNode } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  children: ReactNode;
  snapPoints?: (string | number)[];
  onDismiss?: () => void;
  /** 텍스트 입력이 있는 시트에서 키보드가 뜰 때 시트를 함께 밀어올린다. */
  keyboardHandling?: boolean;
};

/**
 * 웹 버전의 "가운데 뜨는 모달" / "바텀시트" 오버레이를 전부 이걸로 통일한다.
 * 네이티브에서는 바텀시트가 둘 다의 자연스러운 대응물이라, 별도 모달 컴포넌트를
 * 두지 않고 하나로 합쳤다 — 안드로이드 뒤로가기/드래그로 닫기도 기본 지원된다.
 */
export const Sheet = forwardRef<BottomSheetModal, Props>(function Sheet(
  { children, snapPoints = ["90%"], onDismiss, keyboardHandling },
  ref
) {
  const insets = useSafeAreaInsets();

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />
    ),
    []
  );

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      onDismiss={onDismiss}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: "#faf9f5" }}
      handleIndicatorStyle={{ backgroundColor: "#e7e5db" }}
      keyboardBehavior={keyboardHandling ? "interactive" : "fillParent"}
      keyboardBlurBehavior="restore"
    >
      <BottomSheetView style={{ flex: 1, paddingBottom: insets.bottom }}>{children}</BottomSheetView>
    </BottomSheetModal>
  );
});
