import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import {
  collection, addDoc, getDocs, query, where, doc, deleteDoc, onSnapshot, orderBy,
} from "firebase/firestore";

// ── Helpers ────────────────────────────────────────────────────────────────
function todayStr() {
  const d  = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function parseDate(str) {
  const [dd, mm, yyyy] = str.split("/");
  return new Date(+yyyy, +mm - 1, +dd);
}

function isValidDate(str) {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return false;
  return !isNaN(parseDate(str).getTime());
}

// DD/MM/YYYY → YYYY-MM-DD (for hidden date input)
function toInputDate(str) {
  if (!isValidDate(str)) return "";
  const [dd, mm, yyyy] = str.split("/");
  return `${yyyy}-${mm}-${dd}`;
}

// YYYY-MM-DD → DD/MM/YYYY
function fromInputDate(val) {
  if (!val) return "";
  const [yyyy, mm, dd] = val.split("-");
  return `${dd}/${mm}/${yyyy}`;
}

// ── Calendar SVG icon ──────────────────────────────────────────────────────
function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8"  y1="2" x2="8"  y2="6"/>
      <line x1="3"  y1="10" x2="21" y2="10"/>
    </svg>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function MarkAttendance({ addToast }) {
  const { currentUser } = useAuth();
  const calendarRef = useRef(null);

  const [subjects,    setSubjects]    = useState([]);
  const [dateStr,     setDateStr]     = useState(todayStr());
  const [dateRecords, setDateRecords] = useState([]);
  const [loadingDate, setLoadingDate] = useState(false);
  const [saving,      setSaving]      = useState(false);

  // selections: { [subjectId]: "present" | "absent" | null }
  // null = not selected yet (skip this subject)
  const [selections, setSelections] = useState({});

  // Load subjects list
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "users", currentUser.uid, "subjects"), orderBy("createdAt", "asc")),
      snap => setSubjects(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return unsub;
  }, [currentUser]);

  // Load saved records for the selected date
  useEffect(() => {
    if (!isValidDate(dateStr)) { setDateRecords([]); return; }
    loadDate(dateStr);
  }, [dateStr]);

  // Clear pending selections when date changes
  useEffect(() => {
    setSelections({});
  }, [dateStr]);

  async function loadDate(dStr) {
    setLoadingDate(true);
    try {
      const snap = await getDocs(query(
        collection(db, "users", currentUser.uid, "attendance"),
        where("dateStr", "==", dStr)
      ));
      setDateRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch {}
    setLoadingDate(false);
  }

  // Toggle a subject's pending selection
  // Clicking same button again deselects it (null)
  function toggle(subjectId, status) {
    setSelections(prev => ({
      ...prev,
      [subjectId]: prev[subjectId] === status ? null : status,
    }));
  }

  async function handleSave() {
    if (!isValidDate(dateStr))
      return addToast("Invalid date. Use DD/MM/YYYY format.", "error");

    const alreadySavedIds = new Set(dateRecords.map(r => r.subjectId));
    const toSave = Object.entries(selections).filter(
      ([id, status]) => status !== null && !alreadySavedIds.has(id)
    );

    if (toSave.length === 0)
      return addToast("Select Present or Absent for at least one subject.", "error");

    setSaving(true);
    const [dd, mm, yyyy] = dateStr.split("/");
    const parsedDate = parseDate(dateStr);

    try {
      await Promise.all(toSave.map(([subjectId, status]) => {
        const sub = subjects.find(s => s.id === subjectId);
        return addDoc(collection(db, "users", currentUser.uid, "attendance"), {
          subjectId,
          subjectName: sub?.name || "",
          dateStr,
          date:  parsedDate,
          day:   parseInt(dd),
          month: parseInt(mm),
          year:  parseInt(yyyy),
          status,
          createdAt: new Date(),
        });
      }));
      addToast(
        `Saved attendance for ${toSave.length} subject${toSave.length > 1 ? "s" : ""}.`,
        "success"
      );
      setSelections({});
      loadDate(dateStr);
    } catch {
      addToast("Failed to save. Please try again.", "error");
    }
    setSaving(false);
  }

  async function handleRemove(id) {
    try {
      await deleteDoc(doc(db, "users", currentUser.uid, "attendance", id));
      addToast("Record removed.", "info");
      loadDate(dateStr);
    } catch {
      addToast("Failed to remove.", "error");
    }
  }

  const savedMap     = Object.fromEntries(dateRecords.map(r => [r.subjectId, r]));
  const pendingCount = Object.values(selections).filter(v => v !== null).length;
  const presentCount = dateRecords.filter(r => r.status === "present").length;
  const absentCount  = dateRecords.filter(r => r.status === "absent").length;

  return (
    <div className="page">
      <h1 className="page-title">Mark Attendance</h1>
      <p className="page-subtitle">Select Present or Absent for each subject, then tap Save</p>

      {/* ── Date Bar ─────────────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 18, padding: "14px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>

          <span className="input-label" style={{ margin: 0, flexShrink: 0 }}>Date</span>

          {/* Text input + hidden calendar picker */}
          <div style={{ position: "relative", width: 160 }}>
            <input
              className="input"
              value={dateStr}
              onChange={e => setDateStr(e.target.value)}
              placeholder="DD/MM/YYYY"
              maxLength={10}
              style={{
                paddingRight: 34,
                borderColor: dateStr && !isValidDate(dateStr) ? "var(--red)" : undefined,
              }}
            />
            {/* Hidden native date input */}
            <input
              ref={calendarRef}
              type="date"
              value={toInputDate(dateStr)}
              onChange={e => setDateStr(fromInputDate(e.target.value))}
              style={{
                position: "absolute", opacity: 0,
                pointerEvents: "none",
                top: 0, left: 0, width: "100%", height: "100%",
              }}
            />
            {/* Calendar icon — opens native picker */}
            <button
              type="button"
              title="Open calendar"
              onClick={() => {
                if (calendarRef.current?.showPicker) calendarRef.current.showPicker();
                else calendarRef.current?.click();
              }}
              style={{
                position: "absolute", right: 8, top: "50%",
                transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer",
                color: "var(--text3)", display: "flex", alignItems: "center",
                padding: 2, transition: "color var(--transition)",
              }}
            >
              <CalendarIcon />
            </button>
          </div>

          {/* Today button */}
          <button className="btn btn-ghost btn-sm" onClick={() => setDateStr(todayStr())}>
            Today
          </button>

          {/* Validation error */}
          {dateStr && !isValidDate(dateStr) && (
            <span style={{ color: "var(--red)", fontSize: 12 }}>
              Use DD/MM/YYYY format.
            </span>
          )}

          {/* Summary — only when records exist for this date */}
          {dateRecords.length > 0 && (
            <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
              <span className="badge badge-green">{presentCount} Present</span>
              <span className="badge badge-red">{absentCount} Absent</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Subject List ──────────────────────────────────────────────────── */}
      {subjects.length === 0 ? (
        <div className="empty-state card">
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text2)", marginBottom: 6 }}>
            No subjects added yet
          </p>
          <p>Go to the Subjects page and add your subjects first.</p>
        </div>
      ) : loadingDate ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
          <div className="spinner" />
        </div>
      ) : (
        <>
          <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
            {subjects.map((s, i) => {
              const saved   = savedMap[s.id];     // already saved record in DB
              const pending = selections[s.id];   // unsaved pending selection

              return (
                <div key={s.id} style={{
                  display: "flex", alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 18px",
                  borderBottom: i < subjects.length - 1 ? "1px solid var(--border)" : "none",
                  gap: 12,
                  background: saved
                    ? (saved.status === "present"
                        ? "rgba(24,121,78,0.04)"
                        : "rgba(206,44,49,0.04)")
                    : "var(--card)",
                  transition: "background 0.12s ease",
                }}>

                  {/* Subject name */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontWeight: 600, fontSize: 14, color: "var(--text)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {s.name}
                    </p>
                    {s.teacher && (
                      <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 1 }}>
                        {s.teacher}
                      </p>
                    )}
                  </div>

                  {/* Action area */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    {saved ? (
                      // Already saved — show status badge and remove button
                      <>
                        <span
                          className={`badge ${saved.status === "present" ? "badge-green" : "badge-red"}`}
                          style={{ textTransform: "capitalize" }}>
                          {saved.status}
                        </span>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: "var(--text3)", fontSize: 12 }}
                          onClick={() => handleRemove(saved.id)}>
                          Remove
                        </button>
                      </>
                    ) : (
                      // Not yet saved — show Present / Absent toggle buttons
                      <>
                        <button
                          onClick={() => toggle(s.id, "present")}
                          style={{
                            ...toggleBtn,
                            background:  pending === "present" ? "var(--green)" : "var(--card)",
                            color:       pending === "present" ? "#fff" : "var(--text2)",
                            borderColor: pending === "present" ? "var(--green)" : "var(--border)",
                          }}>
                          Present
                        </button>
                        <button
                          onClick={() => toggle(s.id, "absent")}
                          style={{
                            ...toggleBtn,
                            background:  pending === "absent" ? "var(--red)" : "var(--card)",
                            color:       pending === "absent" ? "#fff" : "var(--text2)",
                            borderColor: pending === "absent" ? "var(--red)" : "var(--border)",
                          }}>
                          Absent
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Save Button ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={handleSave}
              disabled={saving || pendingCount === 0 || !isValidDate(dateStr)}>
              {saving
                ? "Saving..."
                : pendingCount > 0
                  ? `Save ${pendingCount} Subject${pendingCount > 1 ? "s" : ""}`
                  : "Save Attendance"}
            </button>

            {pendingCount === 0 && (
              <span style={{ fontSize: 12, color: "var(--text3)" }}>
                Select at least one subject to save.
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const toggleBtn = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "6px 14px",
  borderRadius: "var(--radius2)",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
  border: "1px solid",
  background: "var(--card)",
  fontFamily: "var(--font)",
  lineHeight: 1,
  transition: "all 0.12s ease",
};
