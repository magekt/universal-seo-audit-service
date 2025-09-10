module.exports = () => {
  const required = [
    'DATABASE_URL',
    'REDIS_URL',
    'CRAWLEE_SERVICE_URL',
    'LIGHTHOUSE_SERVICE_URL',
    'SEO_SERVICE_URL',
    'JWT_SECRET'
  ];
  let missing = [];
  required.forEach(key => {
    if (!process.env[key]) {
      missing.push(key);
    }
  });
  if (missing.length) {
    console.error(
      'Missing required environment variables:',
      missing.join(', ')
    );
    process.exit(1);
  }
};
