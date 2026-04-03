interface HoverSystemOptions {
  enabled: boolean
  sandboxId?: string
}

export const useHoverSystem = ({ enabled, sandboxId }: HoverSystemOptions) => {
  return {
    hoveredElement: null,
    isEnabled: enabled,
  }
}
