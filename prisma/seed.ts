import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const templates = [
  {
    id: "minimalist",
    name: "Minimalist",
    description:
      "A clean, modern design with minimal visual elements. Perfect for upscale dining experiences.",
    category: "GASTRONOMY",
    layout: {
      intent: "NARRATIVE",
      navigation: "top-horizontal",
      sections: ["hero", "about", "menu", "reservations", "contact"],
      typography: {
        headingFont: "Georgia",
        bodyFont: "Inter",
      },
    },
    tokens: {
      colors: {
        primary: "#000000",
        secondary: "#ffffff",
        accent: "#e8e8e8",
        text: "#1a1a1a",
        background: "#fafafa",
        border: "#d4d4d4",
      },
      typography: {
        h1: { size: "48px", weight: 400, lineHeight: "1.2" },
        h2: { size: "36px", weight: 400, lineHeight: "1.3" },
        body: { size: "16px", weight: 400, lineHeight: "1.6" },
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "16px",
        lg: "32px",
        xl: "64px",
      },
    },
    preview: {
      thumbnail: "/templates/minimalist-thumb.png",
      features: [
        "Clean typography",
        "Minimal colors",
        "Elegant spacing",
        "Professional layout",
      ],
    },
  },
  {
    id: "modern",
    name: "Modern",
    description:
      "A contemporary design with bold typography and dynamic layouts. Great for trending restaurants.",
    category: ["GASTRONOMY"],
    layout: {
      intent: "COMMERCIAL",
      navigation: "side-vertical",
      sections: ["hero", "featured", "menu", "gallery", "contact"],
      typography: {
        headingFont: "Poppins",
        bodyFont: "Roboto",
      },
    },
    tokens: {
      colors: {
        primary: "#0066ff",
        secondary: "#000000",
        accent: "#ff0066",
        text: "#1a1a1a",
        background: "#ffffff",
        border: "#e0e0e0",
      },
      typography: {
        h1: { size: "56px", weight: 700, lineHeight: "1.1" },
        h2: { size: "40px", weight: 600, lineHeight: "1.2" },
        body: { size: "16px", weight: 400, lineHeight: "1.5" },
      },
      spacing: {
        xs: "6px",
        sm: "12px",
        md: "20px",
        lg: "40px",
        xl: "80px",
      },
    },
    preview: {
      thumbnail: "/templates/modern-thumb.png",
      features: [
        "Bold colors",
        "Dynamic layouts",
        "Modern fonts",
        "Interactive elements",
      ],
    },
  },
  {
    id: "stylish",
    name: "Stylish",
    description:
      "An artistic and creative design with visual storytelling. Ideal for trendy and creative restaurants.",
    category: ["GASTRONOMY", "CREATIVE"],
    layout: {
      intent: "VISUAL",
      navigation: "floating",
      sections: ["hero", "gallery", "story", "menu", "contact"],
      typography: {
        headingFont: "Playfair Display",
        bodyFont: "Lato",
      },
    },
    tokens: {
      colors: {
        primary: "#d4a574",
        secondary: "#2c2c2c",
        accent: "#f4e4d7",
        text: "#2c2c2c",
        background: "#fefdfb",
        border: "#e8dcc8",
      },
      typography: {
        h1: { size: "52px", weight: 700, lineHeight: "1.15" },
        h2: { size: "38px", weight: 600, lineHeight: "1.25" },
        body: { size: "15px", weight: 400, lineHeight: "1.7" },
      },
      spacing: {
        xs: "5px",
        sm: "10px",
        md: "18px",
        lg: "36px",
        xl: "72px",
      },
    },
    preview: {
      thumbnail: "/templates/stylish-thumb.png",
      features: [
        "Artistic design",
        "Visual storytelling",
        "Premium aesthetics",
        "Creative layouts",
      ],
    },
  },
  {
    id: "cozy",
    name: "Cozy",
    description:
      "A warm and inviting design with earthy tones. Perfect for casual and neighborhood restaurants.",
    category: ["GASTRONOMY"],
    layout: {
      intent: "NARRATIVE",
      navigation: "top-horizontal",
      sections: ["hero", "welcome", "menu", "events", "contact"],
      typography: {
        headingFont: "Merriweather",
        bodyFont: "Open Sans",
      },
    },
    tokens: {
      colors: {
        primary: "#8b6f47",
        secondary: "#ffffff",
        accent: "#d9c89e",
        text: "#3d3d3d",
        background: "#fdf9f3",
        border: "#e2d5c3",
      },
      typography: {
        h1: { size: "44px", weight: 400, lineHeight: "1.25" },
        h2: { size: "32px", weight: 400, lineHeight: "1.35" },
        body: { size: "16px", weight: 400, lineHeight: "1.65" },
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "16px",
        lg: "32px",
        xl: "64px",
      },
    },
    preview: {
      thumbnail: "/templates/cozy-thumb.png",
      features: [
        "Warm colors",
        "Friendly atmosphere",
        "Comfortable layouts",
        "Inviting typography",
      ],
    },
  },
];

async function seed() {
  console.log("Start seeding...");

  try {
    for (const template of templates) {
      const upserted = await prisma.template.upsert({
        where: { id: template.id },
        update: {
          name: template.name,
          description: template.description,
          category: template.category,
          layout: template.layout,
          tokens: template.tokens,
          preview: template.preview,
          version: "1.0.0",
        },
        create: {
          id: template.id,
          name: template.name,
          description: template.description,
          category: template.category,
          layout: template.layout,
          tokens: template.tokens,
          preview: template.preview,
          version: "1.0.0",
        },
      });
      console.log(`Upserted ${template.id}`);
    }
    console.log("Seeding finished.");
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
