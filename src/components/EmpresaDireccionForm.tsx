import React, { useState } from "react";
import AddressAutocompleteECU from "./maps/AddressAutocompleteECU";
import OSMMapEmbed from "./maps/OSMMapEmbed";

export default function EmpresaDireccionForm() {
  const [direccion, setDireccion] = useState("");
  const [lat, setLat] = useState<number | undefined>(undefined);
  const [lng, setLng] = useState<number | undefined>(undefined);

  // Cuando el usuario selecciona una dirección del autocompletado
  const handleSelectDireccion = (data: any) => {
    setDireccion(data.address);
    setLat(parseFloat(data.lat));
    setLng(parseFloat(data.lon));
  };

  // Cuando el usuario mueve el marcador en el mapa
  const handleMapMove = (lat: number, lng: number, address: string) => {
    setLat(lat);
    setLng(lng);
    setDireccion(address);
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <label style={{ fontWeight: 600 }}>Dirección de la Empresa*</label>
      <AddressAutocompleteECU
        value={direccion}
        onSelect={handleSelectDireccion}
        placeholder="Ej: Antonio Miguel de Soler N29-26 y Bartolomé de las Casas"
      />
      <div style={{ margin: "16px 0" }}>
        <label>Latitud</label>
        <input
          type="number"
          value={lat ?? ""}
          onChange={e => setLat(Number(e.target.value))}
          placeholder="Latitud"
          style={{ width: 120, marginRight: 8 }}
        />
        <label>Longitud</label>
        <input
          type="number"
          value={lng ?? ""}
          onChange={e => setLng(Number(e.target.value))}
          placeholder="Longitud"
          style={{ width: 120 }}
        />
      </div>
      {lat && lng && (
        <OSMMapEmbed
          lat={lat}
          lng={lng}
          zoom={17}
          height="320px"
        />
      )}
    </div>
  );
}
