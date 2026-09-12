import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Sparkles, 
  Wifi, 
  WifiOff, 
  Database, 
  CloudUpload, 
  Radio, 
  Layers, 
  Activity,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { UniversityName, UNIVERSITIES } from '../types';

interface ConstellationProps {
  selectedUniversity: UniversityName | null;
  onSelectUniversity: (univ: UniversityName) => void;
  isOnline: boolean;
  totalConsolidated: number;
  queuedCount: number;
  activePartsCount: number;
  isConsolidating?: boolean;
}

export const ConsolidationConstellation: React.FC<ConstellationProps> = ({
  selectedUniversity,
  onSelectUniversity,
  isOnline,
  totalConsolidated,
  queuedCount,
  activePartsCount,
  isConsolidating = false,
}) => {
  const [pulseKey, setPulseKey] = useState(0);

  // Trigger visual fiber pulse whenever entries are consolidated
  useEffect(() => {
    if (isConsolidating) {
      setPulseKey((prev) => prev + 1);
    }
  }, [isConsolidating, totalConsolidated]);

  // University nodes coordinates in 600x480 coordinate space
  const campusNodes = [
    {
      id: 'kiu',
      name: 'Kampala International University (KIU)' as UniversityName,
      acronym: 'KIU',
      campus: 'Kansanga / Ishaka',
      x: 390,
      y: 85,
      color: '#10b981', // emerald
      glow: 'rgba(16, 185, 129, 0.4)',
      subNodes: ['Gate 1 Mobilizer', 'Pharmacy Hub', 'Science Wing'],
    },
    {
      id: 'cavendish',
      name: 'Cavendish University Uganda' as UniversityName,
      acronym: 'CUU',
      campus: 'Nsambya Kingsgate',
      x: 430,
      y: 155,
      color: '#3b82f6', // blue
      glow: 'rgba(59, 130, 246, 0.4)',
      subNodes: ['Law Faculty Desk', 'Kingsgate Entry', 'Student Center'],
    },
    {
      id: 'iuea',
      name: 'International University of East Africa (IUEA)' as UniversityName,
      acronym: 'IUEA',
      campus: 'Kansanga Main Quad',
      x: 440,
      y: 235,
      color: '#a855f7', // purple
      glow: 'rgba(168, 85, 247, 0.4)',
      subNodes: ['Tech Pavilion', 'Main Quad Desk', 'Engineering Lab'],
    },
    {
      id: 'ciu',
      name: 'Clarke International University (CIU)' as UniversityName,
      acronym: 'CIU',
      campus: 'Muyenga / Bukoto',
      x: 420,
      y: 315,
      color: '#f59e0b', // amber
      glow: 'rgba(245, 158, 11, 0.4)',
      subNodes: ['Health Sciences', 'Hospital Gate', 'Bukoto Clinic'],
    },
    {
      id: 'kcu',
      name: 'King Caesar University (KCU)' as UniversityName,
      acronym: 'KCU',
      campus: 'Bunga Campus',
      x: 375,
      y: 395,
      color: '#f43f5e', // rose
      glow: 'rgba(244, 63, 94, 0.4)',
      subNodes: ['Bunga Main Gate', 'School of Law', 'Medical Tent'],
    },
  ];

  // Core coordinates
  const coreX = 145;
  const coreY = 240;

  return (
    <div className="relative w-full h-full min-h-[460px] sm:min-h-[520px] rounded-3xl bg-[#060a0f] border border-cyan-900/40 p-4 overflow-hidden select-none shadow-2xl flex flex-col justify-between">
      {/* Background Cybernetic Ambient Glow and Grid Lines */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_20%_40%,rgba(14,165,233,0.12),transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_65%,rgba(168,85,247,0.08),transparent_60%)] pointer-events-none" />
      
      {/* Perspective Cyber Lines */}
      <div 
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(56, 189, 248, 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(56, 189, 248, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Top Banner / Stream Telemetry Tag */}
      <div className="relative z-10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold tracking-widest text-cyan-300 uppercase">
                CONSOLIDATION MATRIX NEXUS
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-700/60 text-cyan-300">
                MULTI-PART CONCURRENT
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Consolidating {activePartsCount} active streams • Real-time de-duplication
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOnline ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold text-emerald-400 bg-emerald-950/70 border border-emerald-700/70 px-2.5 py-1 rounded-full">
              <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
              ONLINE CORE
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-amber-300 bg-amber-950/80 border border-amber-600/80 px-2.5 py-1 rounded-full">
              <WifiOff className="w-3 h-3 text-amber-400" />
              OFFLINE CACHE
            </span>
          )}

          {queuedCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-amber-300 bg-amber-950/80 border border-amber-600/70 px-2.5 py-1 rounded-full animate-pulse">
              <CloudUpload className="w-3 h-3 text-amber-400" />
              {queuedCount} IN OUTBOX
            </span>
          )}
        </div>
      </div>

      {/* Interactive Constellation SVG Stage */}
      <div className="relative flex-1 w-full h-full min-h-[340px] my-2">
        <svg 
          viewBox="0 0 540 460" 
          className="w-full h-full overflow-visible"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Core Radiant Nebula Gradient */}
            <radialGradient id="quantumCore" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="1" />
              <stop offset="45%" stopColor="#818cf8" stopOpacity="0.8" />
              <stop offset="80%" stopColor="#4f46e5" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#060a0f" stopOpacity="0" />
            </radialGradient>

            {/* Glowing Golden-Cyan Bezier Line Gradient */}
            <linearGradient id="fiberLine" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.7" />
              <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.9" />
            </linearGradient>

            {/* Glow Filter */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Intense Node Glow */}
            <filter id="intenseGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Curved Bezier Rays Connecting Core to Campus Streams */}
          {campusNodes.map((node, i) => {
            const isSelected = selectedUniversity === node.name;
            const cpx1 = coreX + 110;
            const cpy1 = coreY + (node.y - coreY) * 0.15;
            const cpx2 = node.x - 70;
            const cpy2 = node.y;

            return (
              <g key={node.id}>
                {/* Secondary Background Fiber Wave */}
                <path
                  d={`M ${coreX} ${coreY} C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${node.x} ${node.y}`}
                  fill="none"
                  stroke={node.color}
                  strokeWidth={isSelected ? '2.5' : '1.2'}
                  strokeOpacity={isSelected ? '0.7' : '0.25'}
                  strokeDasharray={isSelected ? 'none' : '4 3'}
                />

                {/* Main Glowing Fiber Path */}
                <path
                  d={`M ${coreX} ${coreY} C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${node.x} ${node.y}`}
                  fill="none"
                  stroke={isSelected ? '#38bdf8' : 'url(#fiberLine)'}
                  strokeWidth={isSelected ? '2.8' : '1.8'}
                  filter="url(#glow)"
                  opacity={isSelected ? 1 : 0.65}
                />

                {/* Animated Data Pulses Traveling Along the Fibers */}
                <circle r={isSelected ? '3.5' : '2.5'} fill="#facc15" filter="url(#intenseGlow)">
                  <animateMotion
                    dur={`${2.4 + i * 0.4}s`}
                    repeatCount="indefinite"
                    path={`M ${node.x} ${node.y} C ${cpx2} ${cpy2}, ${cpx1} ${cpy1}, ${coreX} ${coreY}`}
                  />
                </circle>
                <circle r="2" fill="#38bdf8">
                  <animateMotion
                    dur={`${3.0 + i * 0.3}s`}
                    repeatCount="indefinite"
                    path={`M ${coreX} ${coreY} C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${node.x} ${node.y}`}
                  />
                </circle>

                {/* Sub-node branch splines radiating from campus node */}
                {node.subNodes.map((sub, sIdx) => {
                  const subX = node.x + 95;
                  const subY = node.y + (sIdx - 1) * 14;
                  return (
                    <g key={sub}>
                      <path
                        d={`M ${node.x + 10} ${node.y} C ${node.x + 40} ${node.y}, ${subX - 25} ${subY}, ${subX} ${subY}`}
                        fill="none"
                        stroke={node.color}
                        strokeWidth="0.8"
                        strokeOpacity="0.35"
                      />
                      <circle cx={subX} cy={subY} r="1.5" fill={node.color} opacity="0.6" />
                      <text
                        x={subX + 5}
                        y={subY + 3}
                        fill="#94a3b8"
                        fontSize="7"
                        fontFamily="monospace"
                        opacity="0.8"
                      >
                        {sub}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* Central Celestial Quantum Nucleus (The Core) */}
          <g className="cursor-pointer" transform={`translate(${coreX}, ${coreY})`}>
            {/* Outer Orbital Rings */}
            <circle r="68" fill="none" stroke="#38bdf8" strokeWidth="0.8" strokeDasharray="3 6" opacity="0.3">
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0"
                to="360"
                dur="30s"
                repeatCount="indefinite"
              />
            </circle>
            <circle r="52" fill="none" stroke="#818cf8" strokeWidth="1" strokeDasharray="6 4" opacity="0.4">
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="360"
                to="0"
                dur="20s"
                repeatCount="indefinite"
              />
            </circle>

            {/* Glowing Nebula Sphere */}
            <circle r="38" fill="url(#quantumCore)" filter="url(#intenseGlow)" />
            <circle r="26" fill="#0c1929" stroke="#38bdf8" strokeWidth="1.5" />
            <circle r="14" fill="#38bdf8" opacity="0.8" filter="url(#glow)">
              <animate attributeName="r" values="12;16;12" dur="3s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.6;1;0.6" dur="3s" repeatCount="indefinite" />
            </circle>

            {/* Core Label */}
            <text
              y="-4"
              textAnchor="middle"
              fill="#ffffff"
              fontSize="8"
              fontWeight="bold"
              fontFamily="monospace"
            >
              CENTRAL
            </text>
            <text
              y="6"
              textAnchor="middle"
              fill="#38bdf8"
              fontSize="7"
              fontWeight="bold"
              fontFamily="monospace"
            >
              CORE
            </text>
            <text
              y="16"
              textAnchor="middle"
              fill="#facc15"
              fontSize="9"
              fontWeight="extrabold"
              fontFamily="monospace"
            >
              {totalConsolidated}
            </text>
          </g>

          {/* The 5 Campus Stream Interactive Nodes */}
          {campusNodes.map((node) => {
            const isSelected = selectedUniversity === node.name;
            return (
              <g
                key={node.id}
                className="cursor-pointer transition-all duration-300 group"
                onClick={() => onSelectUniversity(node.name)}
              >
                {/* Node Outer Selection Halo */}
                {isSelected && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="20"
                    fill="none"
                    stroke={node.color}
                    strokeWidth="1.5"
                    strokeDasharray="4 2"
                    filter="url(#glow)"
                  >
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      from={`0 ${node.x} ${node.y}`}
                      to={`360 ${node.x} ${node.y}`}
                      dur="12s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}

                {/* Node Backing Pill Card */}
                <rect
                  x={node.x - 48}
                  y={node.y - 14}
                  width="96"
                  height="28"
                  rx="14"
                  fill="#0b131e"
                  stroke={isSelected ? '#38bdf8' : node.color}
                  strokeWidth={isSelected ? '2' : '1'}
                  filter={isSelected ? 'url(#intenseGlow)' : 'url(#glow)'}
                  opacity={isSelected ? 1 : 0.85}
                  className="group-hover:opacity-100 transition"
                />

                {/* Node Center Dot */}
                <circle
                  cx={node.x - 34}
                  cy={node.y}
                  r="4"
                  fill={node.color}
                  filter="url(#glow)"
                />

                {/* Acronym Text */}
                <text
                  x={node.x - 24}
                  y={node.y + 3}
                  fill="#ffffff"
                  fontSize="9"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {node.acronym}
                </text>

                {/* Status Pill on Node (similar to GAPS 12% in the PNG) */}
                <rect
                  x={node.x + 10}
                  y={node.y - 8}
                  width="30"
                  height="16"
                  rx="8"
                  fill={isSelected ? '#1e3a8a' : '#03201d'}
                  stroke={node.color}
                  strokeWidth="0.8"
                />
                <text
                  x={node.x + 25}
                  y={node.y + 3.5}
                  textAnchor="middle"
                  fill={node.color}
                  fontSize="7.5"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  SYNC
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Bottom Floating Legend (Styled faithfully to the legend in the uploaded PNG) */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-cyan-900/30 text-[10px] font-mono text-slate-400">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">LEGEND:</span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            Consolidation Core
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            KIU Stream
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            CUU Stream
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            IUEA Stream
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            CIU Stream
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            KCU Stream
          </span>
        </div>

        <div className="text-[10px] text-cyan-300/80 font-mono">
          Click any campus node to switch active channel
        </div>
      </div>
    </div>
  );
};
