import Pusher from 'pusher-js'
import { useEffect, useState, useCallback } from 'react'

interface HoverSystemOptions {
  enabled: boolean
  sandboxId?: string
}

export const useHoverSystem = ({ enabled, sandboxId }: HoverSystemOptions) => {
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null)
  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(
    null,
  )
  const [highlightDiv, setHighlightDiv] = useState<HTMLDivElement | null>(null)
  const [selectedHighlightDiv, setSelectedHighlightDiv] =
    useState<HTMLDivElement | null>(null)
  const [pusher, setPusher] = useState<Pusher | null>(null)
  const [channel, setChannel] = useState<any>(null)

  console.log('[useHoverSystem] Initialized with:', { enabled, sandboxId })

  const getElementInfo = (element: HTMLElement) => {
    const id = element.id || 'No ID'
    const className = element.className || 'No class'
    const content = element.textContent?.slice(0, 100) || 'No content'

    return { id, className, content }
  }

  const getElementPath = (element: HTMLElement): string => {
    const path: string[] = []
    let current: HTMLElement | null = element

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase()
      if (current.id) {
        selector += `#${current.id}`
      } else if (current.className) {
        selector += `.${current.className.split(' ').join('.')}`
      }
      path.unshift(selector)
      current = current.parentElement
    }

    return path.join(' > ')
  }

  const handleClick = useCallback(
    (e: MouseEvent) => {
      if (!enabled || !hoveredElement) return

      e.preventDefault()
      e.stopPropagation()

      const elementData = {
        elementId: hoveredElement.id || 'No ID',
        content:
          hoveredElement.textContent?.trim()?.slice(0, 200) || 'No content',
        className: hoveredElement.className || 'No class',
        tagName: hoveredElement.tagName.toLowerCase(),
        timestamp: Date.now(),
        path: getElementPath(hoveredElement),
        dataAt: hoveredElement.getAttribute('data-at') || null,
        dataIn: hoveredElement.getAttribute('data-in') || null,
        dataIs: hoveredElement.getAttribute('data-is') || null,
      }

      console.log('🔍 Hover Inspector - Element Clicked:', elementData)

      // Set selected element and update selected highlight
      setSelectedElement(hoveredElement)

      // Update selected highlight div
      if (selectedHighlightDiv && hoveredElement) {
        const rect = hoveredElement.getBoundingClientRect()
        selectedHighlightDiv.style.position = 'fixed'
        selectedHighlightDiv.style.left = `${rect.left}px`
        selectedHighlightDiv.style.top = `${rect.top}px`
        selectedHighlightDiv.style.width = `${rect.width}px`
        selectedHighlightDiv.style.height = `${rect.height}px`
        selectedHighlightDiv.style.display = 'block'
        selectedHighlightDiv.style.pointerEvents = 'none'
        selectedHighlightDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.1)'
        selectedHighlightDiv.style.border = '2px solid red'
        selectedHighlightDiv.style.zIndex = '99998'
      }

      // Send data via API endpoint which will trigger Pusher event
      if (sandboxId) {
        // Get the base URL of the parent application
        // const parentUrl = window.location.origin.includes('localhost')
        //   ? 'http://localhost:3210'
        //   : window.location.origin.replace(/:\d+/, ':3210')

        // Use environment variable or fallback to production URL
        const parentUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://capsule-ide.vercel.app'

        console.log(
          `📡 Attempting to send to: ${parentUrl}/api/hover-selection`,
        )

        fetch(`${parentUrl}/api/hover-selection`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sandboxId,
            data: elementData,
          }),
        })
          .then(() => {
            console.log('📡 Sent selection data via API')
          })
          .catch((err) => {
            console.error('Failed to send selection data:', err)
          })
      }
    },
    [enabled, hoveredElement, channel, sandboxId],
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!enabled) {
        if (highlightDiv) {
          highlightDiv.style.display = 'none'
        }
        return
      }

      const target = e.target as HTMLElement
      if (!target || target === highlightDiv || target === selectedHighlightDiv)
        return

      setHoveredElement(target)

      // Always show hover highlight for currently hovered element
      if (highlightDiv) {
        const rect = target.getBoundingClientRect()
        highlightDiv.style.position = 'fixed'
        highlightDiv.style.left = `${rect.left}px`
        highlightDiv.style.top = `${rect.top}px`
        highlightDiv.style.width = `${rect.width}px`
        highlightDiv.style.height = `${rect.height}px`
        highlightDiv.style.display = 'block'
        highlightDiv.style.pointerEvents = 'none'
        highlightDiv.style.backgroundColor = 'rgba(100, 100, 100, 0.1)'
        highlightDiv.style.border = '2px dotted rgba(100, 100, 100, 0.8)'
        highlightDiv.style.zIndex = '99999'
        highlightDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.1)'
        // Use solid red border if element is selected, dotted if just hovered
        highlightDiv.style.border = selectedElement
          ? '2px solid red'
          : '2px dotted rgba(100, 100, 100, 0.8)'
      }
    },
    [enabled, highlightDiv, selectedHighlightDiv],
  )

  const handleMouseLeave = useCallback(() => {
    if (!enabled) return

    // Hide hover highlight when mouse leaves the document
    if (highlightDiv) {
      highlightDiv.style.display = 'none'
    }
    setHoveredElement(null)
  }, [enabled, highlightDiv])

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Create hover highlight div
    const hoverDiv = document.createElement('div')
    hoverDiv.style.position = 'fixed'
    hoverDiv.style.display = 'none'
    hoverDiv.style.transition = 'all 0.1s ease'
    document.body.appendChild(hoverDiv)
    setHighlightDiv(hoverDiv)

    // Create selected highlight div
    const selectedDiv = document.createElement('div')
    selectedDiv.style.position = 'fixed'
    selectedDiv.style.display = 'none'
    selectedDiv.style.transition = 'all 0.1s ease'
    document.body.appendChild(selectedDiv)
    setSelectedHighlightDiv(selectedDiv)

    return () => {
      if (hoverDiv.parentNode) {
        hoverDiv.parentNode.removeChild(hoverDiv)
      }
      if (selectedDiv.parentNode) {
        selectedDiv.parentNode.removeChild(selectedDiv)
      }
    }
  }, [])

  // Initialize Pusher connection
  useEffect(() => {
    if (typeof window === 'undefined' || !sandboxId || !enabled) return

    try {
      // Initialize Pusher client
      const pusherClient = new Pusher(
        process.env.EXPO_PUBLIC_PUSHER_APP_KEY || '',
        {
          cluster: process.env.EXPO_PUBLIC_PUSHER_CLUSTER || 'us2',
        },
      )

      // Subscribe to sandbox-specific channel
      const channelName = `sandbox-${sandboxId}`
      const pusherChannel = pusherClient.subscribe(channelName)

      pusherChannel.bind('pusher:subscription_succeeded', () => {
        console.log(`✅ Connected to Pusher channel: ${channelName}`)
      })

      setPusher(pusherClient)
      setChannel(pusherChannel)

      return () => {
        pusherChannel.unbind_all()
        pusherChannel.unsubscribe()
        pusherClient.disconnect()
      }
    } catch (error) {
      console.error('Failed to initialize Pusher:', error)
    }
  }, [sandboxId, enabled])

  useEffect(() => {
    if (typeof window === 'undefined') return

    console.log('[useHoverSystem] Enabled state changed:', enabled)

    if (enabled) {
      console.log('[useHoverSystem] Adding mouse event listeners')
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('click', handleClick, true)
      document.addEventListener('mouseleave', handleMouseLeave)
    } else {
      console.log('[useHoverSystem] Hover mode disabled, removing listeners')
      // Hide both highlight divs when hover mode is disabled
      if (highlightDiv) {
        highlightDiv.style.display = 'none'
      }
      if (selectedHighlightDiv) {
        selectedHighlightDiv.style.display = 'none'
      }
      setHoveredElement(null)
      setSelectedElement(null)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('click', handleClick, true)
      document.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [
    enabled,
    handleMouseMove,
    handleClick,
    handleMouseLeave,
    highlightDiv,
    selectedHighlightDiv,
  ])

  return {
    hoveredElement,
    isEnabled: enabled,
  }
}
