import type { H3Event } from 'h3'
import type { RealtimeStressDeletedRecord } from '~~/server/utils/realtime-stress'
import type { RealtimeStressTestStatus } from '~~/shared/galaxy'
import { assertRealtimeStressTestingEnabled, clearRealtimeStressTestData, getRealtimeStressTestStatus } from '~~/server/utils/realtime-stress'

export default defineEventHandler(async (event): Promise<RealtimeStressTestStatus & { clearedUsers: number, clearedProfiles: number }> => {
  assertRealtimeStressTestingEnabled()
  const cleared = await clearRealtimeStressTestData(payload => publishDeletedRecord(event, payload))

  return {
    ...(await getRealtimeStressTestStatus()),
    ...cleared,
  }
})

async function publishDeletedRecord(event: H3Event, payload: RealtimeStressDeletedRecord): Promise<void> {
  await rstoreDrizzleHooks.callHook('item.delete.after', {
    event,
    collection: payload.collection,
    key: payload.key,
    meta: {},
    params: {
      collection: payload.collection,
      key: payload.key,
    },
    query: {},
    body: null,
    result: payload.record,
    setResult: () => {},
  })
}
