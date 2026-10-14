/// <reference types="vite/client" />
declare global {
  namespace App {
    interface Locals { locale: 'en' | 'nl' }
    interface Platform { env: { DB: D1Database; REGISTRATION_ENABLED?: string; MANAGEMENT_TOKEN_SECRET?: string; WHATSAPP_INVITE_URL?: string }; context: ExecutionContext }
  }
}
export {};
