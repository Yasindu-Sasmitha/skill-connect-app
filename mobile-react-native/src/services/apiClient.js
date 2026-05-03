import { API_BASE_URL } from "../config/apiConfig";

async function request(path, { method = "GET", token, body } = {}) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

function contentOrArray(response) {
  if (Array.isArray(response?.data)) {
    return response.data;
  }
  return response?.data?.content || [];
}

function equipmentPayload(payload) {
  return {
    name: payload.equipmentName,
    description: payload.equipmentDescription,
    category: payload.category,
    dailyRate: payload.rentalPricePerDay,
    isAvailable: payload.isAvailable,
    location: payload.location || "",

    equipmentName: payload.equipmentName,
    equipmentDescription: payload.equipmentDescription,
    equipmentCondition: payload.equipmentCondition,
    rentalPricePerDay: payload.rentalPricePerDay,
    depositAmount: payload.depositAmount,
    quantityAvailable: payload.quantityAvailable,
    quantityTotal: payload.quantityTotal,
    imagePath: payload.imagePath,
  };
}

export async function login(email, password) {
  const response = await request("/auth/login", {
    method: "POST",
    body: { email, password },
  });
  return response.data;
}

export async function register(payload) {
  const response = await request("/auth/register", {
    method: "POST",
    body: payload,
  });
  return response.data;
}

export async function getJobs(token) {
  const response = await request("/jobs", { token });
  return contentOrArray(response);
}

export async function getMyJobs(token) {
  const response = await request("/jobs/my", { token });
  return contentOrArray(response);
}

export async function createJob(token, payload) {
  const response = await request("/jobs", {
    method: "POST",
    token,
    body: payload,
  });
  return response.data;
}

export async function updateJob(token, jobId, payload) {
  const response = await request(`/jobs/${jobId}`, {
    method: "PUT",
    token,
    body: payload,
  });
  return response.data;
}

export async function deleteJob(token, jobId) {
  return request(`/jobs/${jobId}`, { method: "DELETE", token });
}

export async function getProfile(token) {
  const response = await request("/profile/me", { token });
  return response.data;
}

export async function updateProfile(token, payload) {
  const response = await request("/profile/me", {
    method: "PUT",
    token,
    body: payload,
  });
  return response.data;
}

export async function getWorkers(token, district = "") {
  const query = district ? `?district=${encodeURIComponent(district)}` : "";
  const response = await request(`/profile/workers${query}`, { token });
  return contentOrArray(response);
}

export async function getMyBookings(token, asRole = "customer") {
  const response = await request(`/bookings/my?as=${encodeURIComponent(asRole)}`, {
    token,
  });
  return contentOrArray(response);
}

export async function createBooking(token, payload) {
  const response = await request("/bookings", {
    method: "POST",
    token,
    body: payload,
  });
  return response.data;
}

export async function updateBookingStatus(token, bookingId, status, reason = "") {
  const response = await request(`/bookings/${bookingId}/status`, {
    method: "PATCH",
    token,
    body: { status, reason },
  });
  return response.data;
}

export async function deleteBooking(token, bookingId) {
  return request(`/bookings/${bookingId}`, {
    method: "DELETE",
    token,
  });
}

export async function getEquipment(token) {
  const response = await request("/equipment", { token });
  return contentOrArray(response);
}

export async function createEquipment(token, payload) {
  const response = await request("/equipment", {
    method: "POST",
    token,
    body: equipmentPayload(payload),
  });
  return response.data;
}

export async function updateEquipment(token, equipmentId, payload) {
  const response = await request(`/equipment/${equipmentId}`, {
    method: "PUT",
    token,
    body: equipmentPayload(payload),
  });
  return response.data;
}

export async function deleteEquipment(token, equipmentId) {
  return request(`/equipment/${equipmentId}`, {
    method: "DELETE",
    token,
  });
}

export async function getComplaints(token, includeAll = false) {
  const response = await request(includeAll ? "/complaints" : "/complaints/my", { token });
  return contentOrArray(response);
}

export async function createComplaint(token, payload) {
  const response = await request("/complaints", {
    method: "POST",
    token,
    body: {
      complainedAgainst: payload.complainedAgainst,
      booking: payload.booking || undefined,
      complaintCategory: payload.complaintCategory,
      complaintTitle: payload.complaintTitle,
      complaintDescription: payload.complaintDescription,
      description: payload.complaintDescription,
      priority: payload.priority,
    },
  });
  return response.data;
}

export async function updateComplaintStatus(token, complaintId, status, resolutionNotes = "") {
  const response = await request(`/complaints/${complaintId}/status`, {
    method: "PATCH",
    token,
    body: { status, resolutionNotes },
  });
  return response.data;
}

export async function deleteComplaint(token, complaintId) {
  return request(`/complaints/${complaintId}`, {
    method: "DELETE",
    token,
  });
}

export async function getMyReviews(token) {
  const response = await request("/reviews/my", { token });
  return contentOrArray(response);
}

export async function createReview(token, payload) {
  const response = await request("/reviews", {
    method: "POST",
    token,
    body: {
      booking: payload.booking,
      reviewee: payload.reviewee,
      reviewerType: payload.reviewerType,
      rating: payload.rating,
      overallRating: payload.rating,
      comment: payload.reviewText,
      reviewText: payload.reviewText,
    },
  });
  return response.data;
}

export async function updateReview(token, reviewId, payload) {
  const response = await request(`/reviews/${reviewId}`, {
    method: "PUT",
    token,
    body: {
      rating: payload.rating,
      comment: payload.reviewText,
    },
  });
  return response.data;
}

export async function deleteReview(token, reviewId) {
  return request(`/reviews/${reviewId}`, {
    method: "DELETE",
    token,
  });
}
