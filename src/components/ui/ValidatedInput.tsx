import { useState } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface ValidatedInputProps {
  type: string;
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  validate: (val: string) => string | null;
  disabled?: boolean;
  maxLength?: number;
}

export default function ValidatedInput({
  type, placeholder, value, onChange, validate, disabled, maxLength
}: ValidatedInputProps) {
  const [touched, setTouched] = useState(false);
  const error = touched ? validate(value) : null;
  const isValid = touched && value.length > 0 && !error;

  return (
    <div className="relative">
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setTouched(true)}
        aria-invalid={!!error}
        aria-describedby={error ? `${placeholder}-error` : undefined}
        className={`w-full p-3 pr-10 bg-bg-tertiary border rounded-lg text-text-primary focus:outline-none transition-all disabled:opacity-50 ${
          error
            ? 'border-accent-error focus:border-accent-error'
            : isValid
              ? 'border-accent-success focus:border-accent-success'
              : 'border-border-strong focus:border-accent-primary'
        }`}
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
        {error && <AlertCircle size={16} className="text-accent-error" />}
        {isValid && <CheckCircle size={16} className="text-accent-success" />}
      </div>
      {error && (
        <p id={`${placeholder}-error`} className="text-accent-error text-[11px] mt-1.5 ml-1 font-medium animate-fade-in" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
