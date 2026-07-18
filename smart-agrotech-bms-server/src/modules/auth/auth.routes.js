import { Router } from "express";

const router = Router();

// POST /api/v1/auth/register
router.post("/register", (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Temporary mock response to test your connection
    return res.status(201).json({
      success: true,
      message: "Route hit successfully!",
      data: { email, password }
    });
  } catch (error) {
    next(error); // Sends errors to your global errorMiddleware
  }
});

export default router;
