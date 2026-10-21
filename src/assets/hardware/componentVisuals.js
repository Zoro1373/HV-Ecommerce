/**
 * VERTEX Component Technical Illustrations & Visual Helpers
 * 
 * Provides crisp, high-precision technical SVGs and artwork for industrial components,
 * EV-grade lithium-ion cells, precision fasteners, and embedded electronics.
 */

import React from "react";
import arduinoImg from "./arduino.jpg";
import automationImg from "./automation.jpg";
import breadboardImg from "./breadboard.jpg";
import fastenersImg from "./fasteners.jpg";
import pcbImg from "./pcb.jpg";

import slottedChhdImg from "./screws/slotted-chhd.svg";
import panHeadImg from "./screws/pan-head.svg";
import countersunkCskImg from "./screws/countersunk-csk.svg";
import selfTappingPanImg from "./screws/self-tapping-pan.svg";
import selfTappingCskImg from "./screws/self-tapping-csk.svg";
import laptopMobileImg from "./screws/laptop-mobile-screws.svg";
import drywallGypsumImg from "./screws/drywall-gypsum.svg";
import selfDrillingPanImg from "./screws/self-drilling-pan.svg";
import socketHeadImg from "./screws/socket-head.svg";
import buttonHeadImg from "./screws/button-head.svg";
import allenCountersunkCskImg from "./screws/allen-countersunk-csk.svg";
import hexBoltImg from "./screws/hex-bolt.svg";

export const PRODUCT_PHOTOS = {
  arduino: arduinoImg,
  automation: automationImg,
  breadboard: breadboardImg,
  fasteners: fastenersImg,
  pcb: pcbImg,
  slottedChhd: slottedChhdImg,
  panHead: panHeadImg,
  countersunkCsk: countersunkCskImg,
  selfTappingPan: selfTappingPanImg,
  selfTappingCsk: selfTappingCskImg,
  laptopMobile: laptopMobileImg,
  drywallGypsum: drywallGypsumImg,
  selfDrillingPan: selfDrillingPanImg,
  socketHead: socketHeadImg,
  buttonHead: buttonHeadImg,
  allenCountersunkCsk: allenCountersunkCskImg,
  hexBolt: hexBoltImg,
};

/**
 * Returns an appropriate SVG or image for a given product slug and category.
 */
export function getProductVisual(product) {
  if (!product) return null;
  if (product.imageUrl) return product.imageUrl;

  const slug = (product.slug || "").toLowerCase();

  // Screws catalog matching
  if (slug.includes("slotted-chhd")) return slottedChhdImg;
  if (slug.includes("pan-head")) return panHeadImg;
  if (slug.includes("countersunk-csk") && !slug.includes("allen")) return countersunkCskImg;
  if (slug.includes("self-tapping-pan")) return selfTappingPanImg;
  if (slug.includes("self-tapping-countersunk") || slug.includes("self-tapping-csk")) return selfTappingCskImg;
  if (slug.includes("laptop") || slug.includes("mobile")) return laptopMobileImg;
  if (slug.includes("drywall") || slug.includes("gypsum")) return drywallGypsumImg;
  if (slug.includes("self-drilling") || slug.includes("tek")) return selfDrillingPanImg;
  if (slug.includes("socket-head")) return socketHeadImg;
  if (slug.includes("button-head")) return buttonHeadImg;
  if (slug.includes("allen-countersunk")) return allenCountersunkCskImg;
  if (slug.includes("hex-bolt")) return hexBoltImg;

  // 1. Existing photographed items
  if (slug.includes("arduino-uno")) return arduinoImg;
  if (slug.includes("raspberry-pi")) return arduinoImg;
  if (slug.includes("l298n")) return automationImg;
  if (slug.includes("plc-delta")) return pcbImg;
  if (slug.includes("breadboard")) return breadboardImg;
  if (slug.includes("hex-nut") || slug.includes("nyloc") || slug.includes("washer") || slug.includes("insert")) return fastenersImg;

  return null;
}

/**
 * Technical SVG Component Illustration
 */
export function ComponentIllustration({ type, brand = "VERTEX", specs = {}, className = "" }) {
  // Battery Cell Illustration (18650 or 21700)
  if (type === "battery" || specs.CellFormat || specs.Chemistry) {
    const is21700 = (specs.CellFormat || "").includes("21700");
    const isEV = (specs.Grade || "").includes("EV") || brand === "DMEGC";
    const cellColor = brand === "DMEGC" ? "#2563eb" : brand === "Panasonic" ? "#0284c7" : "#0d9488";
    
    return (
      <svg
        viewBox="0 0 240 180"
        className={`component-svg vtx-battery-svg ${className}`}
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={`cellGrad-${brand}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={cellColor} stopOpacity="0.9" />
            <stop offset="50%" stopColor={cellColor} />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <linearGradient id="metalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="50%" stopColor="#f1f5f9" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
        </defs>
        
        {/* Background grid */}
        <rect width="240" height="180" fill="#0b1728" rx="8" />
        <path d="M 20 0 L 20 180 M 60 0 L 60 180 M 100 0 L 100 180 M 140 0 L 140 180 M 180 0 L 180 180 M 220 0 L 220 180" stroke="#1e293b" strokeWidth="1" strokeDasharray="3,3" />
        <path d="M 0 30 L 240 30 M 0 60 L 240 60 M 0 90 L 240 90 M 0 120 L 240 120 M 0 150 L 240 150" stroke="#1e293b" strokeWidth="1" strokeDasharray="3,3" />

        {/* Battery Cylinder Body */}
        {/* Positive terminal nipple */}
        <rect x={is21700 ? "46" : "50"} y="52" width={is21700 ? "148" : "140"} height="14" rx="4" fill="url(#metalGrad)" stroke="#475569" strokeWidth="1" />
        <rect x="95" y="44" width="50" height="9" rx="3" fill="url(#metalGrad)" stroke="#334155" strokeWidth="1" />
        
        {/* Main sleeve */}
        <rect
          x={is21700 ? "44" : "48"}
          y="64"
          width={is21700 ? "152" : "144"}
          height="82"
          rx="6"
          fill={`url(#cellGrad-${brand})`}
          stroke="#38bdf8"
          strokeWidth="1.5"
        />

        {/* Highlight sheen */}
        <rect x={is21700 ? "50" : "54"} y="68" width={is21700 ? "140" : "132"} height="10" rx="3" fill="#ffffff" fillOpacity="0.18" />

        {/* Label on Cell */}
        <text x="120" y="94" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="bold" letterSpacing="1">
          {brand.toUpperCase()} {is21700 ? "21700" : "18650"}
        </text>
        <text x="120" y="112" textAnchor="middle" fill="#93c5fd" fontSize="11" fontFamily="monospace">
          {specs.NominalVoltage ? `${specs.NominalVoltage} • ` : ""}{specs.RatedCapacity || "EV CELL"}
        </text>
        <text x="120" y="128" textAnchor="middle" fill="#38bdf8" fontSize="9" fontWeight="600" letterSpacing="0.5">
          {specs.Grade || "INDUSTRIAL GRADE"}
        </text>

        {/* Negative Base */}
        <rect x={is21700 ? "46" : "50"} y="145" width={is21700 ? "148" : "140"} height="6" rx="2" fill="url(#metalGrad)" stroke="#475569" strokeWidth="1" />

        {/* Technical specs pill */}
        <rect x="12" y="12" width="76" height="20" rx="4" fill="#1e293b" fillOpacity="0.85" stroke="#334155" strokeWidth="1" />
        <text x="50" y="26" textAnchor="middle" fill="#38bdf8" fontSize="10" fontWeight="bold">
          {is21700 ? "21700 CELL" : "18650 CELL"}
        </text>
        {isEV && (
          <g>
            <rect x="160" y="12" width="68" height="20" rx="4" fill="#065f46" fillOpacity="0.85" stroke="#059669" strokeWidth="1" />
            <text x="194" y="26" textAnchor="middle" fill="#34d399" fontSize="10" fontWeight="bold">
              ⚡ EV GRADE
            </text>
          </g>
        )}
      </svg>
    );
  }

  // Fasteners & Screws Illustration
  if (type === "fastener" || type === "screw" || type === "nut" || type === "washer" || type === "insert") {
    const isPhillips = (specs.DriveType || "").includes("Phillips") || (specs.DriveType || "").includes("Cross");
    const isSlotted = (specs.DriveType || "").includes("Slotted");
    const isNut = type === "nut" || (specs.Type || "").includes("Nut");
    const isWasher = type === "washer" || (specs.Type || "").includes("Washer");
    const isBrass = type === "insert" || (specs.Material || "").includes("Brass");

    return (
      <svg
        viewBox="0 0 240 180"
        className={`component-svg vtx-fastener-svg ${className}`}
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="steelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="40%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>
          <linearGradient id="brassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#ca8a04" />
            <stop offset="100%" stopColor="#713f12" />
          </linearGradient>
          <pattern id="threadPattern" width="10" height="8" patternUnits="userSpaceOnUse">
            <path d="M 0 0 L 10 4 M 0 4 L 10 8" stroke="#475569" strokeWidth="1.5" />
          </pattern>
        </defs>

        {/* Blueprint background */}
        <rect width="240" height="180" fill="#0c1e33" rx="8" />
        <circle cx="120" cy="90" r="70" fill="none" stroke="#1e3a5f" strokeWidth="1" strokeDasharray="4,4" />
        <path d="M 120 10 L 120 170 M 30 90 L 210 90" stroke="#1e3a5f" strokeWidth="1" strokeDasharray="2,2" />

        {isBrass ? (
          // Brass Insert
          <g>
            <rect x="80" y="45" width="80" height="90" rx="4" fill="url(#brassGrad)" stroke="#a16207" strokeWidth="2" />
            {/* Knurl hatch */}
            <path d="M 85 55 L 155 75 M 85 75 L 155 95 M 85 95 L 155 115" stroke="#713f12" strokeWidth="2.5" />
            <path d="M 155 55 L 85 75 M 155 75 L 85 95 M 155 95 L 85 115" stroke="#713f12" strokeWidth="2.5" />
            {/* Inner thread bore */}
            <circle cx="120" cy="90" r="18" fill="#1e293b" stroke="#ca8a04" strokeWidth="2" />
            <circle cx="120" cy="90" r="12" fill="#0f172a" stroke="#ca8a04" strokeWidth="1" strokeDasharray="2,2" />
            <text x="120" y="156" textAnchor="middle" fill="#facc15" fontSize="10" fontWeight="bold" letterSpacing="0.5">
              BRASS THREADED INSERT
            </text>
          </g>
        ) : isWasher ? (
          // Washer
          <g>
            <circle cx="120" cy="90" r="54" fill="url(#steelGrad)" stroke="#64748b" strokeWidth="2" />
            <circle cx="120" cy="90" r="28" fill="#0c1e33" stroke="#94a3b8" strokeWidth="2" />
            <text x="120" y="160" textAnchor="middle" fill="#93c5fd" fontSize="10" fontWeight="bold">
              PRECISION WASHER
            </text>
          </g>
        ) : isNut ? (
          // Hex / Nyloc Nut
          <g>
            {/* Hexagon outer */}
            <polygon
              points="120,40 166,66 166,118 120,144 74,118 74,66"
              fill="url(#steelGrad)"
              stroke="#cbd5e1"
              strokeWidth="2.5"
            />
            {/* Inner circle with thread */}
            <circle cx="120" cy="92" r="24" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
            <circle cx="120" cy="92" r="18" fill="none" stroke="#64748b" strokeWidth="1.5" strokeDasharray="3,2" />
            {specs.LockingMechanism && (
              <circle cx="120" cy="92" r="21" fill="none" stroke="#2563eb" strokeWidth="3" />
            )}
            <text x="120" y="162" textAnchor="middle" fill="#93c5fd" fontSize="10" fontWeight="bold">
              {specs.Type || "HEX FASTENER NUT"}
            </text>
          </g>
        ) : (
          // Screw / Bolt
          <g>
            {/* Screw head */}
            <rect x="70" y="38" width="100" height="26" rx="4" fill="url(#steelGrad)" stroke="#e2e8f0" strokeWidth="1.5" />
            {/* Screw drive recess */}
            {isPhillips ? (
              <g stroke="#0f172a" strokeWidth="4" strokeLinecap="round">
                <line x1="120" y1="44" x2="120" y2="58" />
                <line x1="113" y1="51" x2="127" y2="51" />
              </g>
            ) : isSlotted ? (
              <line x1="95" y1="51" x2="145" y2="51" stroke="#0f172a" strokeWidth="4" strokeLinecap="round" />
            ) : (
              // Hex socket
              <polygon points="120,44 128,48 128,56 120,60 112,56 112,48" fill="#0f172a" />
            )}
            {/* Screw Shank & Threads */}
            <rect x="96" y="64" width="48" height="74" fill="url(#steelGrad)" stroke="#64748b" strokeWidth="1.5" />
            <rect x="96" y="72" width="48" height="66" fill="url(#threadPattern)" />
            {/* Point */}
            <polygon points="96,138 144,138 120,154" fill="url(#steelGrad)" stroke="#64748b" strokeWidth="1" />
            <text x="120" y="168" textAnchor="middle" fill="#93c5fd" fontSize="10" fontWeight="bold">
              {specs.HeadType || "PRECISION FASTENER"}
            </text>
          </g>
        )}

        {/* Quality stamp */}
        <rect x="12" y="12" width="70" height="18" rx="3" fill="#1e293b" />
        <text x="47" y="24" textAnchor="middle" fill="#38bdf8" fontSize="9" fontWeight="bold">
          SS304 / ISO
        </text>
      </svg>
    );
  }

  // Microcontroller, Motor Driver, Buck Converter, Electronics Illustration
  return (
    <svg
      viewBox="0 0 240 180"
      className={`component-svg vtx-electronic-svg ${className}`}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="pcbGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#064e3b" />
          <stop offset="50%" stopColor="#047857" />
          <stop offset="100%" stopColor="#065f46" />
        </linearGradient>
        <linearGradient id="chipGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>
        <linearGradient id="heatsinkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="50%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
      </defs>

      {/* Background chassis */}
      <rect width="240" height="180" fill="#09182d" rx="8" />

      {/* PCB Board */}
      <rect x="30" y="25" width="180" height="130" rx="8" fill="url(#pcbGrad)" stroke="#10b981" strokeWidth="2" />

      {/* Mounting holes */}
      <circle cx="42" cy="37" r="4" fill="#09182d" stroke="#facc15" strokeWidth="1.5" />
      <circle cx="198" cy="37" r="4" fill="#09182d" stroke="#facc15" strokeWidth="1.5" />
      <circle cx="42" cy="143" r="4" fill="#09182d" stroke="#facc15" strokeWidth="1.5" />
      <circle cx="198" cy="143" r="4" fill="#09182d" stroke="#facc15" strokeWidth="1.5" />

      {/* PCB Copper Traces */}
      <path d="M 50 60 L 90 60 L 105 75 M 50 80 L 80 80 L 100 100 M 150 75 L 180 75 M 150 105 L 190 105" stroke="#34d399" strokeWidth="1.5" strokeOpacity="0.4" fill="none" />

      {/* Central IC or Heatsink */}
      {specs.CurrentRating || specs.MaxPower ? (
        // Power Driver / Buck Converter with Heatsink
        <g>
          <rect x="75" y="55" width="90" height="60" rx="4" fill="url(#heatsinkGrad)" stroke="#94a3b8" strokeWidth="1.5" />
          <line x1="85" y1="55" x2="85" y2="115" stroke="#0f172a" strokeWidth="2" />
          <line x1="100" y1="55" x2="100" y2="115" stroke="#0f172a" strokeWidth="2" />
          <line x1="120" y1="55" x2="120" y2="115" stroke="#0f172a" strokeWidth="2" />
          <line x1="140" y1="55" x2="140" y2="115" stroke="#0f172a" strokeWidth="2" />
          <line x1="155" y1="55" x2="155" y2="115" stroke="#0f172a" strokeWidth="2" />
          <rect x="90" y="75" width="60" height="24" rx="2" fill="#0f172a" />
          <text x="120" y="91" textAnchor="middle" fill="#38bdf8" fontSize="10" fontWeight="bold">
            {specs.CurrentRating || specs.MaxPower || "HVNEX"}
          </text>
        </g>
      ) : (
        // MCU Chip
        <g>
          <rect x="85" y="60" width="70" height="60" rx="4" fill="url(#chipGrad)" stroke="#38bdf8" strokeWidth="1.5" />
          <circle cx="95" cy="70" r="2.5" fill="#38bdf8" />
          <text x="120" y="88" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold" letterSpacing="1">
            {brand}
          </text>
          <text x="120" y="104" textAnchor="middle" fill="#38bdf8" fontSize="9" fontFamily="monospace">
            {specs.Model || "SOC CONTROLLER"}
          </text>
        </g>
      )}

      {/* Header Pins */}
      <rect x="40" y="148" width="160" height="6" fill="#0f172a" rx="1" />
      <path d="M 45 154 L 45 162 M 55 154 L 55 162 M 65 154 L 65 162 M 75 154 L 75 162 M 85 154 L 85 162 M 155 154 L 155 162 M 165 154 L 165 162 M 175 154 L 175 162 M 185 154 L 185 162 M 195 154 L 195 162" stroke="#facc15" strokeWidth="2" />

      {/* Status LED */}
      <circle cx="180" cy="50" r="3" fill="#10b981" />
      <circle cx="180" cy="50" r="6" fill="#10b981" fillOpacity="0.3" />

      {/* Corner Label */}
      <rect x="12" y="10" width="84" height="18" rx="3" fill="#1e293b" />
      <text x="54" y="22" textAnchor="middle" fill="#34d399" fontSize="9" fontWeight="bold">
        {brand.toUpperCase()} MODULE
      </text>
    </svg>
  );
}
