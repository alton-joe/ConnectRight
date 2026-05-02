'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import type { ConnectionRequest } from '@/types'
import { getInitial } from '@/utils/helpers'

interface RequestCardProps {
  request: ConnectionRequest
  onRemove: (id: string) => void
}

export default function RequestCard({ request, onRemove }: RequestCardProps) {
  const [loading, setLoading] = useState<'accept' | 'decline' | null>(null)
  const [error, setError] = useState('')
  const supabase = useMemo(() => createClient(), [])

  const handleAccept = async () => {
    setLoading('accept')
    setError('')
    try {
      const { error: rpcError } = await Promise.race([
        supabase.rpc('accept_connection_request', { request_id: request.id }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 10_000)
        ),
      ])
      if (rpcError) {
        setError('Failed to accept. Try again.')
        return
      }
      onRemove(request.id)
    } catch {
      setError('Failed to accept. Try again.')
    } finally {
      setLoading(null)
    }
  }

  const handleDecline = async () => {
    setLoading('decline')
    setError('')
    try {
      const { error: updateError } = await Promise.race([
        supabase
          .from('connection_requests')
          .update({ status: 'declined' })
          .eq('id', request.id),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 10_000)
        ),
      ])
      if (updateError) {
        setError('Failed to decline. Try again.')
        return
      }
      onRemove(request.id)
    } catch {
      setError('Failed to decline. Try again.')
    } finally {
      setLoading(null)
    }
  }

  const senderName = request.sender?.username ?? 'Unknown'

  return (
    <div className="flex flex-col gap-3 p-3 bg-white/5 rounded-xl">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold text-white shrink-0">
          {getInitial(senderName)}
        </div>
        <p className="text-white font-medium text-sm flex-1 truncate">{senderName}</p>
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <div className="flex gap-2">
        <Button
          variant="primary"
          size="sm"
          className="flex-1"
          onClick={handleAccept}
          disabled={loading !== null}
        >
          {loading === 'accept' ? '...' : 'Accept'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="flex-1"
          onClick={handleDecline}
          disabled={loading !== null}
        >
          {loading === 'decline' ? '...' : 'Decline'}
        </Button>
      </div>
    </div>
  )
}
