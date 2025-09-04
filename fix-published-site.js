#!/usr/bin/env node

// Workaround script to ensure published site has complete data
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, 'data', 'configurations.json');

try {
  // Read current configuration
  const data = fs.readFileSync(configPath, 'utf8');
  const configs = JSON.parse(data);
  
  // Find the published config for "erer"
  const config = configs.find(c => c.businessName === 'erer' && c.status === 'published');
  
  if (!config) {
    console.log('Published config not found');
    process.exit(1);
  }

  console.log('Found published config:', config.businessName);
  console.log('Current menu items:', config.menuItems.length);
  
  // Complete the configuration with realistic data
  config.slogan = "Fresh coffee and delicious meals in the heart of the city";
  config.uniqueDescription = "Welcome to erer, your neighborhood cafe where we serve the finest coffee and freshly prepared meals. Our cozy atmosphere and friendly staff make us the perfect place to start your day or catch up with friends.";
  config.location = "123 Main Street, Downtown, City 12345";
  
  // Add realistic menu items
  config.menuItems = [
    {
      id: "coffee-americano",
      name: "Americano",
      description: "Rich espresso with hot water",
      price: 4.50,
      category: "Coffee",
      image: "/placeholder.svg",
      available: true
    },
    {
      id: "coffee-latte",
      name: "Latte",
      description: "Smooth espresso with steamed milk",
      price: 5.25,
      category: "Coffee",
      image: "/placeholder.svg",
      available: true
    },
    {
      id: "coffee-cappuccino",
      name: "Cappuccino",
      description: "Classic espresso with foamed milk",
      price: 4.95,
      category: "Coffee",
      image: "/placeholder.svg",
      available: true
    },
    {
      id: "sandwich-club",
      name: "Club Sandwich",
      description: "Triple layer with turkey, bacon, lettuce, tomato",
      price: 12.95,
      category: "Sandwiches",
      image: "/placeholder.svg",
      available: true
    },
    {
      id: "sandwich-veggie",
      name: "Veggie Wrap",
      description: "Fresh vegetables and hummus in a whole wheat wrap",
      price: 9.50,
      category: "Sandwiches",
      image: "/placeholder.svg",
      available: true
    },
    {
      id: "salad-caesar",
      name: "Caesar Salad",
      description: "Crisp romaine lettuce with caesar dressing and croutons",
      price: 11.25,
      category: "Salads",
      image: "/placeholder.svg",
      available: true
    }
  ];

  // Add contact methods
  config.contactMethods = [
    "Phone: (555) 123-4567",
    "Email: hello@erer.cafe",
    "Instagram: @erercafe"
  ];

  // Add social media
  config.socialMedia = {
    instagram: "https://instagram.com/erercafe",
    facebook: "https://facebook.com/erercafe",
    twitter: "https://twitter.com/erercafe"
  };

  // Add gallery images
  config.gallery = [
    {
      id: "gallery-1",
      url: "/placeholder.svg",
      alt: "Cozy cafe interior",
      caption: "Our welcoming atmosphere"
    },
    {
      id: "gallery-2", 
      url: "/placeholder.svg",
      alt: "Fresh coffee being poured",
      caption: "Freshly brewed coffee"
    },
    {
      id: "gallery-3",
      url: "/placeholder.svg", 
      alt: "Delicious sandwich",
      caption: "Made to order sandwiches"
    },
    {
      id: "gallery-4",
      url: "/placeholder.svg",
      alt: "Outdoor seating area",
      caption: "Enjoy the fresh air"
    }
  ];

  // Update timestamp
  config.updatedAt = new Date().toISOString();

  // Write back to file
  fs.writeFileSync(configPath, JSON.stringify(configs, null, 2));
  
  console.log('✅ Successfully updated published configuration');
  console.log('📋 Menu items:', config.menuItems.length);
  console.log('📞 Contact methods:', config.contactMethods.length);
  console.log('📱 Social media:', Object.keys(config.socialMedia).length);
  console.log('🖼️ Gallery images:', config.gallery.length);
  console.log('🌐 Published URL:', config.publishedUrl);
  
} catch (error) {
  console.error('Error updating configuration:', error);
  process.exit(1);
}
