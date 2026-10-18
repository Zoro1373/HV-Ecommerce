/**
 * Express middleware that validates req.body against a provided Zod schema.
 * Formats errors into the standardized VERTEX API error contract.
 */
export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const issues = result.error.issues || result.error.errors || [];
      const details = issues.map((err) => ({
        field: Array.isArray(err.path) ? err.path.join(".") : String(err.path || "general"),
        message: err.message,
      }));

      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "The request contains invalid fields.",
          details,
        },
      });
    }

    // Overwrite req.body with parsed/sanitized/normalized data
    req.body = result.data;
    next();
  };
}

/**
 * Express middleware that validates req.query against a provided Zod schema.
 */
export function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const issues = result.error.issues || result.error.errors || [];
      const details = issues.map((err) => ({
        field: Array.isArray(err.path) ? err.path.join(".") : String(err.path || "general"),
        message: err.message,
      }));

      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "The request query parameters are invalid.",
          details,
        },
      });
    }

    // Overwrite req.query with parsed/coerced data
    req.query = result.data;
    next();
  };
}

/**
 * Express middleware that validates req.params against a provided Zod schema.
 */
export function validateParams(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      const issues = result.error.issues || result.error.errors || [];
      const details = issues.map((err) => ({
        field: Array.isArray(err.path) ? err.path.join(".") : String(err.path || "general"),
        message: err.message,
      }));

      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "The request route parameters are invalid.",
          details,
        },
      });
    }

    // Overwrite req.params with parsed/normalized data
    req.params = result.data;
    next();
  };
}

