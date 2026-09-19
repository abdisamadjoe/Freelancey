/**
 * Back-compat surface: the loading placeholders now live in the UI kit so the
 * whole app shares one skeleton vocabulary. Prefer importing from
 * `@/components/ui`.
 */
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
} from "@/components/ui/skeleton";
