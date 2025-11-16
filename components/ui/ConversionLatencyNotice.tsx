// Win Room v2.0 - Conversion latency info tooltip

interface ConversionLatencyNoticeProps {
  className?: string;
}

export function ConversionLatencyNotice({ className = '' }: ConversionLatencyNoticeProps) {
  return (
    <div className={`group relative inline-block ${className}`}>
      <span className="cursor-help text-amber-400/80 hover:text-amber-300 transition-colors text-sm">
        ℹ️
      </span>

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-20">
        <div className="bg-surface/95 backdrop-blur border border-amber-400/40 rounded-lg p-3 shadow-xl min-w-[320px] max-w-[380px] whitespace-normal">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-amber-200 uppercase tracking-wider">
              ⏰ Conversion Rate Calculation
            </span>
          </div>

          <div className="space-y-2 text-[11px] text-foreground/80 leading-relaxed">
            <p>
              <strong className="text-amber-300">Daily:</strong> T-4 (96 hours ago)
            </p>
            <p>
              <strong className="text-amber-300">Weekly:</strong> Previous week
            </p>
            <p>
              <strong className="text-amber-300">15-Day:</strong> Calendar half-month (1-15 or 16-END)
            </p>
            <p>
              <strong className="text-amber-300">Monthly:</strong> Previous month
            </p>
            <p className="pt-2 border-t border-border/30 text-[10px] text-foreground/60">
              💡 Data is calculated with delay due to lead → win latency
            </p>
          </div>

          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-amber-400/40" />
        </div>
      </div>
    </div>
  );
}
