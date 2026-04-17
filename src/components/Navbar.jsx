import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const LINKS = [
  { to: "/subjects",  label: "Subjects" },
  { to: "/mark",      label: "Mark Attendance" },
  { to: "/table",     label: "Table" },
  { to: "/analytics", label: "Analytics" },
];

export default function Navbar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen,    setMenuOpen]    = useState(false); // mobile drawer
  const [profileOpen, setProfileOpen] = useState(false); // profile dropdown
  const profileRef = useRef(null);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleLogout() {
    setMenuOpen(false);
    setProfileOpen(false);
    await logout();
    navigate("/login");
  }

  const initials = currentUser?.displayName
    ? currentUser.displayName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : currentUser?.email?.[0]?.toUpperCase() || "U";

  const displayName = currentUser?.displayName || "";
  const email       = currentUser?.email || "";

  const linkStyle = ({ isActive }) => ({
    ...S.link, ...(isActive ? S.linkActive : {}),
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

        {/* Right: profile avatar + hamburger */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>

          {/* Profile avatar button — opens dropdown */}
          <div ref={profileRef} style={{ position: "relative" }}>
            <button
              onClick={() => setProfileOpen(v => !v)}
              style={S.avatarBtn}
              title="Account"
            >
              {initials}
            </button>

            {/* Profile dropdown */}
            {profileOpen && (
              <div style={S.dropdown}>
                {/* User info */}
                <div style={S.dropdownInfo}>
                  <div style={S.dropdownAvatar}>{initials}</div>
                  <div style={{ minWidth: 0 }}>
                    {displayName && (
                      <p style={{ fontWeight: 600, fontSize: 13, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {displayName}
                      </p>
                    )}
                    <p style={{ fontSize: 12, color: "var(--text3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {email}
                    </p>
                  </div>
                </div>

                <div style={S.dropdownDivider} />

                <button
                  onClick={handleLogout}
                  style={S.dropdownBtn}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>

          {/* Hamburger — mobile only */}
          <button
            className="nav-ham"
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Toggle menu"
          >
            <span style={S.bar} /><span style={S.bar} /><span style={S.bar} />
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {menuOpen && (
        <div style={S.drawer}>
          {LINKS.map(l => (
            <NavLink
              key={l.to} to={l.to}
              style={({ isActive }) => ({ ...S.dlink, ...(isActive ? S.dlinkActive : {}) })}
              onClick={() => setMenuOpen(false)}
            >
              {l.label}
            </NavLink>
          ))}
          <div style={S.drawerDivider} />
          {/* Email shown in mobile drawer too */}
          <p style={{ fontSize: 12, color: "var(--text3)", padding: "4px 14px" }}>{email}</p>
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
    width: 28, height: 28, background: "var(--accent)", color: "#fff",
    borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: 700, fontSize: 14,
  },
  brandName: { fontWeight: 700, fontSize: 16, color: "var(--text)", letterSpacing: "-0.01em" },
  link: {
    padding: "5px 12px", borderRadius: 6, fontSize: 13, fontWeight: 500,
    color: "var(--text2)", textDecoration: "none", transition: "all var(--transition)",
  },
  linkActive: { background: "var(--accent-light)", color: "var(--accent)" },

  // Avatar button
  avatarBtn: {
    width: 30, height: 30, borderRadius: "50%",
    background: "var(--accent)", color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 12, fontWeight: 700, flexShrink: 0,
    border: "none", cursor: "pointer",
    transition: "opacity 0.12s ease",
  },

  // Profile dropdown
  dropdown: {
    position: "absolute", top: "calc(100% + 10px)", right: 0,
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
    minWidth: 220,
    zIndex: 600,
    overflow: "hidden",
    animation: "slideUp 0.12s ease",
  },
  dropdownInfo: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "14px 14px 12px",
    minWidth: 0,
  },
  dropdownAvatar: {
    width: 34, height: 34, borderRadius: "50%",
    background: "var(--accent)", color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 13, fontWeight: 700, flexShrink: 0,
  },
  dropdownDivider: { height: 1, background: "var(--border)" },
  dropdownBtn: {
    width: "100%", padding: "11px 14px", textAlign: "left",
    background: "none", border: "none", cursor: "pointer",
    fontSize: 13, color: "var(--red)", fontWeight: 500,
    fontFamily: "var(--font)",
    transition: "background 0.1s ease",
  },

  bar: { display: "block", width: 15, height: 1.5, background: "var(--text2)", borderRadius: 2 },
  drawer: {
    position: "fixed", top: "var(--nav-h)", left: 0, right: 0,
    background: "var(--card)", borderBottom: "1px solid var(--border)",
    padding: "14px 16px",
    display: "flex", flexDirection: "column", gap: 2,
    zIndex: 499, boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
  },
  dlink: {
    padding: "10px 14px", borderRadius: "var(--radius2)",
    color: "var(--text2)", textDecoration: "none",
    fontSize: 14, fontWeight: 500, transition: "all var(--transition)",
  },
  dlinkActive: { background: "var(--accent-light)", color: "var(--accent)" },
  drawerDivider: { height: 1, background: "var(--border)", margin: "8px 0" },
};
