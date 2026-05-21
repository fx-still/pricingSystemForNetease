import {
  normalizeAccountId,
  parseDateToYmd,
  parseFansW,
  parseNumber,
  parsePrice,
  toSafeText,
} from "@/lib/cleaners";
import {
  fetchSheetValues,
  fetchSpreadsheetSheets,
  normalizeSpreadsheetToken,
  rowsToObjects,
} from "@/lib/feishu/sheets";
import type { QuoteHistory } from "@/types/pricing";

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`缺少环境变量: ${name}`);
  }
  return value;
}

type SourceInfo = {
  sourceSpreadsheetToken: string;
  sourceSheetId: string;
  sourceSheetName: string;
};

function buildSelfKolQuote(
  row: Record<string, unknown>,
  sourceInfo: SourceInfo
): QuoteHistory {
  const accountName = toSafeText(row["抖音昵称"]) ?? "";
  const accountId = toSafeText(row["账号ID"]) ?? toSafeText(row["账号id"]) ?? "";
  const remark = toSafeText(row["小玉备注"]);

  return {
    source: "self_kol",
    ...sourceInfo,
    supplier: "自联",
    songId: toSafeText(row["歌曲ID"]),
    studio: toSafeText(row["工作室"]),
    songName: toSafeText(row["歌曲名称"]),
    accountName,
    accountId,
    normalizedAccountId: normalizeAccountId(accountId),
    category: toSafeText(row["二级类目"]) ?? toSafeText(row["达人类型"]),
    profileUrl: toSafeText(row["主页链接"]),
    fansW: parseFansW(row["粉丝量"]),
    price: parsePrice(row["合作价格"]),
    publishDate: parseDateToYmd(row["发布时间"]),
    postUrl: toSafeText(row["发布链接"]),
    likes: parseNumber(row["点赞数据"]),
    cpe: parseNumber(row["点赞成本"]),
    remark,
    raw: row,
  };
}

function buildSupplierQuote(
  row: Record<string, unknown>,
  sourceInfo: SourceInfo
): QuoteHistory {
  const accountName = toSafeText(row["账号昵称"]) ?? "";
  const accountId = toSafeText(row["账号id"]) ?? "";
  const remark = toSafeText(row["验收备注"]) ?? toSafeText(row["备注"]);

  return {
    source: "supplier_quote",
    ...sourceInfo,
    supplier: toSafeText(row["供应商"]) ?? "",
    studio: toSafeText(row["工作室"]),
    songName: toSafeText(row["歌曲"]),
    accountName,
    accountId,
    normalizedAccountId: normalizeAccountId(accountId),
    category: toSafeText(row["垂类"]),
    fansW: parseFansW(row["粉丝数(w)"]),
    profileUrl: toSafeText(row["主页链接"]),
    postUrl: toSafeText(row["作品链接"]),
    neteaseUrl: toSafeText(row["网易云链接"]),
    likes: parseNumber(row["点赞数"]),
    publishDate: parseDateToYmd(row["发布时间"]),
    price: parsePrice(row["合作价格"]),
    cpe: parseNumber(row["CPE值"]),
    remark,
    raw: row,
  };
}

export async function getQuoteHistoryFromFeishu(): Promise<QuoteHistory[]> {
  const selfSpreadsheetToken = normalizeSpreadsheetToken(
    getRequiredEnv("FEISHU_SELF_KOL_SPREADSHEET_TOKEN")
  );
  const selfSheetId = process.env.FEISHU_SELF_KOL_SHEET_ID;
  const selfRange = process.env.FEISHU_SELF_KOL_RANGE ?? "A:AG";

  const supplierSpreadsheetToken = normalizeSpreadsheetToken(
    getRequiredEnv(
    "FEISHU_SUPPLIER_SPREADSHEET_TOKEN"
    )
  );
  const supplierRange = process.env.FEISHU_SUPPLIER_RANGE ?? "A:Q";

  let selfHistories: QuoteHistory[] = [];
  let supplierHistories: QuoteHistory[] = [];

  try {
    const selfSheets = await fetchSpreadsheetSheets(selfSpreadsheetToken);
    const targetSelfSheet =
      (selfSheetId
        ? selfSheets.find((sheet) => sheet.sheetId === selfSheetId)
        : selfSheets[0]) ?? null;

    if (!targetSelfSheet) {
      throw new Error("未找到自联 KOL sheet");
    }

    const selfValues = await fetchSheetValues({
      spreadsheetToken: selfSpreadsheetToken,
      sheetId: targetSelfSheet.sheetId,
      range: selfRange,
    });
    const selfRows = rowsToObjects(selfValues);
    selfHistories = selfRows.map((row) =>
      buildSelfKolQuote(row, {
        sourceSpreadsheetToken: selfSpreadsheetToken,
        sourceSheetId: targetSelfSheet.sheetId,
        sourceSheetName: targetSelfSheet.sheetName,
      })
    );
  } catch {
    throw new Error("飞书自联 KOL 表读取失败");
  }

  try {
    const supplierSheets = await fetchSpreadsheetSheets(supplierSpreadsheetToken);
    const supplierHistoryGroups = await Promise.all(
      supplierSheets.map(async (sheet) => {
        const values = await fetchSheetValues({
          spreadsheetToken: supplierSpreadsheetToken,
          sheetId: sheet.sheetId,
          range: supplierRange,
        });
        const rows = rowsToObjects(values);
        return rows.map((row) =>
          buildSupplierQuote(row, {
            sourceSpreadsheetToken: supplierSpreadsheetToken,
            sourceSheetId: sheet.sheetId,
            sourceSheetName: sheet.sheetName,
          })
        );
      })
    );
    supplierHistories = supplierHistoryGroups.flat();
  } catch {
    throw new Error("飞书供应商比价验收表读取失败");
  }

  return [...selfHistories, ...supplierHistories]
    .filter((item) => item.accountName || item.accountId)
    .filter((item) => item.price !== undefined);
}
