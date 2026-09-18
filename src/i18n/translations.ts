// Lumen dictionaries — flat keys, type-safe. `id` must cover every key in `en`.
// Copy rules: sentence case, no exclamation marks, no em dashes, one verb per
// action. Empty states teach the space rather than naming it.

export type Lang = "en" | "id";

const en = {
  // Common
  "common.settings": "Settings",
  "common.back": "Back",
  "common.close": "Close",
  "common.cancel": "Cancel",
  "common.save": "Save",
  "common.remove": "Remove",
  "common.dark": "Dark",
  "common.light": "Light",
  "common.you": "You",
  "common.provider": "Provider",

  // Sidebar
  "sidebar.history": "Conversations",
  "sidebar.newChat": "New chat",
  "sidebar.searchChats": "Search conversations",
  "sidebar.recents": "Recents",
  "sidebar.found": "{n} found",
  "sidebar.noMatches": "Nothing matches that.",
  "sidebar.noMatchesHint": "Search looks at titles and every message.",
  "sidebar.emptyTitle": "No conversations yet.",
  "sidebar.emptyHint": "Your first message starts one, and it is saved on this device.",
  "sidebar.messageCount": "{n} messages",
  "sidebar.manage": "Chat options",
  "sidebar.chatTitlePlaceholder": "Chat title",
  "sidebar.systemPrompt": "System prompt",
  "sidebar.personaPlaceholder": "For example: you are a Rust tutor",
  "sidebar.actionsFor": "This removes {title} and everything in it.",

  // Chat
  "chat.newSession": "New session",
  "chat.changeModel": "Choose which model answers",
  "chat.emptyTitle": "Ask Lumen anything.",
  "chat.emptySubtitle":
    "Start typing below, attach an image for visual analysis, or attach a file to put its contents in context.",
  "chat.jumpToBottom": "Jump to latest",
  "chat.attach": "Attach",
  "chat.attachImage": "Image",
  "chat.attachImageHint": "Compressed and sent to the provider for analysis",
  "chat.attachFile": "File",
  "chat.attachFileHint": "Text, markdown, JSON, CSV or code, up to 60k characters",
  "chat.removeImage": "Remove image",
  "chat.askLumen": "Ask Lumen",
  "chat.stop": "Stop",
  "chat.send": "Send",
  "chat.model": "Model",
  "chat.thinkingOn": "On",
  "chat.thinkingOff": "Off",
  "chat.thinkingOnHint": "Highest reasoning the model offers",
  "chat.thinkingOffHint": "Faster, ordinary answers",
  "chat.voiceStart": "Start voice input",
  "chat.voiceStop": "Stop voice input",
  "chat.voiceUnavailable": "Voice input is not available on this device.",

  // Message
  "message.actions": "Message options",
  "message.copy": "Copy text",
  "message.editResend": "Edit and resend",
  "message.saveResend": "Save and resend",
  "message.regenerate": "Answer again",
  "message.regenerateShorter": "Answer again, shorter",
  "message.regenerateLonger": "Answer again, longer",
  "message.regenerateCasual": "Answer again, more casual",
  "message.delete": "Delete message",
  "message.deleteConfirm":
    "This removes the message from the conversation and cannot be undone.",
  "message.retry": "Try again",

  // Typing
  "typing.thinking": "Lumen is thinking",

  // Attach
  "file.attached": "I attached {n} files below for context.",

  // Model
  "model.reasoning": "Reasoning",
  "model.search": "Search models",
  "model.count": "{n} models",
  "model.loading": "Fetching the model list",
  "model.noMatches": "No model matches {q}.",
  "model.listOffline": "Showing the saved defaults instead. Check the base URL and API key, then refresh.",
  "model.listOfflineTitle": "Could not reach the provider",
  "model.refresh": "Refresh list",

  // Settings
  "settings.panelTitle": "Configuration",
  "settings.routing": "Routing",
  "settings.providerAndKey": "Provider and API key",
  "settings.providers": "Providers",
  "settings.addProvider": "Add provider",
  "settings.editProvider": "Edit provider",
  "settings.providerKind": "Provider type",
  "settings.providerName": "Name",
  "settings.providerDialogHint":
    "Keys stay on this device. Test the connection before you save it.",
  "settings.saveProvider": "Save provider",
  "settings.manageProvider": "Provider options",
  "settings.useProvider": "Answer with this provider",
  "settings.active": "Active",
  "settings.removeProvider": "Remove provider",
  "settings.removeProviderConfirm":
    "This removes {name} from this device. You can add it again at any time.",
  "settings.defaultModel": "Model",
  "settings.modelPlaceholder": "No model selected",
  "settings.connection": "Connection",
  "settings.testConnection": "Test connection",
  "settings.testConnectionHint": "Sends one small request to the active provider",
  "settings.testing": "Testing the connection",
  "settings.testOk": "Connected. The provider answered.",
  "settings.testFail": "Could not reach the provider. Check the base URL and API key.",
  "settings.apiKey": "API key",
  "settings.apiKeyPlaceholder": "Paste your key",
  "settings.baseUrl": "Base URL",
  "settings.apiFormat": "Wire format",
  "settings.showKey": "Show API key",
  "settings.hideKey": "Hide API key",
  "settings.theme": "Theme",
  "settings.language": "Language",
  "settings.accentActive": "Signal",
  "settings.accentCustom": "Custom",
  "settings.identity": "Identity",
  "settings.data": "Data",
  "settings.exportAll": "Export all conversations",
  "settings.exportHint": "One JSON file, including providers' settings",
  "settings.exportMd": "Export as markdown",
  "settings.importChats": "Import conversations",
  "settings.importHint": "From a Lumen JSON export",
  "settings.clearHint": "Erases every conversation on this device",
  "settings.storage": "Storage",
  "settings.storageHint":
    "Conversations and settings are stored on this device. API keys use the Android keystore.",

  // Profile
  "profile.appearance": "Appearance",
  "profile.accent": "Signal colour",
  "profile.name": "Your name",
  "profile.nameUnset": "Not set",
  "profile.nameHint": "Used for the avatar in the conversation list",
  "profile.clearAll": "Delete all conversations",
  "profile.clearAllConfirm":
    "Every conversation on this device is erased. This cannot be undone.",
  "profile.about": "About",

  // Accent names — the swatches are labelled, never colour-only
  "accent.amber": "Amber",
  "accent.ember": "Ember",
  "accent.jade": "Jade",
  "accent.cobalt": "Cobalt",
  "accent.orchid": "Orchid",

  // Errors
  "errors.requestFailed": "The provider did not answer",
  "errors.importFailed": "That file could not be read. Check that it is a Lumen JSON export.",
} as const;

export type TranslationKey = keyof typeof en;

const id: Record<TranslationKey, string> = {
  // Common
  "common.settings": "Pengaturan",
  "common.back": "Kembali",
  "common.close": "Tutup",
  "common.cancel": "Batal",
  "common.save": "Simpan",
  "common.remove": "Hapus",
  "common.dark": "Gelap",
  "common.light": "Terang",
  "common.you": "Kamu",
  "common.provider": "Provider",

  // Sidebar
  "sidebar.history": "Percakapan",
  "sidebar.newChat": "Chat baru",
  "sidebar.searchChats": "Telusuri percakapan",
  "sidebar.recents": "Terbaru",
  "sidebar.found": "{n} ditemukan",
  "sidebar.noMatches": "Tidak ada yang cocok.",
  "sidebar.noMatchesHint": "Pencarian memeriksa judul dan seluruh isi pesan.",
  "sidebar.emptyTitle": "Belum ada percakapan.",
  "sidebar.emptyHint": "Pesan pertama kamu akan memulainya, dan tersimpan di perangkat ini.",
  "sidebar.messageCount": "{n} pesan",
  "sidebar.manage": "Opsi chat",
  "sidebar.chatTitlePlaceholder": "Judul chat",
  "sidebar.systemPrompt": "System prompt",
  "sidebar.personaPlaceholder": "Misalnya: kamu tutor Rust",
  "sidebar.actionsFor": "Ini menghapus {title} beserta seluruh isinya.",

  // Chat
  "chat.newSession": "Sesi baru",
  "chat.changeModel": "Pilih model yang menjawab",
  "chat.emptyTitle": "Tanya Lumen apa saja.",
  "chat.emptySubtitle":
    "Mulai menulis di bawah, lampirkan gambar untuk analisis visual, atau lampirkan file untuk menjadikan isinya konteks.",
  "chat.jumpToBottom": "Ke pesan terbaru",
  "chat.attach": "Lampirkan",
  "chat.attachImage": "Gambar",
  "chat.attachImageHint": "Dikompres lalu dikirim ke provider untuk dianalisis",
  "chat.attachFile": "File",
  "chat.attachFileHint": "Teks, markdown, JSON, CSV, atau kode, maksimal 60 ribu karakter",
  "chat.removeImage": "Hapus gambar",
  "chat.askLumen": "Tanya Lumen",
  "chat.stop": "Berhenti",
  "chat.send": "Kirim",
  "chat.model": "Model",
  "chat.thinkingOn": "Nyala",
  "chat.thinkingOff": "Mati",
  "chat.thinkingOnHint": "Penalaran tertinggi yang dimiliki model",
  "chat.thinkingOffHint": "Jawaban biasa, lebih cepat",
  "chat.voiceStart": "Mulai input suara",
  "chat.voiceStop": "Hentikan input suara",
  "chat.voiceUnavailable": "Input suara tidak tersedia di perangkat ini.",

  // Message
  "message.actions": "Opsi pesan",
  "message.copy": "Salin teks",
  "message.editResend": "Ubah dan kirim ulang",
  "message.saveResend": "Simpan dan kirim ulang",
  "message.regenerate": "Jawab lagi",
  "message.regenerateShorter": "Jawab lagi, lebih singkat",
  "message.regenerateLonger": "Jawab lagi, lebih panjang",
  "message.regenerateCasual": "Jawab lagi, lebih santai",
  "message.delete": "Hapus pesan",
  "message.deleteConfirm":
    "Pesan ini dihapus dari percakapan dan tidak bisa dikembalikan.",
  "message.retry": "Coba lagi",

  // Typing
  "typing.thinking": "Lumen sedang berpikir",

  // Attach
  "file.attached": "Aku lampirkan {n} file di bawah sebagai konteks.",

  // Model
  "model.reasoning": "Penalaran",
  "model.search": "Cari model",
  "model.count": "{n} model",
  "model.loading": "Mengambil daftar model",
  "model.noMatches": "Tidak ada model yang cocok dengan {q}.",
  "model.listOffline": "Menampilkan daftar tersimpan. Cek base URL dan API key, lalu muat ulang.",
  "model.listOfflineTitle": "Provider tidak bisa dijangkau",
  "model.refresh": "Muat ulang daftar",

  // Settings
  "settings.panelTitle": "Konfigurasi",
  "settings.routing": "Perutean",
  "settings.providerAndKey": "Provider dan API key",
  "settings.providers": "Provider",
  "settings.addProvider": "Tambah provider",
  "settings.editProvider": "Ubah provider",
  "settings.providerKind": "Jenis provider",
  "settings.providerName": "Nama",
  "settings.providerDialogHint":
    "Key tersimpan di perangkat ini. Tes koneksi dulu sebelum menyimpan.",
  "settings.saveProvider": "Simpan provider",
  "settings.manageProvider": "Opsi provider",
  "settings.useProvider": "Jawab dengan provider ini",
  "settings.active": "Aktif",
  "settings.removeProvider": "Hapus provider",
  "settings.removeProviderConfirm":
    "Ini menghapus {name} dari perangkat ini. Kamu bisa menambahkannya lagi kapan saja.",
  "settings.defaultModel": "Model",
  "settings.modelPlaceholder": "Belum ada model dipilih",
  "settings.connection": "Koneksi",
  "settings.testConnection": "Tes koneksi",
  "settings.testConnectionHint": "Mengirim satu permintaan kecil ke provider aktif",
  "settings.testing": "Menguji koneksi",
  "settings.testOk": "Terkoneksi. Provider menjawab.",
  "settings.testFail": "Provider tidak bisa dijangkau. Cek base URL dan API key.",
  "settings.apiKey": "API key",
  "settings.apiKeyPlaceholder": "Tempel key kamu",
  "settings.baseUrl": "Base URL",
  "settings.apiFormat": "Format kabel",
  "settings.showKey": "Tampilkan API key",
  "settings.hideKey": "Sembunyikan API key",
  "settings.theme": "Tema",
  "settings.language": "Bahasa",
  "settings.accentActive": "Sinyal",
  "settings.accentCustom": "Kustom",
  "settings.identity": "Identitas",
  "settings.data": "Data",
  "settings.exportAll": "Ekspor semua percakapan",
  "settings.exportHint": "Satu file JSON, termasuk pengaturan provider",
  "settings.exportMd": "Ekspor sebagai markdown",
  "settings.importChats": "Impor percakapan",
  "settings.importHint": "Dari ekspor JSON Lumen",
  "settings.clearHint": "Menghapus semua percakapan di perangkat ini",
  "settings.storage": "Penyimpanan",
  "settings.storageHint":
    "Percakapan dan pengaturan disimpan di perangkat ini. API key memakai Android keystore.",

  // Profile
  "profile.appearance": "Tampilan",
  "profile.accent": "Warna sinyal",
  "profile.name": "Nama kamu",
  "profile.nameUnset": "Belum diisi",
  "profile.nameHint": "Dipakai untuk avatar di daftar percakapan",
  "profile.clearAll": "Hapus semua percakapan",
  "profile.clearAllConfirm":
    "Semua percakapan di perangkat ini dihapus. Tidak bisa dikembalikan.",
  "profile.about": "Tentang",

  // Accent names
  "accent.amber": "Amber",
  "accent.ember": "Bara",
  "accent.jade": "Jade",
  "accent.cobalt": "Kobalt",
  "accent.orchid": "Anggrek",

  // Errors
  "errors.requestFailed": "Provider tidak menjawab",
  "errors.importFailed": "File itu tidak bisa dibaca. Pastikan itu ekspor JSON dari Lumen.",
};

export const translations: Record<Lang, Record<TranslationKey, string>> = { en, id };
