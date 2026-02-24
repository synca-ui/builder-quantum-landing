import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Menu, MousePointer2 } from "lucide-react";

type WorkflowState = "input" | "processing" | "data-import" | "complete";

export default function MaitrWorkflowAnimation() {
  const [workflowState, setWorkflowState] = useState<WorkflowState>("input");

  // Auto-progress through states for demo - SMOOTHER TIMING
  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [];

    if (workflowState === "input") {
      timeouts.push(setTimeout(() => setWorkflowState("processing"), 5000)); // Extended
    } else if (workflowState === "processing") {
      timeouts.push(setTimeout(() => setWorkflowState("data-import"), 4500)); // Extended
    } else if (workflowState === "data-import") {
      timeouts.push(setTimeout(() => setWorkflowState("complete"), 4500)); // Extended
    } else if (workflowState === "complete") {
      timeouts.push(setTimeout(() => setWorkflowState("input"), 10000)); // Much longer!
    }

    return () => timeouts.forEach(clearTimeout);
  }, [workflowState]);

  return (
    <div className="relative w-full">
      {/* Main Animation - TALLER for smoother transitions */}
      <div
        className="relative w-full max-w-7xl mx-auto h-[850px] flex items-start justify-center overflow-hidden pt-40 bg-gray-50 rounded-3xl border border-gray-200 mt-8 mb-20"
        style={{
          backgroundImage:
            "radial-gradient(circle, #d1d5db 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        <AnimatePresence mode="wait">
          {workflowState === "input" && (
            <InputStage
              key="input"
              onStart={() => setWorkflowState("processing")}
            />
          )}
          {workflowState === "processing" && (
            <ProcessingCore key="processing" />
          )}
          {workflowState === "data-import" && (
            <DataImportStage key="data-import" />
          )}
          {workflowState === "complete" && <PhoneReveal key="complete" />}
        </AnimatePresence>
      </div>

      {/* Compact Problem/Stats Section Below */}
      <CompactStatsSection />
    </div>
  );
}

// Phase 1: Input Stage with Typing Animation
function InputStage({ onStart }: { onStart: () => void }) {
  const [typedText, setTypedText] = useState("");
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [showCursor, setShowCursor] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const fullText = "https://bella-trattoria.de";

  useEffect(() => {
    // Start typing after 1s
    const startDelay = setTimeout(() => {
      let index = 0;
      const typingInterval = setInterval(() => {
        if (index <= fullText.length) {
          setTypedText(fullText.slice(0, index));
          index++;
        } else {
          clearInterval(typingInterval);
          // Show cursor after typing
          setTimeout(() => {
            setShowCursor(true);
            // Animate cursor TO BUTTON (not input!)
            setTimeout(() => {
              setCursorPos({ x: 520, y: 10 }); // Move to button position
              // Click animation - wait longer before clicking
              setTimeout(() => {
                setIsClicking(true);
                setTimeout(() => {
                  setIsClicking(false);
                  onStart();
                }, 400); // Click duration
              }, 1200); // Wait 1200ms at button before clicking
            }, 150);
          }, 300);
        }
      }, 80);
      return () => clearInterval(typingInterval);
    }, 1000);

    return () => clearTimeout(startDelay);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, filter: "blur(20px)" }}
      transition={{ duration: 0.5 }}
      className="flex flex-col sm:flex-row items-center justify-center gap-3 relative w-full max-w-2xl mx-auto px-4 sm:px-0"
    >
      <motion.div
        className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/40 shadow-2xl px-6 py-4 flex items-center gap-3 w-full sm:min-w-[400px]"
        style={{ willChange: "transform" }}
        whileHover={{ scale: 1.02 }}
      >
        <input
          type="text"
          value={typedText}
          placeholder={typedText ? "" : "Google Maps Link hier einfügen..."}
          aria-label="Google Maps Link Eingabefeld für Restaurant"
          className="bg-transparent outline-none text-gray-800 placeholder-gray-400 w-full text-sm font-mono"
          readOnly
        />
      </motion.div>

      <motion.button
        className="bg-gradient-to-r from-teal-500 via-purple-500 to-orange-500 text-white rounded-3xl px-8 py-4 shadow-lg flex items-center justify-center gap-2 font-medium text-sm relative overflow-hidden whitespace-nowrap shrink-0"
        style={{ willChange: "transform" }}
        whileHover={{ scale: 1.05 }}
        animate={{
          scale: isClicking ? 0.95 : showCursor && cursorPos.x > 200 ? 1 : 1,
        }}
      >
        Jetzt loslegen
        <ArrowRight className="w-5 h-5" />
        {/* Click Ripple Effect */}
        {isClicking && (
          <motion.div
            className="absolute inset-0 bg-white/30 rounded-3xl"
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.4 }}
          />
        )}
      </motion.button>

      {/* Animated Cursor with Click Effect - ENHANCED VISIBILITY */}
      {showCursor && (
        <motion.div
          className="absolute pointer-events-none z-50 flex items-center justify-center pointer-events-none"
          initial={{ left: "50%", top: "150%", opacity: 0 }}
          animate={{
            left: cursorPos.x === 0 ? "50%" : "88%", // 88% is exactly over the button
            top: cursorPos.y === 0 ? "150%" : "50%", // 50% centers it perfectly vertically
            opacity: 1,
            scale: isClicking ? 0.9 : 1,
          }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          <MousePointer2
            className="w-8 h-8 text-gray-900 drop-shadow-[0_0_8px_rgba(0,0,0,0.8)] -translate-x-3 -translate-y-3"
            fill="white"
            strokeWidth={2.5}
          />
          {/* Click pulse effect */}
          {isClicking && (
            <motion.div
              className="absolute top-0 left-0 w-8 h-8 bg-teal-400/60 rounded-full"
              initial={{ scale: 1, opacity: 0.9 }}
              animate={{ scale: 3, opacity: 0 }}
              transition={{ duration: 0.4, delay: 3.1 }}
            />
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

// Phase 2: Processing Core
function ProcessingCore() {
  const checks = [
    "Speisekarte analysiert",
    "Branding & Farben extrahiert",
    "Öffnungszeiten synchronisiert",
    "Layout optimiert",
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, x: 300, filter: "blur(20px)" }}
      transition={{ duration: 0.6 }}
      className="flex flex-col items-center -mt-16"
    >
      {/* Pulsing Core */}
      <motion.div
        className="relative mb-8"
        animate={{
          scale: [1, 1.1, 1],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <div className="w-20 h-20 bg-gradient-to-br from-purple-500 via-teal-500 to-orange-500 rounded-2xl opacity-20 blur-xl absolute"></div>
        <div className="w-20 h-20 bg-gradient-to-br from-purple-500 via-teal-500 to-orange-500 rounded-2xl relative flex items-center justify-center">
          <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-xl"></div>
        </div>
      </motion.div>

      {/* Matrix Score */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/40 shadow-xl px-6 py-3 mb-6"
      >
        <div className="text-center">
          <div className="text-2xl font-black bg-gradient-to-r from-teal-600 via-purple-600 to-orange-600 bg-clip-text text-transparent">
            94/100
          </div>
          <div className="text-xs text-gray-600 font-medium">
            Analysieren läuft...
          </div>
        </div>
      </motion.div>

      {/* Check Items */}
      <motion.div
        className="grid grid-cols-2 gap-3"
        variants={{
          show: {
            transition: {
              staggerChildren: 0.15,
            },
          },
        }}
        initial="hidden"
        animate="show"
      >
        {checks.map((check, i) => (
          <motion.div
            key={i}
            variants={{
              hidden: { opacity: 0, scale: 0.8, y: 20 },
              show: { opacity: 1, scale: 1, y: 0 },
            }}
            className="bg-white/60 backdrop-blur-lg rounded-xl border border-white/30 shadow-lg px-4 py-3 flex items-center gap-2"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5 + i * 0.15, type: "spring" }}
              className="w-5 h-5 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center"
            >
              <Check className="w-3 h-3 text-white" strokeWidth={3} />
            </motion.div>
            <span className="text-xs text-gray-700 font-medium">{check}</span>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}

// NEW Phase 2.5: Data Import Animation - TASK LIST
function DataImportStage() {
  const tasks = [
    { label: "Gerichte werden geladen", delay: 0 },
    { label: "Öffnungszeiten erfasst", delay: 0.6 },
    { label: "Branding umgesetzt", delay: 1.2 },
    { label: "Bilder extrahiert", delay: 1.8 },
    { label: "Reservierung hinzugefügt", delay: 2.4 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-md px-4 -mt-16 flex flex-col items-center justify-center gap-6"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-4"
      >
        <h3 className="text-4xl font-black bg-gradient-to-r from-teal-600 via-purple-600 to-orange-600 bg-clip-text text-transparent mb-2">
          Daten werden importiert
        </h3>
      </motion.div>

      {/* Animated Task List */}
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-6 sm:p-8 border border-white/60 w-full sm:min-w-[500px]">
        <div className="space-y-4">
          {tasks.map((task, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: task.delay,
                type: "spring",
                stiffness: 200,
              }}
              className="flex items-center gap-4"
            >
              {/* Checkmark Icon */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  delay: task.delay + 0.3,
                  type: "spring",
                  stiffness: 200,
                }}
                className="w-8 h-8 bg-gradient-to-br from-teal-500 to-green-500 rounded-full flex items-center justify-center flex-shrink-0"
              >
                <Check className="w-5 h-5 text-white" strokeWidth={3} />
              </motion.div>

              {/* Task Label */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: task.delay + 0.2 }}
                className="text-lg font-bold text-gray-800"
              >
                {task.label}
              </motion.div>

              {/* Loading Dots */}
              <div className="flex gap-1 ml-auto">
                {[0, 1, 2].map((dot) => (
                  <motion.div
                    key={dot}
                    className="w-2 h-2 bg-teal-400 rounded-full"
                    animate={{
                      opacity: [0.3, 1, 0.3],
                      scale: [0.8, 1.2, 0.8],
                    }}
                    transition={{
                      delay: task.delay + dot * 0.1,
                      duration: 1,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// Phase 3: Large Phone Reveal with Bella Content
function PhoneReveal() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.7, type: "spring" }}
      className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12 -mt-12 w-full px-4"
    >
      {/* iPhone 14 Pro Mockup - ULTRA REALISTIC */}
      <motion.div
        className="relative"
        initial={{ scale: 0.8, rotate: -5 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.3, type: "spring" }}
        style={{ willChange: "transform, opacity" }}
      >
        {/* iPhone Frame with realistic proportions */}
        <div
          className="w-[300px] h-[606px] bg-gradient-to-br from-gray-800 via-gray-900 to-black rounded-[3rem] p-2 shadow-xl border-[3px] border-gray-700 relative"
          style={{ willChange: "box-shadow" }}
        >
          {/* LEFT SIDE BUTTONS */}
          {/* Mute Switch */}
          <div className="absolute -left-[3px] top-20 w-[3px] h-6 bg-gray-700 rounded-l-sm"></div>
          {/* Volume Up */}
          <div className="absolute -left-[3px] top-32 w-[3px] h-12 bg-gray-700 rounded-l-sm"></div>
          {/* Volume Down */}
          <div className="absolute -left-[3px] top-[188px] w-[3px] h-12 bg-gray-700 rounded-l-sm"></div>

          {/* RIGHT SIDE BUTTON */}
          {/* Power Button */}
          <div className="absolute -right-[3px] top-36 w-[3px] h-16 bg-gray-700 rounded-r-sm"></div>

          {/* Dynamic Island - iPhone 14 Pro Style (Slightly Lower) */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[100px] h-[30px] bg-black rounded-full z-10 shadow-inner">
            {/* Camera & Sensors inside island */}
            <div className="absolute top-1/2 left-3 -translate-y-1/2 w-3 h-3 bg-gray-900 rounded-full"></div>
            <div className="absolute top-1/2 right-3 -translate-y-1/2 w-1.5 h-1.5 bg-gray-800 rounded-full"></div>
          </div>

          {/* Screen Content - NEW BELLA DESIGN - PURPLE/ORANGE/CYAN */}
          <div className="bg-gray-50 h-full rounded-[2.5rem] overflow-hidden relative">
            {/* Bella App Content */}
            <div className="h-full overflow-y-auto">
              {/* Header - PURPLE BRANDING - below notch */}
              <div className="bg-gray-50 px-5 pt-10 pb-3 flex items-center justify-between border-b border-gray-200">
                {/* Purple Logo Icon with Cutlery */}
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5, type: "spring" }}
                  className="flex items-center gap-3"
                >
                  <div className="w-9 h-9 bg-purple-600 rounded-lg flex items-center justify-center shadow-md">
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      {/* Fork */}
                      <path
                        d="M7 2V12M7 12V22M7 12H9M9 2V12M9 12V22M11 2V8"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                      {/* Knife */}
                      <path
                        d="M17 2V12L15 22M17 2L15 12L17 22"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <span className="font-black text-xl text-purple-600">
                    Bella
                  </span>
                </motion.div>

                {/* Hamburger Menu - Purple */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  <div className="flex flex-col gap-1">
                    <div className="w-5 h-0.5 bg-purple-600 rounded-full"></div>
                    <div className="w-5 h-0.5 bg-purple-600 rounded-full"></div>
                    <div className="w-5 h-0.5 bg-purple-600 rounded-full"></div>
                  </div>
                </motion.div>
              </div>

              {/* Hero Section - "Wir sinds..." - CLOSER TO DIVIDER */}
              <motion.div
                className="px-6 py-1 text-center mb-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.6 }}
              >
                <h2 className="text-2xl font-black text-gray-900 mb-1.5">
                  Wir sinds...
                </h2>
                <p className="text-[10px] text-gray-500">
                  Erzähl uns gerne etwas von dir.
                </p>
              </motion.div>

              {/* Highlights Section - White Cards - SMALLER */}
              <div className="px-6 pb-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    HIGHLIGHTS
                  </h3>
                  <span className="text-[10px] text-purple-600 font-medium">
                    Alle →
                  </span>
                </div>

                <div className="space-y-2.5">
                  {/* Menu Card 1 */}
                  <motion.div
                    className="bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.1, type: "spring" }}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="font-bold text-gray-900 text-xs">
                        Wiener Schnitzel
                      </h4>
                      <span className="text-orange-500 font-black text-xs">
                        18.90€
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400">
                      Mit Pommes & Salat
                    </p>
                  </motion.div>

                  {/* Menu Card 2 */}
                  <motion.div
                    className="bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.3, type: "spring" }}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="font-bold text-gray-900 text-xs">
                        Spaghetti Carbonara
                      </h4>
                      <span className="text-orange-500 font-black text-xs">
                        14.50€
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400">Hausgemacht</p>
                  </motion.div>

                  {/* Menu Card 3 */}
                  <motion.div
                    className="bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.5, type: "spring" }}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="font-bold text-gray-900 text-xs">
                        Caesar Salad
                      </h4>
                      <span className="text-orange-500 font-black text-xs">
                        12.90€
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400">
                      Frisch & knackig
                    </p>
                  </motion.div>
                </div>
              </div>

              {/* CTA Button - CYAN with Calendar Icon - SMALLER */}
              <motion.div
                className="px-6 pb-5"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.7, type: "spring" }}
              >
                <button className="w-full bg-gradient-to-r from-cyan-400 to-cyan-500 text-gray-900 rounded-full py-3 px-5 font-bold text-xs shadow-lg flex items-center justify-center gap-2">
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect
                      x="3"
                      y="6"
                      width="18"
                      height="15"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path d="M3 10H21" stroke="currentColor" strokeWidth="2" />
                    <path
                      d="M8 3V6M16 3V6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  Tisch reservieren
                </button>
              </motion.div>

              {/* Footer - Opening Hours & Location - SMALLER */}
              <motion.div
                className="px-6 pb-6 space-y-2.5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.9 }}
              >
                {/* Opening Hours */}
                <div className="flex items-center gap-2 text-xs">
                  <svg
                    className="w-4 h-4 text-gray-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="M12 6V12L15 15"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="text-gray-600 font-medium">
                    Heute: 09:00 – 17:00
                  </span>
                  <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-[10px] font-bold">
                    Geschlossen
                  </span>
                </div>

                {/* Location */}
                <div className="flex items-center justify-center gap-1.5 text-xs">
                  <svg
                    className="w-4 h-4 text-gray-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <circle
                      cx="12"
                      cy="9"
                      r="2.5"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                  <span className="text-gray-500 font-medium">Münster</span>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* QR Code Icon - MINIMALIST DESIGN */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.8 }}
        className="flex flex-col items-center gap-4"
      >
        <div className="bg-white rounded-2xl shadow-2xl p-6 border border-gray-100">
          {/* Realistic QR Code - Rounded Rectangles */}
          <svg
            className="w-24 h-24"
            viewBox="0 0 100 100"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* TOP LEFT Corner Pattern */}
            <rect
              x="8"
              y="8"
              width="28"
              height="28"
              fill="none"
              stroke="#000000"
              strokeWidth="4"
              rx="3"
            />
            <rect x="16" y="16" width="12" height="12" fill="#000000" rx="2" />

            {/* TOP RIGHT Corner Pattern */}
            <rect
              x="64"
              y="8"
              width="28"
              height="28"
              fill="none"
              stroke="#000000"
              strokeWidth="4"
              rx="3"
            />
            <rect x="72" y="16" width="12" height="12" fill="#000000" rx="2" />

            {/* BOTTOM LEFT Corner Pattern */}
            <rect
              x="8"
              y="64"
              width="28"
              height="28"
              fill="none"
              stroke="#000000"
              strokeWidth="4"
              rx="3"
            />
            <rect x="16" y="72" width="12" height="12" fill="#000000" rx="2" />

            {/* Data blocks - small rounded squares */}
            <rect x="66" y="66" width="8" height="8" fill="#000000" rx="2" />
            <rect x="78" y="66" width="8" height="8" fill="#000000" rx="2" />
            <rect x="66" y="78" width="8" height="8" fill="#000000" rx="2" />
            <rect x="78" y="78" width="8" height="8" fill="#000000" rx="2" />

            {/* Center alignment square */}
            <rect x="44" y="44" width="12" height="12" fill="#000000" rx="2" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-lg font-black bg-gradient-to-r from-teal-600 to-purple-600 bg-clip-text text-transparent mb-1">
            Deine App ist live!
          </p>
          <p className="text-sm text-gray-600 font-medium">Scan & Teilen</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Compact Stats Section Below Animation - FULL-WIDTH DARK HERO SECTION
function CompactStatsSection() {
  return (
    <div className="bg-gradient-to-br from-gray-900 via-slate-900 to-black py-20 px-6 relative overflow-hidden w-full">
      {/* Subtle animated glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 via-purple-500/10 to-orange-500/10 blur-3xl animate-pulse"></div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Box 1: Perfektion Section - BORDERED */}
        <div className="bg-white/5 backdrop-blur-sm border-2 border-white/20 rounded-3xl p-10 mb-12 hover:bg-white/10 transition-all">
          <h2 className="text-3xl font-black text-white mb-4 text-center leading-tight">
            Starte jetzt. Perfektioniere später.
          </h2>
          <p className="text-lg text-gray-300 text-center font-medium leading-relaxed max-w-3xl mx-auto">
            Warte nicht auf die 'perfekte' Website. Geh heute mit Maitr live,
            teste was deine Gäste lieben, und pass es in Sekunden an.{" "}
            <span className="font-bold text-white">Erfolg ist ein Prozess</span>{" "}
            – wir geben dir den Startschuss.
          </p>
        </div>

        {/* Stats Grid - Glass Morphism on Dark */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 mb-12">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-2xl border border-white/20 flex items-center justify-center hover:bg-white/15 transition-all">
            <div className="text-3xl sm:text-4xl md:text-5xl font-black bg-gradient-to-r from-teal-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent text-center">
              Volle Tische
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-2xl border border-white/20 flex items-center justify-center hover:bg-white/15 transition-all">
            <div className="text-3xl sm:text-4xl md:text-5xl font-black bg-gradient-to-r from-purple-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent text-center">
              5x mehr Buchungen
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-2xl border border-white/20 flex items-center justify-center hover:bg-white/15 transition-all">
            <div className="text-3xl sm:text-4xl md:text-5xl font-black bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400 bg-clip-text text-transparent text-center">
              Mehr Umsatz
            </div>
          </div>
        </div>

        {/* Box 2: Problem Statement - BORDERED */}
        <div className="bg-white/5 backdrop-blur-sm border-2 border-white/20 rounded-3xl p-6 sm:p-10 hover:bg-white/10 transition-all">
          <p className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-5 text-center leading-tight">
            Dein Restaurant verdient volle Tische, keine IT-Probleme.
          </p>
          <p className="text-xl text-gray-300 text-center font-medium">
            Link rein. App raus. Mehr Gäste.
          </p>
        </div>
      </div>
    </div>
  );
}
