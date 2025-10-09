import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pluggyRoutes from './routes/pluggy.js';
import whatsappRoutes from './routes/whatsapp.js';
import latamRoutes from './routes/latam.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/', pluggyRoutes);
app.use('/', whatsappRoutes);
app.use('/latam', latamRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 FinTrack backend running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

