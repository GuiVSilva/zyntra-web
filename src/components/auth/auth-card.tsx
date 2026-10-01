import Link from 'next/link'

type AuthCardProps = {
  title: string
  description: string
  children: React.ReactNode
  /** Rendered under the form — the "no account yet?" line. */
  footer?: React.ReactNode
}

/**
 * The shell shared by every auth surface, so six screens cannot drift apart in
 * heading size, spacing, or where the secondary link sits.
 *
 * No longer an actual `Card`, despite the name it keeps for its six callers.
 * A card is a way of saying "this thing is separate from its background", and
 * on the split layout the form column *is* the background — a bordered box
 * floating inside a half-screen of empty page is a container drawn around
 * nothing. What the card was really providing was padding and a heading scale,
 * and those are cheaper as themselves.
 */
export function AuthCard({
  title,
  description,
  children,
  footer
}: AuthCardProps) {
  return (
    <>
      <div className="mb-7 space-y-2">
        {/* A real `<h1>`, not shadcn's `CardTitle`, which renders a `<div>`.
            On a card inside a dashboard that is the right call — a card is not
            a document section. On these screens this heading *is* the page
            title, and a page whose only visible title is a div gives a
            screen-reader user no heading to navigate to at all. */}
        <h1 className="font-heading text-[1.75rem] leading-[1.2] font-semibold tracking-(--tracking-display) text-balance lg:text-[2rem]">
          {title}
        </h1>
        <p className="text-muted-foreground text-[0.9375rem] leading-relaxed text-pretty">
          {description}
        </p>
      </div>

      {children}

      {footer ? (
        <p className="text-muted-foreground mt-8 text-center text-sm">
          {footer}
        </p>
      ) : null}
    </>
  )
}

/** The inline link style used in auth footers, in one place. */
export function AuthLink({
  href,
  children
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="text-foreground hover:text-primary focus-visible:ring-ring rounded-sm font-medium underline underline-offset-4 transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      {children}
    </Link>
  )
}
