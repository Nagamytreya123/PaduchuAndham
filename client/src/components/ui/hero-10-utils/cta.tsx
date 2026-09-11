import { Link } from 'react-router-dom';
import type { VariantProps } from 'class-variance-authority';

import { Button, buttonVariants } from '@/components/ui/button';

export type CtaProps = {
  ctaEnabled?: boolean;
  text: string;
  link: string;
  variant?: VariantProps<typeof buttonVariants>['variant'];
  size?: VariantProps<typeof buttonVariants>['size'];
  className?: string;
};

function isExternalLink(link: string): boolean {
  return /^https?:\/\//i.test(link);
}

function isHashLink(link: string): boolean {
  return link.startsWith('#');
}

export function Cta({ cta }: Readonly<{ cta: CtaProps }>) {
  if (!cta.ctaEnabled) return null;

  const { text, link, variant = 'default', size = 'default', className } = cta;

  if (!link) {
    return (
      <Button type="button" variant={variant} size={size} className={className}>
        {text}
      </Button>
    );
  }

  if (isExternalLink(link)) {
    return (
      <Button asChild variant={variant} size={size} className={className}>
        <a href={link} target="_blank" rel="noopener noreferrer">
          {text}
        </a>
      </Button>
    );
  }

  if (isHashLink(link)) {
    return (
      <Button asChild variant={variant} size={size} className={className}>
        <a href={link}>{text}</a>
      </Button>
    );
  }

  return (
    <Button asChild variant={variant} size={size} className={className}>
      <Link to={link}>{text}</Link>
    </Button>
  );
}
