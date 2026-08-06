"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useLocale, useTranslations } from "next-intl";
import type { CagedQueryResult } from "@/domain/caged/schemas";

type MonthlyMetrics = CagedQueryResult["months"][string] & {
  month: string;
};

type QueryResultsProps = {
  result: CagedQueryResult;
};

type PeriodSummary = {
  admissions: number;
  averageSalary?: number;
  dismissals: number;
  netBalance: number;
};

function toMonthlyMetrics(months: CagedQueryResult["months"]): MonthlyMetrics[] {
  return Object.entries(months)
    .sort(([firstMonth], [secondMonth]) => firstMonth.localeCompare(secondMonth))
    .map(([month, metrics]) => ({ month, ...metrics }));
}

function summarizePeriod(monthlyMetrics: readonly MonthlyMetrics[]): PeriodSummary {
  const totals = monthlyMetrics.reduce(
    (summary, metrics) => ({
      admissions: summary.admissions + metrics.admissions,
      dismissals: summary.dismissals + metrics.dismissals,
      netBalance: summary.netBalance + metrics.netBalance,
      salaryCount: summary.salaryCount + metrics.salaryCount,
      salarySum: summary.salarySum + metrics.salarySum,
    }),
    { admissions: 0, dismissals: 0, netBalance: 0, salaryCount: 0, salarySum: 0 },
  );

  return {
    admissions: totals.admissions,
    averageSalary:
      totals.salaryCount === 0 ? undefined : totals.salarySum / totals.salaryCount,
    dismissals: totals.dismissals,
    netBalance: totals.netBalance,
  };
}

function getNetBalanceDomain(monthlyMetrics: readonly MonthlyMetrics[]): [number, number] {
  const largestMagnitude = Math.max(
    1,
    ...monthlyMetrics.map((metrics) => Math.abs(metrics.netBalance)),
  );

  return [-largestMagnitude, largestMagnitude];
}

function formatMonth(month: string): string {
  return `${month.slice(4, 6)}/${month.slice(0, 4)}`;
}

function formatInteger(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
}

function formatCurrency(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    currency: "BRL",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(value);
}

function ChartCard({ children, title }: Readonly<{ children: React.ReactNode; title: string }>) {
  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6">
      <h3 className="text-lg font-bold text-[var(--foreground)]">{title}</h3>
      <div className="mt-5 h-72 sm:h-80">{children}</div>
    </section>
  );
}

export function QueryResults({ result }: QueryResultsProps) {
  const locale = useLocale();
  const t = useTranslations("Results");
  const monthlyMetrics = toMonthlyMetrics(result.months);

  if (monthlyMetrics.length === 0) {
    return (
      <section aria-live="polite" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="text-xl font-bold text-[var(--foreground)]">{t("title")}</h2>
        <p className="mt-3 text-[var(--muted-foreground)]">{t("noData")}</p>
      </section>
    );
  }

  const formatMonthLabel = (month: string) => formatMonth(month);
  const formatCount = (value: number) => formatInteger(value, locale);
  const formatTooltipMonth = (label: unknown) =>
    typeof label === "string" ? formatMonthLabel(label) : "";
  const formatTooltipCount = (value: unknown) =>
    typeof value === "number" || typeof value === "string"
      ? formatCount(Number(value))
      : "";
  const formatTooltipCurrency = (value: unknown) =>
    typeof value === "number" || typeof value === "string"
      ? formatCurrency(Number(value), locale)
      : "";
  const periodSummary = summarizePeriod(monthlyMetrics);
  const netBalanceDomain = getNetBalanceDomain(monthlyMetrics);
  const showCharts = monthlyMetrics.length > 1;
  const summaryCards = [
    { label: t("admissions"), value: formatCount(periodSummary.admissions) },
    { label: t("dismissals"), value: formatCount(periodSummary.dismissals) },
    { label: t("netBalance"), value: formatCount(periodSummary.netBalance) },
    {
      label: t("averageSalary"),
      value:
        periodSummary.averageSalary === undefined
          ? t("notAvailable")
          : formatCurrency(periodSummary.averageSalary, locale),
    },
  ];

  return (
    <section aria-live="polite" className="space-y-6" tabIndex={-1}>
      <div>
        <h2 className="text-2xl font-bold text-[var(--foreground)]">{t("title")}</h2>
        <p className="mt-2 text-[var(--muted-foreground)]">
          {t("description", {
            from: formatMonthLabel(result.query.from),
            location: result.location.name,
            profession: result.profession.title,
            to: formatMonthLabel(result.query.to),
          })}
        </p>
      </div>

      <section aria-labelledby="summary-title">
        <h3 className="text-lg font-bold text-[var(--foreground)]" id="summary-title">
          {t("periodSummary", {
            from: formatMonthLabel(result.query.from),
            to: formatMonthLabel(result.query.to),
          })}
        </h3>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summaryCards.map((card) => (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4" key={card.label}>
              <dt className="text-sm font-medium text-[var(--muted-foreground)]">{card.label}</dt>
              <dd className="mt-2 text-2xl font-bold tracking-tight text-[var(--foreground)]">
                {card.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {showCharts ? <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title={t("admissionsAndDismissalsTitle")}>
          <ResponsiveContainer height="100%" width="100%">
            <LineChart accessibilityLayer data={monthlyMetrics} margin={{ left: 8, right: 16, top: 8 }}>
              <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" />
              <XAxis dataKey="month" tickFormatter={formatMonthLabel} />
              <YAxis tickFormatter={formatCount} width={64} />
              <Tooltip
                formatter={formatTooltipCount}
                labelFormatter={formatTooltipMonth}
              />
              <Legend />
              <Line
                dataKey="admissions"
                name={t("admissions")}
                stroke="var(--primary)"
                strokeWidth={2}
                type="monotone"
              />
              <Line
                dataKey="dismissals"
                name={t("dismissals")}
                stroke="var(--comparison)"
                strokeDasharray="6 4"
                strokeWidth={2}
                type="monotone"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t("netBalanceTitle")}>
          <ResponsiveContainer height="100%" width="100%">
            <BarChart accessibilityLayer data={monthlyMetrics} margin={{ left: 8, right: 16, top: 8 }}>
              <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" />
              <XAxis dataKey="month" tickFormatter={formatMonthLabel} />
              <YAxis domain={netBalanceDomain} tickFormatter={formatCount} width={64} />
              <Tooltip
                formatter={formatTooltipCount}
                labelFormatter={formatTooltipMonth}
              />
              <ReferenceLine stroke="var(--muted-foreground)" y={0} />
              <Bar dataKey="netBalance" name={t("netBalance")}>
                {monthlyMetrics.map((metrics) => (
                  <Cell
                    fill={metrics.netBalance >= 0 ? "var(--positive)" : "var(--negative)"}
                    key={metrics.month}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t("averageSalaryTitle")}>
          <ResponsiveContainer height="100%" width="100%">
            <LineChart accessibilityLayer data={monthlyMetrics} margin={{ left: 12, right: 16, top: 8 }}>
              <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" />
              <XAxis dataKey="month" tickFormatter={formatMonthLabel} />
              <YAxis tickFormatter={(value: number) => formatCurrency(value, locale)} width={92} />
              <Tooltip
                formatter={formatTooltipCurrency}
                labelFormatter={formatTooltipMonth}
              />
              <Line
                dataKey="avgSalary"
                name={t("averageSalary")}
                stroke="var(--primary)"
                strokeWidth={2}
                type="monotone"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div> : null}

      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6">
        <h3 className="text-lg font-bold text-[var(--foreground)]">{t("tableTitle")}</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <caption className="sr-only">{t("tableCaption")}</caption>
            <thead className="border-b border-[var(--border)] text-[var(--muted-foreground)]">
              <tr>
                <th className="whitespace-nowrap px-3 py-3 font-semibold" scope="col">{t("month")}</th>
                <th className="whitespace-nowrap px-3 py-3 font-semibold" scope="col">{t("admissions")}</th>
                <th className="whitespace-nowrap px-3 py-3 font-semibold" scope="col">{t("dismissals")}</th>
                <th className="whitespace-nowrap px-3 py-3 font-semibold" scope="col">{t("netBalance")}</th>
                <th className="whitespace-nowrap px-3 py-3 font-semibold" scope="col">{t("totalTurnover")}</th>
                <th className="whitespace-nowrap px-3 py-3 font-semibold" scope="col">{t("averageSalary")}</th>
                <th className="whitespace-nowrap px-3 py-3 font-semibold" scope="col">{t("salaryCount")}</th>
              </tr>
            </thead>
            <tbody>
              {monthlyMetrics.map((metrics) => (
                <tr className="border-b border-[var(--border)] last:border-0" key={metrics.month}>
                  <th className="whitespace-nowrap px-3 py-3 font-medium" scope="row">
                    {formatMonthLabel(metrics.month)}
                  </th>
                  <td className="whitespace-nowrap px-3 py-3">{formatCount(metrics.admissions)}</td>
                  <td className="whitespace-nowrap px-3 py-3">{formatCount(metrics.dismissals)}</td>
                  <td className="whitespace-nowrap px-3 py-3">{formatCount(metrics.netBalance)}</td>
                  <td className="whitespace-nowrap px-3 py-3">{formatCount(metrics.totalTurnover)}</td>
                  <td className="whitespace-nowrap px-3 py-3">{formatCurrency(metrics.avgSalary, locale)}</td>
                  <td className="whitespace-nowrap px-3 py-3">{formatCount(metrics.salaryCount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
