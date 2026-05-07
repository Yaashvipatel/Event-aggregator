const jwt = require("jsonwebtoken");
const User = require("../models/User");

const generateToken = (user) => {
  return jwt.sign(
    {
      id:   user._id,
      role: user.role,
      name: user.name,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

const safeUser = (user) => ({
  _id:         user._id,
  name:        user.name,
  email:       user.email,
  phone:       user.phone,
  role:        user.role,

  studentId:   user.studentId,
  department:  user.department,
  year:        user.year,

  facultyId:   user.facultyId,
  designation: user.designation,

  adminId:     user.adminId,
  bookmarks:   user.bookmarks,
  readEvents:  user.readEvents,
  createdAt:   user.createdAt,
});


const signup = async (req, res) => {
  try {
    const {
      name, email, phone, password, role,
      
      studentId, department, year,
      facultyId, designation,
      adminId,
    } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "Name, email, password and role are required" });
    }

    if (!["student", "faculty", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(409).json({ message: "Email already registered" });
    }

    if (role === "student" && studentId) {
      const existing = await User.findOne({ studentId });
      if (existing) return res.status(409).json({ message: "Student ID already registered" });
    }
    if (role === "faculty" && facultyId) {
      const existing = await User.findOne({ facultyId });
      if (existing) return res.status(409).json({ message: "Faculty ID already registered" });
    }
    if (role === "admin" && adminId) {
      const existing = await User.findOne({ adminId });
      if (existing) return res.status(409).json({ message: "Admin ID already registered" });
    }

    const userData = { name, email, phone, password, role };

    if (role === "student") {
      if (!studentId) return res.status(400).json({ message: "Student ID is required" });
      userData.studentId  = studentId;
      userData.department = department;
      userData.year       = year;
    }

    if (role === "faculty") {
      if (!facultyId) return res.status(400).json({ message: "Faculty ID is required" });
      userData.facultyId   = facultyId;
      userData.designation = designation;
      userData.department  = department;
    }

    if (role === "admin") {
      if (!adminId) return res.status(400).json({ message: "Admin ID is required" });
      userData.adminId    = adminId;
      userData.department = department;
    }

    const user = await User.create(userData);

    res.status(201).json({
      message: "Signup successful",
      user: safeUser(user),
      token: generateToken(user),
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Server error during signup", error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { id, password } = req.body;

    if (!id || !password) {
      return res.status(400).json({ message: "ID and password are required" });
    }

    const user = await User.findOne({
      $or: [
        { email:     id.toLowerCase() },
        { studentId: id },
        { facultyId: id },
        { adminId:   id },
      ],
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    res.status(200).json({
      message: "Login successful",
      user: safeUser(user),
      token: generateToken(user),
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login", error: error.message });
  }
};


const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user: safeUser(user) });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { signup, login, getMe };