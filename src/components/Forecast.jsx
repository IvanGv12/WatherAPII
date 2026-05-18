export default function Forecast({ data }) {
  if (!data) return null;

  return (
    <div>
      <h3>Pronóstico</h3>
      {data.forecast.forecastday.map((day, index) => (
        <div key={index}>
          <p>{day.date}</p>
          <p>{day.day.avgtemp_c}°C</p>
          <p>{day.day.condition.text}</p>
          <img src={day.day.condition.icon} />
        </div>
      ))}
    </div>
  );
}