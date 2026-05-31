import { NextRequest, NextResponse } from "next/server";

const GAS_URL = process.env.NEXT_PUBLIC_API_URL;

export async function GET(req: NextRequest) {
  try {
    if (!GAS_URL) {
      return NextResponse.json({
        status: "ERROR",
        message: "Missing NEXT_PUBLIC_API_URL",
      });
    }

    const search = req.nextUrl.searchParams.toString();

    const response = await fetch(`${GAS_URL}?${search}`, {
      method: "GET",
      cache: "no-store",
    });

    const text = await response.text();

    return new NextResponse(text, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  } catch (err: any) {
    return NextResponse.json({
      status: "ERROR",
      message: err.message,
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!GAS_URL) {
      return NextResponse.json({
        status: "ERROR",
        message: "Missing NEXT_PUBLIC_API_URL",
      });
    }

    const body = await req.json();

    const response = await fetch(GAS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const text = await response.text();

    return new NextResponse(text, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  } catch (err: any) {
    return NextResponse.json({
      status: "ERROR",
      message: err.message,
    });
  }
}