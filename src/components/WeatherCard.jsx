export default function WeatherCard({ data }) {
  if (!data) return null;

  const { location, current } = data;

  return (
    <div>
      <h2>{location.name}, {location.country}</h2>
      <p>Temperatura: {current.temp_c}°C</p>
      <p>Sensación térmica: {current.feelslike_c}°C</p>
      <p>Condición: {current.condition.text}</p>
      <p>Humedad: {current.humidity}%</p>
      <p>Viento: {current.wind_kph} km/h</p>
      <img src={current.condition.icon} alt="weather icon" />
    </div>
  );
}
