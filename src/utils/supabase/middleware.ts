import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();
  const pathname = request.nextUrl.pathname;

  // Public routes that don't require authentication
  const publicRoutes = [
    '/auth/sign-in',
    '/auth/sign-up',
    '/api/auth/sign-in',
    '/api/auth/sign-up',
    '/',
  ];

  // API routes that require authentication
  const protectedApiRoutes = [
    '/api/pdf-extractor',
    '/api/tag-generation',
    '/api/content',
    '/api/tags',
    '/api/library',
    '/api/extension',
    '/api/user-database', 
  ];

  // Check if current route is public
  const isPublicRoute = publicRoutes.some(route => pathname === route);
  
  // Check if current route is a protected API
  const isProtectedApi = protectedApiRoutes.some(route => pathname.startsWith(route));

  // Handle API routes
  if (pathname.startsWith('/api/')) {
    // Allow public API routes without authentication
    if (isPublicRoute) {
      return supabaseResponse;
    }

    // Protect API routes that require authentication
    if (isProtectedApi && !user) {
      return NextResponse.json(
        { 
          error: 'Authentication required',
          message: 'You must be signed in to access this resource'
        },
        { status: 401 }
      );
    }

    // Add user info to request headers for authenticated API routes
    if (user && isProtectedApi) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', user.id);
      requestHeaders.set('x-user-email', user.email || '');
      
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }

    return supabaseResponse;
  }

  // Handle page routes
  if (!user && !isPublicRoute && !pathname.startsWith('/auth')) {
    // Redirect to sign-in with return URL
    url.pathname = '/auth/sign-in';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if (user && pathname.startsWith('/auth/')) {
    // Special handling for extension authentication
    const source = url.searchParams.get('source');
    
    if (source === 'extension') {
      // Redirect to settings with extension connection parameters
      url.pathname = '/dashboard/settings';
      url.searchParams.delete('source'); 
      url.searchParams.set('tab', 'privacy');
      url.searchParams.set('action', 'connect-extension');
      return NextResponse.redirect(url);
    }
    
    // Normal redirect for other auth pages
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Only redirect root to dashboard if authenticated 
  if (user && pathname === '/') {
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
