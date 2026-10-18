import React, { useState, useEffect, useCallback } from "react";
import arduinoImg from "../../assets/hardware/arduino.jpg";
import pcbImg from "../../assets/hardware/pcb.jpg";
import breadboardImg from "../../assets/hardware/breadboard.jpg";
import automationImg from "../../assets/hardware/automation.jpg";
import fastenersImg from "../../assets/hardware/fasteners.jpg";
import "./HardwareBackground.css";

const SLIDES = [
  {
    id: "arduino",
    src: arduinoImg,
    title: "Microcontrollers & Development Platforms",
    subtitle: "Arduino Uno, ARM Cortex & Embedded Modules",
    tag: "ENGINEERING",
  },
  {
    id: "pcb",
    src: pcbImg,
    title: "High-Density Printed Circuit Boards",
    subtitle: "Precision SMT Components & Multi-Layer Traces",
    tag: "FABRICATION",
  },
  {
    id: "breadboard",
    src: breadboardImg,
    title: "Sensors, Actuators & Prototyping",
    subtitle: "Breadboards, Jumper Wiring & Ultrasonic Sensing",
    tag: "PROTOTYPING",
  },
  {
    id: "automation",
    src: automationImg,
    title: "Industrial Automation & Process Control",
    subtitle: "DIN-Rail PLCs, Power Relays & Terminal Blocks",
    tag: "INDUSTRIAL",
  },
  {
    id: "fasteners",
    src: fastenersImg,
    title: "Precision Fasteners & Hardware",
    subtitle: "Stainless Steel Hex Bolts, Nyloc Nuts & Brass Inserts",
    tag: "FASTENERS",
  },
];

const ROTATION_INTERVAL_MS = 6500;

export default function HardwareBackground() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  // Detect user preference for reduced motion
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(Boolean(mediaQuery?.matches));

    const handleChange = (e) => setPrefersReducedMotion(Boolean(e.matches));
    if (mediaQuery?.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    } else if (mediaQuery?.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % SLIDES.length);
  }, []);

  // Automatic slide rotation
  useEffect(() => {
    if (isPaused || prefersReducedMotion) return;

    const timer = setInterval(() => {
      nextSlide();
    }, ROTATION_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [isPaused, prefersReducedMotion, nextSlide]);

  const activeSlide = SLIDES[currentIndex];

  return (
    <div
      className="vtx-hw-bg-container"
      aria-hidden="true"
      role="presentation"
    >
      {/* Blueprint Grid Fallback & Ambient Accent Layer */}
      <div className="vtx-hw-grid-fallback" />

      {/* Crossfading Slide Images */}
      {SLIDES.map((slide, index) => {
        const isActive = index === currentIndex;
        return (
          <div
            key={slide.id}
            className={`vtx-hw-slide ${isActive ? "active" : ""}`}
            style={{
              transition: prefersReducedMotion ? "none" : "opacity 1.4s ease-in-out, transform 8s ease-out",
            }}
          >
            <img
              src={slide.src}
              alt=""
              className="vtx-hw-image"
              loading={index === 0 ? "eager" : "lazy"}
            />
          </div>
        );
      })}

      {/* Multi-layered Dark Navy Translucent Gradient Overlay */}
      <div className="vtx-hw-overlay-gradient" />
      <div className="vtx-hw-overlay-vignette" />
      <div className="vtx-hw-overlay-mesh" />

      {/* Subtle Bottom Technical Caption & Controls */}
      <div className="vtx-hw-caption-bar">
        <div className="vtx-hw-caption-info">
          <span className="vtx-hw-badge">{activeSlide.tag}</span>
          <span className="vtx-hw-title">{activeSlide.title}</span>
          <span className="vtx-hw-divider" aria-hidden="true">•</span>
          <span className="vtx-hw-subtitle">{activeSlide.subtitle}</span>
        </div>

        {/* Carousel indicators with pause/play toggle */}
        <div className="vtx-hw-indicators" aria-label="Hardware showcase controls">
          <button
            type="button"
            className="vtx-hw-control-btn"
            onClick={() => setIsPaused((prev) => !prev)}
            aria-label={isPaused ? "Play background carousel" : "Pause background carousel"}
            title={isPaused ? "Resume carousel" : "Pause carousel"}
          >
            {isPaused ? "▶" : "❚❚"}
          </button>
          {SLIDES.map((slide, idx) => (
            <button
              key={slide.id}
              type="button"
              className={`vtx-hw-dot ${idx === currentIndex ? "active" : ""}`}
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Jump to slide ${idx + 1}: ${slide.title}`}
              title={slide.title}
            >
              <span className="vtx-hw-dot-fill" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
