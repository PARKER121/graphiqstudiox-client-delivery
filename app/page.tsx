import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-screen-xl flex-col px-4 py-10 sm:px-10">
      <section className="flex flex-1 flex-col justify-between gap-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-[var(--foreground-muted)]">
              Graphiq Studiox Delivery
            </p>
            <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-[var(--foreground)] sm:text-6xl">
              Deliver client work through a private payment unlock link.
            </h1>
          </div>
          <Link
            href="/admin"
            className="hidden rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-5 py-3 text-sm font-medium text-[var(--foreground)] shadow-[var(--shadow)] backdrop-blur sm:inline-flex"
          >
            Open Admin
          </Link>
        </div>
        <Link
          href="/admin"
          className="mt-6 inline-flex w-full justify-center rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-5 py-3 text-sm font-medium text-[var(--foreground)] shadow-[var(--shadow)] backdrop-blur sm:hidden"
        >
          Open Admin
        </Link>

        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.9fr]">
          <div className="overflow-hidden rounded-[36px] border border-white/60 bg-[var(--surface)] p-8 shadow-[var(--shadow)] backdrop-blur xl:p-12">
            <div className="max-w-2xl">
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-[var(--accent)]">
                Fast, secure, client-ready
              </p>
              <p className="mt-5 text-lg leading-8 text-[var(--foreground-muted)]">
                Upload previews to Cloudinary, keep final delivery files
                private in UploadThing, track everything in Supabase, and let
                clients unlock delivery with Paystack. No account creation. No
                exposed final URLs.
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                "Private token links",
                "Webhook-based unlocks",
                "Download-limited delivery",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-3xl border border-[var(--line)] bg-white/70 p-5 text-sm font-medium text-[var(--foreground)]"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[36px] border border-[var(--line)] bg-[var(--foreground)] p-8 text-white shadow-[var(--shadow)]">
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-white/60">
              Launch Checklist
            </p>
            <ol className="mt-6 space-y-5 text-sm leading-7 text-white/80">
              <li>1. Add your Supabase, Cloudinary, UploadThing, and Paystack env vars.</li>
              <li>2. Set an `ADMIN_PASSWORD` for the dashboard.</li>
              <li>3. Set the Paystack webhook to `/api/paystack/webhook`.</li>
              <li>4. Open `/admin`, upload a project, and share the link.</li>
            </ol>
            <Link
              href="/admin"
              className="mt-8 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-[var(--foreground)]"
            >
              Continue to Admin
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
