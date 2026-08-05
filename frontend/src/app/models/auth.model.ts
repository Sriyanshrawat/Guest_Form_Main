export interface AuthResponse {
  token: string;
  username: string;
  role: 'User' | 'Admin';
}

export interface Credentials {
  username: string;
  password: string;
  captchaId: string;
  captchaAnswer: string;
}

export interface CaptchaResponse {
  captchaId: string;
  imageBase64: string;
}
