const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
const routeMap = {
  '/': 'index.html',
  '/studio': 'studio.html',
  '/products': 'products.html',
  '/apps': 'apps.html',
  '/tools': 'tools.html',
  '/content': 'content.html',
  '/travel': 'travel.html',
  '/contact': 'contact.html'
};

// Serve static files from current directory
app.use(express.static(__dirname));
app.use('/public', express.static(path.join(__dirname, 'public')));

// Mirror the static route behavior used in deployment for local development.
app.get(Object.keys(routeMap), (req, res) => {
  res.sendFile(path.join(__dirname, routeMap[req.path]));
});

// Fall back to home for unknown routes.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
