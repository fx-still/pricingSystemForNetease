import { getTenantAccessToken } from "@/lib/feishu/auth";

export type FeishuSheetMeta = {
  sheetId: string;
  sheetName: string;
};

type FetchSheetParams = {
  spreadsheetToken: string;
  sheetId: string;
  range: string;
};

export function normalizeSpreadsheetToken(input: string): string {
  const value = String(input ?? "").trim();
  if (!value) {
    return "";
  }

  // 兼容直接填 token 或完整飞书链接
  const matched = value.match(/\/sheets\/([A-Za-z0-9]+)/);
  return matched?.[1] ?? value;
}

export async function fetchSpreadsheetSheets(
  spreadsheetToken: string
): Promise<FeishuSheetMeta[]> {
  const token = await getTenantAccessToken();
  const normalizedToken = normalizeSpreadsheetToken(spreadsheetToken);
  const url = `https://open.feishu.cn/open-apis/sheets/v3/spreadsheets/${normalizedToken}/sheets/query`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`飞书 sheet 列表读取失败: ${response.status}`);
  }

  const data = (await response.json()) as {
    code?: number;
    msg?: string;
    data?: {
      sheets?: Array<{
        sheet_id?: string;
        title?: string;
      }>;
    };
  };

  if (data.code !== 0) {
    throw new Error(`飞书 sheet 列表读取失败: ${data.msg ?? "unknown"}`);
  }

  return (data.data?.sheets ?? [])
    .map((sheet) => ({
      sheetId: String(sheet.sheet_id ?? "").trim(),
      sheetName: String(sheet.title ?? "").trim(),
    }))
    .filter((sheet) => sheet.sheetId);
}

export async function fetchSheetValues(
  params: FetchSheetParams
): Promise<unknown[][]> {
  const token = await getTenantAccessToken();
  const normalizedToken = normalizeSpreadsheetToken(params.spreadsheetToken);
  const fullRange = encodeURIComponent(`${params.sheetId}!${params.range}`);
  const url = `https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/${normalizedToken}/values/${fullRange}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`飞书表格读取失败: ${response.status}`);
  }

  const data = (await response.json()) as {
    code?: number;
    msg?: string;
    data?: {
      valueRange?: {
        values?: unknown[][];
      };
    };
  };

  if (data.code !== 0) {
    throw new Error(`飞书表格读取失败: ${data.msg ?? "unknown"}`);
  }

  return data.data?.valueRange?.values ?? [];
}

export function rowsToObjects(values: unknown[][]): Record<string, unknown>[] {
  if (!values.length) {
    return [];
  }

  const headers = (values[0] ?? []).map((header) =>
    String(header ?? "").trim()
  );

  const result: Record<string, unknown>[] = [];
  for (let rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    const row = values[rowIndex] ?? [];
    const record: Record<string, unknown> = {};
    let hasValue = false;

    headers.forEach((header, colIndex) => {
      if (!header) {
        return;
      }
      const cellValue = row[colIndex];
      if (cellValue !== null && cellValue !== undefined && cellValue !== "") {
        hasValue = true;
      }
      record[header] = cellValue;
    });

    if (hasValue) {
      result.push(record);
    }
  }

  return result;
}
