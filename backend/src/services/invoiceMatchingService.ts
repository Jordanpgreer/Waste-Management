import { pool } from '../config/database';
import {
  InvoiceMatchingRecord,
  MatchResult,
  AutoMatchInput,
  InvoiceSettings,
  UpdateInvoiceSettingsInput,
} from '../types';
import { AppError } from '../middleware/errorHandler';

export class InvoiceMatchingService {
  /**
   * Calculate Levenshtein distance between two strings
   * Returns the minimum number of edits (insertions, deletions, substitutions) needed
   */
  private calculateLevenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1, // deletion
            dp[i][j - 1] + 1, // insertion
            dp[i - 1][j - 1] + 1 // substitution
          );
        }
      }
    }

    return dp[m][n];
  }

  /**
   * Calculate similarity percentage between two strings (0-100)
   * Uses Levenshtein distance with normalization
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const normalized1 = str1.toLowerCase().trim();
    const normalized2 = str2.toLowerCase().trim();

    if (normalized1 === normalized2) return 100;

    const distance = this.calculateLevenshteinDistance(normalized1, normalized2);
    const maxLength = Math.max(normalized1.length, normalized2.length);

    if (maxLength === 0) return 100;

    return ((maxLength - distance) / maxLength) * 100;
  }

  /**
   * Get or create invoice settings for an organization
   */
  private async getInvoiceSettings(orgId: string): Promise<InvoiceSettings> {
    const result = await pool.query(
      'SELECT * FROM invoice_settings WHERE org_id = $1',
      [orgId]
    );

    if (result.rows.length === 0) {
      // Create default settings
      const createResult = await pool.query(
        `INSERT INTO invoice_settings (org_id)
         VALUES ($1)
         RETURNING *`,
        [orgId]
      );
      return createResult.rows[0];
    }

    return result.rows[0];
  }

  /**
   * Auto-match vendor invoice line items to PO line items
   * Uses fuzzy string matching and price comparison
   */
  async autoMatchInvoice(
    orgId: string,
    input: AutoMatchInput
  ): Promise<MatchResult[]> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const settings = await this.getInvoiceSettings(orgId);

      // Get vendor invoice line items
      const vendorLineItemsResult = await client.query(
        `SELECT * FROM invoice_line_items
         WHERE invoice_id = $1 AND org_id = $2
         ORDER BY line_number`,
        [input.vendor_invoice_id, orgId]
      );

      if (vendorLineItemsResult.rows.length === 0) {
        throw new AppError(
          'No line items found for this invoice',
          404,
          'NO_LINE_ITEMS'
        );
      }

      const vendorLineItems = vendorLineItemsResult.rows;

      // Get PO line items
      let poLineItems: any[] = [];
      if (input.po_id) {
        // If PO is specified, get its line items
        const poLineItemsResult = await client.query(
          `SELECT * FROM po_line_items
           WHERE po_id = $1 AND org_id = $2
           ORDER BY line_number`,
          [input.po_id, orgId]
        );
        poLineItems = poLineItemsResult.rows;
      } else {
        // If no PO specified, try to find linked PO
        const invoiceResult = await client.query(
          'SELECT po_id, vendor_id, client_id, site_id, invoice_date, total FROM invoices WHERE id = $1 AND org_id = $2',
          [input.vendor_invoice_id, orgId]
        );

        if (invoiceResult.rows.length === 0) {
          throw new AppError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
        }

        const invoice = invoiceResult.rows[0];

        if (invoice.po_id) {
          // Use linked PO
          const poLineItemsResult = await client.query(
            `SELECT * FROM po_line_items
             WHERE po_id = $1 AND org_id = $2
             ORDER BY line_number`,
            [invoice.po_id, orgId]
          );
          poLineItems = poLineItemsResult.rows;
        } else {
          // Search for POs from the same vendor
          const poLineItemsResult = await client.query(
            `SELECT pli.* FROM po_line_items pli
             JOIN purchase_orders po ON pli.po_id = po.id
             WHERE po.vendor_id = $1
               AND po.org_id = $2
               AND po.service_scope = 'non_recurring'
               AND po.status IN ('draft', 'sent', 'approved')
               AND po.deleted_at IS NULL
               AND ($3::uuid IS NULL OR po.site_id = $3::uuid)
               AND ($4::uuid IS NULL OR po.client_id = $4::uuid)
               AND (
                 po.po_date BETWEEN ($5::date - INTERVAL '45 day') AND ($5::date + INTERVAL '45 day')
                 OR (
                   po.expected_delivery_date IS NOT NULL
                   AND po.expected_delivery_date BETWEEN ($5::date - INTERVAL '45 day') AND ($5::date + INTERVAL '45 day')
                 )
               )
             ORDER BY ABS(COALESCE(po.total, 0) - $6::numeric) ASC, po.po_date DESC, pli.line_number`,
            [
              invoice.vendor_id,
              orgId,
              invoice.site_id || null,
              invoice.client_id || null,
              invoice.invoice_date || new Date().toISOString().split('T')[0],
              invoice.total || 0,
            ]
          );
          poLineItems = poLineItemsResult.rows;
        }
      }

      const matchResults: MatchResult[] = [];

      // Match each vendor line item to best PO line item
      for (const vendorItem of vendorLineItems) {
        let bestMatch: any = null;
        let bestScore = 0;

        for (const poItem of poLineItems) {
          // Calculate description similarity
          const descriptionSimilarity = this.calculateSimilarity(
            vendorItem.description,
            poItem.description
          );

          // Calculate price difference percentage
          const priceDifference = Math.abs(
            parseFloat(vendorItem.amount) - parseFloat(poItem.amount)
          );
          const priceDifferencePercentage =
            parseFloat(poItem.amount) > 0
              ? (priceDifference / parseFloat(poItem.amount)) * 100
              : 100;

          // Calculate overall match score (weighted: 70% description, 30% price)
          const priceScore = Math.max(0, 100 - priceDifferencePercentage);
          const overallScore = descriptionSimilarity * 0.7 + priceScore * 0.3;

          if (overallScore > bestScore) {
            bestScore = overallScore;
            bestMatch = {
              poItem,
              descriptionSimilarity,
              priceDifference,
              priceDifferencePercentage,
            };
          }
        }

        let matchType: 'exact' | 'fuzzy' | 'unmatched' = 'unmatched';
        let recommendedAction: 'auto_approve' | 'review' | 'flag_discrepancy' =
          'flag_discrepancy';

        if (bestMatch) {
          const withinPriceTolerance =
            bestMatch.priceDifferencePercentage <=
            Number(settings.price_tolerance_percentage);

          if (bestMatch.descriptionSimilarity === 100 && withinPriceTolerance) {
            matchType = 'exact';
            recommendedAction = settings.auto_approve_exact_matches
              ? 'auto_approve'
              : 'review';
          } else if (
            bestMatch.descriptionSimilarity >=
              Number(settings.fuzzy_match_threshold) &&
            withinPriceTolerance
          ) {
            matchType = 'fuzzy';
            recommendedAction = 'review';
          }

          // Save matching record
          const matchStatus =
            recommendedAction === 'auto_approve' ? 'approved' : 'pending';

          await client.query(
            `INSERT INTO invoice_matching_records (
              org_id, vendor_invoice_id, vendor_line_item_id, po_id, po_line_item_id,
              match_type, similarity_score, price_difference_percentage, match_status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              orgId,
              input.vendor_invoice_id,
              vendorItem.id,
              input.po_id || bestMatch.poItem.po_id,
              bestMatch.poItem.id,
              matchType,
              bestMatch.descriptionSimilarity,
              bestMatch.priceDifferencePercentage,
              matchStatus,
            ]
          );

          // Update vendor line item match status
          await client.query(
            `UPDATE invoice_line_items
             SET match_status = $1, po_line_item_id = $2
             WHERE id = $3 AND org_id = $4`,
            [matchType, bestMatch.poItem.id, vendorItem.id, orgId]
          );

          // Create discrepancy if no good match found
          if (matchType === 'unmatched' || recommendedAction === 'flag_discrepancy') {
            await client.query(
              `INSERT INTO invoice_discrepancies (
                org_id, invoice_id, line_item_id, discrepancy_type,
                expected_value, actual_value, amount_difference, severity, status
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
              [
                orgId,
                input.vendor_invoice_id,
                vendorItem.id,
                matchType === 'unmatched' ? 'no_match' : 'price_mismatch',
                bestMatch
                  ? `${bestMatch.poItem.description} - $${bestMatch.poItem.amount}`
                  : 'No matching PO line item',
                `${vendorItem.description} - $${vendorItem.amount}`,
                bestMatch ? bestMatch.priceDifference : 0,
                matchType === 'unmatched' ? 'high' : 'medium',
                'open',
              ]
            );
          }

          matchResults.push({
            vendor_line_item_id: vendorItem.id,
            po_line_item_id: bestMatch.poItem.id,
            match_type: matchType,
            similarity_score: bestMatch.descriptionSimilarity,
            price_difference: bestMatch.priceDifference,
            price_difference_percentage: bestMatch.priceDifferencePercentage,
            recommended_action: recommendedAction,
          });
        } else {
          // No PO items available to match against
          await client.query(
            `UPDATE invoice_line_items
             SET match_status = 'unmatched'
             WHERE id = $1 AND org_id = $2`,
            [vendorItem.id, orgId]
          );

          await client.query(
            `INSERT INTO invoice_discrepancies (
              org_id, invoice_id, line_item_id, discrepancy_type,
              expected_value, actual_value, amount_difference, severity, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              orgId,
              input.vendor_invoice_id,
              vendorItem.id,
              'no_po',
              'PO required',
              `${vendorItem.description} - $${vendorItem.amount}`,
              parseFloat(vendorItem.amount),
              'high',
              'open',
            ]
          );

          matchResults.push({
            vendor_line_item_id: vendorItem.id,
            po_line_item_id: undefined,
            match_type: 'unmatched',
            similarity_score: 0,
            price_difference: parseFloat(vendorItem.amount),
            price_difference_percentage: 100,
            recommended_action: 'flag_discrepancy',
          });
        }
      }

      await client.query('COMMIT');
      return matchResults;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Approve a matching record
   */
  async approveMatch(
    matchId: string,
    userId: string,
    orgId: string
  ): Promise<InvoiceMatchingRecord> {
    const result = await pool.query(
      `UPDATE invoice_matching_records
       SET match_status = 'approved', matched_by = $1, matched_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND org_id = $3
       RETURNING *`,
      [userId, matchId, orgId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Match record not found', 404, 'MATCH_NOT_FOUND');
    }

    return result.rows[0];
  }

  /**
   * Reject a matching record and create discrepancy
   */
  async rejectMatch(
    matchId: string,
    userId: string,
    orgId: string,
    reason?: string
  ): Promise<InvoiceMatchingRecord> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const matchResult = await client.query(
        `UPDATE invoice_matching_records
         SET match_status = 'rejected', matched_by = $1, matched_at = CURRENT_TIMESTAMP,
             notes = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3 AND org_id = $4
         RETURNING *`,
        [userId, reason, matchId, orgId]
      );

      if (matchResult.rows.length === 0) {
        throw new AppError('Match record not found', 404, 'MATCH_NOT_FOUND');
      }

      const match = matchResult.rows[0];

      // Update line item match status
      await client.query(
        `UPDATE invoice_line_items
         SET match_status = 'unmatched', po_line_item_id = NULL
         WHERE id = $1 AND org_id = $2`,
        [match.vendor_line_item_id, orgId]
      );

      // Create discrepancy
      const lineItemResult = await client.query(
        'SELECT * FROM invoice_line_items WHERE id = $1',
        [match.vendor_line_item_id]
      );

      const lineItem = lineItemResult.rows[0];

      await client.query(
        `INSERT INTO invoice_discrepancies (
          org_id, invoice_id, line_item_id, discrepancy_type,
          actual_value, severity, status, resolution_notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          orgId,
          match.vendor_invoice_id,
          match.vendor_line_item_id,
          'rejected_match',
          `${lineItem.description} - $${lineItem.amount}`,
          'medium',
          'open',
          reason || 'Match rejected by user',
        ]
      );

      await client.query('COMMIT');
      return match;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get all matching records for an invoice
   */
  async getMatchingRecords(
    invoiceId: string,
    orgId: string
  ): Promise<InvoiceMatchingRecord[]> {
    const result = await pool.query(
      `SELECT * FROM invoice_matching_records
       WHERE vendor_invoice_id = $1 AND org_id = $2
       ORDER BY created_at DESC`,
      [invoiceId, orgId]
    );

    return result.rows;
  }

  /**
   * Update invoice settings for an organization
   */
  async updateInvoiceSettings(
    input: UpdateInvoiceSettingsInput
  ): Promise<InvoiceSettings> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(input).forEach(([key, value]) => {
      if (value !== undefined && key !== 'orgId') {
        const snakeKey = key.replace(/[A-Z]/g, (letter) =>
          `_${letter.toLowerCase()}`
        );
        fields.push(`${snakeKey} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return this.getInvoiceSettings(input.orgId);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(input.orgId);

    const result = await pool.query(
      `UPDATE invoice_settings SET ${fields.join(', ')}
       WHERE org_id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new AppError('Invoice settings not found', 404, 'SETTINGS_NOT_FOUND');
    }

    return result.rows[0];
  }
}

export const invoiceMatchingService = new InvoiceMatchingService();
