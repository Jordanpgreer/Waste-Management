import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import clientRoutes from './routes/clientRoutes';
import vendorRoutes from './routes/vendorRoutes';
import purchaseOrderRoutes from './routes/purchaseOrderRoutes';
import clientInvoiceRoutes from './routes/clientInvoiceRoutes';
import invoiceMatchingRoutes from './routes/invoiceMatchingRoutes';
import { createTicketRoutes } from './routes/ticket.routes';
import { TicketService } from './services/ticket.service';
import { TicketController } from './controllers/ticket.controller';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { pool } from './config/database';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;
const API_VERSION = process.env.API_VERSION || 'v1';

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    },
  });
});

// Initialize services
const ticketService = new TicketService(pool);
const ticketController = new TicketController(ticketService);

// Register routes
app.use(`/api/${API_VERSION}/auth`, authRoutes);
app.use(`/api/${API_VERSION}/clients`, clientRoutes);
app.use(`/api/${API_VERSION}/vendors`, vendorRoutes);
app.use(`/api/${API_VERSION}/purchase-orders`, purchaseOrderRoutes);
app.use(`/api/${API_VERSION}/client-invoices`, clientInvoiceRoutes);
app.use(`/api/${API_VERSION}/invoice-matching`, invoiceMatchingRoutes);
app.use(`/api/${API_VERSION}/tickets`, createTicketRoutes(ticketController));

app.use(notFoundHandler);
app.use(errorHandler);

const startServer = async () => {
  try {
    await pool.query('SELECT NOW()');
    console.log('Database connection established');

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`API Version: ${API_VERSION}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  await pool.end();
  process.exit(0);
});

export default app;
