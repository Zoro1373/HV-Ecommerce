import * as quoteService from "../services/quote.service.js";

/**
 * Controller to handle public and authenticated customer RFQ submission.
 */
export async function submitQuote(req, res, next) {
  try {
    const userId = req.user?.id || null;
    const quote = await quoteService.createQuote(req.body, userId);

    return res.status(201).json({
      success: true,
      message: "Quote request submitted successfully.",
      quote,
    });
  } catch (error) {
    next(error);
  }
}
