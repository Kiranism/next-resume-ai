'use client';

import React from 'react';
import { motion, type MotionProps } from 'motion/react';
import { cn } from '@/lib/utils';

type AnimatedButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  MotionProps & {
    children?: React.ReactNode;
    as?: any;
  };

/**
 * AnimatedButton — a standout CTA with an animated shine sweep across the label
 * and border. Theme-aware (light/dark) and accepts all native button props.
 */
const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  children = 'Browse Components',
  className = '',
  as = 'button',
  ...rest
}) => {
  const Component = (motion as any)[as] || motion.button;

  return (
    <Component
      {...rest}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30, mass: 0.5 }}
      className={cn(
        'group relative inline-flex items-center justify-center overflow-hidden rounded-md border border-neutral-200 bg-neutral-50 px-6 py-2 dark:border-[#222] dark:bg-black',
        'font-medium text-neutral-900 transition-colors focus-visible:ring-1 focus-visible:ring-neutral-950 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 dark:text-neutral-100',
        '[--shine:rgba(0,0,0,.66)] dark:[--shine:rgba(255,255,255,.66)]',
        className
      )}
    >
      {/* Text with shine mask */}
      <motion.span
        className='relative z-10 flex h-full w-full items-center justify-center gap-1.5 font-light tracking-wide'
        style={{
          WebkitMaskImage:
            'linear-gradient(-75deg, white calc(var(--mask-x) + 20%), transparent calc(var(--mask-x) + 30%), white calc(var(--mask-x) + 100%))',
          maskImage:
            'linear-gradient(-75deg, white calc(var(--mask-x) + 20%), transparent calc(var(--mask-x) + 30%), white calc(var(--mask-x) + 100%))'
        }}
        initial={{ ['--mask-x' as any]: '100%' } as any}
        animate={{ ['--mask-x' as any]: '-100%' } as any}
        transition={{
          repeat: Infinity,
          duration: 1,
          ease: 'linear',
          repeatDelay: 1
        }}
      >
        {children}
      </motion.span>

      {/* Border shine — uses --shine so it adapts to theme */}
      <motion.span
        className='absolute inset-0 block rounded-md p-px'
        style={{
          background:
            'linear-gradient(-75deg, transparent 30%, var(--shine) 50%, transparent 70%)',
          backgroundSize: '200% 100%',
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'exclude',
          WebkitMask:
            'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor'
        }}
        initial={{ backgroundPosition: '100% 0', opacity: 0 }}
        animate={{ backgroundPosition: ['100% 0', '0% 0'], opacity: [0, 1, 0] }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: 'linear',
          repeatDelay: 1
        }}
      />
    </Component>
  );
};

export default AnimatedButton;
