/**
 * js/core/http.js – Centralized HTTP request utility with Bearer token injection.
 * Translates HTTP status errors into ApiError instances and handles automatic 401 logout.
 * Dispatches to js/mock/mock-server.js when USE_MOCK is true, otherwise to FastAPI backend.
 *
 * Depends on: js/config.js, js/api.js, js/mock/mock-server.js
 */

import { API_BASE_URL, LOGIN_ROUTE, USE_MOCK, MOCK_LATENCY_MS, MOCK_FAILURE_RATE } from "../config.js";
import { getToken, clearSession, ApiError } from "../api.js";
import { handle as mockServerHandle } from "../mock/mock-server.js";

/** Artificial delay helper for realistic asynchronous UI feel */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Executes an HTTP request with authentication headers and automatic error handling.
 *
 * @param {string} endpoint - Relative API endpoint starting with '/' (e.g. '/student/courses').
 * @param {RequestInit} [options={}] - Request configuration options (method, headers, body, etc.).
 * @returns {Promise<any>} Parsed JSON response body, or null for 204 No Content.
 * @throws {ApiError} On network drops, authorization expiries, or non-2xx statuses.
 */
export async function request(endpoint, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const token = getToken();

  // Parse body if supplied as string or object
  let body = options.body;
  let parsedBody = body;
  if (typeof body === "string") {
    try {
      parsedBody = JSON.parse(body);
    } catch {
      parsedBody = body;
    }
  }

  // --------------------------------------------------------------------------
  // MOCK DISPATCH BRANCH
  // --------------------------------------------------------------------------
  if (USE_MOCK) {
    if (MOCK_LATENCY_MS > 0) {
      await delay(MOCK_LATENCY_MS);
    }

    // Optional failure rate simulation for error state testing
    if (MOCK_FAILURE_RATE > 0 && Math.random() < MOCK_FAILURE_RATE) {
      throw new ApiError(503, "Simulated mock server failure (Service Unavailable).");
    }

    const mockResponse = mockServerHandle(method, endpoint, parsedBody, token);

    // Handle 401 unauthorized
    if (mockResponse.status === 401) {
      clearSession();
      window.location.assign(LOGIN_ROUTE);
      throw new ApiError(401, mockResponse.error?.detail || "Session expired. Please sign in again.");
    }

    // Handle non-2xx status
    if (!mockResponse.ok) {
      const errorMsg = mockResponse.error?.detail || `Request failed with status ${mockResponse.status}`;
      throw new ApiError(mockResponse.status, errorMsg, mockResponse.error?.errors || null);
    }

    if (mockResponse.status === 204) {
      return null;
    }

    return mockResponse.data;
  }

  // --------------------------------------------------------------------------
  // LIVE HTTP BACKEND FETCH BRANCH
  // --------------------------------------------------------------------------
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let fetchBody = options.body;
  if (fetchBody && typeof fetchBody === "object" && !(fetchBody instanceof FormData) && !(fetchBody instanceof Blob)) {
    fetchBody = JSON.stringify(fetchBody);
  }

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      body: fetchBody,
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
    let errorDetails = null;
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorData.message || errorMessage;
      errorDetails = errorData.errors || null;
    } catch {
      // Body not in JSON format; maintain fallback message
    }
    throw new ApiError(response.status, errorMessage, errorDetails);
  }

  // Return empty payload for No Content responses
  if (response.status === 204) {
    return null;
  }

  return response.json();
}
