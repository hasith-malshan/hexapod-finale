import React, { useState, useEffect, useRef } from 'react';
import type { LogEntry } from '../../types';
import { Terminal, Filter, Trash2, ArrowDown, Radio } from 'lucide-react';

interface LogFeedProps {
  logs: LogEntry[];
  clearLogs?: () => void;
}

export const LogFeed: React.FC<LogFeedProps> = ({ logs, clearLogs }) => {
  const [filterSource, setFilterSource] = useState<string>('ALL');
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const filteredLogs = logs.filter(log => {
    const sourceMatch = filterSource === 'ALL' || log.source === filterSource;
    const levelMatch = filterLevel === 'ALL' || log.level === filterLevel;
    return sourceMatch && levelMatch;
  });

  // Auto-scroll to bottom on new logs if autoScroll is enabled
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'success': return 'text-[#00ff88]';
      case 'error': return 'text-[#ff3366] font-bold';
      case 'warn': return 'text-[#ffb703]';
      default: return 'text-[#e0e6ed]';
    }
  };

  const getSourceBadge = (source: LogEntry['source']) => {
    switch (source) {
      case 'ESP32': 
        return (
          <span className="bg-[#ffb703]/20 text-[#ffb703] border border-[#ffb703]/40 px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider">
            ESP32
          </span>
        );
      case 'PI': 
        return (
          <span className="bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/40 px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider">
            PI BRAIN
          </span>
        );
      default: 
        return (
          <span className="bg-[#00f2fe]/20 text-[#00f2fe] border border-[#00f2fe]/40 px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider">
            DASH
          </span>
        );
    }
  };

  return (
    <div className="glass-card flex flex-col gap-4" style={{ height: '100%', minHeight: '380px' }}>
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h3 className="title-glow flex items-center gap-2" style={{ margin: 0 }}>
            <Terminal className="w-4 h-4 text-[#00f2fe]" /> Live Telemetry & ESP32 Logging Screen
          </h3>
          <p className="subtitle" style={{ fontSize: '11px', margin: 0 }}>
            Real-time diagnostic registers streaming from ESP32 sensors & Raspberry Pi OS
          </p>
        </div>

        {/* Filter controls & Action buttons */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1 bg-black/40 border border-white/5 rounded-lg px-2 py-1 text-[10px] text-[#00ff88]">
            <Radio className="w-3 h-3 animate-pulse text-[#00ff88]" />
            <span>{filteredLogs.length} Events</span>
          </div>

          <div className="flex items-center gap-1.5 bg-white/5 border border-white/5 rounded-lg px-2 py-1">
            <Filter className="w-3.5 h-3.5 text-[#8e9bb4]" />
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="bg-transparent border-none text-white focus:outline-none text-[11px] cursor-pointer"
            >
              <option value="ALL">ALL SOURCES</option>
              <option value="ESP32">ESP32 SENSORS</option>
              <option value="PI">PI BRAIN</option>
              <option value="DASHBOARD">DASHBOARD</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-white/5 border border-white/5 rounded-lg px-2 py-1">
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="bg-transparent border-none text-white focus:outline-none text-[11px] cursor-pointer"
            >
              <option value="ALL">ALL SEVERITIES</option>
              <option value="info">INFO</option>
              <option value="success">SUCCESS</option>
              <option value="warn">WARNING</option>
              <option value="error">ERROR</option>
            </select>
          </div>

          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`glow-button ${autoScroll ? 'active' : ''}`}
            style={{ padding: '4px 10px', fontSize: '10px' }}
            title="Auto-scroll to latest incoming logs"
          >
            <ArrowDown className="w-3 h-3" />
            {autoScroll ? 'Auto-Scroll ON' : 'Paused'}
          </button>

          {clearLogs && (
            <button
              onClick={clearLogs}
              className="glow-button"
              style={{ padding: '4px 10px', fontSize: '10px', borderColor: 'rgba(255, 51, 102, 0.4)' }}
              title="Clear terminal buffer"
            >
              <Trash2 className="w-3 h-3 text-[#ff3366]" />
            </button>
          )}
        </div>
      </div>

      {/* Terminal Display Screen */}
      <div 
        ref={logContainerRef}
        className="bg-black/70 border border-white/10 rounded-xl p-3 flex flex-col gap-1.5 overflow-y-auto font-mono text-[11px] leading-relaxed flex-1 shadow-inner" 
        style={{ minHeight: '260px', maxHeight: '500px' }}
      >
        {filteredLogs.length === 0 ? (
          <div className="text-center text-[#8e9bb4] my-auto py-10">
            Awaiting streaming records from ESP32 & Pi Brain...
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div 
              key={log.id} 
              className="flex items-start gap-2.5 hover:bg-white/5 py-1 px-1.5 rounded transition-colors"
            >
              <span className="text-[#8e9bb4] text-[10px] flex-shrink-0">[{log.timestamp}]</span>
              <span className="flex-shrink-0">{getSourceBadge(log.source)}</span>
              <span className={`${getLevelColor(log.level)} break-all flex-1`}>{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
