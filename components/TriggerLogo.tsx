import React from 'react';
import { Cpu } from 'lucide-react';

export const TriggerLogo = ({ className = "" }: { className?: string }) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <div className="relative flex items-center justify-center w-10 h-10 bg-slate-900 dark:bg-white rounded-lg shadow-lg">
      <Cpu size={24} className="text-white dark:text-slate-900" />
      <div className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 rounded-full border-2 border-white dark:border-slate-900"></div>
    </div>
    <div className="flex flex-col justify-center">
      <h1 className="text-2xl font-black tracking-tighter leading-none text-slate-900 dark:text-white">
        TRIGGER<span className="text-indigo-600 dark:text-indigo-400">.IA</span>
      </h1>
      <span className="text-[0.65rem] font-bold tracking-widest uppercase text-slate-400 dark:text-slate-500 leading-none mt-0.5">
        Intelligence CRM
      </span>
    </div>
  </div>
);