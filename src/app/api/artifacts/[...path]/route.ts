import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs/promises";
import * as path from "path";

/**
 * Artifacts API - Serve job artifacts securely
 *
 * Route: /api/artifacts/[...path]
 *
 * Security:
 * - Whitelist base: ./artifacts
 * - Block path traversal (../)
 * - Validate file exists
 *
 * Features:
 * - Correct Content-Type by extension
 * - Download header option (?download=true)
 * - Range request support for audio/video streaming
 */

const ARTIFACTS_BASE = path.join(process.cwd(), "artifacts");

const MIME_TYPES: Record<string, string> = {
  ".json": "application/json",
  ".txt": "text/plain",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".md": "text/markdown",
  ".html": "text/html",
  ".xml": "application/xml",
  ".ssml": "application/ssml+xml",
};

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
}

function isValidPath(requestedPath: string): boolean {
  // Block path traversal attempts
  if (requestedPath.includes("..")) return false;
  if (requestedPath.includes("~")) return false;

  // Normalize and verify it's within artifacts base
  const normalizedPath = path.normalize(requestedPath);
  const fullPath = path.join(ARTIFACTS_BASE, normalizedPath);

  return fullPath.startsWith(ARTIFACTS_BASE);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const resolvedParams = await params;
    const pathSegments = resolvedParams.path || [];
    const relativePath = pathSegments.join("/");

    // Validate path
    if (!relativePath || !isValidPath(relativePath)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 403 });
    }

    const fullPath = path.join(ARTIFACTS_BASE, relativePath);

    // Check if file exists
    try {
      const stat = await fs.stat(fullPath);
      if (!stat.isFile()) {
        return NextResponse.json({ error: "Not a file" }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Get file stats for Range support
    const stat = await fs.stat(fullPath);
    const fileSize = stat.size;
    const contentType = getContentType(fullPath);
    const fileName = path.basename(fullPath);

    // Check if download requested
    const download = request.nextUrl.searchParams.get("download") === "true";

    // Handle Range requests (required for audio/video streaming in browsers)
    const rangeHeader = request.headers.get("range");

    if (rangeHeader && !download) {
      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      // Validate range
      if (start >= fileSize || end >= fileSize || start > end) {
        return new NextResponse(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${fileSize}` },
        });
      }

      const chunkSize = end - start + 1;

      // Read only the requested range
      const fileHandle = await fs.open(fullPath, "r");
      const buffer = Buffer.alloc(chunkSize);
      await fileHandle.read(buffer, 0, chunkSize, start);
      await fileHandle.close();

      return new NextResponse(buffer, {
        status: 206,
        headers: {
          "Content-Type": contentType,
          "Content-Length": chunkSize.toString(),
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Disposition": `inline; filename="${fileName}"`,
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    // Full file response (no Range or download)
    const fileBuffer = await fs.readFile(fullPath);

    const headers: HeadersInit = {
      "Content-Type": contentType,
      "Content-Length": fileSize.toString(),
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=3600",
    };

    if (download) {
      headers["Content-Disposition"] = `attachment; filename="${fileName}"`;
    } else {
      headers["Content-Disposition"] = `inline; filename="${fileName}"`;
    }

    return new NextResponse(fileBuffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Artifacts API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
