import type { ReactNode } from "react";
import type { ModalProps } from "react-native";

export type FrameModalProps = {
  visible: boolean;
  onRequestClose?: () => void;
  animationType?: ModalProps["animationType"];
  presentationStyle?: ModalProps["presentationStyle"];
  transparent?: boolean;
  /** Accessible name for the dialog on web. */
  label?: string;
  children: ReactNode;
};

/**
 * Node DOM frame HP saat preview web. Diisi oleh WebPhoneStage di src/app/_layout.tsx,
 * dipakai FrameModal.web.tsx untuk portal modal ke DALAM frame.
 * react-native-web mem-portal <Modal> ke document.body (di luar frame), jadi modal
 * harus dipindah manual biar backdrop/fullscreen-nya nggak keluar frame.
 */
export const frameHost: { node: HTMLElement | null } = { node: null };
