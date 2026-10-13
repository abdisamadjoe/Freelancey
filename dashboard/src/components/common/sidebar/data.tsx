import type { ReactNode } from "react";
import {
  CalendarIcon,
  ChatIcon,
  HomeIcon,
  PieChartIcon,
  TaskIcon,
  UserGroupIcon,
  UserIcon,
  Widget4Icon,
} from "./icon";

export interface NavChild {
  title: string;
  url?: string;
}

export interface NavItemData {
  title: string;
  url?: string;
  icon: ReactNode;
  items: NavChild[];
}

export interface NavSection {
  label: string;
  items: NavItemData[];
}

/** Navigation for workspace owners and admins. */
export const STAFF_NAV: NavSection[] = [
  {
    label: "MAIN MENU",
    items: [
      { title: "Overview", url: "/dashboard", icon: <HomeIcon />, items: [] },
      { title: "Leads", url: "/dashboard/leads", icon: <UserIcon />, items: [] },
      { title: "Clients", url: "/dashboard/clients", icon: <UserGroupIcon />, items: [] },
      { title: "Projects", url: "/dashboard/projects", icon: <TaskIcon />, items: [] },
      { title: "Invoices", url: "/dashboard/invoices", icon: <TaskIcon />, items: [] },
      { title: "Calendar", url: "/dashboard/calendar", icon: <CalendarIcon />, items: [] },
      { title: "Support", url: "/dashboard/support", icon: <ChatIcon />, items: [] },
    ],
  },
  {
    label: "REPORTS",
    items: [{ title: "Time report", url: "/dashboard/reports/time", icon: <PieChartIcon />, items: [] }],
  },
  {
    label: "SYSTEM",
    items: [
      {
        title: "Settings",
        icon: <Widget4Icon />,
        items: [
          { title: "General", url: "/dashboard/settings/general" },
          { title: "Profile", url: "/dashboard/settings/profile" },
          { title: "Branding", url: "/dashboard/settings/branding" },
          { title: "Labels & domain", url: "/dashboard/settings/system" },
          { title: "Billing", url: "/dashboard/settings/billing" },
          { title: "Payments", url: "/dashboard/settings/payments" },
        ],
      },
    ],
  },
];

/** Navigation for client (portal) members. */
export const PORTAL_NAV: NavSection[] = [
  {
    label: "MAIN MENU",
    items: [
      { title: "Projects", url: "/portal/projects", icon: <TaskIcon />, items: [] },
      { title: "Onboarding", url: "/portal/onboarding", icon: <UserIcon />, items: [] },
      { title: "Settings", url: "/portal/settings", icon: <Widget4Icon />, items: [] },
    ],
  },
];
