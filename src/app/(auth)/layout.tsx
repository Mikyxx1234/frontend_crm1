export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center bg-zinc-50 px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.06),transparent)]"
      />
      <div className="relative z-10 w-full max-w-[380px]">{children}</div>
    </div>
  );
}
