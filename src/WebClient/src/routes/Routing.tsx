import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../services/roles/ProtectedRoute';
import DynamicNavbar from '../components/layout/DynamicNavbar';
import Role from '../models/enums/Role';
import Login from '../components/account/Login';
import Registration from '../components/account/Registration';
import Home from '../components/home/Home';
import MyProfile from '../components/user/MyProfile';
import Chats from '../components/chat/Chats';
import ChatSignalR from '../components/chat/ChatSignalR';
import Community from '../components/user/Community';
import MyFriends from '../components/user/MyFriends';
import Support from '../components/support/Support';
import AdminDashboard from '../components/admin/AdminDashboard';
import AdminUsers from '../components/admin/AdminUsers';
import AdminChats from '../components/admin/AdminChats';
import AdminChat from '../components/admin/AdminChat';
import AdminSupport from '../components/admin/AdminSupport';
import AdminCommunicationTechnologies from '../components/admin/AdminCommunicationTechnologies';
import AdminMakeAnAdmin from '../components/admin/AdminMakeAnAdmin';
import AdminRaportsUsers from '../components/admin/AdminRaportsUsers';
import AdminRaportsChats from '../components/admin/AdminRaportsChats';
import ChatWebSockets from '../components/chat/ChatWebSockets';
import ChatPolling from '../components/chat/ChatPolling';
import ChatSSE from '../components/chat/ChatSSE';
import ChatGRPC from '../components/chat/ChatGRPC';
import ChatSocketIO from '../components/chat/ChatSocketIO';
import { RoutePaths, RoutePatterns } from './RoutePaths';

const Routing = () => {
  return (
    <Router>
      <Routes>
        <Route path={RoutePaths.login()} element={<Login />} />
        <Route path={RoutePaths.registration()} element={<Registration />} />
        <Route path={RoutePaths.home()} element={<ProtectedRoute element={<DynamicNavbar><Home /></DynamicNavbar>} allowedRoles={[Role.User]} />} />
        <Route path={RoutePaths.myProfile()} element={<ProtectedRoute element={<DynamicNavbar><MyProfile /></DynamicNavbar>} allowedRoles={[Role.Admin, Role.User]} />} />
        <Route path={RoutePaths.chats()} element={<ProtectedRoute element={<DynamicNavbar><Chats /></DynamicNavbar>} allowedRoles={[Role.Admin, Role.User]} />} />
        <Route path={RoutePatterns.chatSignalR} element={<ProtectedRoute element={<DynamicNavbar><ChatSignalR /></DynamicNavbar>} allowedRoles={[Role.Admin, Role.User]} />} />
        <Route path={RoutePatterns.chatWS} element={<ProtectedRoute element={<DynamicNavbar><ChatWebSockets /></DynamicNavbar>} allowedRoles={[Role.Admin, Role.User]} />} />
        <Route path={RoutePatterns.chatPolling} element={<ProtectedRoute element={<DynamicNavbar><ChatPolling /></DynamicNavbar>} allowedRoles={[Role.Admin, Role.User]} />} />
        <Route path={RoutePatterns.chatSSE} element={<ProtectedRoute element={<DynamicNavbar><ChatSSE /></DynamicNavbar>} allowedRoles={[Role.Admin, Role.User]} />} />
        <Route path={RoutePatterns.chatSocketIO} element={<ProtectedRoute element={<DynamicNavbar><ChatSocketIO /></DynamicNavbar>} allowedRoles={[Role.Admin, Role.User]} />} />
        <Route path={RoutePatterns.chatGRPC} element={<ProtectedRoute element={<DynamicNavbar><ChatGRPC /></DynamicNavbar>} allowedRoles={[Role.Admin, Role.User]} />} />
        <Route path={RoutePaths.community()} element={<ProtectedRoute element={<DynamicNavbar><Community /></DynamicNavbar>} allowedRoles={[Role.Admin, Role.User]} />} />
        <Route path={RoutePaths.myFriends()} element={<ProtectedRoute element={<DynamicNavbar><MyFriends /></DynamicNavbar>} allowedRoles={[Role.Admin, Role.User]} />} />
        <Route path={RoutePaths.support()} element={<ProtectedRoute element={<DynamicNavbar><Support /></DynamicNavbar>} allowedRoles={[Role.Admin, Role.User]} />} />
        {/* Admin */}
        <Route path={RoutePaths.adminDashboard()} element={<ProtectedRoute element={<DynamicNavbar><AdminDashboard /></DynamicNavbar>} allowedRoles={[Role.Admin]} />} />
        <Route path={RoutePaths.adminUsers()} element={<ProtectedRoute element={<DynamicNavbar><AdminUsers /></DynamicNavbar>} allowedRoles={[Role.Admin]} />} />
        <Route path={RoutePaths.adminChats()} element={<ProtectedRoute element={<DynamicNavbar><AdminChats /></DynamicNavbar>} allowedRoles={[Role.Admin]} />} />
        <Route path={RoutePatterns.adminChat} element={<ProtectedRoute element={<DynamicNavbar><AdminChat /></DynamicNavbar>} allowedRoles={[Role.Admin]} />} />
        <Route path={RoutePaths.adminSupport()} element={<ProtectedRoute element={<DynamicNavbar><AdminSupport /></DynamicNavbar>} allowedRoles={[Role.Admin]} />} />
        <Route path={RoutePaths.adminCommunicationTechnologies()} element={<ProtectedRoute element={<DynamicNavbar><AdminCommunicationTechnologies /></DynamicNavbar>} allowedRoles={[Role.Admin]} />} />
        <Route path={RoutePaths.adminMakeAnAdmin()} element={<ProtectedRoute element={<DynamicNavbar><AdminMakeAnAdmin /></DynamicNavbar>} allowedRoles={[Role.Admin]} />} />
        <Route path={RoutePaths.adminRaportsUsers()} element={<ProtectedRoute element={<DynamicNavbar><AdminRaportsUsers /></DynamicNavbar>} allowedRoles={[Role.Admin]} />} />
        <Route path={RoutePaths.adminRaportsChats()} element={<ProtectedRoute element={<DynamicNavbar><AdminRaportsChats /></DynamicNavbar>} allowedRoles={[Role.Admin]} />} />
      </Routes>
    </Router>
  );
};

export default Routing;