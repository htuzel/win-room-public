import { NextResponse } from 'next/server';

/**
 * Health check endpoint for DigitalOcean App Platform
 * Returns 200 OK if the application is running
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'win-room-web',
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
}
