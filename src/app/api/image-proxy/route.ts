
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return new NextResponse('Missing image URL', { status: 400 });
  }

  try {
    // Decode the URL just in case it was encoded
    const decodedUrl = decodeURIComponent(imageUrl);

    // Validate the URL (basic check)
    try {
       new URL(decodedUrl);
    } catch (_) {
       return new NextResponse('Invalid image URL format', { status: 400 });
    }

    // *** Add custom headers here if needed ***
    const headers = new Headers();
    // Example: headers.append('Authorization', 'Bearer YOUR_TOKEN');
    // Example: headers.append('X-Custom-Header', 'value');

    const response = await fetch(decodedUrl, { headers });

    if (!response.ok) {
      return new NextResponse(`Failed to fetch image: ${response.statusText}`, { status: response.status });
    }

    // Get the content type from the original response
    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    // Stream the image back to the client
    const imageBuffer = await response.arrayBuffer();

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // Optional: Control caching for the proxied image
        // 'Cache-Control': 'public, max-age=3600, must-revalidate',
      },
    });

  } catch (error) {
    console.error('Error proxying image:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
