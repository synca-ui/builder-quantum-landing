import { Request, Response } from "express";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";

// Configuration data schema
const ConfigurationSchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  businessName: z.string(),
  businessType: z.string(),
  location: z.string().optional(),
  slogan: z.string().optional(),
  uniqueDescription: z.string().optional(),
  template: z.string(),
  primaryColor: z.string(),
  secondaryColor: z.string(),
  fontFamily: z.string(),
  selectedPages: z.array(z.string()),
  customPages: z.array(z.string()),
  openingHours: z.record(z.any()),
  menuItems: z.array(z.any()),
  reservationsEnabled: z.boolean(),
  maxGuests: z.number(),
  notificationMethod: z.string(),
  contactMethods: z.array(z.string()),
  socialMedia: z.record(z.string()),
  gallery: z.array(z.any()),
  onlineOrdering: z.boolean(),
  onlineStore: z.boolean(),
  teamArea: z.boolean(),
  hasDomain: z.boolean(),
  domainName: z.string().optional(),
  selectedDomain: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  publishedUrl: z.string().optional()
});

type Configuration = z.infer<typeof ConfigurationSchema>;

// Simple file-based storage (replace with database in production)
const DATA_DIR = path.join(process.cwd(), 'data');
const CONFIGS_FILE = path.join(DATA_DIR, 'configurations.json');

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

// Load configurations from file
async function loadConfigurations(): Promise<Configuration[]> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(CONFIGS_FILE, 'utf-8');
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
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substr(0, 30);
}

export async function saveConfiguration(req: Request, res: Response) {
  try {
    const userId = req.headers['x-user-id'] as string || 'anonymous';
    const configData = {
      ...req.body,
      userId,
      updatedAt: new Date().toISOString()
    };

    // Set createdAt if it doesn't exist (new configuration)
    if (!configData.createdAt) {
      configData.createdAt = new Date().toISOString();
    }

    // Validate configuration data
    const parsed = ConfigurationSchema.safeParse(configData);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid configuration data',
        details: parsed.error.issues
      });
    }

    const config = parsed.data;
    const configurations = await loadConfigurations();

    if (config.id) {
      // Update existing configuration
      const index = configurations.findIndex(c => c.id === config.id && c.userId === userId);
      if (index === -1) {
        return res.status(404).json({ error: 'Configuration not found' });
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

    await saveConfigurations(configurations);

    res.json({ 
      success: true, 
      configuration: config,
      message: 'Configuration saved successfully'
    });
  } catch (error) {
    console.error('Error saving configuration:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getConfigurations(req: Request, res: Response) {
  try {
    const userId = req.headers['x-user-id'] as string || 'anonymous';
    const configurations = await loadConfigurations();
    
    const userConfigs = configurations.filter(c => c.userId === userId);
    
    res.json({ 
      success: true, 
      configurations: userConfigs 
    });
  } catch (error) {
    console.error('Error getting configurations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getConfiguration(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'] as string || 'anonymous';
    
    const configurations = await loadConfigurations();
    const config = configurations.find(c => c.id === id && c.userId === userId);
    
    if (!config) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    res.json({ 
      success: true, 
      configuration: config 
    });
  } catch (error) {
    console.error('Error getting configuration:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteConfiguration(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'] as string || 'anonymous';
    
    const configurations = await loadConfigurations();
    const index = configurations.findIndex(c => c.id === id && c.userId === userId);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    configurations.splice(index, 1);
    await saveConfigurations(configurations);

    res.json({ 
      success: true, 
      message: 'Configuration deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting configuration:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function publishConfiguration(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'] as string || 'anonymous';
    
    const configurations = await loadConfigurations();
    const configIndex = configurations.findIndex(c => c.id === id && c.userId === userId);
    
    if (configIndex === -1) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    const config = configurations[configIndex];
    
    // Generate published URL
    const slug = generateSlug(config.businessName);
    const publishedUrl = config.hasDomain && config.domainName 
      ? `https://${config.domainName}` 
      : `https://${slug}-${config.id}.sync.app`;

    // Update configuration status
    config.status = 'published';
    config.publishedUrl = publishedUrl;
    config.updatedAt = new Date().toISOString();
    
    configurations[configIndex] = config;
    await saveConfigurations(configurations);

    res.json({ 
      success: true, 
      configuration: config,
      publishedUrl,
      message: 'Website published successfully!'
    });
  } catch (error) {
    console.error('Error publishing configuration:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getPublishedSite(req: Request, res: Response) {
  try {
    const { subdomain } = req.params;
    const configurations = await loadConfigurations();
    
    // Find published configuration by subdomain or domain
    const config = configurations.find(c => 
      c.status === 'published' && (
        c.publishedUrl?.includes(subdomain) ||
        c.selectedDomain === subdomain ||
        c.domainName === subdomain
      )
    );
    
    if (!config) {
      return res.status(404).json({ error: 'Site not found' });
    }

    res.json({ 
      success: true, 
      site: config 
    });
  } catch (error) {
    console.error('Error getting published site:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
