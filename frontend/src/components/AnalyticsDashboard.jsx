import React, { useMemo } from 'react'
import { Card, CardContent } from './ui/Card'
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar, ResponsiveContainer } from 'recharts'

const COLORS = ['#0C6C8C','#689F7A','#E4C4A0','#1A2A45','#424440']

export default function AnalyticsDashboard({ emails = [], cleanedCount = 0 }) {
  const stats = useMemo(() => {
    const byCat = {}
    const byDay = {}
    for (const e of emails) {
      const cat = (e.ai_category || e.aiCategory || 'Other')
      byCat[cat] = (byCat[cat] || 0) + 1
      const day = new Date(e.date || e.received_at || Date.now()).toLocaleDateString()
      byDay[day] = (byDay[day] || 0) + 1
    }
    const catData = Object.entries(byCat).map(([name, value]) => ({ name, value }))
    const dayData = Object.entries(byDay).map(([name, value]) => ({ name, value })).sort((a,b)=> new Date(a.name)-new Date(b.name))
    const total = emails.length
    const unread = emails.filter(e => !e.is_read).length
    return { catData, dayData, total, unread }
  }, [emails])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Metric label="Total Emails" value={stats.total} icon="📩"/>
            <Metric label="Unread" value={stats.unread} icon="🕓"/>
            <Metric label="Cleaned" value={cleanedCount} icon="🧹"/>
            <Metric label="Storage Saved" value={Math.round(cleanedCount * 0.2) + ' MB'} icon="💾"/>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h3 className="font-semibold mb-3">Email Category Breakdown</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={stats.catData} dataKey="value" nameKey="name" outerRadius={90} label>
                  {stats.catData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h3 className="font-semibold mb-3">Emails per Day</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={stats.dayData}>
                <XAxis dataKey="name" hide/>
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#0C6C8C" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h3 className="font-semibold mb-3">Cleanup Stats</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={[{ name: 'Deleted', value: cleanedCount }]}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#689F7A" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4">
            <button className="px-4 py-2 rounded-xl bg-primary-600 text-white hover:bg-primary-700">Generate Report</button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Metric({ label, value, icon }) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-white to-primary-50 p-4 border border-primary-100 shadow-sm">
      <div className="text-2xl">{icon}</div>
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  )
}
