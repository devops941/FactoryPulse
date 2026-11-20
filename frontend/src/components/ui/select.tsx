import React, { createContext, useContext, useState } from 'react';

interface SelectContextType {
  value: string;
  onValueChange?: (val: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  selectedLabel: string;
  setSelectedLabel: (label: string) => void;
}

const SelectContext = createContext<SelectContextType | null>(null);

export function Select({
  value,
  onValueChange,
  children,
}: {
  value: string;
  onValueChange?: (val: string) => void;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState('');

  return (
    <SelectContext.Provider value={{ value, onValueChange, isOpen, setIsOpen, selectedLabel, setSelectedLabel }}>
      <div className="relative w-full">{children}</div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({
  className = '',
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const ctx = useContext(SelectContext);
  return (
    <button
      type="button"
      onClick={() => ctx?.setIsOpen(!ctx.isOpen)}
      className={`flex h-10 w-full items-center justify-between rounded-lg border px-3 py-2 text-sm focus:outline-none ${className}`}
      {...props}
    >
      {children}
      <span className="ml-2 text-xs text-gray-400">▼</span>
    </button>
  );
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const ctx = useContext(SelectContext);
  return <span>{ctx?.selectedLabel || ctx?.value || placeholder || 'Select...'}</span>;
}

export function SelectContent({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = useContext(SelectContext);
  if (!ctx?.isOpen) return null;
  return (
    <div className={`absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border shadow-lg ${className || 'bg-gray-800 border-gray-700'}`}>
      {children}
    </div>
  );
}

export function SelectItem({
  value,
  className = '',
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = useContext(SelectContext);
  const isSelected = ctx?.value === value;

  React.useEffect(() => {
    if (isSelected && typeof children === 'string') {
      ctx?.setSelectedLabel(children);
    }
  }, [isSelected, children]);

  return (
    <div
      onClick={() => {
        ctx?.onValueChange?.(value);
        if (typeof children === 'string') ctx?.setSelectedLabel(children);
        ctx?.setIsOpen(false);
      }}
      className={`cursor-pointer px-3 py-2 text-sm hover:bg-gray-700/80 ${isSelected ? 'bg-gray-700 font-semibold' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
