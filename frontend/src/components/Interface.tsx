import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { House, BookOpen, ChartBar, UsersThree, User } from '@phosphor-icons/react';
import Dashboard from './Dashboard';
import ReflectionsList from './ReflectionsList';
import Prompt from './Prompt';
import ReflectionDetail from './ReflectionDetail';
import Progress from './Progress';
import Groups from './Groups';
import GroupDetail from './GroupDetail';
import Tokens from './Tokens';
import Profile from './Profile';

const navItems = [
  { to: '/',            icon: House,      label: 'Home',       exact: true },
  { to: '/reflections', icon: BookOpen,   label: 'Einträge' },
  { to: '/progress',    icon: ChartBar,   label: 'Fortschritt' },
  { to: '/groups',      icon: UsersThree, label: 'WeDo' },
  { to: '/profile',     icon: User,       label: 'Profil' },
];

export default function Interface() {
  const location = useLocation();

  return (
    <div className="h-full flex flex-col bg-[#F2F2F7] dark:bg-black">
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/"               element={<Page><Dashboard /></Page>} />
            <Route path="/reflections"    element={<Page><ReflectionsList /></Page>} />
            <Route path="/reflections/new" element={<Page><Prompt /></Page>} />
            <Route path="/reflections/:id" element={<Page><ReflectionDetail /></Page>} />
            <Route path="/progress"       element={<Page><Progress /></Page>} />
            <Route path="/groups"         element={<Page><Groups /></Page>} />
            <Route path="/groups/:id"     element={<Page><GroupDetail /></Page>} />
            <Route path="/tokens"         element={<Page><Tokens /></Page>} />
            <Route path="/profile"        element={<Page><Profile /></Page>} />
          </Routes>
        </AnimatePresence>
      </div>

      {/* iOS Tab Bar */}
      <nav className="nav-bottom">
        <div className="flex items-center justify-around max-w-lg mx-auto px-1 pt-2">
          {navItems.map(({ to, icon: Icon, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className="flex-1"
            >
              {({ isActive }) => (
                <div className={`flex flex-col items-center gap-[3px] py-1 transition-all duration-150 ${
                  isActive
                    ? 'text-black dark:text-white'
                    : 'text-[rgba(60,60,67,0.45)] dark:text-[rgba(235,235,245,0.35)]'
                }`}>
                  <Icon
                    size={26}
                    weight={isActive ? 'fill' : 'regular'}
                  />
                  <span className="text-[10px] font-medium leading-none tracking-tight">
                    {label}
                  </span>
                </div>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
