import { useParams, Link } from "react-router-dom";

export default function MeetingPage() {
  const { meetingId } = useParams<{ meetingId: string }>();

  return (
    <div className="meeting-page">
      <div className="meeting-room-card">
        <p className="meeting-eyebrow">CODEYOUNG TRIAL CLASS</p>

        <div className="meeting-camera-icon" aria-hidden="true">
          🎥
        </div>

        <h1>Welcome to your trial class</h1>
        <p className="meeting-subtext">
          Your meeting room is ready. This is a simulated demo
          room for the Codeyoung trial booking assignment — no
          live video is actually connected.
        </p>

        <div className="meeting-id-box">
          <span>Meeting ID</span>
          <strong>{meetingId || "unknown"}</strong>
        </div>

        <div className="meeting-status">
          <span className="status-dot" />
          Meeting room ready
        </div>

        <Link to="/" className="secondary-button meeting-leave-button">
          Leave Meeting
        </Link>
      </div>
    </div>
  );
}
