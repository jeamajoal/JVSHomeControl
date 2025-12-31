import React from 'react';

import jvsAutomateLogo from '../assets/jvsautomate-logo.svg';

const AboutPanel = () => {
  return (
    <div className="w-full h-full overflow-auto p-2 md:p-3">
      <div className="w-full">
        <div className="glass-panel border border-white/10 p-4 md:p-5">
          <div className="text-[11px] md:text-xs uppercase tracking-[0.2em] text-white/55 font-semibold">
            About
          </div>
          <div className="mt-1 text-xl md:text-2xl font-extrabold tracking-tight text-white">
            JVS Home Control
          </div>
          <div className="mt-1 text-xs text-white/45">
            Branding + contact info (text only; not clickable).
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
              <div className="flex items-center gap-4">
                <div className="shrink-0 rounded-2xl border border-white/10 bg-black/20 p-3">
                  <img
                    src={jvsAutomateLogo}
                    alt="JVS Automate"
                    className="w-14 h-14 md:w-16 md:h-16"
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-sm md:text-base font-extrabold text-white/90">JVS Automate</div>
                  <div className="mt-1 text-xs md:text-sm text-white/60">jvsautomate.com</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
              <div className="text-[11px] uppercase tracking-[0.2em] text-white/55 font-semibold">Contact</div>
              <div className="mt-3 text-sm md:text-base font-bold text-white/85">info@jvsautomate.com</div>
              <div className="mt-2 text-sm md:text-base font-bold text-white/85">(931) 450-8639</div>
              <div className="mt-2 text-xs text-white/50">Manchester, TN • Serving Middle Tennessee & Remote Clients Nationwide</div>
              <div className="mt-3 text-[11px] text-white/35">(Text only; not a hyperlink.)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPanel;
