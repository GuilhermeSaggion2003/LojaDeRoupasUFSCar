/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "true" conecta o app aos Emuladores Locais do Firebase (RNF04). */
  readonly VITE_USE_EMULATORS?: string
  /** Host dos emuladores (padrão 127.0.0.1). */
  readonly VITE_EMULATOR_HOST?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
