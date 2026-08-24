import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../stores/authStore';
import axios from 'axios';
import { LayoutDashboard, Ticket, LogOut, Settings, Users } from 'lucide-react';

export const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await axios.post('/auth/logout');
      logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  const navItems = [
    { name: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
    { name: 'Tickets', path: '/app/tickets', icon: Ticket },
    { name: 'Customers', path: '/app/customers', icon: Users },
    { name: 'Settings', path: '/app/settings', icon: Settings },
  ];


  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-surface border-r flex flex-col">
        <div className="h-16 flex items-center px-6 border-b">
          <h1 className="text-xl font-bold text-primary-600">AIS Helptable</h1>
        </div>
        
        <nav className="flex-1 py-4 flex flex-col gap-1 px-3">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                  isActive 
                    ? 'bg-primary-50 text-primary-700 font-medium' 
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <Icon size={18} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium leading-none">{user?.firstName} {user?.lastName}</span>
              <span className="text-xs text-muted-foreground mt-1">{user?.email}</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 border-b bg-surface flex items-center px-8 justify-between">
            <h2 className="text-lg font-medium">Organization: {user?.organizationId ? "My Org" : "System"}</h2>
        </header>
        <div className="flex-1 overflow-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
