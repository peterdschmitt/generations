
import React from 'react';

interface ControlSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}

const ControlSelect: React.FC<ControlSelectProps> = ({ label, value, onChange, options, disabled }) => {
  return (
    <div className="min-w-[120px] flex-1">
      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full appearance-none bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded shadow-sm focus:ring-1 focus:ring-primary focus:border-primary block p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default ControlSelect;
