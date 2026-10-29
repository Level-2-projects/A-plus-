/**
 * js/core/http.js – Centralized HTTP request utility with Bearer token injection.
 * Translates HTTP status errors into ApiError instances and handles automatic 401 logout.
 * Depends on: js/config.js, js/api.js
 */

import { API_BASE_URL, LOGIN_ROUTE } from "../config.js";
import { getToken, clearSession, ApiError } from "../api.js";

/**
 * Executes an HTTP fetch request with authentication headers and automatic error handling.
 *
 * @param {string} endpoint - Relative API endpoint starting with '/' (e.g. '/student/courses').
 * @param {RequestInit} [options={}] - Fetch configuration options (method, headers, body, etc.).
 * @returns {Promise<any>} Parsed JSON response body, or null for 204 No Content.
 * @throws {ApiError} On network drops, authorization expiries, or non-2xx statuses.
 */
export async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getToken();

  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let body = options.body;
  if (body && typeof body === "object" && !(body instanceof FormData) && !(body instanceof Blob)) {
    body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      body,
    });
  } catch (networkError) {
    throw new ApiError(0, "Network connection error. Please check your internet connectivity.");
  }

  // Handle session expiry or revoked permissions
  if (response.status === 401) {
    clearSession();
    window.location.assign(LOGIN_ROUTE);
    throw new ApiError(401, "Session expired. Please sign in again.");
  }

  // Handle unsuccessful HTTP statuses
  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorData.message || errorMessage;
    } catch {
      // Body not in JSON format; maintain fallback message
    }
    throw new ApiError(response.status, errorMessage);
  }

  // Return empty payload for No Content responses
  if (response.status === 204) {
    return null;
  }

  return response.json();
}
