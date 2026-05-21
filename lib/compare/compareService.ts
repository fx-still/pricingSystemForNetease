import { normalizeAccountId } from "@/lib/cleaners";
import type {
  CompareResult,
  QuoteHistory,
  RecommendationResult,
  SelectedKol,
} from "@/types/pricing";

function average(values: number[]): number | undefined {
  if (!values.length) {
    return undefined;
  }
  return Number((values.reduce((sum, item) => sum + item, 0) / values.length).toFixed(2));
}

function getLatestPrice(histories: QuoteHistory[]): number | undefined {
  const withPrice = histories.filter((item) => item.price !== undefined);
  if (!withPrice.length) {
    return undefined;
  }

  const withDate = withPrice.filter((item) => item.publishDate);
  if (!withDate.length) {
    return withPrice[0]?.price;
  }

  const latest = [...withDate].sort((a, b) =>
    (b.publishDate ?? "").localeCompare(a.publishDate ?? "")
  )[0];
  return latest?.price;
}

function getMatchedHistories(
  selected: SelectedKol,
  allHistories: QuoteHistory[]
): { histories: QuoteHistory[]; status: CompareResult["matchedStatus"] } {
  const exactMatches = allHistories.filter(
    (history) => selected.accountId && history.accountId === selected.accountId
  );
  if (exactMatches.length) {
    return { histories: exactMatches, status: "exact" };
  }

  const normalizedMatches = allHistories.filter(
    (history) =>
      selected.normalizedAccountId &&
      history.normalizedAccountId &&
      history.normalizedAccountId === selected.normalizedAccountId
  );
  if (normalizedMatches.length) {
    return { histories: normalizedMatches, status: "normalized_id" };
  }

  const nameMatches = allHistories.filter(
    (history) => selected.accountName && history.accountName === selected.accountName
  );
  if (nameMatches.length) {
    return { histories: nameMatches, status: "name_match" };
  }

  return { histories: [], status: "not_found" };
}

export function buildCompareResults(
  selectedKols: SelectedKol[],
  quoteHistories: QuoteHistory[]
): CompareResult[] {
  return selectedKols.map((selected) => {
    const { histories, status } = getMatchedHistories(selected, quoteHistories);
    const validPrices = histories
      .map((item) => item.price)
      .filter((price): price is number => typeof price === "number");
    const validCpes = histories
      .map((item) => item.cpe)
      .filter((cpe): cpe is number => typeof cpe === "number");

    const minPrice = validPrices.length ? Math.min(...validPrices) : undefined;
    const maxPrice = validPrices.length ? Math.max(...validPrices) : undefined;
    const avgPrice = average(validPrices);
    const latestPrice = getLatestPrice(histories);

    const minPriceHistory = histories.find(
      (item) => item.price !== undefined && item.price === minPrice
    );

    const remarks = Array.from(
      new Set(
        histories
          .map((item) => item.remark?.trim())
          .filter((item): item is string => Boolean(item))
      )
    );

    return {
      accountName: selected.accountName,
      accountId: selected.accountId,
      normalizedAccountId: normalizeAccountId(selected.accountId),
      fansW: histories.find((item) => item.fansW !== undefined)?.fansW,
      category: selected.accountCategory || histories[0]?.category,
      matchedStatus: status,
      historyCount: histories.length,
      histories,
      minPrice,
      maxPrice,
      avgPrice,
      latestPrice,
      bestSupplier: minPriceHistory?.supplier,
      minPriceSongName: minPriceHistory?.songName,
      minPriceSongId: minPriceHistory?.songId,
      minPriceCpe: minPriceHistory?.cpe,
      avgCpe: average(validCpes),
      combinedRemarks: remarks.join("；") || undefined,
    };
  });
}

export function buildRecommendations(
  compareResults: CompareResult[]
): RecommendationResult[] {
  return compareResults.map((result) => ({
    accountName: result.accountName,
    accountId: result.accountId,
    fansW: result.fansW,
    category: result.category,
    minPrice: result.minPrice,
    bestSupplier: result.bestSupplier,
    avgPrice: result.avgPrice,
    savingAmount:
      result.avgPrice !== undefined && result.minPrice !== undefined
        ? Number((result.avgPrice - result.minPrice).toFixed(2))
        : undefined,
    matchedStatus: result.matchedStatus,
  }));
}
