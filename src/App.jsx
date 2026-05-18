import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import { getWeather } from "./services/weatherService";
import { login, register, logout, getUser } from "./services/localAuth";
import Search from "./components/Search";
import WeatherCard from "./components/WeatherCard";
import Login from "./components/Login";
import Register from "./components/Register";

function App() {
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    async function loadUser() {
      setAuthLoading(true);
      const currentUser = await getUser();
      setUser(currentUser);
      setAuthLoading(false);
    }

    loadUser();
  }, []);

  const handleSearch = async (city) => {
    setLoading(true);
    setError("");
    try {
      const data = await getWeather(city);
      setWeather(data);
    } catch (err) {
      setWeather(null);
      setError(err.message ?? "Error desconocido");
    } finally {
      setLoading(false);
    }
  };



  const handleLogin = async (email, password) => {
    setAuthError("");
    setActionLoading(true);
    try {
      const loggedUser = await login(email, password);
      setUser(loggedUser);
    } catch (err) {
      setAuthError(err.message ?? "Error desconocido");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegister = async (name, email, password, passwordConfirmation) => {
    setAuthError("");
    setActionLoading(true);
    try {
      const newUser = await register(name, email, password, passwordConfirmation);
      setUser(newUser);
    } catch (err) {
      setAuthError(err.message ?? "Error desconocido");
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setWeather(null);
    setError("");
  };

  if (authLoading) {
    return (
      <div id="center" className="page-shell">
        <div className="auth-card auth-card--loading">
          <h1>Weather Api</h1>
          <p>Cargando sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div id="center" className="page-shell">
        <h1 className="app-title">Weather Api</h1>

        {user ? (
          <div className="content-shell">
            <div className="header-actions">
              <span>Bienvenido, {user.name}</span>
              <button className="secondary-button" onClick={handleLogout}>
                Cerrar sesión
              </button>
            </div>

            <Routes>
              <Route
                path="/"
                element={
                  <div className="weather-shell">
                    <Search onSearch={handleSearch} loading={loading} />

                    {loading && (
                      <div className="spinner" aria-label="Cargando..." role="status" />
                    )}

                    {error && <p className="error-text">{error}</p>}

                    <WeatherCard data={weather} />
                  </div>
                }
              />
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="/register" element={<Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        ) : (
          <Routes>
            <Route
              path="/login"
              element={
                <Login
                  onLogin={handleLogin}
                  loading={actionLoading}
                  error={authError}
                />
              }
            />
            <Route
              path="/register"
              element={
                <Register
                  onRegister={handleRegister}
                  loading={actionLoading}
                  error={authError}
                />
              }
            />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        )}
      </div>
    </BrowserRouter>
  );
}

export default App;
