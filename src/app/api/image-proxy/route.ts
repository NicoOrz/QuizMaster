
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
    let urlObject: URL;
    try {
       urlObject = new URL(decodedUrl);
    } catch (_) {
       return new NextResponse('Invalid image URL format', { status: 400 });
    }

    // *** Add custom headers here to simulate the browser request ***
    const headers = new Headers();
    headers.append('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7');
    // Note: Browsers typically handle Accept-Encoding automatically, but we can add it if needed.
    // headers.append('Accept-Encoding', 'gzip, deflate, br, zstd');
    headers.append('Accept-Language', 'zh-CN,zh;q=0.9,en-SG;q=0.8,en;q=0.7');
    headers.append('Cache-Control', 'max-age=0');
    headers.append('Connection', 'keep-alive');
    headers.append('DNT', '1');
    // Host is usually set automatically by fetch based on the URL
    // headers.append('Host', urlObject.hostname);
    // Conditional headers like If-Modified-Since and If-None-Match might cause issues if not correctly managed.
    // It's often better to let the browser/Next.js handle caching unless specifically required.
    // headers.append('If-Modified-Since', 'Tue, 21 Dec 2021 09:39:52 GMT');
    // headers.append('If-None-Match', '"D7AEDA8952DE86DC832A38E9231B8E0F"');
    headers.append('Sec-Fetch-Dest', 'document'); // Or 'image' depending on context? Let's keep 'document' as requested.
    headers.append('Sec-Fetch-Mode', 'navigate');
    headers.append('Sec-Fetch-Site', 'cross-site');
    headers.append('Sec-Fetch-User', '?1');
    headers.append('Upgrade-Insecure-Requests', '1');
    headers.append('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36'); // Use a realistic, up-to-date UA if possible
    headers.append('sec-ch-ua', '"Google Chrome";v="135", "Not-A.Brand";v="8", "Chromium";v="135"');
    headers.append('sec-ch-ua-mobile', '?0');
    headers.append('sec-ch-ua-platform', '"Windows"');


    const response = await fetch(decodedUrl, { headers });

    if (!response.ok) {
       console.error(`Proxy failed to fetch image: ${decodedUrl} - Status: ${response.status} ${response.statusText}`);
       // Optionally log response body for debugging if small
       // const errorBody = await response.text();
       // console.error("Error Body:", errorBody);
      return new NextResponse(`Failed to fetch image: ${response.statusText}`, { status: response.status });
    }

    // Get the content type from the original response
    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    // Check if the content type is actually an image type
    if (!contentType.startsWith('image/')) {
       console.warn(`Proxy received non-image content type "${contentType}" for URL: ${decodedUrl}`);
       // Decide how to handle non-image content: return error or pass through?
       // Returning error for now as it's expected to be an image
       // return new NextResponse('Proxied content is not an image', { status: 502 }); // Bad Gateway
    }

    // Stream the image back to the client
    const imageBuffer = await response.arrayBuffer();

    // Log success
    console.log(`Proxy successfully fetched image: ${decodedUrl} - Content-Type: ${contentType}`);


    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // Control caching for the proxied image served *by the proxy*
        // Let the browser decide based on origin headers for simplicity, or set specific caching
        'Cache-Control': 'public, max-age=3600, s-maxage=3600', // Example: Cache for 1 hour
        // Copy other relevant headers from the original response if needed
        // 'Content-Length': response.headers.get('content-length') || '',
        // 'Last-Modified': response.headers.get('last-modified') || '',
        // 'ETag': response.headers.get('etag') || '',
      },
    });

  } catch (error) {
    console.error('Error proxying image:', decodedUrl, error);
    return new NextResponse('Internal Server Error during proxy', { status: 500 });
  }
}
