import * as newsletterService from "../services/newsletter.service.js";

/**
 * Controller to handle public newsletter subscription requests.
 */
export async function subscribe(req, res, next) {
  try {
    const result = await newsletterService.subscribeNewsletter(req.body.email);

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
