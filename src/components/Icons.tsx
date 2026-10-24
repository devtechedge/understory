import type { SVGProps } from 'react';

export type IconName =
  | 'loupe'
  | 'snip'
  | 'mist'
  | 'pause'
  | 'play'
  | 'still'
  | 'sun'
  | 'moon'
  | 'shelf'
  | 'help'
  | 'expand'
  | 'collapse'
  | 'close'
  | 'download'
  | 'upload'
  | 'journal'
  | 'leaf'
  | 'arrow';

export function Icon({ name, size = 18, ...props }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {name === 'loupe' && (
        <>
          <circle cx="10.5" cy="10.5" r="6.2" />
          <path d="M15.2 15.2 L21 21" />
          <path d="M8.2 9.4 Q9.4 7.6 11.5 7.6" opacity="0.6" />
        </>
      )}
      {name === 'snip' && (
        <>
          <circle cx="6.5" cy="17.5" r="2.5" />
          <circle cx="17.5" cy="17.5" r="2.5" />
          <path d="M8.3 15.4 L19 3.5 M15.7 15.4 L5 3.5" />
        </>
      )}
      {name === 'mist' && (
        <>
          <path d="M12 3 Q16 8 16 12 A4 4 0 0 1 8 12 Q8 8 12 3 Z" />
          <path d="M5 19 L5 21 M9 18 L9 21 M13 19 L13 21 M17 18 L17 21 M21 19 L21 21" opacity="0.65" />
        </>
      )}
      {name === 'pause' && (
        <>
          <path d="M9 5 V19 M15 5 V19" />
        </>
      )}
      {name === 'play' && <path d="M8 5 L19 12 L8 19 Z" />}
      {name === 'still' && (
        <>
          <path d="M5 19 Q5 9 12 5 Q19 9 19 19" />
          <path d="M9 19 Q9 13 12 11 Q15 13 15 19" opacity="0.6" />
        </>
      )}
      {name === 'sun' && (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2 V4 M12 20 V22 M2 12 H4 M20 12 H22 M4.9 4.9 L6.3 6.3 M17.7 17.7 L19.1 19.1 M19.1 4.9 L17.7 6.3 M6.3 17.7 L4.9 19.1" />
        </>
      )}
      {name === 'moon' && <path d="M20 14.5 A8.5 8.5 0 0 1 9.5 4 A8.5 8.5 0 1 0 20 14.5 Z" />}
      {name === 'shelf' && (
        <>
          <path d="M4 4 H20 V20 H4 Z" />
          <path d="M4 13 H20 M8 13 V20 M15 13 V20" opacity="0.7" />
          <path d="M8 8 Q12 5 16 8" />
        </>
      )}
      {name === 'help' && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9.2 A2.6 2.6 0 1 1 13.4 11.8 Q12 12.6 12 14.2" />
          <path d="M12 17.4 V17.6" />
        </>
      )}
      {name === 'expand' && (
        <>
          <path d="M4 9 V4 H9 M15 4 H20 V9 M20 15 V20 H15 M9 20 H4 V15" />
        </>
      )}
      {name === 'collapse' && (
        <>
          <path d="M9 4 V9 H4 M20 9 H15 V4 M15 20 V15 H20 M4 15 H9 V20" />
        </>
      )}
      {name === 'close' && <path d="M6 6 L18 18 M18 6 L6 18" />}
      {name === 'download' && (
        <>
          <path d="M12 3 V15 M7 10 L12 15 L17 10" />
          <path d="M4 19 H20" />
        </>
      )}
      {name === 'upload' && (
        <>
          <path d="M12 15 V3 M7 8 L12 3 L17 8" />
          <path d="M4 19 H20" />
        </>
      )}
      {name === 'journal' && (
        <>
          <path d="M5 4 H17 Q19 4 19 6 V20 H7 Q5 20 5 18 Z" />
          <path d="M5 17 H19 M9 8 H15 M9 11 H15" opacity="0.65" />
        </>
      )}
      {name === 'leaf' && (
        <>
          <path d="M5 19 Q5 6 19 5 Q19 18 8 19 Z" />
          <path d="M8 16 Q12 12 16 8" />
        </>
      )}
      {name === 'arrow' && <path d="M4 12 H20 M14 6 L20 12 L14 18" />}
    </svg>
  );
}
