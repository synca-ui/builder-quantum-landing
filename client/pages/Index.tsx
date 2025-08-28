import { useState, useEffect } from "react";
import { ChevronRight, Play, Star, Check, ArrowRight, Zap, Palette, Smartphone, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Index() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeDemo, setActiveDemo] = useState(0);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const features = [
    {
      icon: <Zap className="w-8 h-8 text-teal-500" />,
      title: "Lightning Fast",
      description: "Build your website in minutes, not hours. Our intuitive drag-and-drop builder gets you online quickly."
    },
    {
      icon: <Palette className="w-8 h-8 text-purple-500" />,
      title: "Beautiful Templates",
      description: "Choose from hundreds of professionally designed templates that look great on every device."
    },
    {
      icon: <Smartphone className="w-8 h-8 text-orange-500" />,
      title: "Mobile Optimized",
      description: "Every website automatically adapts to mobile, tablet, and desktop screens perfectly."
    },
    {
      icon: <Globe className="w-8 h-8 text-teal-500" />,
      title: "Global CDN",
      description: "Your site loads fast anywhere in the world with our global content delivery network."
    }
  ];

  const testimonials = [
    {
      name: "Sophia D.",
      business: "Café Owner",
      text: "sync.a allowed me to go from concept to launch in just hours. It's easy to use and delivers professional results.",
      rating: 5
    },
    {
      name: "Marcus T.",
      business: "Freelance Designer",
      text: "The templates are gorgeous and the customization options are endless. My clients love their new websites.",
      rating: 5
    },
    {
      name: "Elena R.",
      business: "Online Store Owner",
      text: "I've tried other builders but sync.a is by far the most intuitive. My online store is now thriving.",
      rating: 5
    }
  ];

  const pricingPlans = [
    {
      name: "Basic",
      price: "$9",
      period: "/month",
      description: "Perfect for personal websites",
      features: [
        "1 Website",
        "Basic Templates",
        "Mobile Responsive",
        "SSL Certificate",
        "24/7 Support"
      ],
      cta: "Start Basic",
      popular: false
    },
    {
      name: "Pro",
      price: "$29",
      period: "/month",
      description: "Ideal for growing businesses",
      features: [
        "5 Websites",
        "Premium Templates",
        "Advanced Customization",
        "E-commerce Ready",
        "Analytics Dashboard",
        "Priority Support"
      ],
      cta: "Start Pro",
      popular: true
    },
    {
      name: "Business",
      price: "$79",
      period: "/month",
      description: "For established businesses",
      features: [
        "Unlimited Websites",
        "All Premium Features",
        "White-label Options",
        "API Access",
        "Custom Integrations",
        "Dedicated Support"
      ],
      cta: "Start Business",
      popular: false
    }
  ];

  const demoTemplates = [
    {
      name: "Modern Business",
      preview: "bg-gradient-to-br from-blue-50 to-indigo-100",
      color: "from-blue-500 to-indigo-600"
    },
    {
      name: "Creative Portfolio", 
      preview: "bg-gradient-to-br from-purple-50 to-pink-100",
      color: "from-purple-500 to-pink-600"
    },
    {
      name: "Online Store",
      preview: "bg-gradient-to-br from-green-50 to-emerald-100", 
      color: "from-green-500 to-emerald-600"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-teal-50 min-h-screen flex items-center">
        <div className={"absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23f1f5f9\" fill-opacity=\"0.4\"%3E%3Ccircle cx=\"7\" cy=\"7\" r=\"1\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50"}></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center">
            <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
                <span className="font-serif">Build a Stunning</span>
                <br />
                <span className="bg-gradient-to-r from-teal-600 to-purple-600 bg-clip-text text-transparent">
                  Website in Minutes
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
                Create, Customize, and Go Live. Perfect for small businesses looking to get online quickly.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white px-8 py-6 text-lg font-semibold rounded-full transform transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  Get Started Now
                  <ChevronRight className="ml-2 w-5 h-5" />
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  className="border-2 border-gray-300 hover:border-gray-400 px-8 py-6 text-lg font-semibold rounded-full transition-all duration-200 hover:scale-105"
                >
                  <Play className="mr-2 w-5 h-5" />
                  Watch Demo
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Elements */}
        <div className="absolute top-1/4 left-10 w-20 h-20 bg-gradient-to-br from-teal-400 to-teal-500 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-10 w-32 h-32 bg-gradient-to-br from-purple-400 to-purple-500 rounded-full opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/3 right-1/4 w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full opacity-20 animate-pulse delay-500"></div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              <span className="font-serif">How It</span> Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Three simple steps to get your professional website online
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card 
                key={index}
                className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border-0 shadow-lg bg-gradient-to-br from-white to-gray-50"
              >
                <CardContent className="p-8 text-center">
                  <div className="mb-6 flex justify-center">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 group-hover:scale-110 transition-transform duration-300">
                      {feature.icon}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <Button 
              variant="outline"
              size="lg"
              className="border-2 border-teal-500 text-teal-600 hover:bg-teal-500 hover:text-white px-8 py-4 text-lg font-semibold rounded-full transition-all duration-300"
            >
              See All Features
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Interactive Demo Section */}
      <section className="py-24 bg-gradient-to-br from-gray-50 to-teal-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              <span className="font-serif">Try It</span> Live
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Experience the power of our website builder with this interactive demo
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-5xl mx-auto">
            <div className="flex flex-wrap gap-4 justify-center mb-8">
              {demoTemplates.map((template, index) => (
                <Button
                  key={index}
                  variant={activeDemo === index ? "default" : "outline"}
                  onClick={() => setActiveDemo(index)}
                  className={`px-6 py-3 rounded-full transition-all duration-300 ${
                    activeDemo === index 
                      ? `bg-gradient-to-r ${template.color} text-white shadow-lg transform scale-105` 
                      : 'hover:scale-105'
                  }`}
                >
                  {template.name}
                </Button>
              ))}
            </div>
            
            <div className="relative">
              <div className={`aspect-video rounded-2xl ${demoTemplates[activeDemo].preview} transition-all duration-500 flex items-center justify-center`}>
                <div className="text-center">
                  <div className={`w-20 h-20 rounded-full bg-gradient-to-r ${demoTemplates[activeDemo].color} mx-auto mb-4 flex items-center justify-center`}>
                    <Play className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">{demoTemplates[activeDemo].name}</h3>
                  <p className="text-gray-600">Click to customize this template</p>
                </div>
              </div>
              
              <Button 
                size="lg"
                className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white px-8 py-3 rounded-full shadow-xl"
              >
                Try it Live
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              <span className="font-serif">What Our</span> Customers Say
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Join thousands of satisfied customers who built their dream websites with sync.a
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card 
                key={index}
                className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border-0 shadow-lg bg-gradient-to-br from-white to-gray-50"
              >
                <CardContent className="p-8">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-6 italic leading-relaxed">"{testimonial.text}"</p>
                  <div>
                    <p className="font-bold text-gray-900">{testimonial.name}</p>
                    <p className="text-gray-600">{testimonial.business}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 bg-gradient-to-br from-gray-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              <span className="font-serif">Simple</span> Pricing
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Choose the perfect plan for your business needs
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <Card 
                key={index}
                className={`group transition-all duration-300 transform hover:-translate-y-2 border-0 shadow-lg relative ${
                  plan.popular 
                    ? 'shadow-2xl scale-105 bg-gradient-to-br from-white to-teal-50 ring-2 ring-teal-500' 
                    : 'bg-gradient-to-br from-white to-gray-50 hover:shadow-xl'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-teal-500 to-teal-600 text-white px-4 py-2 rounded-full text-sm font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}
                <CardContent className="p-8 text-center">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-gray-600 mb-6">{plan.description}</p>
                  <div className="mb-6">
                    <span className="text-5xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-600">{plan.period}</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center justify-center">
                        <Check className="w-5 h-5 text-teal-500 mr-3" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    size="lg"
                    className={`w-full py-4 text-lg font-semibold rounded-full transition-all duration-300 ${
                      plan.popular
                        ? 'bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                        : 'border-2 border-gray-300 hover:border-teal-500 hover:bg-teal-500 hover:text-white'
                    }`}
                    variant={plan.popular ? "default" : "outline"}
                  >
                    {plan.cta}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-24 bg-gradient-to-r from-teal-600 to-purple-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            <span className="font-serif">Ready to Build</span>
            <br />
            Your Website?
          </h2>
          <p className="text-xl md:text-2xl text-teal-100 mb-8 max-w-2xl mx-auto">
            Join thousands of small businesses using sync.a to bring their ideas online.
          </p>
          <Button 
            size="lg"
            className="bg-white text-teal-600 hover:bg-gray-100 px-12 py-6 text-xl font-bold rounded-full transform transition-all duration-300 hover:scale-105 shadow-2xl animate-pulse"
          >
            Start Building
            <ArrowRight className="ml-3 w-6 h-6" />
          </Button>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-10 left-10 w-24 h-24 bg-white opacity-10 rounded-full"></div>
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-white opacity-10 rounded-full"></div>
        <div className="absolute top-1/2 right-20 w-16 h-16 bg-white opacity-10 rounded-full"></div>
      </section>

      {/* Footer Section */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-teal-400 to-purple-400 bg-clip-text text-transparent">
                sync.a
              </h3>
              <p className="text-gray-400 leading-relaxed">
                The easiest way to build beautiful, professional websites for your business.
              </p>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Product</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Templates</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Enterprise</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Company</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Support</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Status</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400">© 2024 sync.a. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <span className="sr-only">Twitter</span>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"></path></svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <span className="sr-only">GitHub</span>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"></path></svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <span className="sr-only">LinkedIn</span>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"></path></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
