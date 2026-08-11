export const environment = {
  production: true,
  // Relative by default so the SPA and API can be served behind the same
  // origin (or a reverse proxy that forwards /api). If the backend lives on
  // a separate host (e.g. an ngrok tunnel), replace this with its origin:
  //   apiUrl: 'https://your-subdomain.ngrok-free.app/api'
  apiUrl: '/api'
};
