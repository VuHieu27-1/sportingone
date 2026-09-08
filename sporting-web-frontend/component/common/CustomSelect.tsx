import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search, X } from 'lucide-react';

export interface SelectOption {
  value: string | number;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface CustomSelectProps {
  options: SelectOption[];
  value: string | number;
  onChange: (value: any) => void;
  placeholder?: string;
  prefixLabel?: string;
  icon?: React.ReactNode;
  className?: string;
  buttonClassName?: string;
  dropdownClassName?: string;
  disabled?: boolean;
  searchable?: boolean;
  size?: 'sm' | 'md' | 'lg';
  placement?: 'bottom' | 'top';
  align?: 'left' | 'right' | 'auto';
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Chọn tùy chọn...',
  prefixLabel,
  icon,
  className = '',
  buttonClassName = '',
  dropdownClassName = '',
  disabled = false,
  searchable,
  size = 'md',
  placement = 'bottom',
  align = 'auto',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({
    position: 'fixed',
    top: -9999,
    left: -9999,
    opacity: 0,
    pointerEvents: 'none',
    zIndex: 99999,
  });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const minWidth = Math.max(rect.width, 200);

    // Auto-detect if we should align to the right edge (expand towards the left)
    const shouldAlignRight =
      align === 'right' ||
      (align === 'auto' && (rect.right > window.innerWidth / 2 || rect.left + minWidth > window.innerWidth - 16));

    let horizontalStyles: React.CSSProperties = {};
    if (shouldAlignRight) {
      const right = Math.max(16, window.innerWidth - rect.right);
      horizontalStyles = {
        right: `${right}px`,
        left: 'auto',
      };
    } else {
      const left = Math.max(16, Math.min(rect.left, window.innerWidth - minWidth - 16));
      horizontalStyles = {
        left: `${left}px`,
        right: 'auto',
      };
    }

    if (placement === 'top') {
      setPopoverStyle({
        position: 'fixed',
        ...horizontalStyles,
        bottom: `${window.innerHeight - rect.top + 6}px`,
        top: 'auto',
        minWidth: `${minWidth}px`,
        maxWidth: 'min(460px, calc(100vw - 32px))',
        opacity: 1,
        pointerEvents: 'auto',
        zIndex: 99999,
      });
    } else {
      setPopoverStyle({
        position: 'fixed',
        ...horizontalStyles,
        top: `${rect.bottom + 6}px`,
        bottom: 'auto',
        minWidth: `${minWidth}px`,
        maxWidth: 'min(460px, calc(100vw - 32px))',
        opacity: 1,
        pointerEvents: 'auto',
        zIndex: 99999,
      });
    }
  }, [placement, align]);

  useIsomorphicLayoutEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleScrollOrResize = () => {
        requestAnimationFrame(() => updatePosition());
      };
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
      return () => {
        window.removeEventListener('scroll', handleScrollOrResize, true);
        window.removeEventListener('resize', handleScrollOrResize);
      };
    } else {
      setPopoverStyle({
        position: 'fixed',
        top: -9999,
        left: -9999,
        opacity: 0,
        pointerEvents: 'none',
        zIndex: 99999,
      });
    }
  }, [isOpen, updatePosition]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node) &&
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectedOption = useMemo(() => {
    return options.find((opt) => String(opt.value) === String(value));
  }, [options, value]);

  const shouldShowSearch = useMemo(() => {
    if (searchable !== undefined) return searchable;
    return options.length > 5;
  }, [searchable, options.length]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const query = searchQuery.toLowerCase().trim();
    return options.filter((opt) => opt.label.toLowerCase().includes(query));
  }, [options, searchQuery]);

  const handleSelect = (optValue: string | number, isOptionDisabled?: boolean) => {
    if (isOptionDisabled || disabled) return;
    onChange(optValue);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleToggleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen((prev) => !prev);
  };

  // Dynamic height/padding classes based on size prop
  const sizeClasses = {
    sm: 'h-8 px-2.5 text-[11px] rounded-lg',
    md: 'h-10 px-3.5 text-xs rounded-xl',
    lg: 'h-11 px-4 text-sm rounded-2xl',
  }[size];

  return (
    <div className={`relative text-left ${className ? className : 'w-full'}`}>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={handleToggleOpen}
        className={`w-full bg-[#FAF8F5] border border-[#E6E2D8] text-[#1E3932] font-bold hover:bg-white hover:border-[#006241] focus:outline-none focus:ring-2 focus:ring-[#006241] cursor-pointer flex items-center justify-between gap-2 transition-all ${sizeClasses} ${
          disabled ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''
        } ${buttonClassName}`}
      >
        <div className="flex items-center gap-2 truncate flex-1 min-w-0">
          {icon && <span className="text-[#006241] shrink-0">{icon}</span>}
          {prefixLabel && (
            <span className="text-[#6F7E72] font-bold whitespace-nowrap shrink-0">{prefixLabel}</span>
          )}
          <span className="truncate">
            {selectedOption ? (
              <span className="flex items-center gap-2 truncate">
                {selectedOption.icon && <span className="shrink-0 flex items-center justify-center">{selectedOption.icon}</span>}
                <span className="truncate">{selectedOption.label}</span>
              </span>
            ) : (
              <span className="text-[#6F7E72]/70 font-normal">{placeholder}</span>
            )}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-[#6F7E72] transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-[#006241]' : ''
          }`}
        />
      </button>

      {/* Custom Dropdown Popover via React Portal */}
      {isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            style={popoverStyle}
            className={`bg-white rounded-2xl border border-[#E6E2D8] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 font-['Plus_Jakarta_Sans',sans-serif] ${dropdownClassName}`}
          >
            {/* Optional Search Bar */}
            {shouldShowSearch && (
              <div className="p-2 bg-[#FBF8F0] border-b border-[#E6E2D8]">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#6F7E72] absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Gõ để tìm..."
                    className="w-full h-8 pl-8 pr-7 rounded-lg bg-white border border-[#E6E2D8] text-xs text-[#1E3932] placeholder-[#6F7E72]/70 focus:outline-none focus:ring-1 focus:ring-[#006241]"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#6F7E72] hover:text-[#1E3932]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Options List */}
            <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
              {filteredOptions.length === 0 ? (
                <div className="p-3 text-center text-xs text-[#6F7E72] italic">
                  Không tìm thấy tùy chọn
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = String(opt.value) === String(value);
                  return (
                    <button
                      type="button"
                      key={String(opt.value)}
                      disabled={opt.disabled}
                      onClick={() => handleSelect(opt.value, opt.disabled)}
                      title={opt.label}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-between gap-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#006241] text-white font-bold shadow-xs'
                          : 'text-[#1E3932] font-medium hover:bg-[#FAF8F5]'
                      } ${opt.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center gap-2.5 truncate flex-1 min-w-0">
                        {opt.icon && <span className="shrink-0 flex items-center justify-center">{opt.icon}</span>}
                        <span className="truncate">{opt.label}</span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 stroke-[2.5] shrink-0 text-white" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
