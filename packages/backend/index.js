import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
// import whatsappRoutes from './routes/whatsapp.js'; // Removido após consolidação do webhook em api/webhook.js

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
// app.use('/', whatsappRoutes); // Rota removida: o endpoint principal de webhook agora está em api/webhook.js (Vercel)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`MeuAzulão backend running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

