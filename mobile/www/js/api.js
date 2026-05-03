// ========================= //
// SkillConnect Mobile – API  //
// ========================= //

// Use deployed backend for emulator/device/web API calls.
const API_BASE = 'http://localhost:5000/api/v1';

const api = {
    // Get stored token
    getToken() {
        return localStorage.getItem('token');
    },

    // Make authenticated request
    async request(endpoint, options = {}) {
        const token = this.getToken();
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` }),
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(`${API_BASE}${endpoint}`, config);
            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.reload();
                }
                // Attach full error data so UI can show specific messages
                const err = new Error(data.message || 'Request failed');
                err.data = data;
                throw err;
            }

            return data;
        } catch (error) {
            throw error;
        }
    },

    // Auth
    async login(email, password) {
        const res = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data));
        return res.data;
    },

    async register(formData) {
        const res = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(formData)
        });
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data));
        return res.data;
    },

    // Jobs
    async getJobs(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/jobs${query ? '?' + query : ''}`);
    },

    async getJob(id) {
        return this.request(`/jobs/${id}`);
    },

    async createJob(data) {
        return this.request('/jobs', { method: 'POST', body: JSON.stringify(data) });
    },

    async getMyJobs() {
        return this.request('/jobs/my');
    },

    async updateJobStatus(id, status) {
        return this.request(`/jobs/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ jobStatus: status })
        });
    },

    async applyJob(jobId, data) {
        return this.request(`/jobs/${jobId}/apply`, { method: 'POST', body: JSON.stringify(data) });
    },

    // Bookings
    async getMyBookings(role = 'customer') {
        return this.request(`/bookings/my?as=${role}`);
    },

    async createBooking(data) {
        return this.request('/bookings', { method: 'POST', body: JSON.stringify(data) });
    },

    async updateBookingStatus(id, status, reason = '') {
        return this.request(`/bookings/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status, reason })
        });
    },

    // Equipment
    async getEquipment() {
        return this.request('/equipment');
    },

    async getEquipmentById(id) {
        return this.request(`/equipment/${id}`);
    },

    async addEquipment(data) {
        return this.request('/equipment', { method: 'POST', body: JSON.stringify(data) });
    },

    // Reviews
    async getMyReviews() {
        return this.request('/reviews/my');
    },

    async submitReview(data) {
        return this.request('/reviews', { method: 'POST', body: JSON.stringify(data) });
    },

    // Complaints
    async getMyComplaints() {
        return this.request('/complaints/my');
    },

    async submitComplaint(data) {
        return this.request('/complaints', { method: 'POST', body: JSON.stringify(data) });
    },

    // Profile
    async getProfile() {
        return this.request('/profile/me');
    },

    async updateProfile(data) {
        return this.request('/profile/me', { method: 'PUT', body: JSON.stringify(data) });
    },

    async getWorkers(district) {
        return this.request(`/profile/workers${district ? '?district=' + district : ''}`);
    }
};
