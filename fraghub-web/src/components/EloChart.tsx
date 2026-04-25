import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Dot,
} from 'recharts'
import type { EloHistoryEntry } from '@/services/playerService'
import styles from './EloChart.module.css'

interface EloChartProps {
  data: EloHistoryEntry[]
  baseElo?: number
}

interface TooltipPayload {
  value: number
  payload: EloHistoryEntry
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: TooltipPayload[]
}) {
  if (!active || !payload?.length) return null
  const entry = payload[0].payload
  const sign = entry.change >= 0 ? '+' : ''
  const date = new Date(entry.timestamp).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  })
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipElo}>{entry.eloAfter} ELO</p>
      <p className={`${styles.tooltipChange} ${entry.change >= 0 ? styles.win : styles.loss}`}>
        {sign}{entry.change}
      </p>
      <p className={styles.tooltipDate}>{date}</p>
    </div>
  )
}

function CustomDot(props: {
  cx?: number
  cy?: number
  payload?: EloHistoryEntry
}) {
  const { cx, cy, payload } = props
  if (cx == null || cy == null || !payload) return null
  const fill = payload.result === 'win' ? 'var(--color-win)' : 'var(--color-loss)'
  return <Dot cx={cx} cy={cy} r={4} fill={fill} stroke="none" />
}

export function EloChart({ data, baseElo }: EloChartProps) {
  if (!data.length) {
    return <p className={styles.empty}>Sem histórico de ELO ainda.</p>
  }

  const chartData = data.map((e, i) => ({ ...e, index: i + 1 }))
  const ref = baseElo ?? data[0].eloAfter - data[0].change

  return (
    <div className={styles.wrapper}>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--outline)" opacity={0.3} />
          <XAxis dataKey="index" hide />
          <YAxis
            domain={['auto', 'auto']}
            tick={{ fontSize: 11, fill: 'var(--on-surface-variant)' }}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={ref} stroke="var(--outline)" strokeDasharray="4 2" opacity={0.5} />
          <Line
            type="monotone"
            dataKey="eloAfter"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={<CustomDot />}
            activeDot={{ r: 6, fill: 'var(--primary)' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
