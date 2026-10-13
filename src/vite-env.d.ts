/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_INDEXER_URI?: string;
  readonly VITE_INDEXER_WS_URI?: string;
  readonly VITE_PROVER_URI?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
