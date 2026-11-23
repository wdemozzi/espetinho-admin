// Vercel Edge Middleware - Cloaking & Server-Side Anti-Tamper Gate

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - favicon.ico, static images (png, jpg, jpeg, svg, webp, ico)
     */
    '/((?!favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)).*)',
  ],
};

const AUTHORIZED_COOKIE = 'ct_stealth_auth_token';
// SHA-256 of 'ct2026'
const SECRET_TOKEN_HASH = '3ad278d67ce74857cf2bbd7d9cf78e38ebb2fd1e4f07f90eddfed8cf9f90a4b1';

export default function middleware(request) {
  const url = new URL(request.url);
  const cookieHeader = request.headers.get('cookie') || '';

  // 1. Check if user is passing secret authorization param in URL (?acesso=ct or ?acesso=ct2026)
  const acessoParam = (url.searchParams.get('acesso') || url.searchParams.get('key') || '').toLowerCase();

  if (acessoParam === 'ct' || acessoParam === 'ct2026' || url.searchParams.has('ct') || url.searchParams.has('ct2026')) {
    // Valid authorization parameter provided!
    // Set secure cookie and redirect to clean URL without query parameter
    url.searchParams.delete('acesso');
    url.searchParams.delete('key');
    url.searchParams.delete('ct');
    url.searchParams.delete('ct2026');

    const cleanUrl = url.pathname + (url.search ? url.search : '');

    return new Response(null, {
      status: 302,
      headers: {
        Location: cleanUrl || '/',
        'Set-Cookie': `${AUTHORIZED_COOKIE}=${SECRET_TOKEN_HASH}; Path=/; SameSite=Lax; Max-Age=2592000`, // 30 days
      },
    });
  }

  // 2. Check if user has the authorized cookie
  const hasAuthCookie = cookieHeader.includes(`${AUTHORIZED_COOKIE}=${SECRET_TOKEN_HASH}`);

  if (hasAuthCookie) {
    // Authorized: let Vercel serve the real application bundle!
    return;
  }

  // 3. UNAUTHORIZED: Return genuine HTTP 404 directly from Vercel Edge Server.
  // The client NEVER receives the SPA HTML or JS bundle.
  // DevTools inspection shows zero source code.
  const false404Html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>404: NOT_FOUND</title>
  <meta name="robots" content="noindex, nofollow, noarchive, nosnippet">
  <style>
    body {
      background-color: #000;
      color: #888;
      font-family: -apple-system, BlinkMacSystemFont, Roboto, "Segoe UI", "Fira Sans", Avenir, "Helvetica Neue", "Lucida Grande", sans-serif;
      height: 100vh;
      margin: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
    }
    .container {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    h1 {
      color: #fff;
      font-size: 24px;
      font-weight: 500;
      margin: 0;
      border-right: 1px solid rgba(255, 255, 255, 0.3);
      padding-right: 20px;
      line-height: 49px;
    }
    p {
      font-size: 14px;
      font-weight: 400;
      margin: 0;
      line-height: 49px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>404</h1>
    <p>This page could not be found.</p>
  </div>
</body>
</html>`;

  return new Response(false404Html, {
    status: 404,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
