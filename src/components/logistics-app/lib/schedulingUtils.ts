import { DeliveryRecord, DeliveryStatus, StoreDeliveryConfig, SlotClosureRule, Branch } from '../types';

export const DEFAULT_STORE_CONFIG: StoreDeliveryConfig = {
  branchId: 'ALL',
  deliveryDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  amTimeRange: '07:00 AM - 12:00 PM',
  pmTimeRange: '12:00 PM - 05:00 PM',
  amMaxCap: 5,
  pmMaxCap: 5,
  cutoffTime: '16:00',
  allowOverbooking: false
};

/**
  * Check if a specific date and slot is closed by closure rules
  */
export function getClosureRule(
  closureRules: SlotClosureRule[],
  branchId: string,
  dateStr: string,
  slot: 'AM' | 'PM'
): SlotClosureRule | undefined {
  if (!closureRules || closureRules.length === 0) return undefined;
  return closureRules.find(r => 
    (r.branchId === 'ALL' || r.branchId === branchId || !r.branchId) &&
    r.date === dateStr &&
    (r.slot === slot || r.slot === 'ALL_DAY' || (r.slot as string) === 'PM_SLOT') &&
    r.closureType !== 'NONE'
  );
}

/**
  * Finds the first available slot starting from "the next day" relative to baseDate or today.
  * Checks store delivery days, closure rules, and capacity limits (AM then PM).
  */
export function findNextAvailableSlot(
  delivery: DeliveryRecord,
  branches: Branch[],
  storeConfigs: Record<string, StoreDeliveryConfig>,
  closureRules: SlotClosureRule[],
  allDeliveries: DeliveryRecord[],
  fromBaseDate?: string
): { date: string; slot: 'AM' | 'PM' } {
  const todayStr = new Date().toISOString().split('T')[0];
  const baseDate = fromBaseDate || (delivery.scheduledDate && delivery.scheduledDate < todayStr ? delivery.scheduledDate : todayStr);
  
  // Calculate "the next day" relative to baseDate
  const startDateObj = new Date(baseDate + 'T00:00:00');
  startDateObj.setDate(startDateObj.getDate() + 1);

  // If startDateObj is before today, move it to today or tomorrow
  const todayObj = new Date(todayStr + 'T00:00:00');
  if (startDateObj < todayObj) {
    startDateObj.setTime(todayObj.getTime());
  }

  // Retrieve store delivery config
  const branchKey = delivery.originBranch || 'ALL';
  const activeConfig = storeConfigs[branchKey] || storeConfigs['ALL'] || DEFAULT_STORE_CONFIG;
  const amMax = activeConfig.amMaxCap || 5;
  const pmMax = activeConfig.pmMaxCap || 5;

  let candidateDateObj = new Date(startDateObj);

  // Up to 30 days search
  for (let i = 0; i < 30; i++) {
    const candidateDateStr = candidateDateObj.toISOString().split('T')[0];
    const dayName = candidateDateObj.toLocaleDateString('en-US', { weekday: 'short' }) as any;

    const isDeliveryDay = activeConfig.deliveryDays.includes(dayName);

    if (isDeliveryDay) {
      const amRule = getClosureRule(closureRules, branchKey, candidateDateStr, 'AM');
      const pmRule = getClosureRule(closureRules, branchKey, candidateDateStr, 'PM');

      const isAmClosed = !!amRule;
      const isPmClosed = !!pmRule;

      // Count deliveries scheduled on candidateDateStr for AM and PM
      const amCount = allDeliveries.filter(d => 
        d.id !== delivery.id &&
        (d.originBranch === delivery.originBranch || !delivery.originBranch) &&
        d.scheduledDate === candidateDateStr &&
        (d.scheduledSlot === 'AM' || !d.scheduledSlot) &&
        d.status !== DeliveryStatus.DELIVERED &&
        d.status !== DeliveryStatus.RETURNED
      ).length;

      const pmCount = allDeliveries.filter(d => 
        d.id !== delivery.id &&
        (d.originBranch === delivery.originBranch || !delivery.originBranch) &&
        d.scheduledDate === candidateDateStr &&
        d.scheduledSlot === 'PM' &&
        d.status !== DeliveryStatus.DELIVERED &&
        d.status !== DeliveryStatus.RETURNED
      ).length;

      // First check AM slot
      if (!isAmClosed && amCount < amMax) {
        return { date: candidateDateStr, slot: 'AM' };
      }

      // Then check PM slot
      if (!isPmClosed && pmCount < pmMax) {
        return { date: candidateDateStr, slot: 'PM' };
      }
    }

    // Increment date
    candidateDateObj.setDate(candidateDateObj.getDate() + 1);
  }

  // Fallback
  const fallbackObj = new Date(baseDate + 'T00:00:00');
  fallbackObj.setDate(fallbackObj.getDate() + 1);
  return { date: fallbackObj.toISOString().split('T')[0], slot: 'AM' };
}

/**
  * Processes all deliveries and moves uncompleted past deliveries to the first available slot in the next day.
  * Returns the updated deliveries array and the count of moved items.
  */
export function rolloverUncompletedDeliveries(
  deliveries: DeliveryRecord[],
  branches: Branch[],
  storeConfigs: Record<string, StoreDeliveryConfig> = {},
  closureRules: SlotClosureRule[] = []
): { updatedDeliveries: DeliveryRecord[]; movedCount: number } {
  const todayStr = new Date().toISOString().split('T')[0];
  let movedCount = 0;

  const updatedDeliveries = deliveries.map(d => {
    const isCompleted = d.status === DeliveryStatus.DELIVERED || d.status === DeliveryStatus.RETURNED;
    if (isCompleted) return d;

    // Check if delivery was scheduled for a past date or is uncompleted before today
    const origDate = d.scheduledDate 
      ? d.scheduledDate.split('T')[0] 
      : (d.registeredAt ? d.registeredAt.split('T')[0] : '');

    // Uncompleted delivery that is scheduled before today (or past due)
    if (origDate && origDate < todayStr) {
      const nextAvailable = findNextAvailableSlot(
        d,
        branches,
        storeConfigs,
        closureRules,
        deliveries,
        origDate
      );

      // Only update if date or slot actually changed
      if (d.scheduledDate !== nextAvailable.date || d.scheduledSlot !== nextAvailable.slot) {
        movedCount++;
        return {
          ...d,
          scheduledDate: nextAvailable.date,
          scheduledSlot: nextAvailable.slot,
          history: [
            ...(d.history || []),
            {
              status: d.status,
              timestamp: new Date().toISOString(),
              location: d.originBranch || 'Depot',
              operator: 'Auto-Rollover Engine',
              notes: `Rolled over uncompleted delivery from past date ${origDate} to first available slot on ${nextAvailable.date} (${nextAvailable.slot})`
            }
          ]
        };
      }
    }

    return d;
  });

  return { updatedDeliveries, movedCount };
}
