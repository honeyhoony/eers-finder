import { NextRequest, NextResponse } from "next/server";

const SERVICE_KEY = process.env.KAPT_SERVICE_KEY || process.env.NARA_SERVICE_KEY;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const kaptCode = searchParams.get("kaptCode");
    const type = searchParams.get("type") || "basic"; // basic or maintenance

    if (!kaptCode) {
      return NextResponse.json({ error: "kaptCode가 필요합니다." }, { status: 400 });
    }

    if (!SERVICE_KEY) {
      return NextResponse.json({ error: "K-APT API 인증키가 설정되지 않았습니다." }, { status: 500 });
    }

    let apiUrl = "";
    if (type === "basic") {
      apiUrl = `http://apis.data.go.kr/1613000/AptBasisInfoServiceV2/getAptBasisInfoV2?serviceKey=${SERVICE_KEY}&kaptCode=${kaptCode}&_type=json`;
    } else {
      apiUrl = `http://apis.data.go.kr/1613000/AptMaintenanceInfoServiceV2/getAptMaintenanceInfoV2?serviceKey=${SERVICE_KEY}&kaptCode=${kaptCode}&_type=json&pageNo=1&numOfRows=100`;
    }

    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error(`K-APT API error: ${res.status}`);

    const data = await res.json();
    const item = data?.response?.body?.item || data?.response?.body?.items?.item;

    return NextResponse.json({ 
      success: true, 
      data: item || (type === "maintenance" ? [] : null)
    });

  } catch (err: any) {
    console.error("[K-APT API Error]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
