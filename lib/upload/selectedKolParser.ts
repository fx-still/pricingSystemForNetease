import * as XLSX from "xlsx";

import { normalizeAccountId } from "@/lib/cleaners";
import type { SelectedKol } from "@/types/pricing";

const HEADER_KEYS = {
  accountCategory: ["账号类别", "账户类别", "账号分类", "账户分类", "类型", "账号类型", "账户类型"],
  accountName: ["抖音昵称"],
  accountId: ["账号id", "账号ID", "账户id", "账户ID", "抖音id", "抖音ID", "抖音号"],
};

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s/g, "");
}

function resolveColumns(headers: unknown[]) {
  const normalizedHeaders = headers.map(normalizeHeader);

  const findIndex = (aliases: string[]) =>
    normalizedHeaders.findIndex((header) =>
      aliases.some((alias) => normalizeHeader(alias) === header)
    );

  const accountCategoryIndex = findIndex(HEADER_KEYS.accountCategory);
  const accountNameIndex = findIndex(HEADER_KEYS.accountName);
  const accountIdIndex = findIndex(HEADER_KEYS.accountId);

  if (accountCategoryIndex < 0 || accountNameIndex < 0 || accountIdIndex < 0) {
    throw new Error("选号表中未找到账号类别、抖音昵称或账号id字段");
  }

  return { accountCategoryIndex, accountNameIndex, accountIdIndex };
}

export async function parseSelectedKolsFromFile(file: File): Promise<SelectedKol[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return [];
  }

  const firstSheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, {
    header: 1,
    raw: true,
    blankrows: false,
  });

  if (!rows.length) {
    return [];
  }

  const headers = rows[0] ?? [];
  const { accountCategoryIndex, accountNameIndex, accountIdIndex } = resolveColumns(headers);

  return rows
    .slice(1)
    .map((row) => {
      const accountCategory = String(row[accountCategoryIndex] ?? "").trim();
      const accountName = String(row[accountNameIndex] ?? "").trim();
      const accountId = String(row[accountIdIndex] ?? "").trim();

      return {
        accountCategory,
        accountName,
        accountId,
        normalizedAccountId: normalizeAccountId(accountId),
      };
    })
    .filter((item) => item.accountName || item.accountId);
}
