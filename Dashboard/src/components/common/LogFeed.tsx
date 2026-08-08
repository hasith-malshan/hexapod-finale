import React, { useState } from 'react';
import type { LogEntry } from '../../types';
import { Terminal, Filter } from 'lucide-react';

interface LogFeedProps {
  logs: LogEntry[];
  clearLogs?: () => void;
}

export const LogFeed: React.FC<LogFeedProps> = ({ logs }) => {
  const [filterSource, setFilterSource] = useState<string>('ALL');
  const [filterLevel, setFilterLevel] = useState<string>('ALL');

  const filteredLogs = logs.filter(log => {
    const sourceMatch = filterSource === 'ALL' || log.source === filterSource;
    const levelMatch = filterLevel === 'ALL' || log.level === filterLevel;
    return sourceMatch && levelMatch;
  });

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'success': return 'text-[#00ff88]';
      case 'error': return 'text-[#ff3366]';
      case 'warn': return 'text-[#ffb703]';
      default: return 'text-[#8e9bb4]';
    }
  };

  const getSourceBadge = (source: LogEntry['source']) => {
    switch (source) {
      case 'ESP32': return <span className="bg-[#e74c3c]/15 text-[#e74c3c] border border-[#e74c3c]/25 px-1.5 py-0.5 rounded text-[8px] font-bold">ESP32</span>;
      case 'PI': return <span className="bg-[#2ecc71]/15 text-[#2ecc71] border border-[#2ecc71]/25 px-1.5 py-0.5 rounded text-[8px] font-bold">PI</span>;
      default: return <span className="bg-[#3498db]/15 text-[#3498db] border border-[#3498db]/25 px-1.5 py-0.5 rounded text-[8px] font-bold">DASH</span>;
    }
  };

  return (
    <div className="glass-card flex flex-col gap-4" style={{ height: '100%', minHeight: '300px' }}>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h3 className="title-glow flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#00f2fe]" /> System Console Logs
          </h3>
          <p className="subtitle">Real-time status registers from distributed nodes</p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/5 rounded-lg px-2 py-1">
            <Filter className="w-3.5 h-3.5 text-[#8e9bb4]" />
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="bg-transparent border-none text-white focus:outline-none text-[11px]"
            >
              <option value="ALL">ALL SOURCES</option>
              <option value="ESP32">ESP32 NODE</option>
              <option value="PI">PI BRAIN</option>
              <option value="DASHBOARD">DASHBOARD</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-white/5 border border-white/5 rounded-lg px-2 py-1">
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="bg-transparent border-none text-white focus:outline-none text-[11px]"
            >
              <option value="ALL">ALL LEVELS</option>
              <option value="info">INFO</option>
              <option value="success">SUCCESS</option>
              <option value="warn">WARNING</option>
              <option value="error">ERROR</option>
            </select>
          </div>
        </div>
      </div>

      {/* Terminal View */}
      <div 
        className="bg-black/50 border border-white/5 rounded-xl p-3 flex flex-col gap-2 overflow-y-auto font-mono text-[11px] leading-relaxed flex-1" 
        style={{ minHeight: '200px', maxHeight: '400px' }}
      >
        {filteredLogs.length === 0 ? (
          <div className="text-center text-[#8e9bb4] my-auto py-10">
            No system log records match filter query.
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="flex items-start gap-2.5 hover:bg-white/5 py-1 px-1.5 rounded transition-colors">
              <span className="text-[#8e9bb4] flex-shrink-0">[{log.timestamp}]</span>
              <span className="flex-shrink-0">{getSourceBadge(log.source)}</span>
              <span className={`${getLevelColor(log.level)} break-all`}>{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
