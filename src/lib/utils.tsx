import { type ClassValue, clsx } from "clsx";
import { forwardRef } from "react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// forward refs
export function fr<T, P = object>(
  component: (props: P, ref: React.ForwardedRef<T>) => React.ReactNode
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wrapped = forwardRef(component as any);
  wrapped.displayName = component.name;
  return wrapped;
}

// styled element
export function se(
  Tag: keyof React.JSX.IntrinsicElements,
  ...classNames: ClassValue[]
) {
  const component = forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement> & { href?: string; target?: string }>(
    ({ className, ...props }, ref) => (
      // @ts-expect-error Too complicated for TypeScript
      <Tag ref={ref} className={cn(...classNames, className)} {...props} />
    )
  );
  component.displayName =
    String(Tag).charAt(0).toUpperCase() + String(Tag).slice(1);
  return component;
}
