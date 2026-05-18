import { useState } from "react";
import { Link } from "react-router-dom";

export default function Register({ onRegister, loading, error }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [validationError, setValidationError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!name.trim() || !email.trim() || !password.trim()) {
      setValidationError("Todos los campos son obligatorios.");
      return;
    }

    if (password !== passwordConfirmation) {
      setValidationError("Las contraseñas deben coincidir.");
      return;
    }

    setValidationError("");
    await onRegister(name, email, password, passwordConfirmation);
  };

  return (
    <div className="auth-card">
      <h2 className="auth-title">Crear cuenta</h2>
      <form className="auth-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Nombre completo"
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-label="Nombre completo"
        />
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
        <input
          type="password"
          placeholder="Confirmar contraseña"
          value={passwordConfirmation}
          onChange={(event) => setPasswordConfirmation(event.target.value)}
          aria-label="Confirmar contraseña"
        />
        <button className="primary-button" type="submit" disabled={loading}>
          {loading ? "Creando cuenta..." : "Registrarse"}
        </button>
      </form>

      {validationError && <p className="error-text">{validationError}</p>}
      {error && <p className="error-text">{error}</p>}

      <p className="form-footer">
        ¿Ya tienes una cuenta? <Link to="/login">Inicia sesión</Link>
      </p>
    </div>
  );
}
