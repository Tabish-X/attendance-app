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

function status75(st) {
  if (!st || st.total === 0) return null;
  if (st.lecturesNeeded !== null)
    return { text: `Need ${st.lecturesNeeded} more`, color: "var(--red)" };
  if (st.canBunk !== null && st.canBunk > 0)
    return { text: `Can skip ${st.canBunk}`, color: "var(--green)" };
  if (st.pct !== null && st.pct >= TARGET && st.canBunk === 0)
    return { text: "Right at limit", color: "var(--yellow)" };
  return null;
}

// ── Percentage box ──────────────────────────────────────────────────────────
function PctBox({ label, pct, isOverall }) {
  const color = getColor(pct);
  return (
    <div style={{
      background: "var(--card)", border: "1px solid var(--border)",
      borderRadius: "var(--radius2)", padding: "12px 16px",
      minWidth: 0, flex: "1 1 110px",
      borderTop: `3px solid ${pct !== null ? color : "var(--border)"}`,
    }}>
      <p style={{
        fontSize: 11, fontWeight: 600, color: "var(--text3)",
        textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>{label}</p>
      <p style={{
        fontSize: isOverall ? 26 : 22, fontWeight: 700, lineHeight: 1,
        color: pct !== null ? color : "var(--text3)",
      }}>
        {pct !== null ? pct.toFixed(1) + "%" : "—"}
      </p>
    </div>
  );
}

// ── Month box (clickable) ───────────────────────────────────────────────────
function MonthBox({ label, pct, selected, onClick }) {
  const color = getColor(pct);
  return (
    <div onClick={onClick} style={{
      background: selected ? "var(--accent-light)" : "var(--card)",
      border: `1px solid ${selected ? "var(--accent)" : "var(--border)"}`,
      borderRadius: "var(--radius2)", padding: "10px 14px",
      flex: "1 1 90px", minWidth: 0, cursor: "pointer",
      transition: "all 0.12s ease",
    }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: selected ? "var(--accent)" : "var(--text3)", marginBottom: 4 }}>
        {label}
      </p>
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
  const [selectedKey, setSelectedKey] = useState("all"); // "all" or "YYYY-MM"

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

  // All months that have records
  const monthYearList = useMemo(() => {
    const set = new Set(records.map(r => `${r.year}-${String(r.month).padStart(2, "0")}`));
    return [...set].sort().map(key => {
      const [y, m] = key.split("-");
      return { year: parseInt(y), month: parseInt(m), key };
    });
  }, [records]);

  // Overall % per subject (all time)
  const overallStats  = useMemo(() => calcStats(records, subjects), [records, subjects]);
  const overallPresent = Object.values(overallStats).reduce((a, s) => a + s.present, 0);
  const overallTotal   = Object.values(overallStats).reduce((a, s) => a + s.total, 0);
  const overallPct     = overallTotal > 0 ? (overallPresent / overallTotal) * 100 : null;

  function monthPct(year, month) {
    const recs = records.filter(r => r.year === year && r.month === month);
    const p = recs.filter(r => r.status === "present").length;
    return recs.length > 0 ? (p / recs.length) * 100 : null;
  }

  // Records and stats for selected month (or all)
  const { filteredRecords, filteredStats, filteredLabel } = useMemo(() => {
    if (selectedKey === "all") {
      return {
        filteredRecords: records,
        filteredStats: overallStats,
        filteredLabel: "All Time",
      };
    }
    const [y, m] = selectedKey.split("-").map(Number);
    const recs = records.filter(r => r.year === y && r.month === m).sort((a, b) => a.day - b.day);
    return {
      filteredRecords: recs,
      filteredStats: calcStats(recs, subjects),
      filteredLabel: `${MONTH_NAMES[m - 1]} ${y}`,
    };
  }, [selectedKey, records, subjects, overallStats]);

  function exportCSV() {
    const rows = [["Date","Subject","Status"]];
    filteredRecords.forEach(r => rows.push([r.dateStr, r.subjectName, r.status]));
    const csv  = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `attendance${selectedKey === "all" ? "" : "-" + selectedKey}.csv`; a.click();
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
          <p className="page-subtitle">Your attendance records and statistics</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={exportCSV}>Export CSV</button>
      </div>

      {records.length === 0 ? (
        <div className="empty-state card">
          <p style={{ fontSize: 15, color: "var(--text2)" }}>
            No data yet. Start marking attendance to see records.
          </p>
        </div>
      ) : (
        <>
          {/* ── Row 1: Overall + per-subject % ── */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            <PctBox label="Overall" pct={overallPct} isOverall />
            {subjects.map(s => (
              <PctBox key={s.id} label={s.name} pct={overallStats[s.id]?.pct ?? null} />
            ))}
          </div>

          {/* ── Row 2: Monthly % boxes (click to select) ── */}
          {monthYearList.length > 0 && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
              {monthYearList.map(({ year, month, key }) => (
                <MonthBox
                  key={key}
                  label={`${MONTH_NAMES[month - 1]} ${year}`}
                  pct={monthPct(year, month)}
                  selected={selectedKey === key}
                  onClick={() => setSelectedKey(prev => prev === key ? "all" : key)}
                />
              ))}
            </div>
          )}

          {/* ── Month dropdown selector ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
            <label className="input-label" style={{ margin: 0 }}>Showing month:</label>
            <select
              className="input"
              style={{ width: "auto" }}
              value={selectedKey}
              onChange={e => setSelectedKey(e.target.value)}
            >
              <option value="all">All Time</option>
              {monthYearList.map(({ year, month, key }) => (
                <option key={key} value={key}>
                  {MONTH_NAMES[month - 1]} {year}
                </option>
              ))}
            </select>
            <span style={{ fontSize: 13, color: "var(--text3)" }}>
              {filteredRecords.length} record{filteredRecords.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* ── Per-subject stats for selected month ── */}
          <div style={{ marginBottom: 20 }}>
            <p className="section-title">{filteredLabel} — Subject Stats</p>
            <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
              {subjects.map((s, i) => {
                const st  = filteredStats[s.id] || { present: 0, absent: 0, total: 0, pct: null, lecturesNeeded: null, canBunk: null };
                const s75 = status75(st);
                const isLast = i === subjects.length - 1;
                return (
                  <div key={s.id} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 16px", flexWrap: "wrap",
                    borderBottom: isLast ? "none" : "1px solid var(--border)",
                  }}>
                    {/* Subject name + 75% status below it */}
                    <div style={{ flex: "1 1 100px", minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {s.name}
                      </p>
                      {s75 ? (
                        <p style={{ fontSize: 11, color: s75.color, fontWeight: 500, marginTop: 2 }}>{s75.text}</p>
                      ) : st.total === 0 ? (
                        <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>No records</p>
                      ) : null}
                    </div>
                    {/* Numbers */}
                    <div style={{ display: "flex", gap: 18, flexShrink: 0 }}>
                      {[
                        { label: "Present", value: st.present, color: "var(--green)" },
                        { label: "Absent",  value: st.absent,  color: "var(--red)" },
                        { label: "Attend %", value: st.pct !== null ? st.pct.toFixed(1) + "%" : "—", color: getColor(st.pct) },
                      ].map(col => (
                        <div key={col.label} style={{ textAlign: "center" }}>
                          <p style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>{col.label}</p>
                          <p style={{ fontWeight: 700, color: col.color, fontSize: 14 }}>{col.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Records table ── */}
          <div>
            <p className="section-title">{filteredLabel} — Attendance Records</p>
            {filteredRecords.length === 0 ? (
              <div className="empty-state card">
                <p>No records for {filteredLabel}.</p>
              </div>
            ) : (
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
                    {filteredRecords.map((r, i) => (
                      <tr key={r.id}>
                        <td style={{ color: "var(--text3)", width: 40 }}>{i + 1}</td>
                        <td style={{ fontWeight: 500, whiteSpace: "nowrap" }}>{r.dateStr}</td>
                        <td style={{ fontWeight: 500 }}>{r.subjectName}</td>
                        <td>
                          <span
                            className={`badge ${r.status === "present" ? "badge-green" : "badge-red"}`}
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
          </div>
        </>
      )}
    </div>
  );
}
