import React, { useId } from 'react';

/**
 * DocVerifyLogo
 * High-definition vector logo matching user's document verification emblem.
 * Features true transparent cutouts (SVG mask) so it renders flawlessly on any background.
 */
export default function DocVerifyLogo({
  className = "w-8 h-8",
  checkColor = "#FFFDF8",
  ...props
}) {
  const maskId = useId();

  return (
    <svg
      viewBox="0 0 100 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="DocVerify AI Logo"
      {...props}
    >
      <defs>
        {/* Transparent Mask to create clean negative space around the shield */}
        <mask id={maskId}>
          {/* Base: Reveal everything */}
          <rect x="0" y="0" width="100" height="120" fill="#FFFFFF" />
          {/* Cutout: Mask out the area right behind and around the shield */}
          <path
            d="M28 72 C28 72 40 67 50 67 C60 67 72 72 72 72 C72 94 61 110 50 117 C39 110 28 94 28 72 Z"
            fill="#000000"
            stroke="#000000"
            strokeWidth="6"
            strokeLinejoin="round"
          />
        </mask>
      </defs>

      {/* Masked Group: Document Outline and Text Lines */}
      <g mask={`url(#${maskId})`}>
        {/* Document Sheet Outline */}
        <path
          d="M26 8 H58 L84 34 V94 C84 99.5 79.5 104 74 104 H26 C20.5 104 16 99.5 16 94 V18 C16 12.5 20.5 8 26 8 Z"
          stroke="currentColor"
          strokeWidth="7"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Top-Right Dog-Ear Folded Flap */}
        <path
          d="M58 8 V26 C58 30.5 61.5 34 66 34 H84 Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* 6 Document Text Lines */}
        <rect x="26" y="21" width="24" height="4.5" rx="2.25" fill="currentColor" />
        <rect x="26" y="32" width="48" height="4.5" rx="2.25" fill="currentColor" />
        <rect x="26" y="44" width="48" height="4.5" rx="2.25" fill="currentColor" />
        <rect x="26" y="56" width="48" height="4.5" rx="2.25" fill="currentColor" />
        <rect x="26" y="68" width="48" height="4.5" rx="2.25" fill="currentColor" />
        <rect x="26" y="80" width="48" height="4.5" rx="2.25" fill="currentColor" />
      </g>

      {/* Security Shield (Foreground) */}
      <path
        d="M30 75 C30 75 41 70 50 70 C59 70 70 75 70 75 C70 94 60 108 50 114 C40 108 30 94 30 75 Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
      />

      {/* Verification Checkmark inside the Shield */}
      <path
        d="M39.5 92 L46.5 98.5 L60.5 83"
        stroke={checkColor}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
