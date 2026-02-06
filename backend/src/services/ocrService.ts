import Tesseract from 'tesseract.js';
import * as pdfParse from 'pdf-parse';
import { AppError } from '../middleware/errorHandler';

interface OCRResult {
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  subtotal?: number;
  tax?: number;
  total?: number;
  lineItems: Array<{
    description: string;
    quantity?: number;
    unitPrice?: number;
    amount: number;
  }>;
  vendorName?: string;
  vendorAddress?: string;
  confidence: number;
  rawText: string;
}

export class OCRService {
  /**
   * Extract text and data from PDF invoice
   */
  async extractInvoiceData(fileBuffer: Buffer): Promise<OCRResult> {
    try {
      console.log('Starting OCR extraction...');

      // First, try to extract text directly from PDF
      let extractedText = '';
      try {
        const pdfData = await (pdfParse as any)(fileBuffer);
        extractedText = pdfData.text;
        console.log('Extracted text from PDF (length):', extractedText.length);
      } catch (error) {
        console.warn('PDF text extraction failed, will try OCR on images:', error);
      }

      // If PDF text extraction failed or returned little text, try OCR
      if (!extractedText || extractedText.length < 50) {
        console.log('Text extraction yielded little content, attempting OCR...');
        try {
          const { data: { text } } = await Tesseract.recognize(fileBuffer, 'eng', {
            logger: (m) => {
              if (m.status === 'recognizing text') {
                console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
              }
            },
          });
          extractedText = text;
          console.log('OCR completed, extracted text length:', extractedText.length);
        } catch (ocrError) {
          console.error('OCR failed:', ocrError);
          throw new AppError(
            'Failed to extract text from PDF. The file may be corrupted or in an unsupported format.',
            422,
            'OCR_FAILED'
          );
        }
      }

      // Parse the extracted text
      const parsedData = this.parseInvoiceText(extractedText);

      console.log('OCR extraction completed with confidence:', parsedData.confidence);
      return parsedData;
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('OCR service error:', error);
      throw new AppError(
        'Failed to process invoice file',
        500,
        'OCR_ERROR'
      );
    }
  }

  /**
   * Parse extracted text to find invoice data
   */
  private parseInvoiceText(text: string): OCRResult {
    const result: OCRResult = {
      lineItems: [],
      confidence: 0,
      rawText: text,
    };

    let fieldsFound = 0;
    const totalFields = 7; // Number of fields we try to extract

    // Extract invoice number
    const invoiceNumberPatterns = [
      /invoice\s*#?\s*:?\s*([A-Z0-9-]+)/i,
      /invoice\s*number\s*:?\s*([A-Z0-9-]+)/i,
      /inv\s*#?\s*:?\s*([A-Z0-9-]+)/i,
      /#\s*([A-Z0-9-]{5,})/i,
    ];
    for (const pattern of invoiceNumberPatterns) {
      const match = text.match(pattern);
      if (match) {
        result.invoiceNumber = match[1].trim();
        fieldsFound++;
        break;
      }
    }

    // Extract dates (invoice date and due date)
    const datePatterns = [
      /invoice\s*date\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /date\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
    ];
    const dates: string[] = [];
    for (const pattern of datePatterns) {
      const matches = text.matchAll(new RegExp(pattern, 'gi'));
      for (const match of matches) {
        dates.push(match[1]);
      }
    }
    if (dates.length > 0) {
      result.invoiceDate = this.normalizeDate(dates[0]);
      fieldsFound++;
    }
    if (dates.length > 1) {
      result.dueDate = this.normalizeDate(dates[1]);
      fieldsFound++;
    }

    // Extract amounts
    const subtotalMatch = text.match(/subtotal\s*:?\s*\$?\s*([\d,]+\.?\d*)/i);
    if (subtotalMatch) {
      result.subtotal = parseFloat(subtotalMatch[1].replace(/,/g, ''));
      fieldsFound++;
    }

    const taxMatch = text.match(/tax\s*:?\s*\$?\s*([\d,]+\.?\d*)/i);
    if (taxMatch) {
      result.tax = parseFloat(taxMatch[1].replace(/,/g, ''));
      fieldsFound++;
    }

    const totalMatch = text.match(/(?:total|amount\s*due|balance\s*due)\s*:?\s*\$?\s*([\d,]+\.?\d*)/i);
    if (totalMatch) {
      result.total = parseFloat(totalMatch[1].replace(/,/g, ''));
      fieldsFound++;
    }

    // Extract vendor name (usually at the top)
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    if (lines.length > 0) {
      result.vendorName = lines[0].trim().substring(0, 100);
      fieldsFound++;
    }

    // Extract line items (simplified - looks for patterns of description + amount)
    const lineItemPattern = /^(.+?)\s+\$?\s*([\d,]+\.?\d*)$/gm;
    const lineMatches = text.matchAll(lineItemPattern);
    for (const match of lineMatches) {
      const description = match[1].trim();
      const amount = parseFloat(match[2].replace(/,/g, ''));

      // Skip lines that look like totals or headers
      if (
        description.length > 5 &&
        description.length < 200 &&
        amount > 0 &&
        !/^(subtotal|tax|total|amount|balance|invoice|date|due|payment)/i.test(description)
      ) {
        result.lineItems.push({
          description,
          amount,
        });
      }
    }

    // Calculate confidence score (0-100)
    result.confidence = Math.round((fieldsFound / totalFields) * 100);

    return result;
  }

  /**
   * Normalize date format to YYYY-MM-DD
   */
  private normalizeDate(dateStr: string): string {
    try {
      // Try to parse various date formats
      const parts = dateStr.split(/[\/\-]/);

      if (parts.length === 3) {
        let year = parseInt(parts[2]);
        const month = parseInt(parts[0]);
        const day = parseInt(parts[1]);

        // Handle 2-digit years
        if (year < 100) {
          year += year < 50 ? 2000 : 1900;
        }

        // Return ISO format
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    } catch (error) {
      console.warn('Failed to normalize date:', dateStr);
    }
    return dateStr;
  }
}

export const ocrService = new OCRService();
