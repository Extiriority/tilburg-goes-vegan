/// <reference types="vite/client" />
declare global {
  namespace App {
    interface Locals { locale: 'en' | 'nl'; admin?: { id:string; email:string } | null; stagingAccess?: boolean }
    interface Platform { env: { DB: D1Database; MEDIA?: R2Bucket; REGISTRATION_ENABLED?: string; MANAGEMENT_TOKEN_SECRET?: string; WHATSAPP_INVITE_URL?: string; APP_ENV?: string; STAGING_ORIGIN?: string; ACCESS_ISSUER?: string; ACCESS_AUDIENCE?: string; PUBLIC_SITE_ORIGIN?: string }; context: ExecutionContext }
  }
}
export {};
