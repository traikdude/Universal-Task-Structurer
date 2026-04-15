import React from 'react';

const EXAMPLES = [
  {
    emoji: '📅',
    label: 'Plan Team Meeting',
    text: 'Schedule team standup for tomorrow at 10am. Invite Alice and Bob. Prep the Q2 roadmap slides beforehand.',
    color: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300 hover:shadow-blue-100',
  },
  {
    emoji: '🛒',
    label: 'Grocery Run',
    text: 'Buy groceries: apples, almond milk, sourdough bread, eggs, spinach, and Greek yogurt.',
    color: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 hover:shadow-emerald-100',
  },
  {
    emoji: '🚀',
    label: 'Launch Checklist',
    text: 'Before launch: write release notes, update README, tag v2.0.0 in GitHub, post on social media, notify beta users.',
    color: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 hover:border-purple-300 hover:shadow-purple-100',
  },
  {
    emoji: '🩺',
    label: 'Healthcare Tasks',
    text: 'Book dentist appointment, refill magnesium prescription, research cardiologists in my area for annual checkup.',
    color: 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 hover:border-rose-300 hover:shadow-rose-100',
  },
  {
    emoji: '💡',
    label: 'Feature Brainstorm',
    text: 'New app ideas: dark mode toggle, keyboard shortcuts, offline support, and weekly digest email — prioritize by user impact.',
    color: 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 hover:border-amber-300 hover:shadow-amber-100',
  },
];

interface ExampleChipsProps {
  onSelect: (text: string) => void;
}

export function ExampleChips({ onSelect }: ExampleChipsProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest px-1">
        ✨ Try an example
      </p>
      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map(({ emoji, label, text, color }) => (
          <button
            key={label}
            onClick={() => onSelect(text)}
            className={`joy-pill border shadow-sm hover:shadow-md active:scale-95 transition-all duration-200 cursor-pointer ${color}`}
          >
            <span className="text-sm leading-none">{emoji}</span>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
