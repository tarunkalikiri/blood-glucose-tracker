import { useEffect, useState } from "react";
import {
  Activity,
  HeartPulse,
  LayoutDashboard,
  Plus,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  BarChart3,
  LogOut,
  Pencil,
  Trash2,
  X,
  Droplets,
  Clock,
  User,
  Lock,
  Mail,
  Menu
} from "lucide-react";

import api from "./services/api";
import "./App.css";

const SLOTS = [
  "Morning",
  "After breakfast",
  "After lunch",
  "After dinner"
];

const getToday = () => {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
};

function App() {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem("sweety_token");
    const savedUser = localStorage.getItem("sweety_user");

    if (!token || !savedUser) return null;

    try {
      return JSON.parse(savedUser);
    } catch {
      localStorage.removeItem("sweety_token");
      localStorage.removeItem("sweety_user");
      return null;
    }
  });

  const [isLogin, setIsLogin] = useState(true);
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: ""
  });

  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const [selectedDate, setSelectedDate] = useState(getToday());
  const [readings, setReadings] = useState([]);
  const [summary, setSummary] = useState({
    count: 0,
    highest: null,
    lowest: null,
    average: null
  });

  const [reportType, setReportType] = useState("daily");
  const [loadingData, setLoadingData] = useState(false);
  const [pageError, setPageError] = useState("");

  const [readingForm, setReadingForm] = useState({
    reading_date: getToday(),
    time_slot: "Morning",
    value: ""
  });

  const [editingId, setEditingId] = useState(null);
  const [savingReading, setSavingReading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // AUTHENTICATION
  const handleAuthChange = (e) => {
    setAuthForm({
      ...authForm,
      [e.target.name]: e.target.value
    });
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();

    setAuthError("");
    setAuthLoading(true);

    try {
      if (!isLogin) {
        await api.post("/auth/register", {
          name: authForm.name,
          email: authForm.email,
          password: authForm.password
        });
      }

      const response = await api.post("/auth/login", {
        email: authForm.email,
        password: authForm.password
      });

      const { token, user: loggedInUser } = response.data;

      localStorage.setItem("sweety_token", token);
      localStorage.setItem("sweety_user", JSON.stringify(loggedInUser));

      setUser(loggedInUser);
    } catch (error) {
      setAuthError(
        error.response?.data?.message ||
        "Unable to authenticate. Please try again."
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("sweety_token");
    localStorage.removeItem("sweety_user");

    setUser(null);
    setReadings([]);
    setSummary({
      count: 0,
      highest: null,
      lowest: null,
      average: null
    });
  };

  // LOAD DASHBOARD DATA
  const loadDashboardData = async () => {
    setLoadingData(true);
    setPageError("");

    try {
      const reportEndpoints = {
        daily: `/reports/daily?date=${selectedDate}`,
        "month-to-date": `/reports/month-to-date?date=${selectedDate}`,
        "previous-month": `/reports/previous-month?date=${selectedDate}`
      };

      const [readingsResponse, reportResponse] = await Promise.all([
        api.get("/readings"),
        api.get(reportEndpoints[reportType])
      ]);

      setReadings(readingsResponse.data.readings || []);
      setSummary(reportResponse.data.summary || {
        count: 0,
        highest: null,
        lowest: null,
        average: null
      });
    } catch (error) {
      if (error.response?.status === 401) {
        handleLogout();
        return;
      }

      setPageError(
        error.response?.data?.message ||
        "Unable to load dashboard data."
      );
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user, selectedDate, reportType]);

  // READING FORM
  const handleReadingChange = (e) => {
    setReadingForm({
      ...readingForm,
      [e.target.name]: e.target.value
    });
  };

  const resetReadingForm = () => {
    setReadingForm({
      reading_date: selectedDate,
      time_slot: "Morning",
      value: ""
    });

    setEditingId(null);
    setFormError("");
    setFormSuccess("");
    setShowForm(false);
  };

  const handleReadingSubmit = async (e) => {
    e.preventDefault();

    setFormError("");
    setFormSuccess("");

    const value = Number(readingForm.value);

    if (!Number.isInteger(value) || value < 40 || value > 600) {
      setFormError("Enter a whole number between 40 and 600.");
      return;
    }

    setSavingReading(true);

    try {
      if (editingId) {
        await api.put(`/readings/${editingId}`, {
          ...readingForm,
          value
        });

        setFormSuccess("Reading updated successfully.");
      } else {
        await api.post("/readings", {
          ...readingForm,
          value
        });

        setFormSuccess("Reading added successfully.");
      }

      setSelectedDate(readingForm.reading_date);
      setReportType("daily");

      await loadDashboardData();

      setReadingForm({
        reading_date: readingForm.reading_date,
        time_slot: "Morning",
        value: ""
      });

      setEditingId(null);
      setShowForm(false);
    } catch (error) {
      setFormError(
        error.response?.data?.message ||
        "Unable to save reading."
      );
    } finally {
      setSavingReading(false);
    }
  };

  const handleEdit = (reading) => {
    setReadingForm({
      reading_date: reading.reading_date,
      time_slot: reading.time_slot,
      value: String(reading.value)
    });

    setEditingId(reading.id);
    setFormError("");
    setFormSuccess("");
    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this glucose reading?"
    );

    if (!confirmed) return;

    try {
      await api.delete(`/readings/${id}`);
      await loadDashboardData();
    } catch (error) {
      alert(
        error.response?.data?.message ||
        "Unable to delete reading."
      );
    }
  };

  const displayedReadings = [...readings].sort((a, b) => {
    return (
      b.reading_date.localeCompare(a.reading_date) ||
      SLOTS.indexOf(a.time_slot) - SLOTS.indexOf(b.time_slot)
    );
  });

  // LOGIN / REGISTRATION SCREEN
  if (!user) {
    return (
      <div className="auth-page">
        <div className="auth-container">

          <div className="auth-brand">
            <div className="brand-icon">
              <HeartPulse size={28} />
            </div>

            <h1>Sweety</h1>
            <p>Blood Glucose Tracker</p>
          </div>

          <div className="auth-content">
            <div className="welcome-section">
              <div className="welcome-icon">
                <Activity size={25} />
              </div>

              <h2>
                {isLogin ? "Welcome back!" : "Create your account"}
              </h2>

              <p>
                {isLogin
                  ? "Sign in to manage and monitor your glucose readings."
                  : "Start tracking your blood glucose and taking control of your health."}
              </p>
            </div>

            <div className="auth-tabs">
              <button
                className={isLogin ? "active" : ""}
                onClick={() => {
                  setIsLogin(true);
                  setAuthError("");
                }}
                type="button"
              >
                Sign In
              </button>

              <button
                className={!isLogin ? "active" : ""}
                onClick={() => {
                  setIsLogin(false);
                  setAuthError("");
                }}
                type="button"
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleAuthSubmit}>
              {!isLogin && (
                <div className="form-group">
                  <label>Full Name</label>

                  <div className="input-wrapper">
                    <User size={18} />
                    <input
                      type="text"
                      name="name"
                      placeholder="Enter your full name"
                      value={authForm.name}
                      onChange={handleAuthChange}
                      required
                      maxLength={100}
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Email Address</label>

                <div className="input-wrapper">
                  <Mail size={18} />
                  <input
                    type="email"
                    name="email"
                    placeholder="you@example.com"
                    value={authForm.email}
                    onChange={handleAuthChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Password</label>

                <div className="input-wrapper">
                  <Lock size={18} />
                  <input
                    type="password"
                    name="password"
                    placeholder="Enter your password"
                    value={authForm.password}
                    onChange={handleAuthChange}
                    required
                    minLength={8}
                  />
                </div>
              </div>

              {authError && (
                <div className="message error-message">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                className="submit-button"
                disabled={authLoading}
              >
                {authLoading
                  ? "Please wait..."
                  : isLogin
                    ? "Sign In"
                    : "Create Account"}
              </button>
            </form>

            <p className="auth-footer">
              {isLogin
                ? "Don't have an account?"
                : "Already have an account?"}

              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setAuthError("");
                }}
              >
                {isLogin ? "Create account" : "Sign in"}
              </button>
            </p>
          </div>

          <div className="auth-bottom">
            <span>© 2026 Sweety</span>
            <span>Track better. Live healthier.</span>
          </div>
        </div>
      </div>
    );
  }

  // MAIN DASHBOARD
  return (
    <div className="dashboard">

      <aside className={`sidebar ${mobileMenuOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <HeartPulse size={24} />
          </div>

          <div>
            <h2>Sweety</h2>
            <span>Glucose Tracker</span>
          </div>
        </div>

        <div className="sidebar-section-label">MENU</div>

        <button className="sidebar-link active">
          <LayoutDashboard size={19} />
          Dashboard
        </button>

        <button
          className="sidebar-link"
          onClick={() => {
            setShowForm(true);
            setMobileMenuOpen(false);
          }}
        >
          <Plus size={19} />
          Add Reading
        </button>

        <div className="sidebar-section-label">ACCOUNT</div>

        <div className="sidebar-user">
          <div className="user-avatar">
            {user.name?.charAt(0)?.toUpperCase() || "U"}
          </div>

          <div className="user-details">
            <strong>{user.name}</strong>
            <span>{user.email}</span>
          </div>
        </div>

        <button className="sidebar-link logout-link" onClick={handleLogout}>
          <LogOut size={19} />
          Logout
        </button>

        <div className="sidebar-bottom">
          <HeartPulse size={17} />
          <span>Take care of yourself.</span>
        </div>
      </aside>

      {mobileMenuOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <main className="main-content">

        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-menu-button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu size={22} />
            </button>

            <div>
              <span className="topbar-subtitle">YOUR HEALTH OVERVIEW</span>
              <h1>Dashboard</h1>
            </div>
          </div>

          <div className="topbar-profile">
            <div className="topbar-avatar">
              {user.name?.charAt(0)?.toUpperCase() || "U"}
            </div>

            <div>
              <strong>{user.name}</strong>
              <span>Personal Account</span>
            </div>
          </div>
        </header>

        <section className="welcome-banner">
          <div>
            <span className="banner-label">YOUR HEALTH JOURNEY</span>
            <h2>Hello, {user.name}! 👋</h2>
            <p>
              Keep track of your glucose readings and stay informed
              about your health.
            </p>
          </div>

          <div className="banner-icon">
            <HeartPulse size={55} />
          </div>
        </section>

        {pageError && (
          <div className="message error-message page-error">
            {pageError}
          </div>
        )}

        <section className="section-heading">
          <div>
            <h2>Glucose Overview</h2>
            <p>Your glucose statistics for the selected report period.</p>
          </div>

          <div className="date-filter">
            <CalendarDays size={18} />

            <input
              type="date"
              value={selectedDate}
              max={getToday()}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </section>

        <section className="report-tabs">
          <button
            className={reportType === "daily" ? "selected" : ""}
            onClick={() => setReportType("daily")}
          >
            Daily
          </button>

          <button
            className={reportType === "month-to-date" ? "selected" : ""}
            onClick={() => setReportType("month-to-date")}
          >
            Month-to-date
          </button>

          <button
            className={reportType === "previous-month" ? "selected" : ""}
            onClick={() => setReportType("previous-month")}
          >
            Previous month
          </button>
        </section>

        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-card-top">
              <span>Total Readings</span>
              <div className="stat-icon teal">
                <Droplets size={20} />
              </div>
            </div>

            <h3>{loadingData ? "..." : summary.count}</h3>
            <p>Readings recorded</p>
          </div>

          <div className="stat-card">
            <div className="stat-card-top">
              <span>Highest Reading</span>
              <div className="stat-icon orange">
                <TrendingUp size={20} />
              </div>
            </div>

            <h3>
              {loadingData
                ? "..."
                : summary.highest !== null
                  ? `${summary.highest}`
                  : "--"}
            </h3>
            <p>mg/dl</p>
          </div>

          <div className="stat-card">
            <div className="stat-card-top">
              <span>Lowest Reading</span>
              <div className="stat-icon blue">
                <TrendingDown size={20} />
              </div>
            </div>

            <h3>
              {loadingData
                ? "..."
                : summary.lowest !== null
                  ? `${summary.lowest}`
                  : "--"}
            </h3>
            <p>mg/dl</p>
          </div>

          <div className="stat-card">
            <div className="stat-card-top">
              <span>Average Reading</span>
              <div className="stat-icon purple">
                <BarChart3 size={20} />
              </div>
            </div>

            <h3>
              {loadingData
                ? "..."
                : summary.average !== null
                  ? Number(summary.average).toFixed(1)
                  : "--"}
            </h3>
            <p>mg/dl</p>
          </div>
        </section>

        <section className="content-grid">

          <div className="panel reading-panel">
            <div className="panel-heading">
              <div>
                <h2>Reading History</h2>
                <p>Your recorded glucose readings</p>
              </div>

              <button
                className="primary-button"
                onClick={() => {
                  setReadingForm({
                    reading_date: selectedDate,
                    time_slot: "Morning",
                    value: ""
                  });

                  setEditingId(null);
                  setFormError("");
                  setFormSuccess("");
                  setShowForm(true);
                }}
              >
                <Plus size={17} />
                Add Reading
              </button>
            </div>

            {displayedReadings.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <Droplets size={30} />
                </div>

                <h3>No readings yet</h3>
                <p>Add your first glucose reading to get started.</p>

                <button
                  className="primary-button"
                  onClick={() => setShowForm(true)}
                >
                  <Plus size={17} />
                  Add Reading
                </button>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="readings-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Time Slot</th>
                      <th>Glucose Value</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {displayedReadings.map((reading) => (
                      <tr key={reading.id}>
                        <td>{reading.reading_date}</td>

                        <td>
                          <span className="slot-badge">
                            {reading.time_slot}
                          </span>
                        </td>

                        <td>
                          <strong className="reading-value">
                            {reading.value} mg/dl
                          </strong>
                        </td>

                        <td>
                          <div className="table-actions">
                            <button
                              className="icon-button edit"
                              title="Edit reading"
                              onClick={() => handleEdit(reading)}
                            >
                              <Pencil size={16} />
                            </button>

                            <button
                              className="icon-button delete"
                              title="Delete reading"
                              onClick={() => handleDelete(reading.id)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="panel report-panel">
            <div className="panel-heading">
              <div>
                <h2>Report Summary</h2>
                <p>Selected report statistics</p>
              </div>

              <div className="report-icon">
                <BarChart3 size={21} />
              </div>
            </div>

            <div className="report-summary">
              <div className="report-row">
                <span>Report type</span>
                <strong>
                  {reportType === "daily"
                    ? "Daily"
                    : reportType === "month-to-date"
                      ? "Month-to-date"
                      : "Previous full month"}
                </strong>
              </div>

              <div className="report-row">
                <span>Selected date</span>
                <strong>{selectedDate}</strong>
              </div>

              <div className="report-row">
                <span>Total readings</span>
                <strong>{loadingData ? "..." : summary.count}</strong>
              </div>

              <div className="report-row">
                <span>Average glucose</span>
                <strong>
                  {summary.average !== null
                    ? `${Number(summary.average).toFixed(1)} mg/dl`
                    : "--"}
                </strong>
              </div>
            </div>

            <div className="report-note">
              <Activity size={17} />
              <span>
                These statistics summarize your recorded readings.
                Consult a healthcare professional for medical interpretation.
              </span>
            </div>
          </div>

        </section>

        <footer className="dashboard-footer">
          <span>© 2026 Sweety Blood Glucose Tracker</span>
          <span>Track better. Live healthier.</span>
        </footer>

      </main>

      {/* ADD / EDIT READING MODAL */}
      {showForm && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) resetReadingForm();
          }}
        >
          <div className="reading-modal">

            <div className="modal-heading">
              <div>
                <h2>{editingId ? "Edit Reading" : "Add Glucose Reading"}</h2>
                <p>Enter your blood glucose measurement.</p>
              </div>

              <button
                className="close-button"
                onClick={resetReadingForm}
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={handleReadingSubmit}>
              <div className="form-group">
                <label>Reading Date</label>

                <input
                  className="modal-input"
                  type="date"
                  name="reading_date"
                  value={readingForm.reading_date}
                  max={getToday()}
                  onChange={handleReadingChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Time Slot</label>

                <select
                  className="modal-input"
                  name="time_slot"
                  value={readingForm.time_slot}
                  onChange={handleReadingChange}
                  required
                >
                  {SLOTS.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Glucose Value (mg/dl)</label>

                <input
                  className="modal-input"
                  type="number"
                  name="value"
                  min="40"
                  max="600"
                  step="1"
                  placeholder="Enter value between 40 and 600"
                  value={readingForm.value}
                  onChange={handleReadingChange}
                  required
                />
              </div>

              {formError && (
                <div className="message error-message">
                  {formError}
                </div>
              )}

              {formSuccess && (
                <div className="message success-message">
                  {formSuccess}
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={resetReadingForm}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={savingReading}
                >
                  {savingReading
                    ? "Saving..."
                    : editingId
                      ? "Update Reading"
                      : "Save Reading"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}

export default App;