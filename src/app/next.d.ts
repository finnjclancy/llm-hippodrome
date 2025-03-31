/// <reference types="next" />
/// <reference types="next/types/global" />

declare namespace NodeJS {
  interface ProcessEnv {
    OPENROUTER_API_KEY: string
    GOOGLE_API_KEY?: string
  }
}
