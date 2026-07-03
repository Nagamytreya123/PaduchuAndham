/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  /** Origin that hosts /uploads when DB is shared but files are on the deployed API */
  readonly VITE_MEDIA_ORIGIN?: string;
  /** GA4 measurement ID (G-XXXXXXXX). Leave unset to disable analytics. */
  readonly VITE_GA_MEASUREMENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
