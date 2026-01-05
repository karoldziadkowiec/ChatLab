import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { RoutePaths } from '../../routes/RoutePaths';
import AccountService from '../../services/api/AccountService';

interface ProtectedRouteProps {
  element: React.ReactElement;
  allowedRoles: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ element, allowedRoles }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [role, setRole] = useState<string | null>(null);
  const [isTokenAvailable, setIsTokenAvailable] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchAuthStatus = async () => {
      const authStatus = await AccountService.isAuthenticated();
      setIsAuthenticated(authStatus);

      const userRole = await AccountService.getRole();
      setRole(userRole);

      const tokenStatus = await AccountService.isTokenAvailable();
      setIsTokenAvailable(tokenStatus);

      setLoading(false);
    };
    fetchAuthStatus();
  }, []);

  if (loading)
    return <div>Loading...</div>;

  if (!isAuthenticated)
    return <Navigate to={RoutePaths.login()} state={{ toastMessage: "You are not authenticated. Please try to log in." }} />

  if (!allowedRoles.includes(role || ''))
    return <Navigate to={RoutePaths.login()} state={{ toastMessage: "Wrong path... Please log in again." }} />;

  if (!isTokenAvailable)
    return <Navigate to={RoutePaths.login()} state={{ toastMessage: "The expiration date has expired. Please log in again." }} />;

  return element;
};

export default ProtectedRoute;