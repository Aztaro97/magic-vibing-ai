'use client'

import { useEffect, useRef, useCallback } from 'react'
import type { FileChangeEvent } from '@react-native-vibe-code/sandbox'

// Simplified file info for callback
export interface FileChangeCallbackEvent {
  type: 'file_change'
  projectId: string
  files: Array<{ path: string }>
}

export interface UseFileChangeEventsOptions {
  projectId: string | undefined
  onFileChange?: (event: FileChangeCallbackEvent) => void
  enabled?: boolean
}

export function useFileChangeEvents({
  projectId,
  onFileChange,
  enabled = true,
}: UseFileChangeEventsOptions) {
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5
  const onFileChangeRef = useRef(onFileChange)

  // OPTIMIZATION: Debounce file change events
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pendingChangesRef = useRef<Map<string, FileChangeEvent>>(new Map())

  // Keep ref up to date without triggering reconnects
  useEffect(() => {
    onFileChangeRef.current = onFileChange
  }, [onFileChange])

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
      debounceTimeoutRef.current = null
    }
    pendingChangesRef.current.clear()
  }, [])

  const connect = useCallback(() => {
    if (!projectId || !enabled) {
      cleanup()
      return
    }

    cleanup() // Close existing connection first

    try {
      const eventSource = new EventSource(`/api/file-watch?projectId=${projectId}`)
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        reconnectAttempts.current = 0
      }

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          // Handle different event types
          if (data.type === 'file_change' && onFileChangeRef.current) {
            // OPTIMIZATION: Debounce file changes by 500ms
            // Accumulate changes and batch them together
            if (data.files && Array.isArray(data.files)) {
              data.files.forEach((file: { path: string }) => {
                pendingChangesRef.current.set(file.path, data)
              })
            }

            // Clear existing debounce timeout
            if (debounceTimeoutRef.current) {
              clearTimeout(debounceTimeoutRef.current)
            }

            // Set new debounce timeout
            debounceTimeoutRef.current = setTimeout(() => {
              if (pendingChangesRef.current.size > 0 && onFileChangeRef.current) {
                // Merge all pending changes into one event
                const allFiles = Array.from(pendingChangesRef.current.values()).flatMap(
                  (event) => event.files || []
                )

                // Remove duplicates by path (keep latest) and simplify to just path
                const uniqueFiles = Array.from(
                  new Map(
                    allFiles.map((file: { path: string }) => [file.path, { path: file.path }])
                  ).values()
                )

                onFileChangeRef.current({
                  type: 'file_change',
                  projectId: data.projectId,
                  files: uniqueFiles,
                })

                pendingChangesRef.current.clear()
              }
            }, 500) // 500ms debounce
          }
        } catch {
          // Silently ignore parse errors
        }
      }

      eventSource.onerror = () => {
        // Attempt to reconnect with exponential backoff
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.pow(2, reconnectAttempts.current) * 1000 // 1s, 2s, 4s, 8s, 16s
          reconnectAttempts.current++

          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, delay)
        } else {
          console.error(
            `[FileChangeEvents] Max reconnection attempts reached for project ${projectId}`
          )
          cleanup()
        }
      }
    } catch (error) {
      console.error(
        `[FileChangeEvents] Failed to create EventSource for project ${projectId}:`,
        error
      )
    }
  }, [projectId, enabled, cleanup])

  // Connect when projectId or enabled status changes
  useEffect(() => {
    connect()
    return cleanup
  }, [connect, cleanup])

  return {
    connect,
    disconnect: cleanup,
    isConnected: eventSourceRef.current?.readyState === EventSource.OPEN,
  }
}
