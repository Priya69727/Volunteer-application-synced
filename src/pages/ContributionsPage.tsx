import { useState } from "react"

import { Icon, PageHeader, StatCard, Status } from "../components/shared"

import { usePortal } from "../components/portal"

import { fmtDate } from "../api"

function downloadContributionReport(
  items: ReturnType<typeof usePortal>["contributions"]["items"],
) {
  const rows = [
    ["Date", "Opportunity", "Activity type", "Role", "Hours", "Attendance"],
    ...items.map((item) => [
      item.date,
      item.name,
      item.kind,
      item.role,
      String(item.hours),
      item.status,
    ]),
  ]
  const csv = rows
    .map((row) =>
      row.map((value) => `"${value.replace(/"/g, '""')}"`).join(","),
    )
    .join("\r\n")
  const url = URL.createObjectURL(
    new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }),
  )
  const link = document.createElement("a")
  link.href = url
  link.download = "volunteer-contributions.csv"
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const activityColors = [
  "#5bc3a6",
  "#f0b45d",
  "#75a9d2",
  "#db806c",
  "#aa91c6",
  "#9ebd72",
]

export function ContributionsPage() {
  const { me, contributions } = usePortal()

  const [period, setPeriod] = useState<"month" | "six-months">("six-months")

  const [showAll, setShowAll] = useState(false)

  const [historyPeriod, setHistoryPeriod] = useState("all")

  const [activityFilter, setActivityFilter] = useState("")

  const [opportunityFilter, setOpportunityFilter] = useState("")

  const stats = me?.stats

  const activities = [...contributions.byKind].sort((a, b) => b.hours - a.hours)

  const total = activities.reduce((sum, activity) => sum + activity.hours, 0)

  const top = activities[0]

  let accumulated = 0

  const pie = activities
    .map((activity, index) => {
      const start = accumulated

      accumulated += total ? (activity.hours / total) * 100 : 0

      return `${activityColors[index % activityColors.length]} ${start}% ${accumulated}%`
    })
    .join(", ")

  const pieStyle = { background: total ? `conic-gradient(${pie})` : "#e6eeeb" }

  const now = new Date()

  const currentMonth = now.toLocaleString("en-US", { month: "short" })
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const yearStart = new Date(now.getFullYear(), 0, 1)
  const nextYearStart = new Date(now.getFullYear() + 1, 0, 1)
  const previousYearStart = new Date(now.getFullYear() - 1, 0, 1)
  const hoursWithin = (start: Date, end: Date) =>
    contributions.items.reduce((sum, item) => {
      const date = new Date(`${item.date}T00:00:00`)
      return date >= start && date < end ? sum + item.hours : sum
    }, 0)
  const currentMonthHours =
    contributions.summary?.currentMonth ??
    hoursWithin(monthStart, nextMonthStart)
  const previousMonthHours =
    contributions.summary?.previousMonth ??
    hoursWithin(previousMonthStart, monthStart)
  const currentYearHours =
    contributions.summary?.currentYear ?? hoursWithin(yearStart, nextYearStart)
  const previousYearHours =
    contributions.summary?.previousYear ??
    hoursWithin(previousYearStart, yearStart)
  const attendanceRecords = contributions.items.filter(
    (item) => item.status !== "Absent",
  ).length
  const attendanceRate =
    contributions.summary?.attendanceRate ??
    (contributions.items.length
      ? Math.round((attendanceRecords / contributions.items.length) * 100)
      : 0)

  const monthHours =
    contributions.monthly.find(
      (item) =>
        item.month.trim().slice(0, 3).toLowerCase() ===
        currentMonth.toLowerCase(),
    )?.hours ?? 0

  const chartItems =
    period === "month"
      ? [{ month: currentMonth, hours: monthHours }]
      : contributions.monthly

  const chartMax = Math.max(
    4,
    Math.ceil(Math.max(0, ...chartItems.map((item) => item.hours)) / 4) * 4,
  )

  const chartTicks = Array.from(
    { length: 5 },
    (_, index) => chartMax - (index * chartMax) / 4,
  )

  const historyItems = contributions.items.filter((item) => {
    if (activityFilter && item.kind !== activityFilter) return false
    if (opportunityFilter && item.name !== opportunityFilter) return false
    if (historyPeriod === "all") return true

    const date = new Date(`${item.date}T00:00:00`)
    if (Number.isNaN(date.getTime())) return false
    if (historyPeriod === "month")
      return date >= monthStart && date < nextMonthStart
    if (historyPeriod === "year")
      return date >= yearStart && date < nextYearStart
    return date >= previousYearStart && date < nextYearStart
  })

  const visibleItems = showAll ? historyItems : historyItems.slice(0, 5)

  const activityOptions = [
    ...new Set(contributions.items.map((item) => item.kind)),
  ]
  const opportunityOptions = [
    ...new Set(contributions.items.map((item) => item.name)),
  ]

  const earnedMilestones = [1, 10, 25, 50, 100].filter(
    (milestone) => (stats?.hours ?? total) >= milestone,
  )

  const topPercentage = top && total ? Math.round((top.hours / total) * 100) : 0

  return (
    <div className="page contributions-page">
      <PageHeader
        title="My Contributions"
        description="Every hour you give helps build a stronger, more connected community."
      />

      <div className="stats-grid contributions-stats">
        <StatCard
          icon="clock"
          label="Total volunteer hours"
          value={`${Math.round((stats?.hours ?? 0) * 10) / 10} hrs`}
          note="Time given to your community"
          tone="green"
        />
        <StatCard
          icon="folder"
          label="Projects contributed to"
          value={String(stats?.projects ?? 0)}
          note="Projects supported so far"
          tone="blue"
        />
        <StatCard
          icon="calendar"
          label="Events participated"
          value={String(stats?.events ?? 0)}
          note="Shared moments in action"
          tone="amber"
        />
        <StatCard
          icon="check"
          label="Contribution days"
          value={String(stats?.days ?? 0)}
          note="Days you made an impact"
          tone="violet"
        />
      </div>

      <div className="contribution-comparisons">
        <article className="contribution-comparison-card">
          <span className="eyebrow">MONTHLY CONTRIBUTION</span>
          <strong>{Math.round(currentMonthHours * 10) / 10} hrs</strong>
          <p>
            {Math.round(previousMonthHours * 10) / 10} hrs last month
            <span>
              {currentMonthHours >= previousMonthHours ? "+" : ""}
              {Math.round((currentMonthHours - previousMonthHours) * 10) / 10}{" "}
              hrs
            </span>
          </p>
        </article>
        <article className="contribution-comparison-card">
          <span className="eyebrow">YEARLY CONTRIBUTION</span>
          <strong>{Math.round(currentYearHours * 10) / 10} hrs</strong>
          <p>
            {Math.round(previousYearHours * 10) / 10} hrs last year
            <span>
              {currentYearHours >= previousYearHours ? "+" : ""}
              {Math.round((currentYearHours - previousYearHours) * 10) / 10} hrs
            </span>
          </p>
        </article>
        <article className="contribution-comparison-card contribution-attendance-card">
          <span className="eyebrow">ATTENDANCE RATE</span>
          <strong>{attendanceRate}%</strong>
          <p>Based on your recorded attendance</p>
        </article>
      </div>

      <div className="contribution-grid">
        <section className="panel chart-card">
          <div className="contribution-section-heading">
            <div>
              <span className="eyebrow">YOUR TIME, OVERVIEW</span>
              <h2>Volunteer hours</h2>
              <p className="chart-caption">
                Track the time you have shared with your community.
              </p>
            </div>
            <label className="contribution-period">
              <span className="sr-only">Chart time period</span>
              <select
                value={period}
                onChange={(event) =>
                  setPeriod(
                    event.currentTarget.value === "month"
                      ? "month"
                      : "six-months",
                  )
                }
              >
                <option value="six-months">Last 6 months</option>
                <option value="month">This month</option>
              </select>
              <Icon name="chevron" size={14} />
            </label>
          </div>
          {chartItems.length && chartItems.some((item) => item.hours > 0) ? (
            <div
              className="contribution-chart"
              role="img"
              aria-label={`${
                period === "month" ? "This month" : "Last six months"
              } volunteer hours`}
            >
              <div className="contribution-chart-axis" aria-hidden="true">
                {chartTicks.map((tick, index) => (
                  <span key={index}>{tick === 0 ? "0" : `${tick}h`}</span>
                ))}
              </div>
              <div className="contribution-chart-plot">
                {chartItems.map((item, index) => {
                  const height =
                    item.hours > 0
                      ? Math.max(5, (item.hours / chartMax) * 100)
                      : 0

                  return (
                    <div
                      className="contribution-bar-column"
                      key={`${item.month}-${index}`}
                    >
                      <div className="contribution-bar-track">
                        {item.hours > 0 && (
                          <span
                            className="contribution-bar-value"
                            style={{ bottom: `calc(${height}% + 6px)` }}
                          >
                            {Math.round(item.hours * 10) / 10}h
                          </span>
                        )}
                        <span
                          className="contribution-bar"
                          style={{ height: `${height}%` }}
                          title={`${item.month}: ${item.hours} hours`}
                        />
                      </div>
                      <small>{item.month}</small>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="contribution-chart-empty">
              <span>
                <Icon name="clock" />
              </span>
              <strong>
                No hours logged {period === "month" ? "this month" : "yet"}
              </strong>
              <p>Your recorded contribution hours will appear here.</p>
            </div>
          )}
        </section>

        <section className="panel activity-card">
          <div className="activity-dark">
            <div className="activity-heading">
              <div>
                <span className="eyebrow">YOUR CONTRIBUTION MIX</span>
                <h2>Hours by activity</h2>
              </div>
              <span className="activity-total">
                {Math.round(total * 10) / 10}
                <small>HRS TOTAL</small>
              </span>
            </div>
            {activities.length ? (
              <div className="activity-visual">
                <div
                  className="activity-pie"
                  style={pieStyle}
                  role="img"
                  aria-label={`Contribution hours by activity: ${activities.map((item) => `${item.kind}, ${item.hours} hours`).join("; ")}`}
                >
                  <div>
                    <strong>100%</strong>
                    <span>OF YOUR HOURS</span>
                  </div>
                </div>
                <div className="activity-legend">
                  {activities.map((activity, index) => (
                    <div key={activity.kind}>
                      <span
                        className="legend-swatch"
                        style={{
                          background:
                            activityColors[index % activityColors.length],
                        }}
                      />
                      <span className="legend-copy">
                        <strong>{activity.kind}</strong>
                        <small>
                          {Math.round(
                            (total ? activity.hours / total : 0) * 100,
                          )}
                          % of your time
                        </small>
                      </span>
                      <b>
                        {Math.round(activity.hours * 10) / 10}
                        <small>HRS</small>
                      </b>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="activity-empty">
                <span className="cause-icon">
                  <Icon name="heart" />
                </span>
                <strong>Your impact is just getting started</strong>
                <p>
                  Activity types will appear here once your attendance hours are
                  logged.
                </p>
              </div>
            )}
          </div>
          {top && (
            <div className="top-activity-note">
              <span className="cause-icon">
                <Icon name="heart" />
              </span>
              <p>
                <strong>{top.kind} is your top activity</strong>
                <small>
                  You’ve given {Math.round(top.hours * 10) / 10} hours to this
                  cause. Every hour makes a difference.
                </small>
              </p>
              <span className="top-activity-share">{topPercentage}%</span>
            </div>
          )}
        </section>
      </div>

      <section className="panel contribution-milestones">
        <div className="contribution-section-heading">
          <div>
            <span className="eyebrow">MILESTONES & RECOGNITION</span>
            <h2>Your achievements</h2>
          </div>
        </div>
        <div className="achievement-columns">
          <div>
            <h3>Hours milestones</h3>
            <div className="milestone-list">
              {[1, 10, 25, 50, 100].map((milestone) => {
                const earned = earnedMilestones.includes(milestone)
                return (
                  <span
                    className={
                      earned ? "milestone-chip earned" : "milestone-chip"
                    }
                    key={milestone}
                  >
                    <Icon name={earned ? "check" : "clock"} size={15} />
                    {milestone} {milestone === 1 ? "hour" : "hours"}
                  </span>
                )
              })}
            </div>
          </div>
          <div className="recognition-list">
            <h3>Certificates & recognition</h3>
            {contributions.recognitions?.length ? (
              contributions.recognitions.map((recognition, index) => (
                <article key={`${recognition.title}-${index}`}>
                  <span className="cause-icon">
                    <Icon name="file" />
                  </span>
                  <p>
                    <strong>{recognition.title}</strong>
                    <small>
                      {recognition.type}
                      {recognition.issuedOn
                        ? ` · ${fmtDate(recognition.issuedOn)}`
                        : ""}
                    </small>
                  </p>
                </article>
              ))
            ) : (
              <p className="recognition-empty">
                Recognition issued by your coordinator will appear here.
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="history-heading">
        <div>
          <span className="eyebrow">YOUR IMPACT, IN DETAIL</span>
          <h2>Contribution history</h2>
        </div>
        {historyItems.length > 5 && (
          <button
            className="history-view-button"
            onClick={() => setShowAll((value) => !value)}
          >
            {showAll ? "Show less" : "View all"}
            <Icon name="arrow" size={15} />
          </button>
        )}
      </div>
      <div className="contribution-history-toolbar">
        <div className="contribution-history-filters">
          <label>
            <span className="sr-only">Filter by date</span>
            <select
              value={historyPeriod}
              onChange={(event) => setHistoryPeriod(event.currentTarget.value)}
            >
              <option value="all">All dates</option>
              <option value="month">This month</option>
              <option value="year">This year</option>
              <option value="last-year">Last 12 months</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by activity type</span>
            <select
              value={activityFilter}
              onChange={(event) => setActivityFilter(event.currentTarget.value)}
            >
              <option value="">All activity types</option>
              {activityOptions.map((activity) => (
                <option key={activity} value={activity}>
                  {activity}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by opportunity</span>
            <select
              value={opportunityFilter}
              onChange={(event) =>
                setOpportunityFilter(event.currentTarget.value)
              }
            >
              <option value="">All opportunities</option>
              {opportunityOptions.map((opportunity) => (
                <option key={opportunity} value={opportunity}>
                  {opportunity}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          className="history-export-button"
          disabled={!historyItems.length}
          onClick={() => downloadContributionReport(historyItems)}
        >
          <Icon name="file" size={15} />
          Download report
        </button>
      </div>
      <div className="panel table-wrap contributions-history">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Opportunity</th>
              <th>Role</th>
              <th>Hours</th>
              <th>Attendance</th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.map((contribution, index) => (
              <tr key={`${contribution.date}-${contribution.name}-${index}`}>
                <td>{fmtDate(contribution.date)}</td>
                <td>
                  <strong>{contribution.name}</strong>
                  <small>{contribution.kind}</small>
                </td>
                <td>{contribution.role}</td>
                <td>
                  <strong>{contribution.hours} hrs</strong>
                </td>
                <td>
                  <Status
                    tone={
                      contribution.status === "Absent"
                        ? "danger"
                        : contribution.status === "Late"
                          ? "warning"
                          : "success"
                    }
                  >
                    {contribution.status}
                  </Status>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!historyItems.length && (
          <p className="contribution-history-empty">
            {contributions.items.length
              ? "No contributions match these filters."
              : "No attendance has been recorded for you yet."}
          </p>
        )}
      </div>
    </div>
  )
}
