import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Match everything except static files, image optimization, favicon, the OpenAI proxy,
    // and the auth subtree. /auth/* is excluded because the PKCE code↔session exchange in
    // /auth/callback must read the verifier cookie set by the browser client; if middleware
    // touches the auth cookies on that hop the exchange fails with callback_failed.
    '/((?!_next/static|_next/image|favicon.ico|api/chat|auth/.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)',
  ],
};
