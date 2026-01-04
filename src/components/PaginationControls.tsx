import { Button } from "@/components/ui/button";

type PaginationControlsProps = {
  totalItems: number;
  pageSize: number;
  page: number;
  onPageChange: (page: number) => void;
};

export function PaginationControls({ totalItems, pageSize, page, onPageChange }: PaginationControlsProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  const goToPage = (nextPage: number) => {
    const safePage = Math.min(Math.max(nextPage, 1), totalPages);
    onPageChange(safePage);
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Showing <span className="font-medium text-foreground">{start}</span>-
        <span className="font-medium text-foreground">{end}</span> of{" "}
        <span className="font-medium text-foreground">{totalItems}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => goToPage(page - 1)} disabled={page === 1}>
          Previous
        </Button>
        <div className="text-sm font-medium tabular-nums">
          Page {page} / {totalPages}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => goToPage(page + 1)}
          disabled={page === totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
