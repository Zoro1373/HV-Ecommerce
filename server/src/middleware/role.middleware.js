/**
 * Middleware generator that enforces server-side Role-Based Access Control (RBAC).
 * Enforces permissions on the server, not just in frontend views.
 *
 * @param  {...string} allowedRoles Roles permitted to access the endpoint (e.g., 'ADMIN', 'B2B')
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required before accessing this resource.",
        },
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Access denied. Insufficient permissions for this resource.",
        },
      });
    }

    next();
  };
}
