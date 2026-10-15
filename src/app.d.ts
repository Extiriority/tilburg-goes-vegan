/// <reference types="vite/client" />
declare global {
  namespace App {
    interface Locals { locale: 'en' | 'nl'; admin?: { id:string; email:string } | null }
    interface Platform { env: { DB: D1Database; MEDIA?: R2Bucket; REGISTRATION_ENABLED?: string; MANAGEMENT_TOKEN_SECRET?: string; WHATSAPP_INVITE_URL?: string }; context: ExecutionContext }
  }
}
export {};
