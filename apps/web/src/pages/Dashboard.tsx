import { useEffect, useState } from 'react';
import { Stack, Title, Group, Button, Text, Paper, Loader, Center, Grid, Alert, Badge } from '@mantine/core';
import { IconPlus, IconReceipt, IconAlertTriangle, IconBellRinging } from '@tabler/icons-react';
import { StatCards } from '../components/Dashboard/StatCards';
import { UpcomingBillsList } from '../components/Dashboard/UpcomingBillsList';
import { CashFlowForecast } from '../components/Dashboard/CashFlowForecast';
import type { Bill, ReminderAlert } from '../api/client';
import { getMonthlyPayments, getReminderAlerts } from '../api/client';

interface DashboardProps {
  bills: Bill[];
  loading: boolean;
  onAddBill: () => void;
  onEditBill: (bill: Bill) => void;
  onPayBill: (bill: Bill) => void;
  onViewPayments: (bill: Bill) => void;
  onViewBills: () => void;
  onStatClick: (stat: 'total' | 'thisWeek' | 'overdue') => void;
  hasDatabase: boolean;
}

export function Dashboard({
  bills,
  loading,
  onAddBill,
  onEditBill,
  onPayBill,
  onViewPayments,
  onViewBills,
  onStatClick,
  hasDatabase,
}: DashboardProps) {
  const [monthlyPaid, setMonthlyPaid] = useState(0);
  const [alerts, setAlerts] = useState<ReminderAlert[]>([]);

  // Fetch monthly payments to get paid amount
  useEffect(() => {
    if (hasDatabase) {
      const today = new Date();
      const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

      getMonthlyPayments()
        .then((res) => {
          setMonthlyPaid(res?.[monthKey]?.expenses || 0);
        })
        .catch(() => {
          setMonthlyPaid(0);
        });
    }
  }, [hasDatabase, bills]);

  useEffect(() => {
    if (!hasDatabase) {
      return;
    }

    getReminderAlerts()
      .then((res) => setAlerts(Array.isArray(res) ? res : []))
      .catch(() => setAlerts([]));
  }, [hasDatabase, bills]);

  if (!hasDatabase) {
    return (
      <Center py="xl">
        <Paper withBorder p="xl" radius="md" ta="center" maw={400}>
          <IconReceipt size={48} color="var(--mantine-color-dimmed)" />
          <Title order={3} mt="md">
            No Bill Group Selected
          </Title>
          <Text c="dimmed" mt="sm">
            Select a bill group from the header to view your dashboard.
          </Text>
        </Paper>
      </Center>
    );
  }

  if (loading) {
    return (
      <Center py="xl">
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Stack gap="lg">
      {/* Header */}
      <Group justify="space-between" align="center">
        <Title order={2}>Dashboard</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={onAddBill}>
          Add Bill
        </Button>
      </Group>

      {/* Stat Cards */}
      <StatCards bills={bills} monthlyPaid={monthlyPaid} onStatClick={onStatClick} />

      <CashFlowForecast hasDatabase={hasDatabase} />

      {alerts.length > 0 && (
        <Alert
          color={alerts.some((alert) => alert.severity === 'critical') ? 'red' : 'yellow'}
          variant="light"
          icon={<IconBellRinging size={20} />}
          title={`${alerts.length} Reminder Alert${alerts.length === 1 ? '' : 's'}`}
        >
          <Stack gap="xs" mt="sm">
            {alerts.slice(0, 4).map((alert) => {
              const bill = bills.find((item) => item.id === alert.bill_id);
              return (
                <Paper key={`${alert.type}-${alert.bill_id}`} withBorder p="sm" radius="sm" bg="white">
                  <Group justify="space-between" wrap="nowrap">
                    <div>
                      <Group gap="xs">
                        <Text fw={600}>{alert.title}</Text>
                        <Badge
                          size="xs"
                          color={alert.severity === 'critical' ? 'red' : alert.severity === 'warning' ? 'yellow' : 'blue'}
                          variant="light"
                        >
                          {alert.database_name}
                        </Badge>
                      </Group>
                      <Text size="xs" c="dimmed">
                        {alert.message}
                        {alert.amount !== null ? ` - $${alert.amount.toFixed(2)}` : ''}
                      </Text>
                    </div>
                    {bill && bill.type !== 'deposit' && !bill.is_shared && (
                      <Button
                        size="xs"
                        color={alert.severity === 'critical' ? 'red' : 'green'}
                        leftSection={<IconAlertTriangle size={14} />}
                        onClick={() => onPayBill(bill)}
                      >
                        Pay
                      </Button>
                    )}
                  </Group>
                </Paper>
              );
            })}
            {alerts.length > 4 && (
              <Text size="xs" c="dimmed" ta="center">
                + {alerts.length - 4} more alert{alerts.length - 4 === 1 ? '' : 's'}
              </Text>
            )}
          </Stack>
        </Alert>
      )}

      {/* Content Grid */}
      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          {/* Upcoming Bills */}
          <UpcomingBillsList
            bills={bills}
            onPay={onPayBill}
            onEdit={onEditBill}
            onViewPayments={onViewPayments}
            onViewAll={onViewBills}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          {/* Quick Actions */}
          <Paper withBorder p="md" radius="md">
            <Title order={5} mb="md">Quick Actions</Title>
            <Stack gap="xs">
              <Button
                variant="light"
                fullWidth
                leftSection={<IconPlus size={16} />}
                onClick={onAddBill}
              >
                Add New Bill
              </Button>
              <Button
                variant="light"
                fullWidth
                color="gray"
                leftSection={<IconReceipt size={16} />}
                onClick={onViewBills}
              >
                View All Bills
              </Button>
            </Stack>
          </Paper>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
