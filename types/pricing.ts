export type SelectedKol = {
  accountCategory: string;
  accountName: string;
  accountId: string;
  normalizedAccountId: string;
};

export type QuoteHistory = {
  source: "self_kol" | "supplier_quote";
  sourceSpreadsheetToken?: string;
  sourceSheetId?: string;
  sourceSheetName?: string;

  supplier: string;
  studio?: string;

  songId?: string;
  songName?: string;

  accountName: string;
  accountId: string;
  normalizedAccountId: string;

  category?: string;
  fansW?: number;

  profileUrl?: string;
  postUrl?: string;
  neteaseUrl?: string;

  price?: number;

  likes?: number;
  cpe?: number;

  publishDate?: string;

  remark?: string;

  raw?: Record<string, unknown>;
};

export type MatchStatus = "exact" | "normalized_id" | "name_match" | "not_found";

export type CompareResult = {
  accountName: string;
  accountId: string;
  normalizedAccountId: string;

  fansW?: number;
  category?: string;

  matchedStatus: MatchStatus;
  historyCount: number;

  histories: QuoteHistory[];

  minPrice?: number;
  maxPrice?: number;
  avgPrice?: number;
  latestPrice?: number;

  bestSupplier?: string;
  minPriceSongName?: string;
  minPriceSongId?: string;
  minPriceCpe?: number;

  avgCpe?: number;

  combinedRemarks?: string;
};

export type RecommendationResult = {
  accountName: string;
  accountId: string;
  fansW?: number;
  category?: string;

  minPrice?: number;
  bestSupplier?: string;
  avgPrice?: number;
  savingAmount?: number;

  matchedStatus: MatchStatus;
};
