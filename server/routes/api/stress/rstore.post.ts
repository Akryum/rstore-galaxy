import type { H3Event } from 'h3'
import type { RealtimeStressCreatedRecord, RealtimeStressDeletedRecord, RealtimeStressUpdatedRecord } from '~~/server/utils/realtime-stress'
import type { RealtimeStressTestOptions, RealtimeStressTestResult } from '~~/shared/galaxy'
import { readBody } from 'h3'
import {
  assertRealtimeStressTestingEnabled,
  runRealtimeStressTest,
} from '~~/server/utils/realtime-stress'

export default defineEventHandler(async (event): Promise<RealtimeStressTestResult> => {
  assertRealtimeStressTestingEnabled()
  const body = await readBody<Partial<RealtimeStressTestOptions>>(event)
  const { status, ...result } = await runRealtimeStressTest(
    body ?? {},
    payload => publishCreatedRecord(event, payload),
    payload => publishUpdatedRecord(event, payload),
    payload => publishDeletedRecord(event, payload),
  )

  return {
    ...status,
    ...result,
  }
})

async function publishCreatedRecord(event: H3Event, payload: RealtimeStressCreatedRecord): Promise<void> {
  await rstoreDrizzleHooks.callHook('index.post.after', {
    event,
    collection: payload.collection,
    meta: {},
    params: {
      collection: payload.collection,
    },
    query: {},
    body: payload.record,
    result: payload.record,
    setResult: () => {},
  })
}

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

async function publishUpdatedRecord(event: H3Event, payload: RealtimeStressUpdatedRecord): Promise<void> {
  await rstoreDrizzleHooks.callHook('item.patch.after', {
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
