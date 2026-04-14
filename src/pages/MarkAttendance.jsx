import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import {
  collection, addDoc, getDocs, query, where, doc, deleteDoc, onSnapshot, orderBy,
} from "firebase/firestore";

function todayStr() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function parseDate(str) {
  const [dd, mm, yyyy] = str.split("/");
  return new Date(+yyyy, +mm - 1, +dd);
}

function isValidDate(str) {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return false;
  return !isNaN(parseDate(str).getTime());
}

export default function MarkAttendance({ addToast }) {
  const { currentUser } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [dateStr, setDateStr] = useState(todayStr());
  const [selectedSubject, setSelectedSubject] = useState("");
  const [status, setStatus] = useState("present");
  const [saving, setSaving] = useState(false);
  const [dateRecords, setDateRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "users", currentUser.uid, "subjects"), orderBy("createdAt", "asc")),
      snap => {
        const s = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setSubjects(s);
        if (s.length && !selectedSubject) setSelectedSubject(s[0].id);
      }
    );
    return unsub;
  }, [currentUser]);

  useEffect(() => {
    if (!isValidDate(dateStr)) return;
    loadRecordsForDate(dateStr);
  }, [dateStr]);

  async function loadRecordsForDate(dStr) {
    setLoadingRecords(true);
    try {
      const snap = await getDocs(query(
        collection(db, "users", currentUser.uid, "attendance"),
        where("dateStr", "==", dStr)
      ));
      setDateRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch {}
    setLoadingRecords(false);
  }

  async function handleSave() {
    if (!selectedSubject) return addToast("Please select a subject.", "error");
    if (!isValidDate(dateStr)) return addToast("Invalid date. Use DD/MM/YYYY format.", "error");
    const sub = subjects.find(s => s.id === selectedSubject);
    const existing = dateRecords.find(r => r.subjectId === selectedSubject);
    if (existing) return addToast(`Attendance already marked for ${sub?.name} on ${dateStr}.`, "error");

    setSaving(true);
    try {
      const parsedDate = parseDate(dateStr);
      const [dd, mm, yyyy] = dateStr.split("/");
      await addDoc(collection(db, "users", currentUser.uid, "attendance"), {
        subjectId: selectedSubject,
        subjectName: sub?.name || "",
        dateStr,
        date: parsedDate,
        day: parseInt(dd),
        month: parseInt(mm),
        year: parseInt(yyyy),
        status,
        createdAt: new Date(),
      });
      addToast(`Marked ${status} for ${sub?.name}.`, "success");
      loadRecordsForDate(dateStr);
    } catch {
      addToast("Failed to save. Please try again.", "error");
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    try {
      await deleteDoc(doc(db, "users", currentUser.uid, "attendance", id));
      addToast("Record removed.", "info");
      loadRecordsForDate(dateStr);
    } catch {
      addToast("Failed to delete.", "error");
    }
  }

  const markedSubjectIds = new Set(dateRecords.map(r => r.subjectId));
  const unmarkedSubjects = subjects.filter(s => !markedSubjectIds.has(s.id));
  const presentCount = dateRecords.filter(r => r.status === "present").length;
  const absentCount  = dateRecords.filter(r => r.status === "absent").length;

  return (
    <div className="page">
      <h1 className="page-title">Mark Attendance</h1>
      <p className="page-subtitle">Record your attendance for any date</p>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 18 }}>

        {/* Left — Form */}
        <div className="card">
          <p className="section-title">Record Attendance</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Date */}
            <div>
              <label className="input-label">Date</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input className="input" value={dateStr}
                  onChange={e => setDateStr(e.target.value)}
                  placeholder="DD/MM/YYYY" maxLength={10}
                  style={{ borderColor: dateStr && !isValidDate(dateStr) ? "var(--red)" : undefined }}
                />
                <button className="btn btn-ghost" style={{ whiteSpace: "nowrap" }} onClick={() => setDateStr(todayStr())}>
                  Today
                </button>
              </div>
              {dateStr && !isValidDate(dateStr) && (
                <p style={{ color: "var(--red)", fontSize: 12, marginTop: 5 }}>
                  Please enter a valid date in DD/MM/YYYY format.
                </p>
              )}
            </div>

            {/* Subject */}
            <div>
              <label className="input-label">Subject</label>
              {subjects.length === 0 ? (
                <p style={{ color: "var(--text3)", fontSize: 13 }}>
                  No subjects added yet. Please add subjects first.
                </p>
              ) : (
                <select className="input" value={selectedSubject}
                  onChange={e => setSelectedSubject(e.target.value)}>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="input-label">Status</label>
              <div style={{ display: "flex", gap: 8 }}>
                {["present", "absent"].map(s => (
                  <button key={s} className="btn" onClick={() => setStatus(s)}
                    style={{
                      flex: 1, fontWeight: 500,
                      background: status === s
                        ? (s === "present" ? "var(--green)" : "var(--red)")
                        : "var(--card)",
                      color: status === s ? "#fff" : "var(--text2)",
                      border: `1px solid ${status === s
                        ? (s === "present" ? "var(--green)" : "var(--red)")
                        : "var(--border)"}`,
                      textTransform: "capitalize",
                    }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <button className="btn btn-primary btn-lg" onClick={handleSave}
              disabled={saving || !selectedSubject || !isValidDate(dateStr)}>
              {saving ? "Saving..." : "Save Attendance"}
            </button>
          </div>
        </div>

        {/* Right — Records for selected date */}
        <div className="card">
          <p className="section-title">
            Records — {isValidDate(dateStr) ? dateStr : "enter a valid date"}
          </p>

          {/* Summary */}
          {dateRecords.length > 0 && (
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              {[
                { label: "Present", count: presentCount, bg: "var(--green-light)", color: "var(--green)" },
                { label: "Absent",  count: absentCount,  bg: "var(--red-light)",   color: "var(--red)" },
              ].map(({ label, count, bg, color }) => (
                <div key={label} style={{ flex: 1, background: bg, border: `1px solid ${color}22`, borderRadius: "var(--radius2)", padding: "10px 14px", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <span style={{ fontSize: 20, fontWeight: 700, color }}>{count}</span>
                  <span style={{ fontSize: 12, color: "var(--text3)" }}>{label}</span>
                </div>
              ))}
            </div>
          )}

          {loadingRecords ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
              <div className="spinner" />
            </div>
          ) : dateRecords.length === 0 ? (
            <div className="empty-state" style={{ padding: "30px 0" }}>
              <p>No records for this date yet.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {dateRecords.map(r => (
                <div key={r.id} style={recRow}>
                  <p style={{ fontWeight: 500, fontSize: 14 }}>{r.subjectName}</p>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span className={`badge ${r.status === "present" ? "badge-green" : "badge-red"}`}
                      style={{ textTransform: "capitalize" }}>
                      {r.status}
                    </span>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r.id)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Unmarked subjects quick-select */}
          {isValidDate(dateStr) && unmarkedSubjects.length > 0 && dateRecords.length > 0 && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
              <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 8 }}>Not yet marked:</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {unmarkedSubjects.map(s => (
                  <button key={s.id} className="chip" style={{ cursor: "pointer" }}
                    onClick={() => setSelectedSubject(s.id)}>
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const recRow = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  background: "var(--bg)", border: "1px solid var(--border)",
  borderRadius: "var(--radius2)", padding: "10px 13px",
};