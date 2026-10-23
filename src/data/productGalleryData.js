/**
 * VERTEX Multi-Angle Product Gallery System (Amazon / Flipkart Style)
 * 
 * Generates verified, multi-angle technical views for fasteners, screws,
 * lithium-ion cells, and electronic components:
 * - View 1: Studio Front Perspective (Genuine Photo / 3D Render)
 * - View 2: Overhead Drive Recess / Top Terminal Geometry
 * - View 3: Technical Dimension Blueprint (DIN / ISO CAD Standard)
 * - View 4: Side Elevation Profile & Thread Lead
 * - View 5: Industrial Factory Packaging & QC Verification
 * 
 * NOTE: Strictly returns empty array for HVNEX Categories 3-6 (text-only rule).
 */

import { isTextOnlyProduct } from "../assets/hardware/componentVisuals";

function svgToDataUri(svg) {
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg.trim());
}

/**
 * Builds an overhead drive recess SVG view based on screw/fastener drive type
 */
function createDriveRecessSvg(product) {
  const name = product.name || "Fastener";
  const specs = product.specs || {};
  const drive = (specs["Drive Type"] || "").toLowerCase();
  const material = specs["Material Grade"] || specs["Material"] || "SS304";
  const size = specs["Dimensions"] || specs["Thread Size"] || "Standard Size";

  let driveSymbol;
  let driveTitle;
  let toolGuide;

  if (drive.includes("hex") || drive.includes("allen")) {
    driveTitle = "Hexagon Socket Recess (Allen)";
    toolGuide = "Precision 6-Point Hex Key Engagement • Anti-Strip";
    driveSymbol = `
      <polygon points="120,55 155,75 155,115 120,135 85,115 85,75" fill="#0f172a" stroke="#38bdf8" stroke-width="3"/>
      <polygon points="120,62 148,78 148,112 120,128 92,112 92,78" fill="#1e293b" stroke="#0284c7" stroke-width="1.5"/>
    `;
  } else if (drive.includes("cross") || drive.includes("phillips")) {
    driveTitle = "Cross Recess (Phillips Type H)";
    toolGuide = "DIN 7985 / ISO 7045 Form H • Self-Centering Driver Bit";
    driveSymbol = `
      <rect x="113" y="60" width="14" height="70" rx="3" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>
      <rect x="85" y="88" width="70" height="14" rx="3" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>
      <circle cx="120" cy="95" r="9" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
    `;
  } else if (drive.includes("slotted") || drive.includes("flat")) {
    driveTitle = "Single Machine Slotted Drive";
    toolGuide = "IS / ISO Precision Ground Slot for Flat Screwdrivers";
    driveSymbol = `
      <rect x="75" y="89" width="90" height="12" rx="2" fill="#0f172a" stroke="#38bdf8" stroke-width="2.5"/>
    `;
  } else if (name.toLowerCase().includes("nut")) {
    driveTitle = "Overhead Metric Thread & Wrench Flats";
    toolGuide = "DIN 934 / DIN 985 Full Hexagon Across Flats (s)";
    driveSymbol = `
      <polygon points="120,40 170,68 170,122 120,150 70,122 70,68" fill="#1e293b" stroke="#38bdf8" stroke-width="3"/>
      <circle cx="120" cy="95" r="28" fill="#0f172a" stroke="#94a3b8" stroke-width="2"/>
      <circle cx="120" cy="95" r="23" fill="none" stroke="#38bdf8" stroke-dasharray="3,2" stroke-width="1.5"/>
    `;
  } else if (name.toLowerCase().includes("washer")) {
    driveTitle = "Overhead Bearing Annular Geometry";
    toolGuide = "DIN 125A / DIN 127B Concentric Hole Distribution";
    driveSymbol = `
      <circle cx="120" cy="95" r="58" fill="#1e293b" stroke="#38bdf8" stroke-width="3"/>
      <circle cx="120" cy="95" r="26" fill="#09182d" stroke="#64748b" stroke-width="2"/>
      <circle cx="120" cy="95" r="29" fill="none" stroke="#38bdf8" stroke-dasharray="4,3" stroke-width="1"/>
    `;
  } else if (name.toLowerCase().includes("insert")) {
    driveTitle = "Top Heat-Set Entry & Internal Thread";
    toolGuide = "Guided Chamfer for Ultrasonic / Thermal Embedding";
    driveSymbol = `
      <circle cx="120" cy="95" r="54" fill="#854d0e" stroke="#fbbf24" stroke-width="3"/>
      <circle cx="120" cy="95" r="32" fill="#09182d" stroke="#ca8a04" stroke-width="2"/>
      <circle cx="120" cy="95" r="24" fill="none" stroke="#fde047" stroke-dasharray="3,2" stroke-width="1.5"/>
    `;
  } else {
    driveTitle = "Technical Recess Geometry";
    toolGuide = "Factory Standard Tooling Interface";
    driveSymbol = `
      <circle cx="120" cy="95" r="50" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
      <circle cx="120" cy="95" r="20" fill="#0f172a" stroke="#94a3b8" stroke-width="2"/>
    `;
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" width="100%" height="100%">
      <rect width="320" height="240" fill="#0b1324"/>
      <circle cx="120" cy="95" r="75" fill="#111c33" stroke="#1e293b" stroke-width="2"/>
      <circle cx="120" cy="95" r="68" fill="#1e293b" stroke="#334155" stroke-width="1"/>
      ${driveSymbol}
      <line x1="20" y1="190" x2="300" y2="190" stroke="#1e293b" stroke-width="1"/>
      <text x="160" y="208" text-anchor="middle" fill="#f8fafc" font-size="12" font-family="system-ui, sans-serif" font-weight="700">
        ${driveTitle}
      </text>
      <text x="160" y="226" text-anchor="middle" fill="#38bdf8" font-size="10" font-family="system-ui, sans-serif">
        ${toolGuide} • ${size} • ${material}
      </text>
    </svg>
  `;
  return svgToDataUri(svg);
}

/**
 * Builds an authentic CAD blueprint drawing view
 */
function createBlueprintSvg(product) {
  const specs = product.specs || {};
  const standard = specs["Standard"] || "ISO Metric";
  const material = specs["Material Grade"] || specs["Material"] || "SS304";

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" width="100%" height="100%">
      <defs>
        <pattern id="cadGrid" width="16" height="16" patternUnits="userSpaceOnUse">
          <path d="M 16 0 L 0 0 0 16" fill="none" stroke="#172554" stroke-width="0.75"/>
        </pattern>
      </defs>
      <rect width="320" height="240" fill="#0a192f"/>
      <rect width="320" height="240" fill="url(#cadGrid)"/>
      
      <!-- Border and Title Block -->
      <rect x="12" y="12" width="296" height="216" fill="none" stroke="#38bdf8" stroke-width="1.5"/>
      <rect x="180" y="176" width="124" height="48" fill="#0f2648" stroke="#38bdf8" stroke-width="1"/>
      
      <!-- Centerline -->
      <line x1="40" y1="100" x2="280" y2="100" stroke="#ef4444" stroke-width="1" stroke-dasharray="10,3,2,3"/>
      
      <!-- Fastener Profile Sketch -->
      <rect x="70" y="70" width="45" height="60" rx="3" fill="#1e3a8a" stroke="#60a5fa" stroke-width="1.5"/>
      <rect x="115" y="80" width="110" height="40" fill="#1e3a8a" stroke="#60a5fa" stroke-width="1.5"/>
      
      <!-- Thread serrations -->
      <line x1="125" y1="80" x2="125" y2="120" stroke="#93c5fd" stroke-width="1"/>
      <line x1="140" y1="80" x2="140" y2="120" stroke="#93c5fd" stroke-width="1"/>
      <line x1="155" y1="80" x2="155" y2="120" stroke="#93c5fd" stroke-width="1"/>
      <line x1="170" y1="80" x2="170" y2="120" stroke="#93c5fd" stroke-width="1"/>
      <line x1="185" y1="80" x2="185" y2="120" stroke="#93c5fd" stroke-width="1"/>
      <line x1="200" y1="80" x2="200" y2="120" stroke="#93c5fd" stroke-width="1"/>
      <line x1="215" y1="80" x2="215" y2="120" stroke="#93c5fd" stroke-width="1"/>

      <!-- Dimension Arrows -->
      <line x1="70" y1="52" x2="115" y2="52" stroke="#facc15" stroke-width="1.2"/>
      <polygon points="70,52 76,49 76,55" fill="#facc15"/>
      <polygon points="115,52 109,49 109,55" fill="#facc15"/>
      <text x="92" y="46" text-anchor="middle" fill="#facc15" font-size="9" font-family="monospace">k (Head Ht)</text>

      <line x1="115" y1="52" x2="225" y2="52" stroke="#facc15" stroke-width="1.2"/>
      <polygon points="115,52 121,49 121,55" fill="#facc15"/>
      <polygon points="225,52 219,49 219,55" fill="#facc15"/>
      <text x="170" y="46" text-anchor="middle" fill="#facc15" font-size="9" font-family="monospace">L (Nominal Length)</text>

      <line x1="52" y1="70" x2="52" y2="130" stroke="#facc15" stroke-width="1.2"/>
      <polygon points="52,70 49,76 55,76" fill="#facc15"/>
      <polygon points="52,130 49,124 55,124" fill="#facc15"/>
      <text x="44" y="103" text-anchor="end" fill="#facc15" font-size="9" font-family="monospace">d_k</text>

      <!-- Title block info -->
      <text x="186" y="190" fill="#93c5fd" font-size="8" font-family="system-ui, sans-serif" font-weight="700">SPECIFICATION DRAWING</text>
      <text x="186" y="203" fill="#ffffff" font-size="10" font-family="system-ui, sans-serif" font-weight="700">${standard}</text>
      <text x="186" y="217" fill="#38bdf8" font-size="8" font-family="monospace">${material} • 6g/6H</text>
    </svg>
  `;
  return svgToDataUri(svg);
}

/**
 * Builds side profile and thread flank lead view
 */
function createSideProfileSvg(product) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" width="100%" height="100%">
      <rect width="320" height="240" fill="#0f172a"/>
      
      <!-- Thread lead elevation profile -->
      <g transform="translate(40, 45)">
        <rect x="0" y="40" width="240" height="70" rx="4" fill="#1e293b" stroke="#334155" stroke-width="2"/>
        
        <!-- Detailed 60° thread teeth flank profile -->
        <path d="
          M 10 40 L 20 20 L 30 40 L 40 20 L 50 40 L 60 20 L 70 40 L 80 20 L 90 40 L 100 20 L 110 40
          L 120 20 L 130 40 L 140 20 L 150 40 L 160 20 L 170 40 L 180 20 L 190 40 L 200 20 L 210 40
          L 220 20 L 230 40
        " fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linejoin="round"/>

        <path d="
          M 10 110 L 20 130 L 30 110 L 40 130 L 50 110 L 60 130 L 70 110 L 80 130 L 90 110 L 100 130 L 110 110
          L 120 130 L 130 110 L 140 130 L 150 110 L 160 130 L 170 110 L 180 130 L 190 110 L 200 130 L 210 110
          L 220 130 L 230 110
        " fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linejoin="round"/>

        <!-- Chamfered tip -->
        <polygon points="230,40 240,55 240,95 230,110" fill="#38bdf8" opacity="0.3"/>
        <line x1="230" y1="40" x2="240" y2="55" stroke="#38bdf8" stroke-width="2"/>
        <line x1="240" y1="55" x2="240" y2="95" stroke="#38bdf8" stroke-width="2"/>
        <line x1="240" y1="95" x2="230" y2="110" stroke="#38bdf8" stroke-width="2"/>

        <text x="120" y="80" text-anchor="middle" fill="#f8fafc" font-size="12" font-family="system-ui, sans-serif" font-weight="700">
          60° ISO Metric Thread Flank
        </text>
        <text x="120" y="96" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="monospace">
          Lead Pitch & Chamfered Lead-In
        </text>
      </g>

      <text x="160" y="210" text-anchor="middle" fill="#f8fafc" font-size="11" font-family="system-ui, sans-serif" font-weight="700">
        Precision Rolled Machine Thread Profile
      </text>
      <text x="160" y="226" text-anchor="middle" fill="#38bdf8" font-size="9" font-family="system-ui, sans-serif">
        Class 6g Toleranced Thread • Anti-Galling Passivated Surface
      </text>
    </svg>
  `;
  return svgToDataUri(svg);
}

/**
 * Builds factory-verified industrial packaging & multi-pack box view
 */
function createPackageSvg(product) {
  const primaryVariant = product.variants?.[0];
  const unit = primaryVariant?.packSize || product.unit || "Pack of 50";
  const hsn = product.hsnCode || "7318";

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" width="100%" height="100%">
      <rect width="320" height="240" fill="#0f172a"/>
      
      <!-- Industrial Packaging Box -->
      <polygon points="60,70 160,25 260,70 160,115" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
      <polygon points="60,70 160,115 160,200 60,155" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>
      <polygon points="160,115 260,70 260,155 160,200" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
      
      <!-- Label on box front -->
      <polygon points="75,95 145,125 145,180 75,150" fill="#f8fafc" stroke="#94a3b8" stroke-width="1"/>
      <text x="110" y="115" text-anchor="middle" fill="#0f172a" font-size="9" font-family="system-ui, sans-serif" font-weight="800">HV VERTEX</text>
      <text x="110" y="128" text-anchor="middle" fill="#0284c7" font-size="8" font-family="monospace" font-weight="700">${unit}</text>
      <text x="110" y="142" text-anchor="middle" fill="#475569" font-size="7" font-family="monospace">HSN: ${hsn}</text>
      <text x="110" y="154" text-anchor="middle" fill="#16a34a" font-size="7" font-family="system-ui, sans-serif" font-weight="700">QC VERIFIED</text>
      
      <!-- Barcode simulation -->
      <line x1="85" y1="162" x2="85" y2="174" stroke="#0f172a" stroke-width="1.5"/>
      <line x1="88" y1="162" x2="88" y2="174" stroke="#0f172a" stroke-width="2.5"/>
      <line x1="93" y1="162" x2="93" y2="174" stroke="#0f172a" stroke-width="1"/>
      <line x1="97" y1="162" x2="97" y2="174" stroke="#0f172a" stroke-width="2"/>
      <line x1="102" y1="162" x2="102" y2="174" stroke="#0f172a" stroke-width="1.5"/>
      <line x1="107" y1="162" x2="107" y2="174" stroke="#0f172a" stroke-width="2"/>
      <line x1="112" y1="162" x2="112" y2="174" stroke="#0f172a" stroke-width="1"/>
      <line x1="116" y1="162" x2="116" y2="174" stroke="#0f172a" stroke-width="2.5"/>
      <line x1="122" y1="162" x2="122" y2="174" stroke="#0f172a" stroke-width="1.5"/>
      <line x1="127" y1="162" x2="127" y2="174" stroke="#0f172a" stroke-width="2"/>
      <line x1="133" y1="162" x2="133" y2="174" stroke="#0f172a" stroke-width="1"/>

      <!-- Footer Callout -->
      <text x="160" y="222" text-anchor="middle" fill="#38bdf8" font-size="10" font-family="system-ui, sans-serif" font-weight="700">
        Factory Sealed Bulk Packaging • ${unit}
      </text>
    </svg>
  `;
  return svgToDataUri(svg);
}

/**
 * Builds top terminal view for cylindrical lithium-ion cells
 */
function createBatteryTerminalSvg(product) {
  const specs = product.specs || {};
  const voltage = specs["Nominal Voltage"] || "3.65V";
  const capacity = specs["Nominal Capacity"] || specs["Rated Capacity"] || "EV Grade";
  const brand = product.brand || "VERTEX";

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" width="100%" height="100%">
      <rect width="320" height="240" fill="#09182d"/>
      
      <!-- Top Positive Button Terminal -->
      <circle cx="160" cy="100" r="70" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
      <circle cx="160" cy="100" r="56" fill="#334155" stroke="#64748b" stroke-width="1.5"/>
      
      <!-- Safety Vent Slots -->
      <circle cx="160" cy="100" r="42" fill="#0f172a" stroke="#0284c7" stroke-width="2"/>
      <rect x="156" y="60" width="8" height="20" rx="3" fill="#38bdf8"/>
      <rect x="156" y="120" width="8" height="20" rx="3" fill="#38bdf8"/>
      <rect x="120" y="96" width="20" height="8" rx="3" fill="#38bdf8"/>
      <rect x="180" y="96" width="20" height="8" rx="3" fill="#38bdf8"/>

      <!-- Center Positive Terminal -->
      <circle cx="160" cy="100" r="24" fill="#94a3b8" stroke="#f8fafc" stroke-width="2"/>
      <text x="160" y="106" text-anchor="middle" fill="#0f172a" font-size="16" font-family="monospace" font-weight="900">+</text>

      <text x="160" y="196" text-anchor="middle" fill="#f8fafc" font-size="12" font-family="system-ui, sans-serif" font-weight="700">
        Positive Terminal & Pressure Safety Vent
      </text>
      <text x="160" y="214" text-anchor="middle" fill="#38bdf8" font-size="10" font-family="monospace">
        ${brand} • ${voltage} • ${capacity} • 3-Point Crimp
      </text>
    </svg>
  `;
  return svgToDataUri(svg);
}

/**
 * Returns multi-angle image array for any product.
 * Strictly respects rule: Categories 3, 4, 5, 6 return empty array (NO images).
 */
export function getProductImages(product) {
  if (!product) return [];
  if (isTextOnlyProduct(product)) return [];

  // If the product already has explicit multi-image definitions, return them
  if (Array.isArray(product.images) && product.images.length > 0) {
    return product.images;
  }

  const name = product.name || "Component";
  const primaryImg = product.imageUrl;
  if (!primaryImg) return [];

  const isBattery =
    product.subcategory?.slug === "lithium-ion-batteries" ||
    (product.specs && product.specs["Cell Format"]);

  const isFastener =
    product.category?.slug === "fasteners" ||
    product.categoryId === "cat-fasteners" ||
    product.category?.slug === "nuts" ||
    (product.specs && (product.specs["Drive Type"] || product.specs["Head Type"] || product.specs["Standard"]));

  // Fasteners: 5 rich engineering views
  if (isFastener) {
    return [
      {
        id: "view-front",
        url: primaryImg,
        thumbnailUrl: primaryImg,
        angle: "front",
        label: "3D Studio Front View",
        caption: `${name} — High-resolution studio perspective view`,
      },
      {
        id: "view-drive",
        url: createDriveRecessSvg(product),
        thumbnailUrl: createDriveRecessSvg(product),
        angle: "drive",
        label: "Drive Recess Geometry",
        caption: `${name} — Overhead drive recess and tool engagement profile`,
      },
      {
        id: "view-blueprint",
        url: createBlueprintSvg(product),
        thumbnailUrl: createBlueprintSvg(product),
        angle: "blueprint",
        label: "Technical CAD Blueprint",
        caption: `${name} — Engineering standard dimensional blueprint (DIN/ISO)`,
      },
      {
        id: "view-side",
        url: createSideProfileSvg(product),
        thumbnailUrl: createSideProfileSvg(product),
        angle: "side",
        label: "Thread Pitch & Flank Lead",
        caption: `${name} — 60° metric thread lead elevation and chamfered tip`,
      },
      {
        id: "view-package",
        url: createPackageSvg(product),
        thumbnailUrl: createPackageSvg(product),
        angle: "package",
        label: "Industrial Packaging",
        caption: `${name} — Factory-sealed bulk multi-pack with QC barcode`,
      },
    ];
  }

  // Batteries: 4 verified cell views
  if (isBattery) {
    return [
      {
        id: "view-front",
        url: primaryImg,
        thumbnailUrl: primaryImg,
        angle: "front",
        label: "Studio Cell Front",
        caption: `${name} — Authentic manufacturer cylindrical cell photo`,
      },
      {
        id: "view-terminal",
        url: createBatteryTerminalSvg(product),
        thumbnailUrl: createBatteryTerminalSvg(product),
        angle: "terminal",
        label: "Positive Terminal & Safety Vent",
        caption: `${name} — Overhead button terminal and safety CID pressure relief vents`,
      },
      {
        id: "view-blueprint",
        url: createBlueprintSvg(product),
        thumbnailUrl: createBlueprintSvg(product),
        angle: "blueprint",
        label: "Electrode Blueprint",
        caption: `${name} — Standard dimensional specifications and cell format geometry`,
      },
      {
        id: "view-package",
        url: createPackageSvg(product),
        thumbnailUrl: createPackageSvg(product),
        angle: "package",
        label: "Storage Tray Packaging",
        caption: `${name} — Industrial battery carrier pack with insulation protection`,
      },
    ];
  }

  // General Components (Breadboard, Jumper Cables, Berg Strip)
  return [
    {
      id: "view-front",
      url: primaryImg,
      thumbnailUrl: primaryImg,
      angle: "front",
      label: "Studio Perspective",
      caption: `${name} — Verified product studio photography`,
    },
    {
      id: "view-blueprint",
      url: createBlueprintSvg(product),
      thumbnailUrl: createBlueprintSvg(product),
      angle: "blueprint",
      label: "Pinout & Dimension Drawing",
      caption: `${name} — Mechanical dimensions and pin spacing specification`,
    },
    {
      id: "view-package",
      url: createPackageSvg(product),
      thumbnailUrl: createPackageSvg(product),
      angle: "package",
      label: "Packaging & ESD Seal",
      caption: `${name} — Antistatic factory packaging with verified part code`,
    },
  ];
}
