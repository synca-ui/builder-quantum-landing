import React from 'react';
import { Helmet } from 'react-helmet-async';
import { SchemaOrganization, RestaurantSchemaConfig } from '../../shared/types/schema';
import { generateRestaurantSchema } from '../../lib/schemaGenerator';

interface RestaurantJsonLdProps {
  /**
   * Site configuration object (same shape as FormData)
   */
  config: any;
  /**
   * Pre-generated schema (optional - if not provided, will be generated from config)
   */
  preGeneratedSchema?: SchemaOrganization;
}

/**
 * Component that injects Restaurant JSON-LD schema into page head
 * This enables AI agents (ChatGPT, Google Assistant, etc.) to read menu and booking info
 * 
 * Usage:
 * <RestaurantJsonLd config={formData} />
 * // or with pre-generated schema
 * <RestaurantJsonLd config={formData} preGeneratedSchema={schema} />
 */
export function RestaurantJsonLd({
  config,
  preGeneratedSchema
}: RestaurantJsonLdProps) {
  // Convert formData config to schema config format
  const schemaConfig: RestaurantSchemaConfig = {
    businessName: config.businessName || 'Unnamed Business',
    businessType: config.businessType,
    description: config.uniqueDescription || config.slogan,
    location: config.location,
    address: config.location, // Using location as address
    phone: config.contactMethods?.[0],
    email: config.contactMethods?.find((c: string) => c.includes('@')),
    website: config.website,
    logo: config.logo,
    openingHours: config.openingHours,
    menuItems: config.menuItems?.map((item: any) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category,
      image: item.image || item.imageUrl
    })),
    latitude: config.latitude,
    longitude: config.longitude,
    reviews: config.reviews,
    socialLinks: {
      facebook: config.socialMedia?.facebook,
      instagram: config.socialMedia?.instagram,
      twitter: config.socialMedia?.twitter,
      linkedin: config.socialMedia?.linkedin
    }
  };

  // Use pre-generated schema or generate from config
  let schema: SchemaOrganization;
  
  if (preGeneratedSchema) {
    schema = preGeneratedSchema;
  } else {
    try {
      schema = generateRestaurantSchema(schemaConfig);
    } catch (error) {
      console.warn('Failed to generate restaurant schema:', error);
      return null;
    }
  }

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
}

export default RestaurantJsonLd;
