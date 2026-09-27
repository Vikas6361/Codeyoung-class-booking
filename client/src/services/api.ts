import axios from "axios";
import type { BookingConfirmation, SelectedSlot } from "../types/booking";

/*
 * Base URL is configurable via Vite env var so the same
 * build can point at a deployed backend. Falls back to
 * the local dev server.
 */
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const getAvailableSlots = async (
  date: string,
  timezone: string
): Promise<SelectedSlot[]> => {
  const response = await api.get("/slots", {
    params: {
      date,
      timezone,
    },
  });

  return response.data.slots;
};

export interface CreateBookingInput {
  parent: {
    name: string;
    email: string;
    timezone: string;
  };
  date: string;
  time: string;
}

export interface CreateBookingResponse {
  success: boolean;
  message: string;
  booking: BookingConfirmation;
}

export const createBooking = async (
  data: CreateBookingInput
): Promise<CreateBookingResponse> => {
  const response = await api.post("/bookings", data);

  return response.data;
};

export default api;
