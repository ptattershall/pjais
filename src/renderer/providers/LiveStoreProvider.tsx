import React from 'react'
import { LiveStoreProvider as BaseLiveStoreProvider } from '@livestore/react'
import { makePersistedAdapter } from '@livestore/adapter-web'
import { unstable_batchedUpdates as batchUpdates } from 'react-dom'
import { schema } from '../../livestore/schema'

interface LiveStoreProviderProps {
  children: React.ReactNode
}

const adapter = makePersistedAdapter({
  storage: { type: 'opfs' },
  worker: undefined
})

export const LiveStoreProvider: React.FC<LiveStoreProviderProps> = ({ children }) => {
  return (
    <BaseLiveStoreProvider 
      schema={schema} 
      adapter={adapter} 
      batchUpdates={batchUpdates}
    >
      {children}
    </BaseLiveStoreProvider>
  )
} 