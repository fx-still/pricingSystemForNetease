"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { parseSelectedKolsFromFile } from "@/lib/upload/selectedKolParser";
import type { CompareResult, RecommendationResult, SelectedKol } from "@/types/pricing";

type CompareApiResponse = {
  success: boolean;
  compareResults: CompareResult[];
  recommendations: RecommendationResult[];
  message?: string;
};

const MATCH_STATUS_TEXT: Record<CompareResult["matchedStatus"], string> = {
  exact: "精准匹配",
  normalized_id: "清洗后匹配",
  name_match: "疑似匹配",
  not_found: "未匹配",
};

function formatNumber(value?: number): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }
  return Number(value.toFixed(2)).toString();
}

function sortHistoriesByDateDesc(histories: CompareResult["histories"]) {
  return [...histories].sort((a, b) => (b.publishDate ?? "").localeCompare(a.publishDate ?? ""));
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [selectedKols, setSelectedKols] = useState<SelectedKol[]>([]);
  const [compareResults, setCompareResults] = useState<CompareResult[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationResult[]>([]);
  const [activeKol, setActiveKol] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [message, setMessage] = useState<string>("");

  const trendData = useMemo(() => {
    if (!activeKol) {
      return [];
    }

    const records = activeKol.histories
      .filter((item) => item.publishDate && item.price !== undefined)
      .map((item) => ({
        date: item.publishDate as string,
        supplier: item.supplier || "未知供应商",
        price: item.price as number,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const dateMap = new Map<string, Record<string, string | number>>();
    records.forEach((record) => {
      if (!dateMap.has(record.date)) {
        dateMap.set(record.date, { date: record.date });
      }
      const row = dateMap.get(record.date) as Record<string, string | number>;
      row[record.supplier] = record.price;
    });

    return Array.from(dateMap.values());
  }, [activeKol]);

  const supplierSeries = useMemo(() => {
    if (!activeKol) {
      return [];
    }
    return Array.from(
      new Set(activeKol.histories.map((item) => item.supplier).filter(Boolean))
    ) as string[];
  }, [activeKol]);

  async function handleStartCompare() {
    try {
      if (!file) {
        throw new Error("请先选择 Excel 文件");
      }
      setLoading(true);
      setError("");
      setMessage("");

      const parsed = await parseSelectedKolsFromFile(file);
      if (!parsed.length) {
        throw new Error("上传文件未解析到有效账号");
      }
      setSelectedKols(parsed);

      const response = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedKols: parsed }),
      });

      const data = (await response.json()) as CompareApiResponse;
      if (!response.ok || !data.success) {
        setCompareResults(data.compareResults ?? []);
        setRecommendations(data.recommendations ?? []);
        setActiveKol((data.compareResults ?? [])[0] ?? null);
        throw new Error(data.message || "比价失败");
      }

      setCompareResults(data.compareResults);
      setRecommendations(data.recommendations);
      setActiveKol(data.compareResults[0] ?? null);
      setMessage(data.message ?? "比价完成");
    } catch (err) {
      setError(err instanceof Error ? err.message : "发生未知错误");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 p-6 text-sm text-slate-900">
      <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-5">
        <h1 className="text-2xl font-semibold">Pricing NetEase - KOL 供应商比价系统</h1>
        <p className="text-slate-600">
          上传选号表，自动匹配飞书历史报价，输出 KOL 历史价格、最低价供应商和推荐比价方案。
        </p>
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold">上传选号表</h2>
        <p className="text-slate-600">
          请上传包含「账号类别 / 抖音昵称 / 账号id」三列的 Excel 文件。系统将以账号 id
          为核心匹配字段，自动查询飞书历史报价。
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="cursor-pointer rounded-md border border-slate-300 px-4 py-2 hover:bg-slate-50">
            选择文件
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
          <button
            type="button"
            className="rounded-md bg-slate-900 px-4 py-2 text-white disabled:bg-slate-400"
            onClick={handleStartCompare}
            disabled={loading}
          >
            {loading ? "比价中..." : "开始比价"}
          </button>
          <span className="text-slate-600">{file?.name ?? "尚未选择文件"}</span>
        </div>
        {!!selectedKols.length && (
          <p className="text-slate-600">已解析账号数：{selectedKols.length}</p>
        )}
        {!!message && <p className="text-emerald-600">{message}</p>}
        {!!error && <p className="text-rose-600">{error}</p>}
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold">KOL 比价总看板</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="py-2 pr-4">账号昵称</th>
                <th className="py-2 pr-4">账号id</th>
                <th className="py-2 pr-4">粉丝数(w)</th>
                <th className="py-2 pr-4">垂类</th>
                <th className="py-2 pr-4">历史投放歌曲</th>
                <th className="py-2 pr-4">历史合作价格</th>
                <th className="py-2 pr-4">历史投放cpe</th>
                <th className="py-2 pr-4">备注</th>
                <th className="py-2 pr-4">匹配状态</th>
              </tr>
            </thead>
            <tbody>
              {compareResults.map((item) => {
                const sortedHistories = sortHistoriesByDateDesc(item.histories);
                const boardRows = sortedHistories.length ? sortedHistories : [null];

                return boardRows.map((history, index) => {
                  const isFirstRow = index === 0;
                  return (
                    <tr
                      key={`${item.accountId}-${item.accountName}-${history?.songName ?? history?.songId ?? "empty"}-${index}`}
                      className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                      onClick={() => setActiveKol(item)}
                    >
                      {isFirstRow && (
                        <>
                          <td className="py-2 pr-4 align-top" rowSpan={boardRows.length}>
                            {item.accountName || "-"}
                          </td>
                          <td className="py-2 pr-4 align-top" rowSpan={boardRows.length}>
                            {item.accountId || "-"}
                          </td>
                          <td className="py-2 pr-4 align-top" rowSpan={boardRows.length}>
                            {formatNumber(item.fansW)}
                          </td>
                          <td className="py-2 pr-4 align-top" rowSpan={boardRows.length}>
                            {item.category || "-"}
                          </td>
                        </>
                      )}
                      <td className="py-2 pr-4">{history?.songName || history?.songId || "-"}</td>
                      <td className="py-2 pr-4">{formatNumber(history?.price)}</td>
                      <td className="py-2 pr-4">{formatNumber(history?.cpe)}</td>
                      <td className="py-2 pr-4">{history?.remark || "-"}</td>
                      <td className="py-2 pr-4">{MATCH_STATUS_TEXT[item.matchedStatus]}</td>
                    </tr>
                  );
                });
              })}
              {!compareResults.length && (
                <tr>
                  <td className="py-4 text-slate-500" colSpan={9}>
                    暂无数据，请先上传文件并开始比价。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold">KOL 详情</h2>
        {!activeKol ? (
          <p className="text-slate-500">请选择一个 KOL 查看详情。</p>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-md bg-slate-50 p-3">历史最低价：{formatNumber(activeKol.minPrice)}</div>
              <div className="rounded-md bg-slate-50 p-3">历史最高价：{formatNumber(activeKol.maxPrice)}</div>
              <div className="rounded-md bg-slate-50 p-3">历史均价：{formatNumber(activeKol.avgPrice)}</div>
              <div className="rounded-md bg-slate-50 p-3">平均cpe：{formatNumber(activeKol.avgCpe)}</div>
              <div className="rounded-md bg-slate-50 p-3">最新报价：{formatNumber(activeKol.latestPrice)}</div>
              <div className="rounded-md bg-slate-50 p-3">最低价供应商：{activeKol.bestSupplier || "-"}</div>
              <div className="rounded-md bg-slate-50 p-3">最低价对应歌曲：{activeKol.minPriceSongName || "-"}</div>
              <div className="rounded-md bg-slate-50 p-3">最低价对应CPE：{formatNumber(activeKol.minPriceCpe)}</div>
              <div className="rounded-md bg-slate-50 p-3 sm:col-span-2">备注：{activeKol.combinedRemarks || "-"}</div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    <th className="py-2 pr-4">时间</th>
                    <th className="py-2 pr-4">供应商</th>
                    <th className="py-2 pr-4">合作价格</th>
                    <th className="py-2 pr-4">歌曲</th>
                    <th className="py-2 pr-4">CPE</th>
                    <th className="py-2 pr-4">备注</th>
                  </tr>
                </thead>
                <tbody>
                  {sortHistoriesByDateDesc(activeKol.histories).map((history, index) => (
                      <tr
                        className="border-b border-slate-100"
                        key={`${history.supplier}-${history.publishDate}-${index}`}
                      >
                        <td className="py-2 pr-4">{history.publishDate || "-"}</td>
                        <td className="py-2 pr-4">{history.supplier || "-"}</td>
                        <td className="py-2 pr-4">{formatNumber(history.price)}</td>
                        <td className="py-2 pr-4">{history.songName || history.songId || "-"}</td>
                        <td className="py-2 pr-4">{formatNumber(history.cpe)}</td>
                        <td className="py-2 pr-4">{history.remark || "-"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="h-[320px] rounded-md border border-slate-200 p-3">
              <p className="mb-2 text-slate-700">价格趋势折线图</p>
              {trendData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {supplierSeries.map((supplier, index) => (
                      <Line
                        key={supplier}
                        type="monotone"
                        dataKey={supplier}
                        stroke={["#2563eb", "#16a34a", "#f97316", "#9333ea"][index % 4]}
                        activeDot={{ r: 6 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-slate-500">该 KOL 暂无可绘制的价格趋势数据。</p>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold">推荐比价方案</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="py-2 pr-4">账号昵称</th>
                <th className="py-2 pr-4">账号id</th>
                <th className="py-2 pr-4">粉丝数(w)</th>
                <th className="py-2 pr-4">垂类</th>
                <th className="py-2 pr-4">最低价</th>
                <th className="py-2 pr-4">对应供应商</th>
                <th className="py-2 pr-4">历史均价</th>
                <th className="py-2 pr-4">节省金额</th>
              </tr>
            </thead>
            <tbody>
              {recommendations.map((item) => (
                <tr key={`${item.accountId}-${item.accountName}`} className="border-b border-slate-100">
                  <td className="py-2 pr-4">{item.accountName || "-"}</td>
                  <td className="py-2 pr-4">{item.accountId || "-"}</td>
                  <td className="py-2 pr-4">{formatNumber(item.fansW)}</td>
                  <td className="py-2 pr-4">{item.category || "-"}</td>
                  <td className="py-2 pr-4">{formatNumber(item.minPrice)}</td>
                  <td className="py-2 pr-4">{item.bestSupplier || "-"}</td>
                  <td className="py-2 pr-4">{formatNumber(item.avgPrice)}</td>
                  <td className="py-2 pr-4">{formatNumber(item.savingAmount)}</td>
                </tr>
              ))}
              {!recommendations.length && (
                <tr>
                  <td className="py-4 text-slate-500" colSpan={8}>
                    暂无推荐数据。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
