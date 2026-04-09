import React from 'react';

interface Example {
  label: string;
  icon: string;
  text: string;
}

const EXAMPLES: Example[] = [
  {
    label: 'Meeting Notes',
    icon: '📅',
    text: 'Sync with the design team tomorrow at 10am to review the new onboarding wireframes. Make sure to bring feedback from last sprint. Follow up with Sarah about the copy revisions by Thursday EOD.'
  },
  {
    label: 'Errands',
    icon: '🛒',
    text: 'Pick up milk, eggs, sourdough bread, and almond butter from Publix before Friday. Also need to return the Amazon package and drop off dry cleaning.'
  },
  {
    label: 'Project Tasks',
    icon: '💼',
    text: 'Q2 strategy doc needs to be finalized by April 15th. Coordinate with Dev, Design, and Marketing leads. Schedule kick-off meeting for next Monday morning.'
  },
  {
    label: 'Home Tasks',
    icon: '🏠',
    text: 'Fix the leaky bathroom faucet this weekend. Call the HOA about the parking permit. Renew car registration before May 1st.'
  }
];

interface ExampleChipsProps {
  onSelect: (text: string) => void;
}

export function ExampleChips({ onSelect }: ExampleChipsProps) {
  return (
    <div className="flex flex-col gap-2 mb-3">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Load an Example</span>
      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((example, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(example.text)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors shadow-sm"
          >
            <span>{example.icon}</span>
            <span>{example.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
