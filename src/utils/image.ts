import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import type { ContentPart } from "../types/chat";

const MAX_IMAGE_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

/**
 * Pilih gambar dari galeri lalu kompres: resize ke max 1600px (pertahankan
 * aspect ratio) + JPEG q0.85. Hasilnya data-URL base64 (rata-rata ~35-150KB,
 * jauh di bawah batas render Image di Android). Aturan sama dengan Lumen web.
 */
export async function pickAndCompressImage(): Promise<ContentPart | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 1,
  });
  if (result.canceled || !result.assets?.length) {
    return null;
  }
  const asset = result.assets[0];
  const width = asset.width || 1024;
  const height = asset.height || 1024;
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(width, height));
  const outWidth = Math.max(1, Math.round(width * scale));
  const outHeight = Math.max(1, Math.round(height * scale));

  const actions: ImageManipulator.Action[] =
    scale < 1 ? [{ resize: { width: outWidth, height: outHeight } }] : [];
  const out = await ImageManipulator.manipulateAsync(asset.uri, actions, {
    compress: JPEG_QUALITY,
    format: ImageManipulator.SaveFormat.JPEG,
    base64: true,
  });

  return {
    type: "image_url",
    image_url: {
      url: `data:image/jpeg;base64,${out.base64 ?? ""}`,
      width: outWidth,
      height: outHeight,
    },
  };
}

/** Hitung ukuran tampil image part (contain dalam batas max). */
export function imageDisplaySize(
  width: number | undefined,
  height: number | undefined,
  maxWidth = 240,
  maxHeight = 340,
): { width: number; height: number } {
  if (!width || !height) {
    return { width: maxWidth, height: 180 };
  }
  const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) };
}