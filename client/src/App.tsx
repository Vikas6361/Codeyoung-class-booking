import { Routes, Route } from "react-router-dom";

import "./App.css";

import BookingPage from "./pages/BookingPage";
import MeetingPage from "./pages/MeetingPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<BookingPage />} />
      <Route path="/meeting/:meetingId" element={<MeetingPage />} />
    </Routes>
  );
}

export default App;
