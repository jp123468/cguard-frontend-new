"use client";

import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import './PhoneField.css';

type Props = {
  code: string;
  number: string;
  onCodeChange: (v: string) => void;
  onNumberChange: (v: string) => void;
};

export default function PhoneField({
  code,
  number,
  onCodeChange,
  onNumberChange,
}: Props) {
  // Combinar código y número para el valor completo
  const fullNumber = `${code}${number}`;

  const handleChange = (value: string | undefined) => {
    if (!value) {
      onCodeChange('+593');
      onNumberChange('');
      return;
    }

    // Extraer el código de país y el número
    // react-phone-number-input maneja esto automáticamente
    const match = value.match(/^(\+\d{1,4})(.*)$/);
    if (match) {
      onCodeChange(match[1]);
      onNumberChange(match[2]);
    }
  };

  return (
    <div className="phone-input-container">
      <PhoneInput
        international
        defaultCountry="EC"
        value={fullNumber}
        onChange={handleChange}
        placeholder="Ingresa número de teléfono"
      />
    </div>
  );
}
