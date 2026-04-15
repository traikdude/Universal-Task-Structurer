import React from 'react';

interface Example {
  label: string;
  icon: string;
  text: string;
  color: string;
}

const EXAMPLES: Example[] = [
  {
    label: 'Meeting Notes',
    icon: '📅',
    color: 'hover:border-neon-cyan/50 hover:text-neon-cyan hover:bg-neon-cyan/10 hover:shadow-[0_0_15px_rgba(34,211,238,0.15)]',
    text: 'Sync with the design team tomorrow at 10am to review the new onboarding wireframes. Make sure to bring feedback from last sprint. Follow up with Sarah about the copy revisions by Thursday EOD.'
  },
  {
    label: 'Errands',
    icon: '🛒',
    color: 'hover:border-neon-emerald/50 hover:text-neon-emerald hover:bg-neon-emerald/10 hover:shadow-[0_0_15px_rgba(16,185,129,0.15)]',
    text: 'Pick up milk, eggs, sourdough bread, and almond butter from Publix before Friday. Also need to return the Amazon package and drop off dry cleaning.'
  },
  {
    label: 'Project Tasks',
    icon: '💼',
    color: 'hover:border-neon-pink/50 hover:text-neon-pink hover:bg-neon-pink/10 hover:shadow-[0_0_15px_rgba(236,72,153,0.15)]',
    text: 'Q2 strategy doc needs to be finalized by April 15th. Coordinate with Dev, Design, and Marketing leads. Schedule kick-off meeting for next Monday morning.'
  },
  {
    label: 'Home Tasks',
    icon: '🏠',
    color: 'hover:border-neon-amber/50 hover:text-neon-amber hover:bg-neon-amber/10 hover:shadow-[0_0_15px_rgba(245,158,11,0.15)]',
    text: 'Fix the leaky bathroom faucet this weekend. Call the HOA about the parking permit. Renew car registration before May 1st.'
  }
];

interface ExampleChipsProps {
  onSelect: (text: string) => void;
}

export function ExampleChips({ onSelect }: ExampleChipsProps) {
  return (
    <div className="flex flex-col gap-2 mb-1">
      <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em]">
        ⚡ Load an Example
      </span>
      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((example, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(example.text)}
            className={`flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/60 backdrop-blur border border-slate-700/50 rounded-full text-xs font-bold text-slate-400 transition-all duration-300 active:scale-95 ${example.color}`}
          >
            <span className="text-base leading-none">{example.icon}</span>
            <span className="tracking-wide">{example.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
