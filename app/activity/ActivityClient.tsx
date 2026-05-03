'use client'

import { useMemo } from 'react'
import BackButton from '@/components/layout/BackButton'
import UserAvatar from '@/components/ui/UserAvatar'

interface MessageRow {
  id: string
  connection_id: string
  sender_id: string
  created_at: string
}

interface ConnectionProfile {
  id: string
  username: string
  avatar_url: string | null
}

interface ConnectionRow {
  id: string
  user_a: string
  user_b: string
  created_at: string
  profile_a: ConnectionProfile | ConnectionProfile[] | null
  profile_b: ConnectionProfile | ConnectionProfile[] | null
}

interface Props {
  currentUserId: string
  profile: { username: string; memberSince: string; lastActive: string }
  messages: MessageRow[]
  connections: ConnectionRow[]
  sentRequestCount: number
  receivedRequestCount: number
}

const DAY_MS = 24 * 60 * 60 * 1000
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function pickProfile(p: ConnectionProfile | ConnectionProfile[] | null): ConnectionProfile | null {
  if (!p) return null
  return Array.isArray(p) ? p[0] ?? null : p
}

function fmtDuration(ms: number): string {
  if (ms < 60_000) return `${Math.max(1, Math.round(ms / 1000))}s`
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`
  if (ms < 24 * 3_600_000) return `${(ms / 3_600_000).toFixed(1)}h`
  return `${(ms / (24 * 3_600_000)).toFixed(1)}d`
}

export default function ActivityClient({
  currentUserId,
  profile,
  messages,
  connections,
  sentRequestCount,
  receivedRequestCount,
}: Props) {
  // ── Derived metrics ────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const sent = messages.filter((m) => m.sender_id === currentUserId)
    const received = messages.filter((m) => m.sender_id !== currentUserId)

    // Per-connection message counts → top chats.
    const otherUserByConn = new Map<string, ConnectionProfile | null>()
    connections.forEach((c) => {
      const other = c.user_a === currentUserId ? pickProfile(c.profile_b) : pickProfile(c.profile_a)
      otherUserByConn.set(c.id, other)
    })

    const perConnSent = new Map<string, number>()
    const perConnReceived = new Map<string, number>()
    messages.forEach((m) => {
      const target = m.sender_id === currentUserId ? perConnSent : perConnReceived
      target.set(m.connection_id, (target.get(m.connection_id) ?? 0) + 1)
    })

    const topChats = connections
      .map((c) => {
        const other = otherUserByConn.get(c.id)
        const sentN = perConnSent.get(c.id) ?? 0
        const recvN = perConnReceived.get(c.id) ?? 0
        return {
          connectionId: c.id,
          username: other?.username ?? 'Unknown',
          avatarUrl: other?.avatar_url ?? null,
          sent: sentN,
          received: recvN,
          total: sentN + recvN,
        }
      })
      .filter((c) => c.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)

    // Last 14 days bar chart.
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dailyBuckets: { label: string; date: Date; count: number; isToday: boolean }[] = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today.getTime() - i * DAY_MS)
      dailyBuckets.push({
        label: `${d.getDate()}/${d.getMonth() + 1}`,
        date: d,
        count: 0,
        isToday: i === 0,
      })
    }
    const startOfWindow = today.getTime() - 13 * DAY_MS
    messages.forEach((m) => {
      const ts = new Date(m.created_at).getTime()
      if (ts < startOfWindow) return
      const idx = Math.floor((ts - startOfWindow) / DAY_MS)
      if (idx >= 0 && idx < dailyBuckets.length) dailyBuckets[idx].count += 1
    })

    // Hour-of-day distribution (24 buckets).
    const hourly: number[] = Array(24).fill(0)
    messages.forEach((m) => {
      const h = new Date(m.created_at).getHours()
      hourly[h] += 1
    })
    const peakHour = hourly.indexOf(Math.max(...hourly))

    // Day-of-week distribution.
    const weekly: number[] = Array(7).fill(0)
    messages.forEach((m) => {
      weekly[new Date(m.created_at).getDay()] += 1
    })
    const peakDay = weekly.indexOf(Math.max(...weekly))

    // "Active time" estimate: cluster timestamps into sessions; gaps > 5min
    // start a new session, and each session is given a baseline of 30s plus
    // its actual span. Rough but proportional to time spent in the app.
    const sortedTs = messages
      .map((m) => new Date(m.created_at).getTime())
      .sort((a, b) => a - b)
    let activeMs = 0
    let sessionStart = -1
    let lastTs = -1
    const SESSION_GAP = 5 * 60 * 1000
    for (const ts of sortedTs) {
      if (sessionStart === -1) {
        sessionStart = ts
        lastTs = ts
        continue
      }
      if (ts - lastTs > SESSION_GAP) {
        activeMs += Math.max(30_000, lastTs - sessionStart)
        sessionStart = ts
      }
      lastTs = ts
    }
    if (sessionStart !== -1) activeMs += Math.max(30_000, lastTs - sessionStart)

    // Average response time when the other person sends → user replies in same conversation.
    const messagesByConn = new Map<string, MessageRow[]>()
    messages.forEach((m) => {
      const arr = messagesByConn.get(m.connection_id) ?? []
      arr.push(m)
      messagesByConn.set(m.connection_id, arr)
    })
    let totalResponseMs = 0
    let responseCount = 0
    messagesByConn.forEach((arr) => {
      for (let i = 1; i < arr.length; i++) {
        const prev = arr[i - 1]
        const curr = arr[i]
        if (prev.sender_id !== currentUserId && curr.sender_id === currentUserId) {
          totalResponseMs += new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime()
          responseCount += 1
        }
      }
    })
    const avgResponseMs = responseCount > 0 ? totalResponseMs / responseCount : 0

    // Longest streak of consecutive days with at least one message.
    const dayKeys = new Set<string>()
    messages.forEach((m) => {
      const d = new Date(m.created_at)
      d.setHours(0, 0, 0, 0)
      dayKeys.add(d.toISOString().slice(0, 10))
    })
    const sortedDays = [...dayKeys].sort()
    let longestStreak = 0
    let currentStreak = 0
    let prevDay: Date | null = null
    sortedDays.forEach((key) => {
      const d = new Date(key)
      if (prevDay && (d.getTime() - prevDay.getTime()) === DAY_MS) {
        currentStreak += 1
      } else {
        currentStreak = 1
      }
      if (currentStreak > longestStreak) longestStreak = currentStreak
      prevDay = d
    })

    return {
      sentCount: sent.length,
      receivedCount: received.length,
      totalCount: messages.length,
      topChats,
      dailyBuckets,
      hourly,
      weekly,
      peakHour,
      peakDay,
      activeMs,
      avgResponseMs,
      longestStreak,
    }
  }, [messages, connections, currentUserId])

  const dailyMax = Math.max(1, ...stats.dailyBuckets.map((b) => b.count))
  const hourlyMax = Math.max(1, ...stats.hourly)
  const weeklyMax = Math.max(1, ...stats.weekly)
  const topChatMax = Math.max(1, ...stats.topChats.map((c) => c.total))

  const memberDays = Math.max(
    1,
    Math.floor((Date.now() - new Date(profile.memberSince).getTime()) / DAY_MS)
  )

  return (
    <div className="min-h-screen bg-black flex flex-col pt-16 md:pt-24">
      <div className="max-w-6xl mx-auto w-full px-4">
        <BackButton />
      </div>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 pb-16 flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-white text-2xl font-bold">Your Activity</h1>
          <p className="text-white/40 text-sm">
            Insights from your last 60 days on ConnectRight, <span className="text-orange-400">@{profile.username}</span>.
          </p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Messages sent"     value={stats.sentCount.toLocaleString()} accent="bg-orange-500" />
          <KpiCard label="Messages received" value={stats.receivedCount.toLocaleString()} accent="bg-blue-500" />
          <KpiCard label="Connections"       value={connections.length.toLocaleString()} accent="bg-emerald-500" />
          <KpiCard label="Active time"       value={fmtDuration(stats.activeMs)} accent="bg-purple-500" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Avg reply time"    value={stats.avgResponseMs > 0 ? fmtDuration(stats.avgResponseMs) : '—'} subtle />
          <KpiCard label="Longest streak"    value={stats.longestStreak > 0 ? `${stats.longestStreak} day${stats.longestStreak === 1 ? '' : 's'}` : '—'} subtle />
          <KpiCard label="Requests sent"     value={sentRequestCount.toLocaleString()} subtle />
          <KpiCard label="Requests received" value={receivedRequestCount.toLocaleString()} subtle />
        </div>

        {/* Daily message chart */}
        <Card title="Messages — last 14 days" subtitle={`Peak day: ${DAY_NAMES[stats.peakDay]}`}>
          <div className="h-44 flex items-end gap-1.5 px-1">
            {stats.dailyBuckets.map((b, i) => {
              const h = (b.count / dailyMax) * 100
              return (
                <div key={i} className="flex-1 h-full flex flex-col justify-end items-center gap-1.5 group relative">
                  <div
                    className={`w-full rounded-t-md transition-all ${b.isToday ? 'bg-orange-500' : 'bg-white/15 group-hover:bg-white/30'}`}
                    style={{ height: `${Math.max(2, h)}%` }}
                  />
                  <span className="text-[10px] text-white/40 leading-none whitespace-nowrap">{b.label}</span>
                  {b.count > 0 && (
                    <span className="absolute -top-5 text-[10px] text-white/70 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800 border border-white/10 rounded px-1.5 py-0.5">
                      {b.count}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top chats */}
          <Card title="Top conversations" subtitle="Who you talk to most">
            {stats.topChats.length === 0 ? (
              <EmptyChartState text="Once you exchange messages, your top chats show up here." />
            ) : (
              <ul className="flex flex-col gap-3">
                {stats.topChats.map((c, idx) => {
                  const pct = (c.total / topChatMax) * 100
                  return (
                    <li key={c.connectionId} className="flex items-center gap-3">
                      <span className="text-white/30 text-xs w-4 tabular-nums">{idx + 1}</span>
                      <UserAvatar username={c.username} avatarUrl={c.avatarUrl} size={28} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-white text-sm font-medium truncate">@{c.username}</span>
                          <span className="text-white/50 text-xs tabular-nums shrink-0">
                            {c.total} <span className="text-white/30">({c.sent}↑ {c.received}↓)</span>
                          </span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          {/* Day-of-week */}
          <Card title="Day of the week" subtitle={`Most active: ${DAY_NAMES[stats.peakDay]}`}>
            <div className="h-44 flex items-end gap-2 px-1">
              {stats.weekly.map((count, i) => {
                const h = (count / weeklyMax) * 100
                const peak = i === stats.peakDay && count > 0
                return (
                  <div key={i} className="flex-1 h-full flex flex-col justify-end items-center gap-1.5">
                    <div
                      className={`w-full rounded-t-md ${peak ? 'bg-orange-500' : 'bg-white/15'}`}
                      style={{ height: `${Math.max(2, h)}%` }}
                      title={`${DAY_NAMES[i]}: ${count}`}
                    />
                    <span className={`text-[10px] leading-none ${peak ? 'text-orange-400 font-semibold' : 'text-white/40'}`}>
                      {DAY_NAMES[i]}
                    </span>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>

        {/* Hour-of-day heatmap */}
        <Card
          title="When you message"
          subtitle={`You're most active around ${stats.peakHour}:00`}
        >
          <div className="grid grid-cols-12 gap-1.5">
            {stats.hourly.map((count, h) => {
              const intensity = count / hourlyMax
              return (
                <div
                  key={h}
                  className="aspect-square rounded-md flex items-center justify-center group relative"
                  style={{
                    backgroundColor: count === 0
                      ? 'rgba(255,255,255,0.05)'
                      : `rgba(249,115,22,${0.15 + intensity * 0.85})`,
                  }}
                >
                  <span className={`text-[10px] tabular-nums ${count === 0 ? 'text-white/25' : 'text-white'}`}>
                    {h}
                  </span>
                  {count > 0 && (
                    <span className="pointer-events-none absolute bottom-full mb-1 left-1/2 -translate-x-1/2 text-[10px] bg-zinc-800 border border-white/10 rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {h}:00 · {count} msg{count === 1 ? '' : 's'}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          <p className="text-white/30 text-[11px] mt-3">Hour 0 = midnight, 23 = 11 PM</p>
        </Card>

        {/* Footer summary */}
        <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <p className="text-white/50 text-xs uppercase tracking-wide mb-1">Member since</p>
            <p className="text-white text-base font-medium">{new Date(profile.memberSince).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="text-right">
            <p className="text-white/50 text-xs uppercase tracking-wide mb-1">Daily average</p>
            <p className="text-white text-base font-medium">
              {(stats.totalCount / Math.min(memberDays, 60)).toFixed(1)} msgs/day
            </p>
          </div>
        </div>

      </main>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  accent,
  subtle = false,
}: {
  label: string
  value: string
  accent?: string
  subtle?: boolean
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/10 ${subtle ? 'bg-zinc-900/40' : 'bg-zinc-900'} p-4 flex flex-col gap-1`}>
      {accent && (
        <span className={`absolute top-0 left-0 h-full w-1 ${accent}`} aria-hidden />
      )}
      <p className="text-white/40 text-[11px] uppercase tracking-wide">{label}</p>
      <p className={`text-white font-bold ${subtle ? 'text-xl' : 'text-2xl'} tabular-nums`}>{value}</p>
    </div>
  )
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-zinc-900 border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-white font-semibold text-base">{title}</h2>
        {subtitle && <p className="text-white/40 text-xs">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

function EmptyChartState({ text }: { text: string }) {
  return (
    <div className="h-44 flex items-center justify-center text-center">
      <p className="text-white/30 text-sm max-w-xs">{text}</p>
    </div>
  )
}
