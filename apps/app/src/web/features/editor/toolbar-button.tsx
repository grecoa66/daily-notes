type ToolbarButtonProps = {
  active: boolean;
  onClick: () => void;
  label: string;
};

export function ToolbarButton({ active, onClick, label }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onMouseDown={(event) => {
        event.preventDefault();
        onClick();
      }}
      className={`rounded px-2 py-1 text-xs ${
        active
          ? "bg-zinc-900 text-zinc-50"
          : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
      }`}
    >
      {label}
    </button>
  );
}
