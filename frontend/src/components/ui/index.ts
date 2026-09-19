/**
 * Freelancey UI kit — the design-system surface ported from the NextAdmin
 * template (`dashboard/`). Import primitives from here rather than from
 * individual files so the vocabulary stays discoverable.
 */
export { Badge, badgeStyles, StatusDot } from "./badge";
export type { BadgeColor, BadgeSize, BadgeProps } from "./badge";
export { Breadcrumbs } from "./breadcrumbs";
export type { BreadcrumbItem } from "./breadcrumbs";
export { Button, buttonStyles } from "./button";
export type { ButtonProps, ButtonSize, ButtonVariant, ButtonAppearance } from "./button";
export { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter } from "./card";
export { Checkbox, Switch } from "./checkbox";
export { DataToolbar, PageSection, SectionHeading } from "./data-toolbar";
export { DropdownMenu, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "./dropdown";
export { EmptyState } from "./empty-state";
export type { EmptyStateProps } from "./empty-state";
export { Field, FieldDescription, FieldError, Input, Label, NativeSelect, Textarea } from "./input";
export { Modal, ModalBody, ModalFooter, ModalHeader } from "./modal";
export type { ModalSize } from "./modal";
export { PageHeader } from "./page-header";
export { Pagination } from "./pagination";
export { Progress } from "./progress";
export { SearchInput } from "./search-input";
export { Sheet } from "./sheet";
export {
  CardSkeleton,
  ClientItemSkeleton,
  FileItemSkeleton,
  InvoiceCardSkeleton,
  ListItemSkeleton,
  PageSkeleton,
  ProjectCardSkeleton,
  ProjectDetailSkeleton,
  Skeleton,
  StatCardSkeleton,
  TableRowSkeleton,
  UpdateItemSkeleton,
} from "./skeleton";
export { LoadingState, Spinner } from "./spinner";
export { StatCard } from "./stat-card";
export type { StatTone } from "./stat-card";
export { StatusBadge, statusColor, statusLabel } from "./status-badge";
export { TableBody, TableCell, TableHead, TableHeader, TableRoot, TableRow } from "./table";
export { Tab, TabList, TabPanel, Tabs } from "./tabs";
export { Avatar, AvatarGroup } from "./avatar";
export { Alert, alertStyles } from "./alert";
export type { AlertStatus } from "./alert";
