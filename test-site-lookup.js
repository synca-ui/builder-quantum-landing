// Quick test to verify the site lookup logic
const configurations = [
  {
    businessName: "erer",
    status: "published",
    publishedUrl: "https://erer-xt3wpr.synca.digital",
    selectedDomain: undefined,
    domainName: undefined
  }
];

function testSiteLookup(subdomain) {
  console.log(`Testing lookup for subdomain: "${subdomain}"`);
  
  const config = configurations.find(
    (c) =>
      c.status === "published" &&
      (c.publishedUrl?.includes(subdomain) ||
        c.selectedDomain === subdomain ||
        c.domainName === subdomain),
  );
  
  if (config) {
    console.log(`✅ Found: ${config.businessName}`);
    console.log(`   publishedUrl: ${config.publishedUrl}`);
    console.log(`   selectedDomain: ${config.selectedDomain}`);
    console.log(`   domainName: ${config.domainName}`);
  } else {
    console.log(`❌ Not found`);
  }
  
  return config;
}

// Test different variations
console.log('=== Site Lookup Test ===');
testSiteLookup('erer-xt3wpr');
testSiteLookup('erer');
testSiteLookup('xt3wpr');

console.log('\n=== URL Analysis ===');
const testUrl = 'https://erer-xt3wpr.synca.digital';
const hostname = new URL(testUrl).hostname;
const parts = hostname.split('.');
console.log(`URL: ${testUrl}`);
console.log(`Hostname: ${hostname}`);
console.log(`Parts: ${JSON.stringify(parts)}`);
console.log(`First part (subdomain): ${parts[0]}`);

// Test the actual includes logic
const subdomain = 'erer-xt3wpr';
const publishedUrl = 'https://erer-xt3wpr.synca.digital';
console.log(`\nIncludes test: "${publishedUrl}".includes("${subdomain}") = ${publishedUrl.includes(subdomain)}`);
