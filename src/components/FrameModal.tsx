import { Modal } from "react-native";
import type { FrameModalProps } from "./FrameModal.shared";

/**
 * Native: langsung <Modal> bawaan React Native.
 * Di web, Metro pakai FrameModal.web.tsx sebagai gantinya (lihat file itu).
 */
export function FrameModal({
  visible,
  onRequestClose,
  animationType,
  presentationStyle,
  transparent,
  children,
}: FrameModalProps) {
  return (
    <Modal
      visible={visible}
      onRequestClose={onRequestClose}
      animationType={animationType}
      presentationStyle={presentationStyle}
      transparent={transparent}
    >
      {children}
    </Modal>
  );
}
