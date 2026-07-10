import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import '@mantine/charts/styles.css';
import {
  Alert,
  Badge,
  Center,
  Group,
  Loader,
  NumberInput,
  Paper,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { LineChart } from '@mantine/charts';
import {
  IconAlertTriangle,
  IconArrowDownRight,
  IconArrowUpRight,
  IconCalendarStats,
  IconCash,
} from '@tabler/icons-react';
import * as api from '../../api/client';
import type { CashFlowForecast as CashFlowForecastData } from '../../api/client';
import { BillIcon } from '../BillIcon';
import { formatCurrency, formatCurrencyAxis, getCurrencySymbol } from '../../lib/currency';

interface CashFlowForecastProps {
  hasDatabase: boolean;
  framed?: boolean;
  showHeader?: boolean;
}

const STORAGE_KEY = 'billmanager:forecast-starting-balance';

function formatShortDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return dateStr;
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function SummaryMetric({
  label,
  value,
  detail,
  color,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  color: string;
  icon: ReactNode;
}) {
  return (
    <Group gap="sm" align="flex-start" wrap="nowrap">
      <ThemeIcon color={color} variant="light" size="lg" radius="md">
        {icon}
      </ThemeIcon>
      <Stack gap={2}>
        <Text size="xs" c="dimmed" tt="uppercase" fw={700}>{label}</Text>
        <Text fw={700} size="lg">{value}</Text>
        <Text size="xs" c="dimmed">{detail}</Text>
      </Stack>
    </Group>
  );
}

export function CashFlowForecast({ hasDatabase, framed = true, showHeader = true }: CashFlowForecastProps) {
  const [startingBalance, setStartingBalance] = useState<number>(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? Number(saved) : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  });
  const [days, setDays] = useState('60');
  const [forecast, setForecast] = useState<CashFlowForecastData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(startingBalance));
  }, [startingBalance]);

  useEffect(() => {
    if (!hasDatabase) {
      return;
    }

    let cancelled = false;

    Promise.resolve()
      .then(() => {
        if (cancelled) return null;
        setLoading(true);
        setError(false);
        return api.getCashFlowForecast(startingBalance, Number(days));
      })
      .then((response) => {
        if (!cancelled && response) setForecast(response);
      })
      .catch(() => {
        if (!cancelled) {
          setForecast(null);
          setError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hasDatabase, startingBalance, days]);

  const chartData = useMemo(() => (
    forecast?.daily.map((day) => ({
      date: formatShortDate(day.date),
      balance: day.balance,
    })) ?? []
  ), [forecast]);

  if (!hasDatabase) return null;

  const content = (
      <Stack gap="md">
        <Group justify={showHeader ? 'space-between' : 'flex-end'} align={showHeader ? 'flex-start' : 'flex-end'}>
          {showHeader && (
            <Stack gap={2}>
              <Title order={4}>Cash Flow Forecast</Title>
              <Text size="sm" c="dimmed">
                Projected balance from upcoming bills, deposits, and shared payables
              </Text>
            </Stack>
          )}
          <Group gap="sm" align="flex-end">
            <NumberInput
              label="Starting balance"
              prefix={getCurrencySymbol()}
              decimalScale={2}
              value={startingBalance}
              onChange={(value) => setStartingBalance(typeof value === 'number' ? value : 0)}
              w={170}
            />
            <SegmentedControl
              value={days}
              onChange={setDays}
              data={[
                { label: '30d', value: '30' },
                { label: '60d', value: '60' },
                { label: '90d', value: '90' },
              ]}
            />
          </Group>
        </Group>

        {error && (
          <Alert color="red" icon={<IconAlertTriangle size={16} />}>
            Unable to load cash flow forecast.
          </Alert>
        )}

        {loading && !forecast ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : forecast ? (
          <>
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
              <SummaryMetric
                label="Ending balance"
                value={formatCurrency(forecast.summary.ending_balance)}
                detail={`${forecast.summary.days} day projection`}
                color={forecast.summary.ending_balance >= 0 ? 'green' : 'red'}
                icon={<IconCash size={18} />}
              />
              <SummaryMetric
                label="Lowest balance"
                value={formatCurrency(forecast.summary.lowest_balance)}
                detail={formatShortDate(forecast.summary.lowest_balance_date)}
                color={forecast.summary.lowest_balance >= 0 ? 'blue' : 'red'}
                icon={<IconCalendarStats size={18} />}
              />
              <SummaryMetric
                label="Income"
                value={formatCurrency(forecast.summary.total_income)}
                detail="Projected deposits"
                color="green"
                icon={<IconArrowUpRight size={18} />}
              />
              <SummaryMetric
                label="Expenses"
                value={formatCurrency(forecast.summary.total_expenses)}
                detail={forecast.summary.runway_days === null
                  ? 'No negative balance'
                  : `Negative in ${forecast.summary.runway_days} day${forecast.summary.runway_days === 1 ? '' : 's'}`}
                color={forecast.summary.runway_days === null ? 'orange' : 'red'}
                icon={<IconArrowDownRight size={18} />}
              />
            </SimpleGrid>

            {chartData.length > 1 && (
              <LineChart
                h={240}
                data={chartData}
                dataKey="date"
                series={[{
                  name: 'balance',
                  color: forecast.summary.lowest_balance < 0 ? 'red.6' : 'teal.6',
                  label: 'Projected Balance',
                }]}
                curveType="linear"
                withTooltip
                yAxisProps={{
                  tickFormatter: (value: number) => formatCurrencyAxis(value),
                }}
              />
            )}

            {forecast.occurrences.length === 0 ? (
              <Text size="sm" c="dimmed">No projected bills or deposits in this window.</Text>
            ) : (
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Date</Table.Th>
                    <Table.Th>Bill</Table.Th>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>Amount</Table.Th>
                    <Table.Th>Balance After</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {forecast.occurrences.slice(0, 6).map((item) => (
                    <Table.Tr key={`${item.source}-${item.share_id ?? item.bill_id}-${item.date}`}>
                      <Table.Td>{formatShortDate(item.date)}</Table.Td>
                      <Table.Td>
                        <Group gap="xs" wrap="nowrap">
                          <BillIcon icon={item.bill_icon} size={24} />
                          <Stack gap={0}>
                            <Text size="sm" fw={500}>{item.bill_name}</Text>
                            <Text size="xs" c="dimmed">
                              {item.source === 'shared' && item.counterparty_name
                                ? `Shared by ${item.counterparty_name}`
                                : item.database_name}
                            </Text>
                          </Stack>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={item.signed_amount >= 0 ? 'green' : 'red'} variant="light">
                          {item.signed_amount >= 0 ? 'Deposit' : 'Expense'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text c={item.signed_amount >= 0 ? 'green' : 'red'} fw={600}>
                          {item.signed_amount >= 0 ? '+' : '-'}{formatCurrency(item.amount)}
                        </Text>
                      </Table.Td>
                      <Table.Td>{formatCurrency(item.balance_after)}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </>
        ) : null}
      </Stack>
  );

  if (!framed) {
    return content;
  }

  return (
    <Paper withBorder p="md" radius="md">
      {content}
    </Paper>
  );
}
