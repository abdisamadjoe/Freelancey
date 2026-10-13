import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

/*
 * Dashboard stat-card icons. Same duotone treatment as the template set (18px grid,
 * 1.2 outline, 20% fill, currentColor), drawn for what each card actually measures.
 */

const base = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 18,
  height: 18,
  viewBox: "0 0 18 18",
  fill: "none",
  "aria-hidden": true,
} as const;

const stroke = {
  stroke: "currentColor",
  strokeWidth: 1.2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** Total Projects: a project folder with a completed item. */
export const ProjectsStatIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path
      d="M1.5 5.25C1.5 4.007 2.507 3 3.75 3H6.6c.5 0 .97.2 1.32.55l.68.68c.35.35.83.55 1.33.55h4.57c1.24 0 2.25 1.01 2.25 2.25v5.72c0 1.24-1.01 2.25-2.25 2.25H3.75A2.25 2.25 0 0 1 1.5 12.75v-7.5Z"
      fill="currentColor"
      fillOpacity={0.2}
      {...stroke}
    />
    <path d="m6.4 10.3 1.7 1.7 3.5-3.5" {...stroke} />
  </svg>
);

/** In Progress: a dial with the hands mid-turn. */
export const InProgressStatIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <circle cx={9} cy={9} r={6.75} fill="currentColor" fillOpacity={0.2} {...stroke} />
    <path d="M9 5.4V9l2.4 1.5" {...stroke} />
  </svg>
);

/** Outstanding Receivables: an invoice still waiting to be paid. */
export const ReceivablesStatIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path
      d="M4.5 1.5h6.75l3 3v9.75a1.5 1.5 0 0 1-1.5 1.5H4.5a1.5 1.5 0 0 1-1.5-1.5V3a1.5 1.5 0 0 1 1.5-1.5Z"
      fill="currentColor"
      fillOpacity={0.2}
      {...stroke}
    />
    <path d="M11.25 1.5v3h3M6 8.25h6M6 11.25h3.75" {...stroke} />
  </svg>
);

/** Total Collected: cash that has arrived. */
export const CollectedStatIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <rect x={1.5} y={4.5} width={15} height={9} rx={2.25} fill="currentColor" fillOpacity={0.2} {...stroke} />
    <circle cx={9} cy={9} r={2.25} {...stroke} />
    <circle cx={4.75} cy={9} r={0.6} fill="currentColor" />
    <circle cx={13.25} cy={9} r={0.6} fill="currentColor" />
  </svg>
);
