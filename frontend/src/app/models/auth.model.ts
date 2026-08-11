export interface AuthResponse {
  username: string;
  role: 'User' | 'Admin';
  profilePicture?: string;
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
