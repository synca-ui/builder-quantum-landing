import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TEMPLATES = [
  {
    id: "minimalist",
    name: "Minimalist",
    description: "Narrative, minimal design guiding users through full-screen sections.",
    category: "restaurant",
    isPremium: false,
    creator: "maitr",
    version: "1.0.0",
    layout: {
      intent: "narrative",
      navigation: "overlay-hamburger",
      typography: "minimal-sans",
    },
    tokens: {
      colors: {
        primary: "#111827",
        secondary: "#F3F4F6",
        text: "#111827",
        background: "#FFFFFF",
      },
      typography: {
        fontFamily: "Inter, sans-serif",
        headingSize: "2.5rem",
        bodySize: "1rem",
      },
      spacing: {
        unit: "8px",
        padding: "16px",
        gutter: "24px",
      },
    },
    preview: {
      thumbnail: "/templates/minimalist-thumb.png",
      features: ["Ultra Clean", "Fast Loading", "Content Focus"],
    },
  },
  {
    id: "modern",
    name: "Modern",
    description: "Contemporary design with bold colors and sleek animations.",
    category: "restaurant",
    isPremium: false,
    creator: "maitr",
    version: "1.0.0",
    layout: {
      intent: "commercial",
      navigation: "glassmorphism",
      typography: "modern-geometric",
    },
    tokens: {
      colors: {
        primary: "#4F46E5",
        secondary: "#7C3AED",
        text: "#FFFFFF",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      },
      typography: {
        fontFamily: "Inter, sans-serif",
        headingSize: "3rem",
        bodySize: "1rem",
      },
    },
    preview: {
      thumbnail: "/templates/modern-thumb.png",
      features: ["Gradient Backgrounds", "Glass Effects", "Bold Typography"],
    },
  },
  {
    id: "stylish",
    name: "Stylish",
    description: "Visual-first design with overlays, mixed sections, and motion.",
    category: "restaurant",
    isPremium: false,
    creator: "maitr",
    version: "1.0.0",
    layout: {
      intent: "visual",
      navigation: "contrast",
      typography: "decorative-serif",
    },
    tokens: {
      colors: {
        primary: "#059669",
        secondary: "#10B981",
        text: "#F9FAFB",
        background: "#111827",
      },
      typography: {
        fontFamily: "Playfair Display, serif",
        headingSize: "3.5rem",
        bodySize: "1rem",
      },
    },
    preview: {
      thumbnail: "/templates/stylish-thumb.png",
      features: ["Overlapping Visuals", "Mixed Sections", "Animated Hovers"],
    },
  },
  {
    id: "cozy",
    name: "Cozy",
    description: "Warm, friendly aesthetic with rounded elements and authentic photography.",
    category: "restaurant",
    isPremium: false,
    creator: "maitr",
    version: "1.0.0",
    layout: {
      intent: "functional",
      navigation: "rounded-top",
      typography: "handwritten-sans",
    },
    tokens: {
      colors: {
        primary: "#EA580C",
        secondary: "#F59E0B",
        text: "#1F2937",
        background: "#FFFBF0",
      },
      typography: {
        fontFamily: "Poppins, sans-serif",
        headingSize: "2.75rem",
        bodySize: "1rem",
      },
      shapes: {
        borderRadius: "20px",
      },
    },
    preview: {
      thumbnail: "/templates/cozy-thumb.png",
      features: ["Warm Colors", "Rounded Corners", "Community Feel"],
    },
  },
];

async function main() {
  console.log(` Seeding ${TEMPLATES.length} templates...`);

  for (const template of TEMPLATES) {
    const result = await prisma.template.upsert({
      where: { id: template.id },
      update: {
        // Update if exists
        name: template.name,
        description: template.description,
        version: template.version,
        layout: template.layout,
        tokens: template.tokens,
        preview: template.preview,
      },
      create: {
        // Create if doesn't exist
        ...template,
      },
    });

    console.log(`  ✅ Template: ${result.id} (${result.name})`);
  }

  console.log("✅ Seeding complete!");
}

main()
  .catch((error) => {
    console.error("❌ Seeding error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
