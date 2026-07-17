export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="border border-danger/40 bg-danger/10 text-danger rounded-lg px-3 py-2 text-[12px] mb-3">
      {message}
    </div>
  );
}
