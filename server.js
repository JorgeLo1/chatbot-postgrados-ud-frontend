const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const RASA_API = process.env.RASA_API || 'http://149.130.173.156:5005';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'Chatbot Frontend',
    rasa_endpoint: RASA_API,
    timestamp: new Date().toISOString()
  });
});

// Proxy para health check de Rasa
app.get('/api/', async (req, res) => {
  try {
    const response = await axios.get(`${RASA_API}/`, { timeout: 5000 });
    res.json(response.data);
  } catch (error) {
    console.error('Error checking Rasa status:', error.message);
    res.status(503).json({ 
      error: 'Rasa offline',
      details: error.message 
    });
  }
});

// Proxy para chat
app.post('/api/chat', async (req, res) => {
  try {
    const { sender, message } = req.body;
    
    if (!sender || !message) {
      return res.status(400).json({ 
        error: 'Se requieren los campos "sender" y "message"' 
      });
    }

    console.log(`[${new Date().toISOString()}] Mensaje:`, { sender, message });

    const response = await axios.post(
      `${RASA_API}/webhooks/rest/webhook`,
      { sender, message },
      { 
        timeout: 30000,
        headers: { 'Content-Type': 'application/json' }
      }
    );

    console.log(`[${new Date().toISOString()}] Respuesta OK`);
    res.json(response.data);
    
  } catch (error) {
    console.error('Error Rasa:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        error: 'Servidor Rasa no disponible'
      });
    }
    
    res.status(500).json({ 
      error: 'Error interno',
      details: error.message 
    });
  }
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║  🤖 Chatbot Postgrados UD                            ║
╠═══════════════════════════════════════════════════════╣
║  🌐 Servidor:  http://localhost:${PORT}               
║  🎯 Rasa API:  ${RASA_API}                            
╚═══════════════════════════════════════════════════════╝
  `);
});