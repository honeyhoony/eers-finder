import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q2 = searchParams.get("q2"); // 모델명
    const q3 = searchParams.get("q3"); // 업체명
    const q1 = searchParams.get("q1"); // 인증번호
    
    const serviceKey = process.env.KEA_SERVICE_KEY || process.env.NARA_SERVICE_KEY || "IlRRv3oVxFd7feu6O2+G2m6E8iLeuUG2S5JWzmbPdWnD6+ZmpUEnbtbQYJ0xcN/4iGwcOe7Dw3fcASgr8u5fkg==";
    if (!serviceKey) {
      return NextResponse.json({ error: "에너지공단 API 인증키가 설정되지 않았습니다. (.env.local 확인 필요)" }, { status: 500 });
    }

    const apiUrl = new URL("http://apis.data.go.kr/B553530/CRTIF/CRITF_01_LIST");
    apiUrl.searchParams.append("serviceKey", serviceKey);
    apiUrl.searchParams.append("apiType", "json");
    apiUrl.searchParams.append("pageNo", "1");
    apiUrl.searchParams.append("numOfRows", "10");

    if (q1) apiUrl.searchParams.append("q1", q1);
    if (q2) apiUrl.searchParams.append("q2", q2);
    if (q3) apiUrl.searchParams.append("q3", q3);

    const res = await fetch(apiUrl.toString());
    
    if (!res.ok) {
      throw new Error(`KEA API error: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json({ 
      success: true, 
      items: data?.response?.body?.items?.item || [],
      totalCount: data?.response?.body?.totalCount || 0
    });

  } catch (err: any) {
    console.error("[KEA API Error]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
