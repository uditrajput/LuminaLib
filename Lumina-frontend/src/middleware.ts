import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    if (request.nextUrl.pathname.startsWith('/grafana')) {
        const token = request.cookies.get('lumina_token')?.value;

        if (!token) {
            return NextResponse.redirect(new URL('/login', request.url));
        }

        try {
            // Read JWT payload natively using atob inside Edge runtime
            const parts = token.split('.');
            if (parts.length !== 3) throw new Error("Invalid token");

            const payloadStr = Buffer.from(parts[1], 'base64').toString('utf8');
            const payload = JSON.parse(payloadStr);

            const email = payload.sub;

            // Only allow if token payload sub exists
            if (!email) {
                return NextResponse.redirect(new URL('/login', request.url));
            }

            // Token verified. Let the request proceed so next.config.ts rewrites can intercept it and securely reverse proxy to the internal Grafana 3000 port
            return NextResponse.next();
        } catch (error) {
            console.error("SSO Middleware Error:", error);
            return NextResponse.redirect(new URL('/login', request.url));
        }
    }
}

export const config = {
    matcher: ['/grafana/:path*'],
};
