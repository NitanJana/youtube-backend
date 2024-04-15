class ApiResponse {
  constructor(statusCode = 200, message = 'success', data = null) {
    this.data = data;
    this.statusCode = statusCode;
    this.message = message;
    this.success = statusCode < 400;
  }
}

export default ApiResponse;
