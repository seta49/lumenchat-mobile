import { Animated, Easing, StyleSheet, View } from "react-native";
import { useEffect, useRef, useState } from "react";
import { frameHost } from "./FrameModal.shared";
import type { FrameModalProps } from "./FrameModal.shared";

type ReactDom = {
  createPortal: (children: React.ReactNode, container: Element) => React.ReactPortal;
};
// react-dom nggak punya tipe sendiri di project ini → ambil lewat require + cast.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createPortal } = require("react-dom") as ReactDom;

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function visibleFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.getClientRects().length > 0,
  );
}

/**
 * Web: isi modal di-portal ke dalam frame HP (frameHost.node), bukan ke
 * document.body, supaya backdrop tetap ke-clip di dalam frame.
 *
 * Web juga harus memikul kontrak modal yang di native didapat gratis dari
 * <Modal>: Escape menutup, Tab tetap di dalam, fokus masuk saat dibuka dan
 * balik ke pemicunya saat ditutup, dan permukaannya mengaku sebagai dialog.
 */
export function FrameModal({
  visible,
  onRequestClose,
  animationType,
  label,
  children,
}: FrameModalProps) {
  const host = frameHost.node;
  const shell = useRef<View>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const [progress] = useState(() => new Animated.Value(0));

  const animate = animationType === "fade" || animationType === "slide";

  // Escape closes; Tab cycles inside the dialog instead of leaving it.
  useEffect(() => {
    if (!visible) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && onRequestClose) {
        event.stopPropagation();
        onRequestClose();
        return;
      }
      if (event.key !== "Tab") {
        return;
      }
      const node = shell.current as unknown as HTMLElement | null;
      if (!node) {
        return;
      }
      const items = visibleFocusable(node);
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [visible, onRequestClose]);

  // Move focus in on open, return it to the trigger on close.
  useEffect(() => {
    if (!visible) {
      return;
    }
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const timer = setTimeout(() => {
      const node = shell.current as unknown as HTMLElement | null;
      if (!node) {
        return;
      }
      const items = visibleFocusable(node);
      if (items.length > 0) {
        items[0].focus();
      } else {
        node.setAttribute("tabindex", "-1");
        node.focus();
      }
    }, 0);
    return () => {
      clearTimeout(timer);
      const previous = previouslyFocused.current;
      if (previous && typeof previous.focus === "function") {
        previous.focus();
      }
    };
  }, [visible]);

  useEffect(() => {
    if (!visible || !animate) {
      return;
    }
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [visible, animate, progress]);

  if (!visible || !host) {
    return null;
  }

  return createPortal(
    <Animated.View
      style={[styles.overlay, animate ? { opacity: progress } : null]}
    >
      <View
        ref={shell}
        style={styles.shell}
        role="dialog"
        aria-modal
        aria-label={label}
      >
        {children}
      </View>
    </Animated.View>,
    host,
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
  },
  shell: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
