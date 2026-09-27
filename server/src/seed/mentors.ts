import dotenv from "dotenv";
import { connectDatabase } from "../config/database";
import { Mentor } from "../models/Mentor";

dotenv.config();

const mentors = [
  {
    name: "Priya Sharma",
    email: "priya.sharma@codeyoung-demo.com",
    timezone: "Asia/Kolkata",
  },
  {
    name: "Rahul Kumar",
    email: "rahul.kumar@codeyoung-demo.com",
    timezone: "Asia/Kolkata",
  },
  {
    name: "Ananya Rao",
    email: "ananya.rao@codeyoung-demo.com",
    timezone: "Asia/Kolkata",
  },
  {
    name: "Arjun Mehta",
    email: "arjun.mehta@codeyoung-demo.com",
    timezone: "Asia/Kolkata",
  },
  {
    name: "Sneha Patel",
    email: "sneha.patel@codeyoung-demo.com",
    timezone: "Asia/Kolkata",
  },
  {
    name: "Vivek Nair",
    email: "vivek.nair@codeyoung-demo.com",
    timezone: "Asia/Kolkata",
  },
  {
    name: "Kavya Iyer",
    email: "kavya.iyer@codeyoung-demo.com",
    timezone: "Asia/Kolkata",
  },
  {
    name: "Aditya Singh",
    email: "aditya.singh@codeyoung-demo.com",
    timezone: "Asia/Kolkata",
  },
  {
    name: "Meera Joshi",
    email: "meera.joshi@codeyoung-demo.com",
    timezone: "Asia/Kolkata",
  },
  {
    name: "Rohan Desai",
    email: "rohan.desai@codeyoung-demo.com",
    timezone: "Asia/Kolkata",
  },
];

const seedMentors = async (): Promise<void> => {
  try {
    await connectDatabase();

    await Mentor.deleteMany({});

    await Mentor.insertMany(mentors);

    console.log("10 mentors seeded successfully");

    process.exit(0);
  } catch (error) {
    console.error("Mentor seeding failed:", error);
    process.exit(1);
  }
};

seedMentors();