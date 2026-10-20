import { connection } from 'next/server';
import {
  getReportSummary,
  getDailyReport,
  getProductReport,
} from '@/app/actions/reports';
import { getMonthStart, getTodayEnd } from '@/lib/formatters';
import { ReportsClient } from '@/components/reports/reports-client';

export default async function ReportsPage() {
  await connection();
  const startDate = getMonthStart();
  const endDate = getTodayEnd();

  const [summaryRes, dailyRes, productsRes] = await Promise.all([
    getReportSummary(startDate, endDate),
    getDailyReport(startDate, endDate),
    getProductReport(startDate, endDate),
  ]);

  const summary = summaryRes.success && summaryRes.data
    ? summaryRes.data
    : {
        total_revenue: 0,
        total_profit: 0,
        transaction_count: 0,
        avg_transaction_value: 0,
      };

  const daily = dailyRes.success && dailyRes.data ? dailyRes.data : [];
  const products = productsRes.success && productsRes.data ? productsRes.data : [];

  return (
    <ReportsClient
      initialSummary={summary}
      initialDaily={daily}
      initialProducts={products}
      initialStartDate={startDate}
      initialEndDate={endDate}
    />
  );
}
