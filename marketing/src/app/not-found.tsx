import { LinkButton } from "@/components/link-button";

export default function NotFound() {
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <p className="text-sm font-medium text-brand-600">404</p>
      <h1 className="mt-3 text-3xl font-medium tracking-tight text-ink sm:text-4xl">This page does not exist</h1>
      <p className="mt-4 text-base leading-7 text-ink-secondary">
        The link may be old or mistyped. The home page has everything you need to get started.
      </p>
      <LinkButton href="/" className="mt-8">
        Back to the home page
      </LinkButton>
    </section>
  );
}
