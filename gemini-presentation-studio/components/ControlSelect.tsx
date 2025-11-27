
import React, { useState } from 'react';

interface ControlSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; description?: string }[];
  disabled?: boolean;
}

const ControlSelect: React.FC<ControlSelectProps> = ({ label, value, onChange, options, disabled }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const selectedOption = options.find(opt => opt.value === value);
  const description = selectedOption?.description;

  return (
    <div className="min-w-[120px] flex-1 relative">
      <div className="flex items-center gap-1 mb-1">
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
          {label}
        </label>
        {description && (
          <div className="relative">
            <button
              type="button"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={() => setShowTooltip(!showTooltip)}
              className="text-gray-500 hover:text-gray-300 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </button>
            {showTooltip && (
              <div className="absolute z-50 left-0 top-full mt-1 w-64 p-2 bg-gray-800 border border-gray-600 rounded-lg shadow-xl text-xs text-gray-300 leading-relaxed">
                {description}
              </div>
            )}
          </div>
        )}
      </div>
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
