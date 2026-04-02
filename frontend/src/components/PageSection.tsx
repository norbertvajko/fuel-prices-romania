/**
 * Reusable container component for consistent page sections.
 * Applies: max-w-5xl, mx-auto, and responsive padding.
 */

import { forwardRef } from "react";

interface PageSectionProps {
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
}

const PageSection = forwardRef<HTMLDivElement, PageSectionProps>(
  ({ children, className = "", as: Component = "div" }, ref) => {
    return (
      <Component ref={ref} className={`w-full max-w-5xl mx-auto px-4 sm:px-0 ${className}`}>
        {children}
      </Component>
    );
  }
);

PageSection.displayName = "PageSection";

export default PageSection;