class ApiResponse {
  constructor(data, statusCode = 200, message = 'success') {
    this.data = data;
    this.statusCode = statusCode;
    this.message = message;
    this.success = statusCode < 400;
  }
}

export default ApiResponse;
