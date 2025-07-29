import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const redirectUrl = searchParams.get('redirectUrl') || 'https://greenlease.me';
  
  // Redirect to the main application
  return NextResponse.redirect(redirectUrl);
}

export async function POST(request: NextRequest) {
  return NextResponse.json({ success: true });
} 