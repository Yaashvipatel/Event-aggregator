const User   = require("../models/User");
const bcrypt = require("bcryptjs");

const safeUser = (user) => ({
  _id: user._id, name: user.name, email: user.email, phone: user.phone,
  role: user.role, studentId: user.studentId, department: user.department,
  year: user.year, semester: user.semester, section: user.section,
  facultyId: user.facultyId, designation: user.designation,
  facultyDepartment: user.facultyDepartment, officeLocation: user.officeLocation,
  adminId: user.adminId, adminDepartment: user.adminDepartment,
  bio: user.bio, avatar: user.avatar, interests: user.interests,
  clubsJoined: user.clubsJoined, subjectsHandled: user.subjectsHandled,
  clubsManaged: user.clubsManaged, notifPrefs: user.notifPrefs,
  bookmarks: user.bookmarks, readEvents: user.readEvents, createdAt: user.createdAt,
});

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(safeUser(user));
  } catch (err) { res.status(500).json({ message: "Server error", error: err.message }); }
};

const updateProfile = async (req, res) => {
  try {
    const ALLOWED = ["name","phone","bio","avatar","studentId","department","year",
      "semester","section","interests","clubsJoined","facultyId","designation",
      "facultyDepartment","officeLocation","subjectsHandled","clubsManaged",
      "adminId","adminDepartment","notifPrefs"];
    const updates = {};
    ALLOWED.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    if (!Object.keys(updates).length) return res.status(400).json({ message: "No valid fields" });

    const user = await User.findByIdAndUpdate(req.user.id, { $set: updates }, { new: true }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "Profile updated", user: safeUser(user) });
  } catch (err) { res.status(500).json({ message: "Server error", error: err.message }); }
};

const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return res.status(400).json({ message: "Both passwords required" });
    if (newPassword.length < 6) return res.status(400).json({ message: "Min 6 characters" });
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    const ok = await user.matchPassword(oldPassword);
    if (!ok) return res.status(401).json({ message: "Current password is incorrect" });
    user.password = newPassword;
    await user.save();
    res.json({ message: "Password changed successfully" });
  } catch (err) { res.status(500).json({ message: "Server error", error: err.message }); }
};

const getAllUsers = async (req, res) => {
  try {
    const filter = {};
    if (req.query.role && ["student","faculty","admin"].includes(req.query.role)) filter.role = req.query.role;
    const users = await User.find(filter).select("-password").sort({ createdAt: -1 });
    res.json({ users: users.map(safeUser), total: users.length });
  } catch (err) { res.status(500).json({ message: "Server error", error: err.message }); }
};

const getStats = async (req, res) => {
  try {
    const [students, faculty, admins, total] = await Promise.all([
      User.countDocuments({ role: "student" }), User.countDocuments({ role: "faculty" }),
      User.countDocuments({ role: "admin" }),   User.countDocuments({})
    ]);
    res.json({ students, faculty, admins, total });
  } catch (err) { res.status(500).json({ message: "Server error", error: err.message }); }
};

const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!["student","faculty","admin"].includes(role)) return res.status(400).json({ message: "Invalid role" });
    const user = await User.findByIdAndUpdate(req.params.id, { $set: { role } }, { new: true }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "Role updated", user: safeUser(user) });
  } catch (err) { res.status(500).json({ message: "Server error", error: err.message }); }
};

module.exports = { getMe, updateProfile, changePassword, getAllUsers, getStats, updateUserRole };