import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  FaHome, FaUsers, FaCalendarAlt, FaClock, 
  FaMoneyBillWave, FaFileAlt, FaGift, FaCreditCard,
  FaSignOutAlt, FaUser, FaBook, FaChartBar,
  FaUserCircle, FaCog, FaClipboardList, FaBuilding,
  FaUserTie, FaChevronDown, FaChevronRight,
  FaHandHoldingUsd, FaRegCalendarCheck
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [expandedMenus, setExpandedMenus] = useState({});

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleMenu = (menuPath) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuPath]: !prev[menuPath]
    }));
  };

  // Role-based menu configuration
  const getMenuItems = () => {
    const role = user?.role || 'employee';
    
    // Base menus for all users
    const baseMenus = [
      { 
        path: '/dashboard', 
        icon: <FaHome />, 
        label: 'Dashboard',
        allowedRoles: ['admin', 'hr', 'manager', 'sales', 'team', 'employee']
      },
      { 
        path: '/profile', 
        icon: <FaUserCircle />, 
        label: 'My Profile',
        allowedRoles: ['admin', 'hr', 'manager', 'sales', 'team', 'employee']
      }
    ];

    // Role-specific menus
    const roleMenus = {
      admin: [
        { 
          path: '/employees', 
          icon: <FaUsers />, 
          label: 'Employees',
          allowedRoles: ['admin', 'hr', 'manager']
        },
        { 
          path: '/attendance', 
          icon: <FaClock />, 
          label: 'Attendance',
          allowedRoles: ['admin', 'hr', 'manager', 'employee']
        },
        { 
          path: '/leave', 
          icon: <FaCalendarAlt />, 
          label: 'Leave Management',
          allowedRoles: ['admin', 'hr', 'manager', 'employee'],
          subMenus: [
            { path: '/leave', label: 'Request Leave' },
            { path: '/leave/list', label: 'All Requests' },
            { path: '/leave/cancel', label: 'Cancel Request' },
            { path: '/leave/calendar', label: 'Calendar View' }
          ]
        },
        { 
          path: '/salary', 
          icon: <FaMoneyBillWave />, 
          label: 'Salary',
          allowedRoles: ['admin', 'hr', 'manager', 'employee']
        },
        { 
          path: '/policies', 
          icon: <FaBook />, 
          label: 'Policies',
          allowedRoles: ['admin', 'hr', 'manager', 'employee']
        },
        { 
          path: '/holidays', 
          icon: <FaGift />, 
          label: 'Holidays',
          allowedRoles: ['admin', 'hr', 'manager', 'employee']
        },
        { 
          path: '/payments', 
          icon: <FaCreditCard />, 
          label: 'Payments',
          allowedRoles: ['admin', 'hr']
        },
        { 
          path: '/performance', 
          icon: <FaChartBar />, 
          label: 'Performance',
          allowedRoles: ['admin', 'hr', 'manager']
        }
      ],
      hr: [
        { 
          path: '/employees', 
          icon: <FaUsers />, 
          label: 'Employees',
          allowedRoles: ['admin', 'hr', 'manager']
        },
        { 
          path: '/attendance', 
          icon: <FaClock />, 
          label: 'Attendance',
          allowedRoles: ['admin', 'hr', 'manager', 'employee']
        },
        { 
          path: '/leave', 
          icon: <FaCalendarAlt />, 
          label: 'Leave Management',
          allowedRoles: ['admin', 'hr', 'manager', 'employee'],
          subMenus: [
            { path: '/leave', label: 'Request Leave' },
            { path: '/leave/list', label: 'All Requests' },
            { path: '/leave/cancel', label: 'Cancel Request' },
            { path: '/leave/calendar', label: 'Calendar View' }
          ]
        },
        { 
          path: '/salary', 
          icon: <FaMoneyBillWave />, 
          label: 'Salary',
          allowedRoles: ['admin', 'hr', 'manager', 'employee']
        },
        { 
          path: '/policies', 
          icon: <FaBook />, 
          label: 'Policies',
          allowedRoles: ['admin', 'hr', 'manager', 'employee']
        },
        { 
          path: '/holidays', 
          icon: <FaGift />, 
          label: 'Holidays',
          allowedRoles: ['admin', 'hr', 'manager', 'employee']
        },
        { 
          path: '/payments', 
          icon: <FaCreditCard />, 
          label: 'Payments',
          allowedRoles: ['admin', 'hr']
        },
        { 
          path: '/performance', 
          icon: <FaChartBar />, 
          label: 'Performance',
          allowedRoles: ['admin', 'hr', 'manager']
        }
      ],
      manager: [
        { 
          path: '/employees', 
          icon: <FaUsers />, 
          label: 'Team',
          allowedRoles: ['admin', 'hr', 'manager']
        },
        { 
          path: '/attendance', 
          icon: <FaClock />, 
          label: 'Team Attendance',
          allowedRoles: ['admin', 'hr', 'manager', 'employee']
        },
        { 
          path: '/leave', 
          icon: <FaCalendarAlt />, 
          label: 'Leave Management',
          allowedRoles: ['admin', 'hr', 'manager', 'employee'],
          subMenus: [
            { path: '/leave', label: 'Request Leave' },
            { path: '/leave/list', label: 'Team Requests' },
            { path: '/leave/cancel', label: 'Cancel Request' },
            { path: '/leave/calendar', label: 'Calendar View' }
          ]
        },
        { 
          path: '/performance', 
          icon: <FaChartBar />, 
          label: 'Team Performance',
          allowedRoles: ['admin', 'hr', 'manager']
        },
        { 
          path: '/salary', 
          icon: <FaMoneyBillWave />, 
          label: 'My Salary',
          allowedRoles: ['admin', 'hr', 'manager', 'employee']
        },
        { 
          path: '/policies', 
          icon: <FaBook />, 
          label: 'Policies',
          allowedRoles: ['admin', 'hr', 'manager', 'employee']
        },
        { 
          path: '/holidays', 
          icon: <FaGift />, 
          label: 'Holidays',
          allowedRoles: ['admin', 'hr', 'manager', 'employee']
        }
      ],
      employee: [
        { 
          path: '/attendance', 
          icon: <FaClock />, 
          label: 'My Attendance',
          allowedRoles: ['admin', 'hr', 'manager', 'employee']
        },
        { 
          path: '/leave', 
          icon: <FaCalendarAlt />, 
          label: 'Leave Management',
          allowedRoles: ['admin', 'hr', 'manager', 'employee'],
          subMenus: [
            { path: '/leave', label: 'Request Leave' },
            { path: '/leave/list', label: 'My Requests' },
            { path: '/leave/cancel', label: 'Cancel Request' },
            { path: '/leave/calendar', label: 'Calendar View' }
          ]
        },
        { 
          path: '/salary', 
          icon: <FaMoneyBillWave />, 
          label: 'My Salary',
          allowedRoles: ['admin', 'hr', 'manager', 'employee']
        },
        { 
          path: '/policies', 
          icon: <FaBook />, 
          label: 'Policies',
          allowedRoles: ['admin', 'hr', 'manager', 'employee']
        },
        { 
          path: '/holidays', 
          icon: <FaGift />, 
          label: 'Holidays',
          allowedRoles: ['admin', 'hr', 'manager', 'employee']
        }
      ],
      sales: [
        { 
          path: '/attendance', 
          icon: <FaClock />, 
          label: 'My Attendance',
          allowedRoles: ['admin', 'hr', 'manager', 'employee']
        },
        { 
          path: '/leave', 
          icon: <FaCalendarAlt />, 
          label: 'Leave Management',
          allowedRoles: ['admin', 'hr', 'manager', 'employee'],
          subMenus: [
            { path: '/leave', label: 'Request Leave' },
            { path: '/leave/list', label: 'My Requests' },
            { path: '/leave/cancel', label: 'Cancel Request' },
            { path: '/leave/calendar', label: 'Calendar View' }
          ]
        },
        { 
          path: '/salary', 
          icon: <FaMoneyBillWave />, 
          label: 'My Salary',
          allowedRoles: ['admin', 'hr', 'manager', 'employee']
        },
        { 
          path: '/policies', 
          icon: <FaBook />, 
          label: 'Policies',
          allowedRoles: ['admin', 'hr', 'manager', 'employee']
        }
      ],
      team: [
        { 
          path: '/attendance', 
          icon: <FaClock />, 
          label: 'My Attendance',
          allowedRoles: ['admin', 'hr', 'manager', 'employee']
        },
        { 
          path: '/leave', 
          icon: <FaCalendarAlt />, 
          label: 'Leave Management',
          allowedRoles: ['admin', 'hr', 'manager', 'employee'],
          subMenus: [
            { path: '/leave', label: 'Request Leave' },
            { path: '/leave/list', label: 'My Requests' },
            { path: '/leave/cancel', label: 'Cancel Request' },
            { path: '/leave/calendar', label: 'Calendar View' }
          ]
        },
        { 
          path: '/salary', 
          icon: <FaMoneyBillWave />, 
          label: 'My Salary',
          allowedRoles: ['admin', 'hr', 'manager', 'employee']
        },
        { 
          path: '/policies', 
          icon: <FaBook />, 
          label: 'Policies',
          allowedRoles: ['admin', 'hr', 'manager', 'employee']
        }
      ]
    };

    // Get role-specific menus or fallback to employee
    const roleMenusList = roleMenus[role] || roleMenus.employee;
    
    // Combine base and role-specific menus
    const allMenus = [...baseMenus, ...roleMenusList];
    
    // Filter out duplicate menus
    const uniqueMenus = allMenus.filter((menu, index, self) => 
      index === self.findIndex(m => m.path === menu.path)
    );

    // Filter based on role
    return uniqueMenus.filter(menu => 
      !menu.allowedRoles || menu.allowedRoles.includes(role)
    );
  };

  const menuItems = getMenuItems();

  return (
    <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <div className="logo-container">
          <span className="logo-icon">📋</span>
          <h3>LMS Panel</h3>
        </div>
        <button className="close-sidebar" onClick={toggleSidebar}>
          <span>×</span>
        </button>
      </div>

      <div className="user-info">
        <div className="user-avatar">
          <FaUserCircle size={40} />
        </div>
        <div className="user-details">
          <div className="user-name">
            {user?.employee?.first_name || user?.email?.split('@')[0] || 'User'}
          </div>
          <div className="user-role">
            <span className={`role-badge role-${user?.role || 'employee'}`}>
              {user?.role || 'Employee'}
            </span>
          </div>
        </div>
      </div>
      
      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          // Check if this is a parent menu with submenus
          const hasSubMenus = item.subMenus && item.subMenus.length > 0;
          const isExpanded = expandedMenus[item.path];

          if (hasSubMenus) {
            return (
              <div key={item.path} className="nav-group">
                <div 
                  className={`nav-group-header ${isExpanded ? 'expanded' : ''}`}
                  onClick={() => toggleMenu(item.path)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                  <span className="nav-arrow">
                    {isExpanded ? <FaChevronDown /> : <FaChevronRight />}
                  </span>
                </div>
                {isExpanded && (
                  <div className="nav-submenu">
                    {item.subMenus.map((subItem) => (
                      <NavLink
                        key={subItem.path}
                        to={subItem.path}
                        className={({ isActive }) => 
                          `nav-subitem ${isActive ? 'active' : ''}`
                        }
                      >
                        <span className="subitem-dot">•</span>
                        {subItem.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          // Regular menu item
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => 
                `nav-item ${isActive ? 'active' : ''}`
              }
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <button onClick={handleLogout} className="logout-btn">
          <FaSignOutAlt />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;