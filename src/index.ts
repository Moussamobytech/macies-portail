import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import requestRoutes from './routes/requests';
import adminRoutes from './routes/admin';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Route de test pour la racine
app.get('/', (req, res) => {
  res.json({ status: 'success', message: 'MACIES API is running on Vercel!' });
});

app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/admin', adminRoutes);

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
