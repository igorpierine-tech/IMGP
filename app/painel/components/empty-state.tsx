"use client";

const illustrations: Record<string, JSX.Element> = {
  projects: (
    <svg viewBox="0 0 120 100" fill="none" className="w-28 h-24 text-gray-300">
      <rect x="10" y="30" width="100" height="60" rx="8" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3"/>
      <rect x="20" y="42" width="30" height="6" rx="3" fill="currentColor" opacity=".3"/>
      <rect x="20" y="54" width="50" height="4" rx="2" fill="currentColor" opacity=".2"/>
      <rect x="20" y="64" width="40" height="4" rx="2" fill="currentColor" opacity=".15"/>
      <circle cx="90" cy="55" r="12" stroke="currentColor" strokeWidth="2" opacity=".3"/>
      <path d="M86 55h8M90 51v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".3"/>
    </svg>
  ),
  tasks: (
    <svg viewBox="0 0 120 100" fill="none" className="w-28 h-24 text-gray-300">
      <rect x="15" y="20" width="25" height="70" rx="6" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3"/>
      <rect x="48" y="20" width="25" height="70" rx="6" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3"/>
      <rect x="80" y="20" width="25" height="70" rx="6" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3"/>
      <rect x="20" y="30" width="15" height="10" rx="3" fill="currentColor" opacity=".2"/>
      <rect x="53" y="30" width="15" height="10" rx="3" fill="currentColor" opacity=".2"/>
      <rect x="85" y="30" width="15" height="10" rx="3" fill="currentColor" opacity=".2"/>
    </svg>
  ),
  generic: (
    <svg viewBox="0 0 120 100" fill="none" className="w-28 h-24 text-gray-300">
      <circle cx="60" cy="45" r="25" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3"/>
      <path d="M55 45h10M60 40v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".4"/>
      <path d="M45 80h30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".2"/>
      <path d="M50 87h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".15"/>
    </svg>
  ),
};

export default function EmptyState({
  icon = "generic", title, description, action,
}: {
  icon?: keyof typeof illustrations | string;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      {illustrations[icon] ?? illustrations.generic}
      <h3 className="mt-4 text-base font-semibold text-gray-600 dark:text-gray-400">{title}</h3>
      {description && <p className="mt-1 text-sm text-gray-400 dark:text-gray-500 text-center max-w-xs">{description}</p>}
      {action && (
        <button onClick={action.onClick}
          className="mt-4 px-4 py-2 text-sm font-medium text-white bg-[#0c4a3e] hover:bg-[#0a3d33] rounded-lg transition-colors">
          {action.label}
        </button>
      )}
    </div>
  );
}
