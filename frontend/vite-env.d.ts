interface ImportMetaEnv {
  readonly VITE_API_DEV: string
  readonly VITE_API_PROD: string
  readonly MODE: 'development' | 'production'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}