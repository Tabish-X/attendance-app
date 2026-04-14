import { Navigate, BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import { Toast, useToast } from "./components/Toast";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import Subjects from "./pages/Subjects";
import MarkAttendance from "./pages/MarkAttendance";
import AttendanceTable from "./pages/AttendanceTable";
import Analytics from "./pages/Analytics";

// PrivateRoute inlined — no separate file needed
function Private({ children }) {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  const { currentUser } = useAuth();
  const { toasts, addToast } = useToast();

  return (
    <>
      {currentUser && <Navbar />}
      <Routes>
        <Route path="/login"          element={currentUser ? <Navigate to="/subjects" /> : <Login addToast={addToast} />} />
        <Route path="/signup"         element={currentUser ? <Navigate to="/subjects" /> : <Signup addToast={addToast} />} />
        <Route path="/forgot-password" element={currentUser ? <Navigate to="/subjects" /> : <ForgotPassword addToast={addToast} />} />
        <Route path="/subjects"  element={<Private><Subjects addToast={addToast} /></Private>} />
        <Route path="/mark"      element={<Private><MarkAttendance addToast={addToast} /></Private>} />
        <Route path="/table"     element={<Private><AttendanceTable addToast={addToast} /></Private>} />
        <Route path="/analytics" element={<Private><Analytics addToast={addToast} /></Private>} />
        <Route path="*" element={<Navigate to={currentUser ? "/subjects" : "/login"} />} />
      </Routes>
      <Toast toasts={toasts} />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}