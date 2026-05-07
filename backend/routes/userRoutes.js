const express = require("express");
const router  = express.Router();
const { getMe, updateProfile, changePassword, getAllUsers, getStats, updateUserRole }
  = require("../controllers/userController");
const { protect, authoriseRoles } = require("../middleware/authMiddleware");

router.use(protect);  

router.get("/me",              getMe);
router.put("/update",          updateProfile);
router.put("/change-password", changePassword);
router.get("/all",   authoriseRoles("admin","faculty"), getAllUsers);
router.get("/stats", authoriseRoles("admin"),           getStats);
router.patch("/:id/role", authoriseRoles("admin"),      updateUserRole);

module.exports = router;