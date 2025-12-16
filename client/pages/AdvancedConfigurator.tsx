import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import CardBasedEditor from '@/components/editor/CardBasedEditor';
import { usePersistence } from '@/lib/stepPersistence';
import { configurationApi, type Configuration } from '@/lib/api';
import { publishWebApp } from '@/lib/webapps';

/**
 * Advanced Configurator using Card-Based Editor
 * Provides a modern, modular interface for site configuration
 * 
 * Features:
 * - Card-based sections instead of multi-step wizard
 * - Split-screen live preview
 * - All settings in one place
 * - Auto-saves to localStorage
 */
export default function AdvancedConfigurator() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const persistence = usePersistence();

  const [initialConfig, setInitialConfig] = useState<Configuration | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  // Load initial configuration from persistence
  useEffect(() => {
    try {
      const savedFormData = persistence.getFormData();
      
      // Map formData from stepPersistence to Configuration interface
      const config: Configuration = {
        userId: 'local',
        businessName: savedFormData?.businessName || '',
        businessType: savedFormData?.businessType || 'restaurant',
        location: savedFormData?.location || '',
        slogan: savedFormData?.slogan || '',
        uniqueDescription: savedFormData?.uniqueDescription || '',
        template: savedFormData?.template || 'modern',
        primaryColor: savedFormData?.primaryColor || '#2563EB',
        secondaryColor: savedFormData?.secondaryColor || '#F8FAFC',
        fontFamily: savedFormData?.fontFamily || 'Inter',
        selectedPages: savedFormData?.selectedPages || ['home', 'menu', 'contact'],
        customPages: savedFormData?.customPages || [],
        menuItems: savedFormData?.menuItems || [],
        gallery: savedFormData?.gallery || [],
        openingHours: savedFormData?.openingHours || {},
        contactMethods: savedFormData?.contactMethods || [],
        socialMedia: savedFormData?.socialMedia || {},
        onlineOrdering: savedFormData?.onlineOrdering || false,
        onlineStore: savedFormData?.onlineStore || false,
        teamArea: savedFormData?.teamArea || false,
        hasDomain: savedFormData?.hasDomain || false,
        selectedDomain: savedFormData?.selectedDomain,
        domainName: savedFormData?.domainName,
        status: savedFormData?.status || 'draft',
        publishedUrl: savedFormData?.publishedUrl,
        previewUrl: savedFormData?.previewUrl,
      };

      setInitialConfig(config);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load configuration:', error);
      toast({
        title: 'Error loading configuration',
        description: 'Starting with a fresh configuration',
        variant: 'destructive'
      });
      setInitialConfig(undefined);
      setIsLoading(false);
    }
  }, [persistence, toast]);

  // Save configuration to persistence and database
  const handleSave = async (config: Configuration) => {
    try {
      // Save to persistence layer
      persistence.recordStep({
        stepNumber: -1,
        stepId: 'advanced-editor-save',
        action: 'save',
        data: config
      });

      // Optionally save to server
      // This could be a draft save endpoint
      toast({
        title: 'Configuration saved',
        description: 'Your changes have been saved locally'
      });
    } catch (error) {
      console.error('Failed to save configuration:', error);
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
      throw error;
    }
  };

  // Publish configuration
  const handlePublish = async (config: Configuration) => {
    try {
      // First save the configuration
      await handleSave(config);

      // Publish the website
      const result = await publishWebApp(config);

      if (result.success) {
        // Update persistence with published URL
        persistence.recordStep({
          stepNumber: -1,
          stepId: 'advanced-editor-publish',
          action: 'publish',
          data: { publishedUrl: result.url }
        });

        toast({
          title: 'Site published successfully!',
          description: `Your site is live at ${result.url}`
        });

        // Optionally redirect or show success state
        return result.url;
      } else {
        throw new Error(result.error || 'Publication failed');
      }
    } catch (error) {
      console.error('Failed to publish:', error);
      toast({
        title: 'Publication failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
      throw error;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/configurator')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Back to classic editor"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Advanced Site Editor</h1>
              <p className="text-sm text-gray-600">Configure all aspects of your site in one place</p>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => navigate('/configurator')}
            className="text-gray-700 border-gray-300"
          >
            Back to Classic
          </Button>
        </div>
      </header>

      {/* Editor */}
      <CardBasedEditor
        initialConfig={initialConfig}
        onSave={handleSave}
        onPublish={handlePublish}
        showPreview={true}
      />
    </div>
  );
}
