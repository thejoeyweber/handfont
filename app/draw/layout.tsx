"use server"

export default async function DrawLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-[100dvh] overflow-hidden bg-white p-0">
      <main className="m-0 size-full p-0">{children}</main>
    </div>
  )
}
