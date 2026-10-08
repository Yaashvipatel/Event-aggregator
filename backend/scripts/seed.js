// Usage: npm run seed   (wipes users/events/notices and inserts demo data)
const { connectDB, disconnectDB } = require("../src/config/db");
const User = require("../src/models/User");
const Event = require("../src/models/Event");
const Notice = require("../src/models/Notice");

const H = 3600 * 1000;
const D = 24 * H;
const at = (days, hour = 10) => {
  const d = new Date(Date.now() + days * D);
  d.setHours(hour, 0, 0, 0);
  return d;
};

async function seedData() {
  await Promise.all([User.deleteMany({}), Event.deleteMany({}), Notice.deleteMany({})]);

  const admin = await User.create({ name: "Campus Admin", studentId: "admin", password: "Admin@123", role: "admin" });
  const org = await User.create({ name: "Cultural Committee", studentId: "org001", password: "Organizer@123", role: "organizer", interests: ["cultural", "music"] });
  const cse = await User.create({ name: "CSE Department", studentId: "org002", password: "Organizer@123", role: "organizer", interests: ["coding"] });
  await User.create({ name: "Aarav Sharma", studentId: "stu001", password: "Student@123", interests: ["coding", "python", "machine learning", "workshop"] });
  await User.create({ name: "Diya Verma", studentId: "stu002", password: "Student@123", interests: ["music", "dance", "cultural", "fest"] });

  const mk = (o, owner, extra) => ({ ...o, organizer: owner._id, organizerName: owner.name, ...extra });
  await Event.insertMany([
    mk({ title: "Midsem Exam Schedule Briefing", category: "exam", tags: ["exam", "timetable"], location: "Main Auditorium", startDate: at(4, 10), endDate: at(4, 11), capacity: 0, description: "Walkthrough of the midsem exam timetable, seating plan and rules for all courses." }, cse),
    mk({ title: "Aura - Annual Cultural Fest", category: "fest", tags: ["music", "dance", "food", "cultural"], location: "Open Air Theatre", startDate: at(14, 17), endDate: at(16, 22), capacity: 500, description: "Three days of performances, food stalls, competitions and live music. Join us for the annual cultural fest Aura." }, org),
    mk({ title: "Python for Machine Learning Workshop", category: "workshop", tags: ["python", "machine learning", "ai", "coding"], location: "Lab 3, CSE Block", startDate: at(3, 14), endDate: at(3, 17), capacity: 40, description: "Hands-on workshop covering numpy, pandas and scikit-learn. Build a classifier from scratch. Bring your laptop." }, cse),
    mk({ title: "Web Development Bootcamp", category: "workshop", tags: ["javascript", "node", "web", "coding"], location: "Lab 1, CSE Block", startDate: at(7, 10), endDate: at(8, 16), capacity: 30, description: "Two day bootcamp on building full-stack apps with Node.js, Express and MongoDB." }, cse),
    mk({ title: "AI in Healthcare Seminar", category: "seminar", tags: ["ai", "healthcare", "research"], location: "Seminar Hall B", startDate: at(5, 11), endDate: at(5, 13), capacity: 120, description: "Guest lecture on applying machine learning to medical imaging and diagnostics." }, cse),
    mk({ title: "Inter-College Dance Battle", category: "cultural", tags: ["dance", "music", "competition"], location: "Open Air Theatre", startDate: at(9, 18), endDate: at(9, 21), capacity: 200, description: "Solo and group dance competition. Register your team and win exciting prizes." }, org),
    mk({ title: "Semester Fee Payment Deadline", category: "fees", tags: ["fees", "deadline"], location: "Accounts Office", startDate: at(2, 9), endDate: at(2, 17), capacity: 0, description: "Last date to pay semester fees without a late charge. Bring your fee slip." }, admin),
    mk({ title: "National Tech Conference 2026", category: "conference", tags: ["technology", "startups", "ai", "networking"], location: "Convention Centre", startDate: at(21, 9), endDate: at(22, 18), capacity: 300, description: "Industry speakers, startup demos and networking on AI, cloud and the future of software." }, admin),
    mk({ title: "Photography Club Meetup", category: "club", tags: ["photography", "art", "club"], location: "Student Activity Centre", startDate: at(6, 16), endDate: at(6, 18), capacity: 25, description: "Monthly meetup with a photo walk across campus and a critique session." }, org),
    mk({ title: "Competitive Programming Contest", category: "club", tags: ["coding", "algorithms", "competition", "python"], location: "Lab 2, CSE Block", startDate: at(10, 15), endDate: at(10, 18), capacity: 60, description: "Three hour contest with algorithmic problems. Practice for ICPC and placements." }, cse),
    mk({ title: "Open Mic Night", category: "cultural", tags: ["music", "poetry", "comedy"], location: "Cafeteria Lawn", startDate: at(8, 19), endDate: at(8, 22), capacity: 0, description: "Sing, recite or perform stand-up. Sign-ups at the venue." }, org),
    mk({ title: "Resume & Interview Workshop", category: "workshop", tags: ["career", "placements", "interview"], location: "Placement Cell", startDate: at(12, 11), endDate: at(12, 13), capacity: 80, description: "Learn how to craft a standout resume and ace technical and HR interviews." }, admin),
  ]);

  await Notice.insertMany([
    { title: "Midsem Exam Schedule", category: "exam", description: "The midsem exam schedule has been released. Please check the timetable for your respective courses.", postedBy: cse.name, author: cse._id },
    { title: "Annual Cultural Fest - Aura", category: "fest", description: "Join us for the annual cultural fest. Volunteer registrations are now open.", postedBy: org.name, author: org._id },
    { title: "Library Timings Extended", category: "club", description: "The central library will remain open until 11 PM during exam weeks.", postedBy: admin.name, author: admin._id },
  ]);

  console.log("Seeded. Demo logins (Student ID / password):");
  console.log("  admin   / Admin@123      (role: admin)");
  console.log("  org001  / Organizer@123  (role: organizer)");
  console.log("  org002  / Organizer@123  (role: organizer)");
  console.log("  stu001  / Student@123    (role: student, likes coding/python/ML)");
  console.log("  stu002  / Student@123    (role: student, likes music/dance/culture)");
}

module.exports = { seedData };

if (require.main === module) {
  connectDB()
    .then(seedData)
    .then(disconnectDB)
    .catch((e) => { console.error(e); process.exit(1); });
}
