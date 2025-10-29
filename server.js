const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;
const RASA_API = process.env.RASA_API || 'http://149.130.173.156:5005';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'Chatbot Frontend',
    rasa_endpoint: RASA_API,
    timestamp: new Date().toISOString()
  });
});

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "Chatbot Postgrados UD - API Docs"
}));

// Proxy endpoint para evitar CORS
app.post('/api/chat', async (req, res) => {
  try {
    const { sender, message } = req.body;
    
    if (!sender || !message) {
      return res.status(400).json({ 
        error: 'Se requieren los campos "sender" y "message"' 
      });
    }

    console.log(`[${new Date().toISOString()}] Enviando mensaje a Rasa:`, { sender, message });

    const response = await axios.post(
      `${RASA_API}/webhooks/rest/webhook`,
      { sender, message },
      { 
        timeout: 30000,
        headers: { 'Content-Type': 'application/json' }
      }
    );

    console.log(`[${new Date().toISOString()}] Respuesta de Rasa:`, response.data);

    res.json(response.data);
  } catch (error) {
    console.error('Error al contactar Rasa:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        error: 'Servidor Rasa no disponible',
        details: `No se pudo conectar a ${RASA_API}`
      });
    }
    
    if (error.code === 'ETIMEDOUT') {
      return res.status(504).json({ 
        error: 'Timeout al conectar con Rasa',
        details: 'El servidor tardó demasiado en responder'
      });
    }

    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

// Status de Rasa
app.get('/api/status', async (req, res) => {
  try {
    const response = await axios.get(`${RASA_API}/`, { timeout: 5000 });
    res.json({ 
      status: 'online', 
      rasa_version: response.data.version || 'unknown',
      endpoint: RASA_API
    });
  } catch (error) {
    res.json({ 
      status: 'offline', 
      error: error.message,
      endpoint: RASA_API
    });
  }
});

// Página principal
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║  🤖 Chatbot Postgrados UD - Frontend + Swagger       ║
╠═══════════════════════════════════════════════════════╣
║  🌐 Servidor:     http://localhost:${PORT}            ║
║  📚 API Docs:     http://localhost:${PORT}/api-docs   ║
║  🎯 Rasa API:     ${RASA_API}                         ║
╚═══════════════════════════════════════════════════════╝
  `);
});