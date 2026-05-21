import { NextResponse } from "next/server";

import { buildCompareResults, buildRecommendations } from "@/lib/compare/compareService";
import { getQuoteHistoryFromFeishu } from "@/lib/feishu/quoteService";
import { normalizeAccountId } from "@/lib/cleaners";
import type { SelectedKol } from "@/types/pricing";

type CompareRequestBody = {
  selectedKols?: SelectedKol[];
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CompareRequestBody;
    const selectedKols = (body.selectedKols ?? []).map((item) => ({
      accountCategory: String(item.accountCategory ?? "").trim(),
      accountName: String(item.accountName ?? "").trim(),
      accountId: String(item.accountId ?? "").trim(),
      normalizedAccountId: normalizeAccountId(item.accountId ?? ""),
    }));

    if (!selectedKols.length) {
      return NextResponse.json(
        {
          success: false,
          compareResults: [],
          recommendations: [],
          message: "未接收到有效选号数据",
        },
        { status: 400 }
      );
    }

    const quoteHistories = await getQuoteHistoryFromFeishu();
    const compareResults = buildCompareResults(selectedKols, quoteHistories);
    const recommendations = buildRecommendations(compareResults);
    const hasAnyHistory = compareResults.some((item) => item.historyCount > 0);

    return NextResponse.json({
      success: hasAnyHistory,
      compareResults,
      recommendations,
      message: hasAnyHistory ? undefined : "没有匹配到任何历史报价",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "比价失败";
    return NextResponse.json(
      {
        success: false,
        compareResults: [],
        recommendations: [],
        message,
      },
      { status: 500 }
    );
  }
}
