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

/** The app's navigation, in the template's NAV_DATA shape. */
export const NAV_DATA: { label: string; items: NavItemData[] }[] = [
  {
    label: "MAIN MENU",
    items: [
      { title: "Overview", url: "/dashboard", icon: <HomeIcon />, items: [] },
      { title: "Leads", url: "/dashboard/leads", icon: <UserIcon />, items: [] },
      { title: "Projects", url: "/dashboard/projects", icon: <TaskIcon />, items: [] },
      { title: "Calendar", url: "/dashboard/calendar", icon: <CalendarIcon />, items: [] },
      { title: "Clients", url: "/dashboard/clients", icon: <UserGroupIcon />, items: [] },
      { title: "Support", url: "/dashboard/support", icon: <ChatIcon />, items: [] },
    ],
  },
  {
    label: "REPORTS",
    items: [{ title: "Reports", url: "/dashboard/reports", icon: <PieChartIcon />, items: [] }],
  },
  {
    label: "SYSTEM",
    items: [
      {
        title: "Settings",
        icon: <Widget4Icon />,
        items: [
          { title: "Account", url: "/dashboard/settings/account" },
          { title: "Workspace", url: "/dashboard/settings/workspace" },
          { title: "Billing", url: "/dashboard/settings/billing" },
          { title: "Payments", url: "/dashboard/settings/payments" },
        ],
      },
    ],
  },
];
