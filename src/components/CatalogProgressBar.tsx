interface Props {
  loaded: number;
  total: number;
}

export const CatalogProgressBar = ({ loaded, total }: Props) => (
  <div className="mb-4 rounded-lg border border-border bg-card/60 px-4 py-2 text-xs text-muted-foreground">
    Loading anime catalog… {loaded.toLocaleString()} of {total.toLocaleString()} loaded
    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full bg-primary transition-all"
        style={{ width: `${Math.min(100, (loaded / total) * 100)}%` }}
      />
    </div>
  </div>
);
