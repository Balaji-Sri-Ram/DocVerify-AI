import React from 'react';
import DocVerifyLogo from './DocVerifyLogo';

export default function Footer() {
  return (
    <footer className="border-t border-muted-border bg-warm-white py-5 sm:py-6 text-center text-xs text-forest/70 space-y-2 mt-auto">
      <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4">
        <div className="flex items-center space-x-2">
          <DocVerifyLogo className="w-5 h-5 text-forest-deep shrink-0" />
          <span className="font-semibold text-forest-deep">DocVerify AI</span>
        </div>
        <div className="text-[10px] sm:text-[11px] text-forest/60">
          Powered by MobileNet v2 & TensorFlow.js • Built with React & Tailwind CSS
        </div>
      </div>
      <div className="text-[10px] text-forest/50 max-w-xl mx-auto px-4 leading-relaxed">
        Notice: This system performs visual document category classification only. It does not certify official government authenticity, legal status, or detect physical forgery.
      </div>
    </footer>
  );
}
