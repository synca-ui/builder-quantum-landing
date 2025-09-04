import { Request, Response } from "express";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import { Pool } from "pg";

// Configuration data schema
const ConfigurationSchema = z.object({
  id: z.string().optional(),
  userId: z.string().default("anonymous"),
  businessName: z.string().default(""),
  businessType: z.string().default(""),
  location: z.string().optional(),
  slogan: z.string().optional(),
  uniqueDescription: z.string().optional(),
  template: z.string().default(""),
  primaryColor: z.string().default("#111827"),
  secondaryColor: z.string().default("#6B7280"),
  fontFamily: z.string().default("sans-serif"),
  selectedPages: z.array(z.string()).default([]),
  customPages: z.array(z.string()).default([]),
  openingHours: z.record(z.any()).default({}),
  menuItems: z.array(z.any()).default([]),
  reservationsEnabled: z.coerce.boolean().default(false),
  maxGuests: z.coerce.number().default(10),
  notificationMethod: z.string().default("email"),
  contactMethods: z.array(z.string()).default([]),
  socialMedia: z.record(z.string()).default({}),
  gallery: z.array(z.any()).default([]),
  onlineOrdering: z.coerce.boolean().default(false),
  onlineStore: z.coerce.boolean().default(false),
  teamArea: z.coerce.boolean().default(false),
  hasDomain: z.coerce.boolean().default(false),
  domainName: z.string().optional(),
  selectedDomain: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  publishedUrl: z.string().optional(),
  previewUrl: z.string().optional(),
});

type Configuration = z.infer<typeof ConfigurationSchema>;

// Simple file-based storage (replace with database in production)
const DATA_DIR = path.join(process.cwd(), "data");
const CONFIGS_FILE = path.join(DATA_DIR, "configurations.json");

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
    } catch {
      // Read-only filesystem - ignore
    }
  }
}

// Load configurations from file
async function loadConfigurations(): Promise<Configuration[]> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(CONFIGS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// Save configurations to file
async function saveConfigurations(configs: Configuration[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(CONFIGS_FILE, JSON.stringify(configs, null, 2));
}

// Generate unique ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Generate subdomain-safe slug
function generateSlug(businessName: string): string {
  return businessName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .substr(0, 30);
}

export async function saveConfiguration(req: Request, res: Response) {
  try {
    const userId = (req.headers["x-user-id"] as string) || "anonymous";
    const configData = {
      ...req.body,
      userId,
      updatedAt: new Date().toISOString(),
    };

    // Set createdAt if it doesn't exist (new configuration)
    if (!configData.createdAt) {
      configData.createdAt = new Date().toISOString();
    }

    // Validate configuration data
    const parsed = ConfigurationSchema.safeParse(configData);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid configuration data",
        details: parsed.error.issues,
      });
    }

    const config = parsed.data;
    const configurations = await loadConfigurations();

    if (config.id) {
      // Update existing configuration
      const index = configurations.findIndex(
        (c) => c.id === config.id && c.userId === userId,
      );
      if (index === -1) {
        return res.status(404).json({ error: "Configuration not found" });
      }
      // Preserve original createdAt for updates
      config.createdAt = configurations[index].createdAt;
      configurations[index] = config;
    } else {
      // Create new configuration
      config.id = generateId();
      // createdAt is already set above
      configurations.push(config);
    }

    try {
      await saveConfigurations(configurations);
    } catch (e) {
      console.warn("Skipping configurations.json save (read-only FS)");
    }

    res.json({
      success: true,
      configuration: config,
      message: "Configuration saved successfully",
    });
  } catch (error) {
    console.error("Error saving configuration:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getConfigurations(req: Request, res: Response) {
  try {
    const userId = (req.headers["x-user-id"] as string) || "anonymous";
    const configurations = await loadConfigurations();

    const userConfigs = configurations.filter((c) => c.userId === userId);

    res.json({
      success: true,
      configurations: userConfigs,
    });
  } catch (error) {
    console.error("Error getting configurations:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getConfiguration(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = (req.headers["x-user-id"] as string) || "anonymous";

    const configurations = await loadConfigurations();
    const config = configurations.find(
      (c) => c.id === id && c.userId === userId,
    );

    if (!config) {
      return res.status(404).json({ error: "Configuration not found" });
    }

    res.json({
      success: true,
      configuration: config,
    });
  } catch (error) {
    console.error("Error getting configuration:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteConfiguration(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = (req.headers["x-user-id"] as string) || "anonymous";

    const configurations = await loadConfigurations();
    const index = configurations.findIndex(
      (c) => c.id === id && c.userId === userId,
    );

    if (index === -1) {
      return res.status(404).json({ error: "Configuration not found" });
    }

    configurations.splice(index, 1);
    await saveConfigurations(configurations);

    res.json({
      success: true,
      message: "Configuration deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting configuration:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function publishConfiguration(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = (req.headers["x-user-id"] as string) || "anonymous";

    // Prefer config from request payload to avoid FS on serverless; fallback to file
    const payload = ((req.body && (req.body as any).config) ? (req.body as any).config : req.body) as Partial<Configuration>;
    let configurations: Configuration[] = [];
    let configIndex = -1;
    if (!payload || Object.keys(payload).length === 0) {
      try {
        configurations = await loadConfigurations();
        configIndex = configurations.findIndex(
          (c) => c.id === id && c.userId === userId,
        );
      } catch {}
    }

    let config: Configuration;
    if (payload && Object.keys(payload).length > 0) {
      if (!payload.businessName || !payload.template) {
        return res
          .status(400)
          .json({ error: "Missing required fields in payload" });
      }
      config = {
        ...(payload as Configuration),
        id: id || Date.now().toString(36),
        userId,
        createdAt: payload.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: (payload.status as any) || "draft",
      } as Configuration;
    } else if (configIndex !== -1) {
      config = configurations[configIndex];
    } else {
      return res.status(404).json({ error: "Configuration not found" });
    }

    // Prepare tenant details
    const baseSlug = generateSlug(config.businessName) || "site";
    const shortId =
      (config.id || "").slice(-6) || Date.now().toString(36).slice(-6);
    const tenantSlug = `${baseSlug}-${shortId}`; // unique per config
    const tenantSchema =
      `tenant_${tenantSlug.replace(/[^a-z0-9_\-]/g, "").replace(/\-/g, "_")}`.slice(
        0,
        50,
      );

    // Database URL from env (do NOT hardcode secrets)
    const databaseUrl =
      process.env.DATABASE_URL ||
      process.env.SUPABASE_DB_URL ||
      process.env.POSTGRES_URL ||
      "";
    if (!databaseUrl) {
      console.warn("DATABASE_URL not configured, skipping DB setup");
    } else {
      // Fire-and-forget provisioning to keep response fast
      (async () => {
        const pool = new Pool({
          connectionString: databaseUrl,
          ssl: { rejectUnauthorized: false },
          max: 2,
        });
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
          await client.query(`CREATE SCHEMA IF NOT EXISTS ${tenantSchema};`);
          await client.query(`SET search_path TO ${tenantSchema};`);
          await client.query(`
            CREATE TABLE IF NOT EXISTS restaurants (
              id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
              name text NOT NULL,
              type text,
              logo_url text,
              address text,
              contact_info jsonb DEFAULT '{}'::jsonb,
              config_json jsonb NOT NULL,
              created_at timestamptz DEFAULT now()
            );
          `);
          await client.query(`
            CREATE TABLE IF NOT EXISTS menu_categories (
              id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
              name text NOT NULL,
              sort_order int DEFAULT 0
            );
          `);
          await client.query(`
            CREATE TABLE IF NOT EXISTS menu_items (
              id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
              category_id uuid REFERENCES menu_categories(id) ON DELETE SET NULL,
              name text NOT NULL,
              description text,
              price numeric(10,2) NOT NULL,
              stock int,
              images jsonb DEFAULT '[]'::jsonb,
              metadata jsonb DEFAULT '{}'::jsonb
            );
          `);
          await client.query(`
            CREATE TABLE IF NOT EXISTS events (
              id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
              title text NOT NULL,
              description text,
              starts_at timestamptz,
              ends_at timestamptz,
              metadata jsonb DEFAULT '{}'::jsonb
            );
          `);
          await client.query(`
            CREATE TABLE IF NOT EXISTS orders (
              id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
              user_id uuid,
              status text DEFAULT 'pending',
              total numeric(10,2) DEFAULT 0,
              created_at timestamptz DEFAULT now()
            );
          `);
          await client.query(`
            CREATE TABLE IF NOT EXISTS order_items (
              id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
              order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
              item_id uuid,
              quantity int NOT NULL DEFAULT 1,
              unit_price numeric(10,2) NOT NULL
            );
          `);
          await client.query(`
            CREATE TABLE IF NOT EXISTS loyalty_points (
              id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
              user_id uuid,
              points int NOT NULL DEFAULT 0,
              metadata jsonb DEFAULT '{}'::jsonb
            );
          `);
          const insertRes = await client.query(
            `INSERT INTO restaurants(name, type, config_json) VALUES($1,$2,$3) RETURNING id`,
            [config.businessName, config.businessType, JSON.stringify(config)],
          );
          const restaurantId = insertRes.rows[0]?.id;

          await client.query("RESET search_path;");
          await client.query(`
            CREATE TABLE IF NOT EXISTS public.tenants (
              id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
              tenant_slug text UNIQUE NOT NULL,
              schema_name text UNIQUE NOT NULL,
              restaurant_id uuid,
              created_at timestamptz DEFAULT now()
            );
          `);
          await client.query(
            `INSERT INTO public.tenants(tenant_slug, schema_name, restaurant_id)
             VALUES($1,$2,$3)
             ON CONFLICT (tenant_slug) DO UPDATE SET schema_name = EXCLUDED.schema_name, restaurant_id = EXCLUDED.restaurant_id`,
            [tenantSlug, tenantSchema, restaurantId],
          );

          await client.query("COMMIT");
          console.log(`Tenant provisioned: ${tenantSlug} -> ${tenantSchema}`);
        } catch (e) {
          try {
            await client.query("ROLLBACK");
          } catch {}
          console.error("DB provisioning failed:", e);
        } finally {
          client.release();
          try {
            await pool.end();
          } catch {}
        }
      })().catch((e) => console.error("Provisioning error:", e));
    }

    // Generate published URL to unique subdomain like tenant.synca.digital
    const siteUrlFromEnv = process.env.SITE_URL || process.env.URL;
    let baseHost = "synca.digital";
    if (siteUrlFromEnv) {
      try {
        const h = new URL(siteUrlFromEnv).hostname.replace(/^www\./, "");
        if (h) baseHost = h;
      } catch {}
    }
    const publishedUrl =
      config.hasDomain && config.domainName
        ? `https://${config.domainName}`
        : `https://${tenantSlug}.${baseHost}`;
    const previewUrl = `${(siteUrlFromEnv || `https://${baseHost}`).replace(/\/$/, "")}/site/${tenantSlug}`;

    // Update configuration status
    config.status = "published";
    config.publishedUrl = publishedUrl;
    (config as any).previewUrl = previewUrl;
    config.updatedAt = new Date().toISOString();

    try {
      if (configIndex !== -1) {
        configurations[configIndex] = config;
      } else {
        // Best-effort append in environments that allow writes
        configurations.push(config as any);
      }
      await saveConfigurations(configurations);
    } catch (e) {
      console.warn("Skipping configurations.json save (read-only FS)");
    }

    return res.json({
      success: true,
      configuration: config,
      publishedUrl,
      previewUrl,
      tenant: { slug: tenantSlug, schema: tenantSchema },
      message: "Website published successfully!",
    });
  } catch (error) {
    console.error("Error publishing configuration:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getPublishedSite(req: Request, res: Response) {
  try {
    const { subdomain } = req.params; // actually tenantSlug

    // Prefer DB source if configured
    const databaseUrl =
      process.env.DATABASE_URL ||
      process.env.SUPABASE_DB_URL ||
      process.env.POSTGRES_URL ||
      "";

    if (databaseUrl) {
      const pool = new Pool({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false },
        max: 2,
      });
      const client = await pool.connect();
      try {
        // Look up tenant mapping
        const mapRes = await client.query(
          `SELECT schema_name, restaurant_id FROM public.tenants WHERE tenant_slug = $1 LIMIT 1`,
          [subdomain],
        );
        const mapping = mapRes.rows[0];
        if (mapping?.schema_name && mapping?.restaurant_id) {
          await client.query(`SET search_path TO ${mapping.schema_name};`);
          const cfgRes = await client.query(
            `SELECT config_json FROM restaurants WHERE id = $1 LIMIT 1`,
            [mapping.restaurant_id],
          );
          const row = cfgRes.rows[0];
          if (row?.config_json) {
            return res.json({ success: true, site: row.config_json });
          }
        }
      } catch (e) {
        console.error("DB read for published site failed:", e);
      } finally {
        client.release();
      }
    }

    // Fallback to file-based store (for local dev)
    const configurations = await loadConfigurations();
    const config = configurations.find(
      (c) =>
        c.status === "published" &&
        (c.publishedUrl?.includes(subdomain) ||
          c.selectedDomain === subdomain ||
          c.domainName === subdomain),
    );
    if (config) {
      return res.json({ success: true, site: config });
    }

    return res.status(404).json({ error: "Site not found" });
  } catch (error) {
    console.error("Error getting published site:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
