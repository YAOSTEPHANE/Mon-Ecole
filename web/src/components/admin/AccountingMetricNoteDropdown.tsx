'use client';

import { FiChevronDown, FiChevronUp, FiInfo } from 'react-icons/fi';

type AccountingMetricNoteDropdownProps = {
  title: string;
  body: string;
  open: boolean;
  onToggle: () => void;
};

const AccountingMetricNoteDropdown = ({
  title,
  body,
  open,
  onToggle,
}: AccountingMetricNoteDropdownProps) => (
  <div className="mt-2 border-t border-stone-200/60 pt-2">
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between gap-2 text-left text-[10px] font-medium text-stone-600 hover:text-stone-800"
      aria-expanded={open}
    >
      <span className="flex items-center gap-1">
        <FiInfo className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
        Note — {title}
      </span>
      {open ? <FiChevronUp className="h-3 w-3 shrink-0" /> : <FiChevronDown className="h-3 w-3 shrink-0" />}
    </button>
    {open && <p className="mt-1.5 text-[10px] leading-relaxed text-stone-600">{body}</p>}
  </div>
);

export default AccountingMetricNoteDropdown;
