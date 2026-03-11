import type { GalaxySceneBody } from '~~/shared/galaxy'
import { computed } from 'vue'
import { getSceneBodyColorHex, getSceneBodyGlowHex, getSceneBodyScale, getSceneBodyTrailHex } from '~~/shared/galaxy'

export interface GalaxyObjectVisualProps {
  body: GalaxySceneBody
  isLowDetail: boolean
  selectedScale: number
}

export function useGalaxyObjectVisualState(props: GalaxyObjectVisualProps) {
  const scale = computed(() => getSceneBodyScale(props.body))
  const colorHex = computed(() => getSceneBodyColorHex(props.body))
  const glowHex = computed(() => getSceneBodyGlowHex(props.body))
  const trailHex = computed(() => getSceneBodyTrailHex(props.body))

  return {
    scale,
    colorHex,
    glowHex,
    trailHex,
  }
}
