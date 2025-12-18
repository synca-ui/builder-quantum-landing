import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Edit3, Trash2, Globe, Calendar, Clock, MoreVertical, Rocket, Eye, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { configurationApi, sessionApi, handleApiError, type Configuration } from "@/lib/api";

export default function Dashboard() {
  const [configurations, setConfigurations] = useState<Configuration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  // Load configurations on mount
  useEffect(() => {
    loadConfigurations();
  }, []);

  const loadConfigurations = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await configurationApi.getAll();
      if (result.success && result.data) {
        setConfigurations(result.data);
      } else {
        setError(handleApiError(result.error || 'Failed to load configurations'));
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const deleteConfiguration = async (id: string) => {
    setDeleteLoading(id);
    try {
      const result = await configurationApi.delete(id);
      if (result.success) {
        setConfigurations(prev => prev.filter(config => config.id !== id));
      } else {
        setError(handleApiError(result.error || 'Failed to delete configuration'));
      }
    } catch (err) {
      setError('Failed to delete configuration');
    } finally {
      setDeleteLoading(null);
    }
  };

  const publishConfiguration = async (id: string) => {
    try {
      const result = await configurationApi.publish(id);
      if (result.success && result.data) {
        setConfigurations(prev => prev.map(config => 
          config.id === id ? result.data! : config
        ));
      } else {
        setError(handleApiError(result.error || 'Failed to publish configuration'));
      }
    } catch (err) {
      setError('Failed to publish configuration');
    }
  };

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getBusinessTypeIcon = (type: string) => {
    switch (type) {
      case 'cafe': return '☕';
      case 'restaurant': return '🍽️';
      case 'bar': return '🍺';
      case 'store': return '🏪';
      default: return '🏢';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-teal-500 rounded-full animate-bounce mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your websites...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link to="/" className="text-2xl font-black text-gradient">Maitr</Link>
              <span className="text-gray-300">/</span>
              <span className="text-gray-600 font-medium">Dashboard</span>
            </div>
            <Link to="/configurator">
              <Button className="bg-gradient-to-r from-teal-500 to-purple-500 hover:from-teal-600 hover:to-purple-600">
                <Plus className="w-4 h-4 mr-2" />
                New App
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={loadConfigurations}
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        )}

        {configurations.length === 0 ? (
          // Empty state
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <Globe className="w-12 h-12 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">No websites yet</h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Create your first website with our easy-to-use builder. It only takes a few minutes!
            </p>
            <Link to="/configurator">
              <Button size="lg" className="bg-gradient-to-r from-teal-500 to-purple-500">
                <Plus className="w-5 h-5 mr-2" />
                Create Your First Website
              </Button>
            </Link>
          </div>
        ) : (
          // Configurations grid
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Your Websites</h1>
                <p className="text-gray-600 mt-1">
                  Manage and publish your {configurations.length} website{configurations.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {configurations.map((config) => (
                <Card key={config.id} className="group hover:shadow-lg transition-shadow duration-200">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">{getBusinessTypeIcon(config.businessType)}</div>
                        <div>
                          <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-teal-600 transition-colors">
                            {config.businessName || 'Untitled Website'}
                          </CardTitle>
                          <p className="text-sm text-gray-500 capitalize">{config.businessType}</p>
                        </div>
                      </div>
                      <div className="relative">
                        <Button variant="ghost" size="sm" className="p-1">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-4">
                      {/* Status and URL */}
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(config.status || 'draft')}`}>
                          {config.status || 'draft'}
                        </span>
                        {config.publishedUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyUrl(config.publishedUrl!)}
                            className="p-1"
                            title="Copy URL"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        )}
                      </div>

                      {/* Details */}
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-3 h-3" />
                          <span>Created {formatDate(config.createdAt)}</span>
                        </div>
                        {config.updatedAt && config.updatedAt !== config.createdAt && (
                          <div className="flex items-center space-x-2">
                            <Clock className="w-3 h-3" />
                            <span>Updated {formatDate(config.updatedAt)}</span>
                          </div>
                        )}
                        {config.template && (
                          <div className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                            Template: {config.template}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex space-x-2 pt-4 border-t border-gray-100">
                        <Link to={`/configurator?edit=${config.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full">
                            <Edit3 className="w-3 h-3 mr-2" />
                            Edit
                          </Button>
                        </Link>

                        {config.status === 'published' && config.publishedUrl ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(config.publishedUrl, '_blank')}
                            className="flex-1"
                          >
                            <Eye className="w-3 h-3 mr-2" />
                            View
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => publishConfiguration(config.id!)}
                            className="flex-1"
                          >
                            <Rocket className="w-3 h-3 mr-2" />
                            Publish
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteConfiguration(config.id!)}
                          disabled={deleteLoading === config.id}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
