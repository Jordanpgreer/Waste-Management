import multer from 'multer';
import { Request } from 'express';
import { AppError } from './errorHandler';

// Configure multer for memory storage (we'll upload to Supabase from memory)
const storage = multer.memoryStorage();

// File filter to only allow PDFs
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new AppError('Only PDF files are allowed', 400, 'INVALID_FILE_TYPE'));
  }
};

// Configure multer
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB default

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

// Export configured middleware for single file upload
export const uploadSinglePDF = uploadMiddleware.single('file');
