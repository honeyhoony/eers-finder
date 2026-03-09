import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  const publicDocsReqs = (folderName: string) => {
    try {
      const dirPath = path.join(process.cwd(), "public", "docs", folderName);
      if (fs.existsSync(dirPath)) {
        return fs.readdirSync(dirPath).filter(f => f.endsWith('.pdf'));
      }
    } catch {
      // Ignore
    }
    return [];
  };

  return NextResponse.json({
    tip: publicDocsReqs("TIP"),
    faq: publicDocsReqs("FAQ"),
  });
}
