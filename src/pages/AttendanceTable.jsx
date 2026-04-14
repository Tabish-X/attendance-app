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
  if (pct === null) return "var(--text3)";
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
    stats[s.id] = { present, absent, total, pct, lecturesNeeded, canBunk, subject: s };
  });
  return stats;
}

export default function AttendanceTable({ addToast }) {
  const { currentUser } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const [viewMode,     setViewMode]     = useState("combined");
  const [filterMonth,  setFilterMonth]  = useState("all");
  const [filterYear,   setFilterYear]   = useState("all");
  const [filterSubject,setFilterSubject]= useState("all");
  const [sortDir,      setSortDir]      = useState("asc");

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

  const years = useMemo(() => [...new Set(records.map(r => r.year))].sort(), [records]);

  const monthYearList = useMemo(() => {
    const set = new Set(records.map(r => `${r.year}-${String(r.month).padStart(2, "0")}`));
    return [...set].sort().map(key => {
      const [y, m] = key.split("-");
      return { year: parseInt(y), month: parseInt(m), key };
    });
  }, [records]);

  const filteredRecords = useMemo(() => {
    let r = [...records];
    if (filterMonth   !== "all") r = r.filter(x => x.month     === parseInt(filterMonth));
    if (filterYear    !== "all") r = r.filter(x => x.year      === parseInt(filterYear));
    if (filterSubject !== "all") r = r.filter(x => x.subjectId === filterSubject);
    if (sortDir === "desc") r = [...r].reverse();
    return r;
  }, [records, filterMonth, filterYear, filterSubject, sortDir]);

  const overallStats = useMemo(() => calcStats(filteredRecords, subjects), [filteredRecords, subjects]);

  const overallPresent = Object.values(overallStats).reduce((a, s) => a + s.present, 0);
  const overallTotal   = Object.values(overallStats).reduce((a, s) => a + s.total, 0);
  const overallPct     = overallTotal > 0 ? (overallPresent / overallTotal) * 100 : null;
  const overallNeeded  = overallPct !== null && overallPct < TARGET
    ? Math.ceil((TARGET * overallTotal - 100 * overallPresent) / (100 - TARGET)) : null;
  const overallCanBunk = overallPct !== null && overallPct >= TARGET
    ? Math.floor((100 * overallPresent / TARGET) - overallTotal) : null;

  function exportCSV() {
    const rows = [["Date", "Subject", "Status"]];
    filteredRecords.forEach(r => rows.push([r.dateStr, r.subjectName, r.status]));
    const csv  = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "attendance.csv"; a.click();
    URL.revokeObjectURL(url);
    addToast("CSV exported.", "success");
  }

  if (loading) return (
    <div className="page" style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Attendance Table</h1>
          <p className="page-subtitle">View, filter, and analyze your attendance records</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={exportCSV}>Export CSV</button>
      </div>

      {/* Overall Summary Banner */}
      <div className="card" style={{ marginBottom: 18, borderLeft: `4px solid ${getColor(overallPct)}` }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 20, alignItems: "start" }}>
          <div>
            <p style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
              Overall Attendance
            </p>
            <p style={{ fontSize: 32, fontWeight: 700, color: overallPct !== null ? getColor(overallPct) : "var(--text3)", lineHeight: 1 }}>
              {overallPct !== null ? overallPct.toFixed(2) + "%" : "—"}
            </p>
            <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>
              {overallPresent} present / {overallTotal} total
            </p>
            {overallTotal > 0 && (
              <div className="progress-bar" style={{ marginTop: 8 }}>
                <div className="progress-fill" style={{ width: `${Math.min(overallPct || 0, 100)}%`, background: getColor(overallPct) }} />
              </div>
            )}
          </div>

          {overallNeeded !== null && (
            <div style={statusBox("var(--red-light)", "#ffc5c7")}>
              <p style={{ fontSize: 11, color: "var(--red)", fontWeight: 600, marginBottom: 4 }}>Need to attend</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: "var(--red)", lineHeight: 1 }}>{overallNeeded} more</p>
              <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>lectures to reach 75%</p>
            </div>
          )}

          {overallCanBunk !== null && overallCanBunk > 0 && (
            <div style={statusBox("var(--green-light)", "#b4e8d2")}>
              <p style={{ fontSize: 11, color: "var(--green)", fontWeight: 600, marginBottom: 4 }}>Can skip</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: "var(--green)", lineHeight: 1 }}>{overallCanBunk} more</p>
              <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>and stay above 75%</p>
            </div>
          )}

          {overallPct !== null && overallPct >= TARGET && overallCanBunk === 0 && (
            <div style={statusBox("var(--yellow-light)", "#fde68a")}>
              <p style={{ fontSize: 11, color: "var(--yellow)", fontWeight: 600 }}>Right at the limit</p>
              <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>Attend all upcoming classes.</p>
            </div>
          )}
        </div>
      </div>

      {/* Per Subject Cards */}
      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
        {subjects.map(s => {
          const st = overallStats[s.id] || { present: 0, absent: 0, total: 0, pct: null, lecturesNeeded: null, canBunk: null };
          return (
            <div key={s.id} className="card" style={{ padding: "14px 16px" }}>
              <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {s.name}
              </p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: st.pct !== null ? getColor(st.pct) : "var(--text3)" }}>
                  {st.pct !== null ? st.pct.toFixed(2) + "%" : "—"}
                </span>
                <span style={{ color: "var(--text3)", fontSize: 12 }}>{st.present}/{st.total}</span>
              </div>
              {st.total > 0 && (
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${Math.min(st.pct || 0, 100)}%`, background: getColor(st.pct) }} />
                </div>
              )}
              <div style={{ marginTop: 8, fontSize: 12 }}>
                {st.lecturesNeeded !== null && <span style={{ color: "var(--red)" }}>Need {st.lecturesNeeded} more to reach 75%</span>}
                {st.canBunk !== null && st.canBunk > 0 && <span style={{ color: "var(--green)" }}>Can skip {st.canBunk} lectures</span>}
                {st.pct !== null && st.pct >= TARGET && st.canBunk === 0 && <span style={{ color: "var(--yellow)" }}>Right at the 75% limit</span>}
                {st.total === 0 && <span style={{ color: "var(--text3)" }}>No records yet</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* View Mode Toggle */}
      <div className="tab-bar">
        <button className={`tab ${viewMode === "combined" ? "active" : ""}`} onClick={() => setViewMode("combined")}>Combined View</button>
        <button className={`tab ${viewMode === "monthly"  ? "active" : ""}`} onClick={() => setViewMode("monthly")}>Month by Month</button>
      </div>

      {/* COMBINED VIEW */}
      {viewMode === "combined" && (
        <>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
            <select className="input" style={{ width: "auto" }} value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
              <option value="all">All Months</option>
              {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select className="input" style={{ width: "auto" }} value={filterYear} onChange={e => setFilterYear(e.target.value)}>
              <option value="all">All Years</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select className="input" style={{ width: "auto" }} value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
              <option value="all">All Subjects</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button className="btn btn-ghost btn-sm" onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}>
              Date {sortDir === "asc" ? "(Oldest first)" : "(Newest first)"}
            </button>
            <span style={{ color: "var(--text3)", fontSize: 13, marginLeft: "auto" }}>
              {filteredRecords.length} record{filteredRecords.length !== 1 ? "s" : ""}
            </span>
          </div>

          {filteredRecords.length === 0 ? (
            <div className="empty-state card"><p>No records found for the selected filters.</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th><th>Date</th><th>Subject</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((r, i) => (
                    <tr key={r.id}>
                      <td style={{ color: "var(--text3)", width: 44 }}>{i + 1}</td>
                      <td style={{ fontWeight: 500, whiteSpace: "nowrap" }}>{r.dateStr}</td>
                      <td style={{ fontWeight: 500 }}>{r.subjectName}</td>
                      <td>
                        <span className={`badge ${r.status === "present" ? "badge-green" : "badge-red"}`}
                          style={{ textTransform: "capitalize" }}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* MONTHLY VIEW */}
      {viewMode === "monthly" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {monthYearList.length === 0 ? (
            <div className="empty-state card"><p>No records yet to show month-by-month data.</p></div>
          ) : (
            monthYearList.map(({ year, month, key }) => {
              const monthRecords = records.filter(r => r.year === year && r.month === month);
              const monthStats   = calcStats(monthRecords, subjects);
              const mPresent     = Object.values(monthStats).reduce((a, s) => a + s.present, 0);
              const mTotal       = Object.values(monthStats).reduce((a, s) => a + s.total, 0);
              const mPct         = mTotal > 0 ? (mPresent / mTotal) * 100 : null;

              return (
                <div key={key}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <h2 style={{ fontSize: 17, fontWeight: 700 }}>{MONTH_NAMES[month - 1]} {year}</h2>
                      {mPct !== null && (
                        <span style={{ fontSize: 14, fontWeight: 600, color: getColor(mPct) }}>{mPct.toFixed(2)}%</span>
                      )}
                    </div>
                    <span style={{ color: "var(--text3)", fontSize: 13 }}>{mPresent} present / {mTotal} total</span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10, marginBottom: 14 }}>
                    {subjects.map(s => {
                      const st = monthStats[s.id];
                      if (!st || st.total === 0) return null;
                      return (
                        <div key={s.id} style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "var(--radius2)", padding: "11px 14px" }}>
                          <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</p>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                            <span style={{ fontWeight: 700, fontSize: 18, color: st.pct !== null ? getColor(st.pct) : "var(--text3)" }}>
                              {st.pct !== null ? st.pct.toFixed(2) + "%" : "—"}
                            </span>
                            <span style={{ fontSize: 12, color: "var(--text3)" }}>{st.present}/{st.total}</span>
                          </div>
                          <div className="progress-bar" style={{ marginTop: 6 }}>
                            <div className="progress-fill" style={{ width: `${Math.min(st.pct || 0, 100)}%`, background: getColor(st.pct) }} />
                          </div>
                          <div style={{ marginTop: 6, fontSize: 11 }}>
                            {st.lecturesNeeded !== null && <span style={{ color: "var(--red)" }}>Need {st.lecturesNeeded} more for 75%</span>}
                            {st.canBunk !== null && st.canBunk > 0 && <span style={{ color: "var(--green)" }}>Can skip {st.canBunk}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr><th>#</th><th>Date</th><th>Subject</th><th>Status</th></tr>
                      </thead>
                      <tbody>
                        {monthRecords.map((r, i) => (
                          <tr key={r.id}>
                            <td style={{ color: "var(--text3)", width: 44 }}>{i + 1}</td>
                            <td style={{ fontWeight: 500, whiteSpace: "nowrap" }}>{r.dateStr}</td>
                            <td style={{ fontWeight: 500 }}>{r.subjectName}</td>
                            <td>
                              <span className={`badge ${r.status === "present" ? "badge-green" : "badge-red"}`}
                                style={{ textTransform: "capitalize" }}>
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
            })
          )}
        </div>
      )}
    </div>
  );
}

function statusBox(bg, border) {
  return {
    background: bg, border: `1px solid ${border}`,
    borderRadius: "var(--radius2)", padding: "12px 14px",
  };
}