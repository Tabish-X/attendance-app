import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, ReferenceLine,
} from "recharts";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function getColor(pct) {
  if (pct === null || pct === undefined) return "#9898a8";
  if (pct >= 75) return "#18794e";
  if (pct >= 60) return "#946800";
  return "#ce2c31";
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 6, padding: "10px 14px", fontSize: 13, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
      <p style={{ fontWeight: 600, marginBottom: 4, color: "var(--text)" }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || "var(--text2)" }}>
          {p.name}: {p.value} lectures
        </p>
      ))}
    </div>
  );
};

export default function Analytics({ addToast }) {
  const { currentUser } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [records,  setRecords]  = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const u1 = onSnapshot(
      query(collection(db, "users", currentUser.uid, "subjects"), orderBy("createdAt")),
      s => setSubjects(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    const u2 = onSnapshot(
      query(collection(db, "users", currentUser.uid, "attendance"), orderBy("date")),
      s => { setRecords(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); }
    );
    return () => { u1(); u2(); };
  }, [currentUser]);

  const subjectData = useMemo(() => {
    return subjects.map(s => {
      const recs    = records.filter(r => r.subjectId === s.id);
      const present = recs.filter(r => r.status === "present").length;
      const absent  = recs.filter(r => r.status === "absent").length;
      const total   = present + absent;
      const pct     = total > 0 ? parseFloat(((present / total) * 100).toFixed(2)) : 0;
      const needed  = pct < 75 && total > 0 ? Math.ceil((75 * total - 100 * present) / 25) : null;
      const canBunk = pct >= 75 && total > 0 ? Math.floor((100 * present / 75) - total) : null;
      return {
        name: s.name.length > 12 ? s.name.slice(0, 12) + "…" : s.name,
        fullName: s.name, pct, present, absent, total, needed, canBunk,
      };
    });
  }, [subjects, records]);

  const monthlyData = useMemo(() => {
    const map = {};
    records.forEach(r => {
      const key = `${r.year}-${String(r.month).padStart(2, "0")}`;
      if (!map[key]) map[key] = { label: `${MONTHS[r.month - 1]} ${r.year}`, present: 0, absent: 0 };
      if (r.status === "present") map[key].present++;
      else if (r.status === "absent") map[key].absent++;
    });
    return Object.values(map).map(d => ({
      ...d,
      pct: d.present + d.absent > 0
        ? parseFloat(((d.present / (d.present + d.absent)) * 100).toFixed(2)) : 0,
    }));
  }, [records]);

  const pieData = useMemo(() => {
    const p = records.filter(r => r.status === "present").length;
    const a = records.filter(r => r.status === "absent").length;
    return [
      { name: "Present", value: p, color: "#18794e" },
      { name: "Absent",  value: a, color: "#ce2c31" },
    ].filter(d => d.value > 0);
  }, [records]);

  // Days Tracked = number of unique dates on which any lecture was recorded
  const daysTracked = useMemo(() =>
    new Set(records.map(r => r.dateStr)).size, [records]);

  const streak = useMemo(() => {
    const dates = [...new Set(
      records.filter(r => r.status === "present").map(r => r.dateStr)
    )].sort();
    if (!dates.length) return 0;
    let s = 1, max = 1;
    for (let i = 1; i < dates.length; i++) {
      const [d1, m1, y1] = dates[i-1].split("/").map(Number);
      const [d2, m2, y2] = dates[i].split("/").map(Number);
      const diff = (new Date(y2, m2-1, d2) - new Date(y1, m1-1, d1)) / 86400000;
      if (diff === 1) { s++; max = Math.max(max, s); } else s = 1;
    }
    return max;
  }, [records]);

  const best  = subjectData.reduce((a, b) => (b.pct > (a?.pct ?? -1) ? b : a), null);
  const worst = subjectData.filter(s => s.total > 0).reduce((a, b) => (b.pct < (a?.pct ?? 101) ? b : a), null);

  const overallPresent = records.filter(r => r.status === "present").length;
  const overallAbsent  = records.filter(r => r.status === "absent").length;
  const overallTotal   = overallPresent + overallAbsent;
  const overallPct     = overallTotal > 0 ? (overallPresent / overallTotal) * 100 : null;

  if (loading) return (
    <div className="page" style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
      <div className="spinner" />
    </div>
  );

  if (records.length === 0) return (
    <div className="page">
      <h1 className="page-title">Analytics</h1>
      <div className="empty-state card" style={{ marginTop: 20 }}>
        <p style={{ fontSize: 15, color: "var(--text2)" }}>
          No data yet. Start marking attendance to see analytics.
        </p>
      </div>
    </div>
  );

  return (
    <div className="page">
      <h1 className="page-title">Analytics</h1>
      <p className="page-subtitle">Overview of your attendance patterns</p>

      {/* Stat Cards */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        {[
          { label: "Total Records",   value: records.length },
          { label: "Days Tracked",    value: daysTracked },
          { label: "Longest Streak",  value: `${streak} days` },
          { label: "Overall %",       value: overallPct !== null ? overallPct.toFixed(2) + "%" : "—", colored: true },
          { label: "Most Attended",   value: best?.fullName || "—" },
          { label: "Least Attended",  value: worst?.fullName || "—" },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: "14px 16px" }}>
            <p style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
              {s.label}
            </p>
            <p style={{
              fontWeight: 700, fontSize: 20,
              color: s.colored ? getColor(overallPct) : "var(--text)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>

        {/* Bar Chart */}
        <div className="card">
          <p className="section-title">Bar Chart</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={subjectData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fill: "var(--text3)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: "var(--text3)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => v + "%"} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={75} stroke="var(--accent)" strokeDasharray="4 3" strokeWidth={1.5}
              <Bar dataKey="pct" name="Attendance %" radius={[4, 4, 0, 0]}>
                {subjectData.map((d, i) => <Cell key={i} fill={getColor(d.pct)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="card">
          <p className="section-title">Pie Chart</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                labelLine={{ stroke: "var(--text3)" }} fontSize={11}>
                {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 6 }}>
            {pieData.map(d => (
              <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: d.color }} />
                <span style={{ color: "var(--text2)" }}>{d.name}: {d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Trend */}
        {monthlyData.length > 1 && (
          <div className="card" style={{ gridColumn: "1 / -1" }}>
            <p className="section-title">Monthly Attendance Trend</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthlyData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fill: "var(--text3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: "var(--text3)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => v + "%"} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={75} stroke="var(--accent)" strokeDasharray="4 3" strokeWidth={1.5} />
                <Line type="monotone" dataKey="pct" name="Attendance %" stroke="var(--accent)"
                  strokeWidth={2} dot={{ fill: "var(--accent)", r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Subject Breakdown Table */}
        <div className="card" style={{ gridColumn: "1 / -1" }}>
          <p className="section-title">Subject Breakdown</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Present</th>
                  <th>Absent</th>
                  <th>Total</th>
                  <th>Attendance %</th>
                  <th>75% Status</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {subjectData.map(s => (
                  <tr key={s.fullName}>
                    <td style={{ fontWeight: 600 }}>{s.fullName}</td>
                    <td style={{ color: "var(--green)" }}>{s.present}</td>
                    <td style={{ color: "var(--red)"   }}>{s.absent}</td>
                    <td>{s.total}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: getColor(s.pct) }}>
                        {s.total > 0 ? s.pct.toFixed(2) + "%" : "—"}
                      </span>
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {s.needed   !== null            && <span style={{ color: "var(--red)"    }}>Need {s.needed} more</span>}
                      {s.canBunk  !== null && s.canBunk > 0 && <span style={{ color: "var(--green)"  }}>Can skip {s.canBunk}</span>}
                      {s.canBunk  === 0    && s.pct >= 75   && <span style={{ color: "var(--yellow)" }}>Right at limit</span>}
                      {s.total    === 0                     && <span style={{ color: "var(--text3)"  }}>No records</span>}
                    </td>
                    <td style={{ width: 100 }}>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${Math.min(s.pct, 100)}%`, background: getColor(s.pct) }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
