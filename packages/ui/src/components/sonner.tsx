'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner, ToasterProps } from 'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className='toaster group'
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',

          '--success-bg': 'var(--accent)',
          // '--success-text': 'var(--accent-foreground)',
          '--success-border': 'var(--border)',

          '--error-bg': 'var(--accent)',
          // '--error-text': 'var(--card-foreground)',
          '--error-border': 'var(--border)',

          '--info-bg': 'var(--accent)',
          // '--info-text': 'var(--card-foreground)',
          '--info-border': 'var(--border)',

          '--warning-bg': 'var(--accent)',
          // '--warning-text': 'var(--card-foreground)',
          '--warning-border': 'var(--border)'
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {

          title: '!text-[var(--card-foreground)]',
          description: '!text-[var(--card-foreground)]',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
