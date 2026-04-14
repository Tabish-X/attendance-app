import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import {
  collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, updateDoc,
} from "firebase/firestore";

const ACCENT_COLORS = [
  "#5b5bd6", "#18794e", "#ce2c31", "#946800",
  "#7c3aed", "#0891b2", "#db2777", "#65a30d",
];

export default function Subjects({ addToast }) {
  const { currentUser } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editSubject, setEditSubject] = useState(null);
  const [form, setForm] = useState({ name: "", teacher: "" });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    const q = query(
      collection(db, "users", currentUser.uid, "subjects"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, snap => {
      setSubjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [currentUser]);

  function openAdd() {
    setEditSubject(null);
    setForm({ name: "", teacher: "" });
    setShowModal(true);
  }

  function openEdit(s) {
    setEditSubject(s);
    setForm({ name: s.name, teacher: s.teacher || "" });
    setShowModal(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const data = { name: form.name.trim(), teacher: form.teacher.trim() };
      if (editSubject) {
        await updateDoc(doc(db, "users", currentUser.uid, "subjects", editSubject.id), data);
        addToast("Subject updated.", "success");
      } else {
        await addDoc(collection(db, "users", currentUser.uid, "subjects"), {
          ...data, createdAt: new Date(),
        });
        addToast("Subject added.", "success");
      }
      setShowModal(false);
    } catch {
      addToast("Failed to save. Please try again.", "error");
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    try {
      await deleteDoc(doc(db, "users", currentUser.uid, "subjects", id));
      addToast("Subject deleted.", "info");
      setDeleteConfirm(null);
    } catch {
      addToast("Failed to delete.", "error");
    }
  }

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Subjects</h1>
          <p className="page-subtitle">Add and manage your subjects</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Subject</button>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
          <div className="spinner" />
        </div>
      ) : subjects.length === 0 ? (
        <div className="empty-state card">
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text2)", marginBottom: 6 }}>No subjects added yet</p>
          <p style={{ marginBottom: 20 }}>Add your first subject to start tracking attendance.</p>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Subject</button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: 12 }}>
          {subjects.map((s, i) => {
            const color = ACCENT_COLORS[i % ACCENT_COLORS.length];
            return (
              <div key={s.id} className="card"
                style={{ borderLeft: `3px solid ${color}`, padding: "16px 18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontWeight: 600, fontSize: 15, marginBottom: 4, color: "var(--text)" }}>
                      {s.name}
                    </h3>
                    {s.teacher && (
                      <p style={{ color: "var(--text3)", fontSize: 13 }}>{s.teacher}</p>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0, marginLeft: 10 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(s)}>Delete</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">{editSubject ? "Edit Subject" : "Add Subject"}</h2>
            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="input-label">Subject Name *</label>
                <input className="input" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Data Structures"
                  required autoFocus />
              </div>
              <div>
                <label className="input-label">Teacher / Professor</label>
                <input className="input" value={form.teacher}
                  onChange={e => setForm(f => ({ ...f, teacher: e.target.value }))}
                  placeholder="e.g. Dr. Sharma" />
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button className="btn btn-ghost w-full" type="button" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary w-full" type="submit" disabled={saving}>
                  {saving ? "Saving..." : editSubject ? "Update" : "Add Subject"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Delete Subject?</h2>
            <p style={{ color: "var(--text2)", marginBottom: 6, fontSize: 14 }}>
              You are about to delete{" "}
              <strong style={{ color: "var(--text)" }}>{deleteConfirm.name}</strong>.
            </p>
            <p style={{ color: "var(--text3)", fontSize: 13, marginBottom: 22 }}>
              All attendance records for this subject will also be removed. This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-ghost w-full" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger w-full" onClick={() => handleDelete(deleteConfirm.id)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}