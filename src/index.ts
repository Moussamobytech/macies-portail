import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import requestRoutes from './routes/requests';
import adminRoutes from './routes/admin';
import notificationRoutes from './routes/notifications';
import orderRoutes from './routes/orders';

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
app.use('/api/notifications', notificationRoutes);
app.use('/api/orders', orderRoutes);

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
