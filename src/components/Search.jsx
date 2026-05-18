import { useState } from "react";

export default function Search({ onSearch, loading }) {
  const [city, setCity] = useState("");
  const [validationError, setValidationError] = useState("");

  const handleSearch = () => {
    if (city.trim() === "") {
      setValidationError("Escribe una ciudad");
      return;
    }
    setValidationError("");
    onSearch(city);
    setCity("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSearch();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Buscar ciudad..."
        value={city}
        onChange={(e) => setCity(e.target.value)}
        onKeyDown={handleKeyDown}
        aria-label="Ciudad"
      />
      <button type="submit" disabled={loading}>
        Buscar
      </button>
      {validationError && (
        <span role="alert" aria-live="polite">
          {validationError}
        </span>
      )}
    </form>
  );
}
