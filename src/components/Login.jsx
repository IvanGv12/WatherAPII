import { useState } from "react";
import { Link } from "react-router-dom";

export default function Login({ onLogin, loading, error }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [validationError, setValidationError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (email.trim() === "" || password.trim() === "") {
      setValidationError("El correo y la contraseña son obligatorios.");
      return;
    }

    setValidationError("");
    await onLogin(email, password);
  };

  return (
    <div className="auth-card">
      <h2 className="auth-title">Iniciar sesión</h2>
      <form className="auth-form" onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-label="Correo electrónico"
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-label="Contraseña"
        />
        <button className="primary-button" type="submit" disabled={loading}>
          {loading ? "Iniciando sesión..." : "Iniciar sesión"}
        </button>
      </form>

      {validationError && <p className="error-text">{validationError}</p>}
      {error && <p className="error-text">{error}</p>}

      <p className="form-footer">
        ¿No tienes cuenta? <Link to="/register">Regístrate</Link>
      </p>
    </div>
  );
}
