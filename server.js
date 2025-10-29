const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const RASA_API = process.env.RASA_API || 'http://149.130.173.156:5005';

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept']
}));
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'dist')));

// Health check del frontend
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'Chatbot Frontend',
    rasa_endpoint: RASA_API,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Health check de Rasa (proxy)
app.get('/api/', async (req, res) => {
  try {
    console.log(`Verificando Rasa en: ${RASA_API}/`);
    const response = await axios.get(`${RASA_API}/`, { 
      timeout: 5000,
      headers: { 'Accept': 'application/json' }
    });
    console.log('✓ Rasa está online');
    res.json(response.data);
  } catch (error) {
    console.error('✗ Error verificando Rasa:', error.message);
    res.status(503).json({ 
      error: 'Rasa offline',
      details: error.message,
      endpoint: RASA_API
    });
  }
});

// Endpoint de chat (proxy a Rasa)
app.post('/api/chat', async (req, res) => {
  try {
    const { sender, message } = req.body;
    
    // Validación de entrada
    if (!sender || !message) {
      return res.status(400).json({ 
        error: 'Se requieren los campos "sender" y "message"' 
      });
    }

    console.log(`[${new Date().toISOString()}] Chat request:`, { 
      sender: sender.substring(0, 15) + '...', 
      message: message.substring(0, 50) + (message.length > 50 ? '...' : '')
    });

    // Hacer petición a Rasa
    const rasaUrl = `${RASA_API}/webhooks/rest/webhook`;
    console.log(`Enviando a Rasa: ${rasaUrl}`);
    
    const response = await axios.post(
      rasaUrl,
      { sender, message },
      { 
        timeout: 30000,
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );

    console.log(`✓ Respuesta de Rasa recibida (${response.data.length} mensajes)`);
    res.json(response.data);
    
  } catch (error) {
    console.error('✗ Error en /api/chat:', {
      message: error.message,
      code: error.code,
      response: error.response?.data
    });
    
    // Manejo detallado de errores
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        error: 'Servidor Rasa no disponible',
        details: `No se puede conectar a ${RASA_API}`,
        suggestion: 'Verifica que el servidor Rasa esté corriendo'
      });
    }
    
    if (error.code === 'ETIMEDOUT') {
      return res.status(504).json({ 
        error: 'Timeout al conectar con Rasa',
        details: 'El servidor tardó demasiado en responder'
      });
    }

    if (error.response) {
      return res.status(error.response.status).json({
        error: 'Error en servidor Rasa',
        details: error.response.data,
        status: error.response.status
      });
    }
    
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

// Ruta para obtener tracker (opcional, para debugging)
app.get('/api/conversations/:sender/tracker', async (req, res) => {
  try {
    const { sender } = req.params;
    const response = await axios.get(
      `${RASA_API}/conversations/${sender}/tracker`,
      { timeout: 5000 }
    );
    res.json(response.data);
  } catch (error) {
    console.error('Error obteniendo tracker:', error.message);
    res.status(500).json({ 
      error: 'Error obteniendo historial',
      details: error.message 
    });
  }
});

// SPA fallback - debe ir al final
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error no capturado:', err);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    details: err.message 
  });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║  🤖 Chatbot Postgrados UD - Frontend Server         ║
╠═══════════════════════════════════════════════════════╣
║  🌐 Servidor:     http://localhost:${PORT.toString().padEnd(4)}              ║
║  🎯 Rasa API:     ${RASA_API.padEnd(35)}║
║  📦 Entorno:      ${(process.env.NODE_ENV || 'development').padEnd(35)}║
╚═══════════════════════════════════════════════════════╝
  `);
  
  // Verificar conexión con Rasa al iniciar
  console.log('\n⏳ Verificando conexión con Rasa...');
  axios.get(`${RASA_API}/`, { timeout: 5000 })
    .then(response => {
      console.log('✓ Conexión con Rasa establecida exitosamente');
      console.log(`  Versión: ${response.data.version || 'desconocida'}\n`);
    })
    .catch(error => {
      console.error('✗ No se pudo conectar con Rasa:');
      console.error(`  ${error.message}`);
      console.error('  El servidor seguirá funcionando, pero el chat no estará disponible\n');
    });
});