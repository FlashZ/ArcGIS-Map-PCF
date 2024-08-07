const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

// Handle preflight requests
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.sendStatus(200);
});

// Proxy configuration
app.use('/arcgis', createProxyMiddleware({
  target: 'https://maps.ultrafastfibre.co.nz',
  changeOrigin: true,
  pathRewrite: {
    '^/arcgis': ''
  },
  onProxyReq: (proxyReq, req, res) => {
    // Add custom headers if needed
    proxyReq.setHeader('Access-Control-Allow-Origin', '*');
    if (req.body) {
      let bodyData = JSON.stringify(req.body);
      // incase if content-type is application/x-www-form-urlencoded -> we need to change to application/json
      proxyReq.setHeader('Content-Type','application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      // Stream the content
      proxyReq.write(bodyData);
    }
  }
}));

app.listen(3000, () => {
  console.log('Proxy server running on port 3000');
});
