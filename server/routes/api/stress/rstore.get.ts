import { assertRealtimeStressTestingEnabled, getRealtimeStressTestStatus } from '~~/server/utils/realtime-stress'

export default defineEventHandler(async () => {
  assertRealtimeStressTestingEnabled()
  return getRealtimeStressTestStatus()
})
