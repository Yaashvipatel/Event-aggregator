const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
    },
    role: {
      type: String,
      enum: ["student", "faculty", "admin"],
      required: true,
    },

    studentId: { type: String, sparse: true, trim: true },
    department: { type: String, trim: true },
    year: { type: String },

    facultyId: { type: String, sparse: true, trim: true },
    designation: { type: String, trim: true },

    adminId: { type: String, sparse: true, trim: true },

    bio: { type: String, trim: true },
    avatar: { type: String },
    semester: { type: String },
    section: { type: String, trim: true },
    interests: [{ type: String }],
    clubsJoined: [{ type: String }],

    facultyDepartment: { type: String, trim: true },
    officeLocation: { type: String, trim: true },
    subjectsHandled: [{ type: String }],
    clubsManaged: [{ clubName: String, role: String }],

    adminDepartment: { type: String, trim: true },

    notifPrefs: {
      assignments: { type: Boolean, default: true },
      exams: { type: Boolean, default: true },
      notices: { type: Boolean, default: true },
      clubs: { type: Boolean, default: false },
      workshops: { type: Boolean, default: false },
    },

    bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Event" }],
    readEvents: [{ type: mongoose.Schema.Types.ObjectId, ref: "Event" }],
  },
  {
    timestamps: true,
  }
);

UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", UserSchema);