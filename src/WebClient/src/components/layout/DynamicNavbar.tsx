import React, { useEffect, useState } from 'react';
import AccountService from '../../services/api/AccountService';
import Role from '../../models/enums/Role';
import NavbarComponent from '../../components/layout/Navbar';
import AdminNavbarComponent from '../../components/layout/AdminNavbar';

interface DynamicNavbarProps {
  children: React.ReactNode;
}

const DynamicNavbar: React.FC<DynamicNavbarProps> = ({ children }) => {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchRole = async () => {
      const userRole = await AccountService.getRole();
      setRole(userRole);
    };
    fetchRole();
  }, []);

  return (
    <>
      {role === Role.Admin ? <AdminNavbarComponent /> : <NavbarComponent />}
      <div className="main-content">
        {children}
      </div>
    </>
  );
};

export default DynamicNavbar;