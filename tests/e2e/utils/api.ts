import { APIRequestContext } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost';
const ADMIN_API = `${BASE_URL}:8080/api/admin`;

export class ApiHelper {
  request: APIRequestContext;

  constructor(request: APIRequestContext) {
    this.request = request;
  }

  async createInvitation(data: any) {
    const response = await this.request.post(`${ADMIN_API}/invitations/`, {
      data
    });
    if (!response.ok()) {
      throw new Error(`Failed to create invitation: ${await response.text()}`);
    }
    return response.json();
  }

  async deleteInvitation(id: number) {
    const response = await this.request.delete(`${ADMIN_API}/invitations/${id}/`);
    if (!response.ok()) {
      console.warn(`Failed to delete invitation ${id}: ${await response.text()}`);
    }
    return response.ok();
  }

  async getInvitationLink(id: number) {
    const response = await this.request.get(`${ADMIN_API}/invitations/${id}/generate_link/`);
    if (!response.ok()) {
      throw new Error(`Failed to get link: ${await response.text()}`);
    }
    return response.json();
  }

  async markAsSent(id: number) {
    const response = await this.request.post(`${ADMIN_API}/invitations/${id}/mark-as-sent/`);
    if (!response.ok()) {
      throw new Error(`Failed to mark as sent: ${await response.text()}`);
    }
    return response.json();
  }
  async createAccommodation(data: any) {

    const response = await this.request.post(`${ADMIN_API}/accommodations/`, {
      data: data
    });
    if (!response.ok()) {
      throw new Error(`Failed to create accommodation: ${await response.text()}`);
    }
    return response.json();
  }

  async deleteAccommodation(id: number) {
    const response = await this.request.delete(`${ADMIN_API}/accommodations/${id}/`);
    if (!response.ok()) {
      console.warn(`Failed to delete accommodation ${id}: ${await response.text()}`);
    }
    return response.ok();
  }

  async triggerAutoAssignment(reset: boolean = true) {
    const response = await this.request.post(`${ADMIN_API}/accommodations/auto-assign/`, {
      data: { reset_previous: reset, strategy: 'STANDARD' }
    });
    if (!response.ok()) {
      throw new Error(`Failed to auto assign: ${await response.text()}`);
    }
    return response.json();
  }
  
  async getDashboardStats() {
      const response = await this.request.get(`${ADMIN_API}/dashboard/stats/`);
      if (!response.ok()) throw new Error("Stats failed");
      return response.json();
  }
}
