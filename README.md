# Lumen Mobile

Versi **Android** dari [Lumenchat](https://github.com/seta49/lumenchat) (chat multi-provider AI) — dibangun ulang dengan **Expo (React Native)**. Logika inti (registry provider, wire format OpenAI/Anthropic, streaming, migrasi data) di-port dari versi web; UI di-rebuild untuk mobile.

## Fitur

- 💬 Chat streaming langsung ke provider — **tanpa backend, tanpa CORS proxy** (native tidak kena CORS)
- 🔌 Multi-provider: OpenCode Go, OpenAI, Anthropic, OpenRouter, Ollama, Custom (OpenAI/Anthropic-compatible)
- 🖼️ Lampirkan gambar — otomatis dikompres (max 1600px, JPEG q0.85) sebelum dikirim
- 🧠 Thinking level (Off/Low/Medium/High/Max) → `reasoning_effort` / `budget_tokens`
- 📚 Riwayat chat per sesi (buat, rename, hapus) — tersimpan lokal di perangkat
- 🎨 Dark & light theme, bahasa EN/ID
- 🔒 API key disimpan di perangkat (AsyncStorage), tidak pernah keluar

## Cara menjalankan (development)

1. Install **Expo Go** di HP Android (Play Store).
2. Pastikan HP dan laptop satu Wi-Fi.
3. Jalankan dari folder project:

```bash
npm install
npx expo start
```

4. Scan QR code yang muncul di terminal dengan Expo Go.

Untuk typecheck: `npm run typecheck`. Untuk build APK (release): `npx eas-cli build -p android --profile preview` (butuh akun [expo.dev](https://expo.dev) + login).

## Struktur

```
src/
├── app/            # Routes expo-router (index = chat, settings)
├── screens/        # ChatScreen, SettingsScreen
├── components/     # ChatMessage, Composer, Sidebar, ProviderDialog, Sheet, MarkdownRenderer
├── services/       # ai.ts (streaming), providers.ts (registry), storage.ts (AsyncStorage)
├── types/chat.ts   # Tipe data (port dari web, + width/height pada image part)
├── theme.tsx       # Palet warna dark/light
└── i18n/           # Kamus EN/ID
```

## Catatan v1

- **Mermaid & KaTeX tidak di-port** — diagram mermaid render sebagai code block, rumus sebagai teks. (Web pakai lib browser-only.)
- **Persona/system prompt per chat & command palette** belum ada di v1 (YAGNI).
- API key di AsyncStorage — upgrade ke `expo-secure-store` (keychain Android) direncanakan.
- `metro.config.js` berisi satu alias `punycode` (dibutuhkan `markdown-it`, dependency `react-native-markdown-display` — modul itu mengimpor builtin Node yang tidak ada di Metro).

## Lisensi

0BSD (sama dengan template Expo).