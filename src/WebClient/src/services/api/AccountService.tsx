import axios from 'axios';
import Cookies from 'js-cookie';
import ApiURL from '../../config/ApiConfig';
import LoginDTO from '../../models/dtos/LoginDTO';
import RegisterDTO from '../../models/dtos/RegisterDTO';
import jwtDecode from 'jwt-decode'
import Role from '../../models/enums/Role';
import { RoutePaths } from '../../routes/RoutePaths';

const AccountService = {
  async registerUser(registerDTO: RegisterDTO) {
    try {
      const response = await axios.post(`${ApiURL}/account/register`, registerDTO);
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Registration failed, details:', error.response?.data || error.message);
      }
      else {
        console.error('Unexpected error:', error);
      }
      throw error;
    }
  },

  async login(loginDTO: LoginDTO) {
    try {
      const response = await axios.post(`${ApiURL}/account/login`, loginDTO);
      const token = response.data;

      if (token) {
        Cookies.set('AuthToken', token, { path: RoutePaths.login() });
        return token;
      }
      else {
        console.error('Token not found in response');
      }
    }
    catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Login failed, details:', error.response?.data || error.message);
      }
      else {
        console.error('Unexpected error:', error);
      }
      throw error;
    }
  },

  async getToken() {
    return Cookies.get('AuthToken') || null;
  },

  async getTokenExpirationTime() {
    const token = await AccountService.getToken();
    if (token) {
      try {
        const decodedToken = jwtDecode<any>(token);
        return decodedToken['exp'];
      }
      catch (error) {
        console.error('Failed to get token expiration time:', error);
      }
    }
    return null;
  },

  async isTokenAvailable(): Promise<boolean> {
    const expirationDate = await AccountService.getTokenExpirationTime();
    if (expirationDate) {
      try {
        const expirationTime = expirationDate * 1000;
        const currentTime = Date.now();

        if (currentTime < expirationTime) {
          return true;
        } 
        else {
          Cookies.remove('AuthToken');
          return false;
        }
      }
      catch (error) {
        console.error('Failed to check if token is avaiable:', error);
      }
    }
    return false;
  },

  async getRole() {
    const token = await AccountService.getToken();
    if (token) {
      try {
        const decodedToken = jwtDecode<any>(token);
        return decodedToken['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
      }
      catch (error) {
        console.error('Failed to decode token:', error);
      }
    }
    return null;
  },

  async getRoles(): Promise<string[]> {
    try {
      const authorizationHeader = await AccountService.getAuthorizationHeader();
      const response = await axios.get<string[]>(`${ApiURL}/account/roles`, {
        headers: {
          'Authorization': authorizationHeader
        }
      });
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Error fetching roles, details:', error.response?.data || error.message);
      }
      else {
        console.error('Unexpected error:', error);
      }
      throw error;
    }
  },

  async getId() {
    const token = await AccountService.getToken();
    if (token) {
      try {
        const decodedToken = jwtDecode<any>(token);
        return decodedToken['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
      }
      catch (error) {
        console.error('Failed to decode token:', error);
      }
    }
    return null;
  },

  async getAuthorizationHeader(): Promise<string> {
    const tokenType = 'Bearer';
    const tokenJWT = await AccountService.getToken();
    if (tokenJWT)
      return `${tokenType} ${tokenJWT}`;

    else
      throw new Error('Token is not available');
  },

  async isAuthenticated() {
    const token = await AccountService.getToken();
    return !!token;
  },

  async isRoleAdmin(): Promise<boolean> {
    const role = await AccountService.getRole();
    if (role === Role.Admin)
      return true;
    else
      return false;
  },

  async isRoleUser(): Promise<boolean> {
    const role = await AccountService.getRole();
    if (role === Role.User)
      return true;
    else
      return false;
  },

  async logout() {
    Cookies.remove('AuthToken', { path: RoutePaths.login() });
  },

  async makeAnAdmin(userId: string): Promise<void> {
    try {
      const authorizationHeader = await AccountService.getAuthorizationHeader();
      await axios.post(`${ApiURL}/account/roles/make-admin/${userId}`, userId, {
        headers: {
          'Authorization': authorizationHeader
        }
      });
    }
    catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Error making an admin, details:', error.response?.data || error.message);
      }
      else {
        console.error('Unexpected error:', error);
      }
      throw error;
    }
  },

  async makeAnUser(userId: string): Promise<void> {
    try {
      const authorizationHeader = await AccountService.getAuthorizationHeader();
      await axios.post(`${ApiURL}/account/roles/make-user/${userId}`, userId, {
        headers: {
          'Authorization': authorizationHeader
        }
      });
    }
    catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Error making an user, details:', error.response?.data || error.message);
      }
      else {
        console.error('Unexpected error:', error);
      }
      throw error;
    }
  }
};

export default AccountService;