import React, { useState } from "react";

// Componente de autocompletado de direcciones para Ecuador usando Nominatim
interface AddressAutocompleteECUProps {
  value: string;
  onSelect: (data: any) => void;
  placeholder?: string;
  country?: string;
}

interface NominatimSuggestion {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: Record<string, string>;
}

const AddressAutocompleteECU: React.FC<AddressAutocompleteECUProps> = ({
  value,
  onSelect,
  placeholder = "Buscar dirección...",
  country = "ec",
}) => {
  const [input, setInput] = useState(value || "");
  const [suggestions, setSuggestions] = useState<NominatimSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  // Buscar sugerencias en Nominatim
  const fetchSuggestions = async (query: string) => {
    setLoading(true);
    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=${country}&q=${encodeURIComponent(
      query
    )}`;
    const res = await fetch(url);
    const data = await res.json();
    setSuggestions(data);
    setLoading(false);
  };

  // Manejar cambios en el input
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);
    if (val.length > 3) {
      fetchSuggestions(val);
    } else {
      setSuggestions([]);
    }
  };

  // Seleccionar una sugerencia
  const handleSelect = (suggestion: NominatimSuggestion) => {
    setInput(suggestion.display_name);
    setSuggestions([]);
    if (onSelect) {
      onSelect({
        address: suggestion.display_name,
        lat: suggestion.lat,
        lon: suggestion.lon,
        details: suggestion.address,
      });
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <input
        type="text"
        value={input}
        onChange={handleChange}
        placeholder={placeholder}
        style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
      />
      {loading && <div style={{ position: "absolute", top: 36, left: 0 }}>Buscando...</div>}
      {suggestions.length > 0 && (
        <ul
          style={{
            position: "absolute",
            top: 36,
            left: 0,
            right: 0,
            background: "white",
            border: "1px solid #ccc",
            borderRadius: 4,
            zIndex: 1000,
            maxHeight: 200,
            overflowY: "auto",
            listStyle: "none",
            margin: 0,
            padding: 0,
          }}
        >
          {suggestions.map((s) => (
            <li
              key={s.place_id}
              onClick={() => handleSelect(s)}
              style={{ padding: 8, cursor: "pointer" }}
            >
              {s.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default AddressAutocompleteECU;
