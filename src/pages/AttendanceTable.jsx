import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const TARGET = 75;

function getColor(pct) {
  if (pct === null || pct === undefined) return "var(--text3)";
  if (pct >= 75) return "var(--green)";
  if (pct >= 60) return "var(--yellow)";
  return "var(--red)";
}

function calcStats(records, subjects) {
  const stats = {};
  subjects.forEach(s => {
    const recs    = records.filter(r => r.subjectId === s.id);
    const present = recs.filter(r => r.status === "present").length;
    const absent  = recs.filter(r => r.status === "absent").length;
    const total   = present + absent;
    const pct     = total > 0 ? (present / total) * 100 : null;
    const lecturesNeeded = pct !== null && pct < TARGET
      ? Math.ceil((TARGET * total - 100 * present) / (100 - TARGET)) : null;
    const canBunk = pct !== null && pct >= TARGET
      ? Math.floor((100 * present / TARGET) - total) : null;
    stats[s.id] = { present, absent, total, pct, lecturesNeeded, canBunk };
  });
  return stats;
}

// ── Small stat box ──────────────────────────────────────────────────────────
function PctBox({ label, pct, isOverall }) {
  const color = getColor(pct);
  return (
    <div style={{
      background: "var(--card)",
      border: `1px solid var(--border)`,
      borderRadius: "var(--radius2)",
      padding: "12px 16px",
      minWidth: 0,
      flex: "1 1 120px",
      borderTop: `3px solid ${pct !== null ? color : "var(--border)"}`,
    }}>
      <p style={{
        fontSize: 11, fontWeight: 600, color: "var(--text3)",
        textTransform: "uppercase", letterSpacing: "0.05em",
        marginBottom: 6,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {label}
      </p>
      <p style={{
        fontSize: isOverall ? 26 : 22,
        fontWeight: 700,
        color: pct !== null ? color : "var(--text3)",
        lineHeight: 1,
      }}>
        {pct !== null ? pct.toFixed(1) + "%" : "—"}
      </p>
    </div>
  );
}

// ── Month box ───────────────────────────────────────────────────────────────
function MonthBox({ label, pct }) {
  const color = getColor(pct);
  return (
    <div style={{
      background: "var(--card)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius2)",
      padding: "10px 14px",
      flex: "1 1 100px",
      minWidth: 0,
    }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 18, fontWeight: 700, color: pct !== null ? color : "var(--text3)" }}>
        {pct !== null ? pct.toFixed(1) + "%" : "—"}
      </p>
    </div>
  );
}

export default function AttendanceTable({ addToast }) {
  const { currentUser } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [records,  setRecords]  = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const u1 = onSnapshot(
      query(collection(db, "users", currentUser.uid, "subjects"), orderBy("createdAt", "asc")),
      snap => setSubjects(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    const u2 = onSnapshot(
      query(collection(db, "users", currentUser.uid, "attendance"), orderBy("date", "asc")),
      snap => {
        setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }
    );
    return () => { u1(); u2(); };
  }, [currentUser]);

  // Overall stats
  const overallStats = useMemo(() => calcStats(records, subjects), [records, subjects]);
  const overallPresent = Object.values(overallStats).reduce((a, s) => a + s.present, 0);
  const overallTotal   = Object.values(overallStats).reduce((a, s) => a + s.total, 0);
  const overallPct     = overallTotal > 0 ? (overallPresent / overallTotal) * 100 : null;

  // Month list
  const monthYearList = useMemo(() => {
    const set = new Set(records.map(r => `${r.year}-${String(r.month).padStart(2, "0")}`));
    return [...set].sort().map(key => {
      const [y, m] = key.split("-");
      return { year: parseInt(y), month: parseInt(m), key };
    });
  }, [records]);

  // Monthly overall %
  function monthPct(year, month) {
    const recs = records.filter(r => r.year === year && r.month === month);
    const p = recs.filter(r => r.status === "present").length;
    const t = recs.length;
    return t > 0 ? (p / t) * 100 : null;
  }

  function exportCSV() {
    const rows = [["Date","Subject","Status"]];
    records.forEach(r => rows.push([r.dateStr, r.subjectName, r.status]));
    const csv  = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "attendance.csv"; a.click();
    URL.revokeObjectURL(url);
    addToast("CSV exported.", "success");
  }

  if (loading) return (
    <div className="page" style={{ display:"flex", justifyContent:"center", paddingTop:80 }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div className="page">

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
        <div>
          <h1 className="page-title">Attendance Table</h1>
          <p className="page-subtitle">Your attendance records and statistics</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={exportCSV}>Export CSV</button>
      </div>

      {records.length === 0 ? (
        <div className="empty-state card">
          <p style={{ fontSize:15, color:"var(--text2)" }}>
            No data yet. Start marking attendance to see records.
          </p>
        </div>
      ) : (
        <>
          {/* ── Row 1: Overall + per-subject % boxes ── */}
          <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:12 }}>
            <PctBox label="Overall" pct={overallPct} isOverall />
            {subjects.map(s => {
              const st = overallStats[s.id];
              return <PctBox key={s.id} label={s.name} pct={st?.pct ?? null} />;
            })}
          </div>

          {/* ── Row 2: Monthly overall % boxes ── */}
          {monthYearList.length > 0 && (
            <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:28 }}>
              {monthYearList.map(({ year, month, key }) => (
                <MonthBox
                  key={key}
                  label={`${MONTH_NAMES[month-1]} ${year}`}
                  pct={monthPct(year, month)}
                />
              ))}
            </div>
          )}

          {/* ── Subject Breakdown Table ── */}
          <div style={{ marginBottom: 28 }}>
            <p className="section-title">Subject Breakdown</p>
            {/* Responsive: stack on mobile, table on desktop */}
            <div className="breakdown-wrap">
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr>
                    <th style={th}>Subject</th>
                    <th style={th}>Present</th>
                    <th style={th}>Absent</th>
                    <th style={th}>Attendance %</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map(s => {
                    const st = overallStats[s.id] || { present:0, absent:0, total:0, pct:null, lecturesNeeded:null, canBunk:null };
                    return (
                      <tr key={s.id}>
                        <td style={td}><span style={{ fontWeight:600 }}>{s.name}</span></td>
                        <td style={td}><span style={{ color:"var(--green)", fontWeight:500 }}>{st.present}</span></td>
                        <td style={td}><span style={{ color:"var(--red)",   fontWeight:500 }}>{st.absent}</span></td>
                        <td style={td}>
                          <span style={{ fontWeight:700, color:getColor(st.pct) }}>
                            {st.pct !== null ? st.pct.toFixed(1) + "%" : "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Month by Month Tables ── */}
          <div style={{ display:"flex", flexDirection:"column", gap:32 }}>
            {monthYearList.map(({ year, month, key }) => {
              const monthRecords = records
                .filter(r => r.year === year && r.month === month)
                .sort((a, b) => a.day - b.day);

              if (monthRecords.length === 0) return null;

              const monthStats = calcStats(monthRecords, subjects);

              return (
                <div key={key}>
                  <p className="section-title" style={{ fontSize:15, fontWeight:700, color:"var(--text)", marginBottom:10 }}>
                    {MONTH_NAMES[month-1]} {year}
                  </p>

                  {/* Per-subject 75% status for this month */}
                  <div className="breakdown-wrap" style={{ marginBottom:12 }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                      <thead>
                        <tr>
                          <th style={th}>Subject</th>
                          <th style={th}>Present</th>
                          <th style={th}>Absent</th>
                          <th style={th}>%</th>
                          <th style={th}>75% Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subjects.map(s => {
                          const st = monthStats[s.id];
                          if (!st || st.total === 0) return null;
                          return (
                            <tr key={s.id}>
                              <td style={td}><span style={{ fontWeight:600 }}>{s.name}</span></td>
                              <td style={td}><span style={{ color:"var(--green)", fontWeight:500 }}>{st.present}</span></td>
                              <td style={td}><span style={{ color:"var(--red)",   fontWeight:500 }}>{st.absent}</span></td>
                              <td style={td}>
                                <span style={{ fontWeight:700, color:getColor(st.pct) }}>
                                  {st.pct !== null ? st.pct.toFixed(1) + "%" : "—"}
                                </span>
                              </td>
                              <td style={td}>
                                {st.lecturesNeeded !== null && (
                                  <span style={{ color:"var(--red)", fontSize:12 }}>Need {st.lecturesNeeded} more</span>
                                )}
                                {st.canBunk !== null && st.canBunk > 0 && (
                                  <span style={{ color:"var(--green)", fontSize:12 }}>Can skip {st.canBunk}</span>
                                )}
                                {st.pct !== null && st.pct >= TARGET && st.canBunk === 0 && (
                                  <span style={{ color:"var(--yellow)", fontSize:12 }}>Right at limit</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Raw records table for this month */}
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Date</th>
                          <th>Subject</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthRecords.map((r, i) => (
                          <tr key={r.id}>
                            <td style={{ color:"var(--text3)", width:40 }}>{i+1}</td>
                            <td style={{ fontWeight:500, whiteSpace:"nowrap" }}>{r.dateStr}</td>
                            <td style={{ fontWeight:500 }}>{r.subjectName}</td>
                            <td>
                              <span
                                className={`badge ${r.status === "present" ? "badge-green" : "badge-red"}`}
                                style={{ textTransform:"capitalize" }}>
                                {r.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

const th = {
  background:"var(--bg2)", color:"var(--text3)",
  fontSize:11, fontWeight:600,
  textTransform:"uppercase", letterSpacing:"0.06em",
  padding:"10px 14px", textAlign:"left",
  borderBottom:"1px solid var(--border)",
  whiteSpace:"nowrap",
};

const td = {
  padding:"11px 14px",
  borderBottom:"1px solid var(--border)",
  color:"var(--text)",
  verticalAlign:"middle",
};
