import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const LINKS = [
  { to: "/subjects", label: "Subjects" },
  { to: "/mark",     label: "Mark Attendance" },
  { to: "/table",    label: "Table" },
  { to: "/analytics",label: "Analytics" },
];

function EyeIcon() { /* reused as hamburger icon */ }

export default function Navbar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    setOpen(false);
    await logout();
    navigate("/login");
  }

  const initials = currentUser?.displayName
    ? currentUser.displayName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : currentUser?.email?.[0]?.toUpperCase() || "U";

  const linkStyle = ({ isActive }) => ({
    ...S.link,
    ...(isActive ? S.linkActive : {}),
  });

  return (
    <>
      <nav style={S.nav}>
        {/* Brand */}
        <div style={S.brand}>
          <div style={S.logo}>A</div>
          <span style={S.brandName}>AttendEase</span>
        </div>

        {/* Desktop links */}
        <div className="nav-links-desktop">
          {LINKS.map(l => (
            <NavLink key={l.to} to={l.to} style={linkStyle}>{l.label}</NavLink>
          ))}
        </div>

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={S.userRow}>
            <div style={S.avatar}>{initials}</div>
            <span className="nav-user-name">
              {currentUser?.displayName || currentUser?.email}
            </span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
            Sign out
          </button>
          <button className="nav-ham" onClick={() => setOpen(v => !v)} aria-label="Toggle menu">
            <span style={S.bar} /><span style={S.bar} /><span style={S.bar} />
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div style={S.drawer}>
          {LINKS.map(l => (
            <NavLink key={l.to} to={l.to}
              style={({ isActive }) => ({ ...S.dlink, ...(isActive ? S.dlinkActive : {}) })}
              onClick={() => setOpen(false)}>
              {l.label}
            </NavLink>
          ))}
          <div style={S.drawerDivider} />
          <button className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }} onClick={handleLogout}>
            Sign out
          </button>
        </div>
      )}
    </>
  );
}

const S = {
  nav: {
    position: "fixed", top: 0, left: 0, right: 0,
    height: "var(--nav-h)",
    background: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(12px)",
    borderBottom: "1px solid var(--border)",
    display: "flex", alignItems: "center",
    padding: "0 24px",
    justifyContent: "space-between",
    zIndex: 500,
  },
  brand: { display: "flex", alignItems: "center", gap: 9, flexShrink: 0 },
  logo: {
    width: 28, height: 28,
    background: "var(--accent)", color: "#fff",
    borderRadius: 6,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: 700, fontSize: 14,
  },
  brandName: { fontWeight: 700, fontSize: 16, color: "var(--text)", letterSpacing: "-0.01em" },
  link: {
    padding: "5px 12px", borderRadius: 6,
    fontSize: 13, fontWeight: 500,
    color: "var(--text2)", textDecoration: "none",
    transition: "all var(--transition)",
  },
  linkActive: { background: "var(--accent-light)", color: "var(--accent)" },
  userRow: { display: "flex", alignItems: "center", gap: 8 },
  avatar: {
    width: 26, height: 26, borderRadius: "50%",
    background: "var(--accent)", color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 11, fontWeight: 600, flexShrink: 0,
  },
  bar: { display: "block", width: 15, height: 1.5, background: "var(--text2)", borderRadius: 2 },
  drawer: {
    position: "fixed", top: "var(--nav-h)", left: 0, right: 0,
    background: "var(--card)", borderBottom: "1px solid var(--border)",
    padding: "14px 16px",
    display: "flex", flexDirection: "column", gap: 2,
    zIndex: 499,
    boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
  },
  dlink: {
    padding: "10px 14px", borderRadius: "var(--radius2)",
    color: "var(--text2)", textDecoration: "none",
    fontSize: 14, fontWeight: 500,
    transition: "all var(--transition)",
  },
  dlinkActive: { background: "var(--accent-light)", color: "var(--accent)" },
  drawerDivider: { height: 1, background: "var(--border)", margin: "8px 0" },
};