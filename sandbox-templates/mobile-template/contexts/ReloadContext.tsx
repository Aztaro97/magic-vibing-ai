import React, { createContext, useContext, useState, useCallback } from 'react'

interface ReloadContextType {
  reload: () => void
}

const ReloadContext = createContext<ReloadContextType | null>(null)

export function ReloadProvider({ children }: { children: React.ReactNode }) {
  const [key, setKey] = useState(0)

  const reload = useCallback(() => {
    console.log('[ReloadContext] Reloading app by incrementing key')
    setKey(prev => prev + 1)
  }, [])

  return (
    <ReloadContext.Provider value={{ reload }}>
      {React.cloneElement(children as React.ReactElement, { key })}
    </ReloadContext.Provider>
  )
}

export function useReload() {
  const context = useContext(ReloadContext)
  if (!context) {
    throw new Error('useReload must be used within ReloadProvider')
  }
  return context
}
